import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Smartphone, Download } from 'lucide-react';

interface FlutterCodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DETAIL_SCREEN_CODE = `import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/property.dart';
import '../services/chat_service.dart';

class PropertyDetailScreen extends StatefulWidget {
  final Property property;

  const PropertyDetailScreen({super.key, required this.property});

  @override
  State<PropertyDetailScreen> createState() => _PropertyDetailScreenState();
}

class _PropertyDetailScreenState extends State<PropertyDetailScreen> {
  int _currentImageIndex = 0;
  bool _isSaved = false;
  bool _isSaving = false;
  final PageController _pageController = PageController();

  @override
  void initState() {
    super.initState();
    _checkIfSaved();
  }

  Future<void> _checkIfSaved() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('saved')
          .doc(widget.property.id)
          .get();
      if (mounted) {
        setState(() {
          _isSaved = doc.exists;
        });
      }
    } catch (e) {
      debugPrint('Error checking saved state: \$e');
    }
  }

  Future<void> _toggleSaveProperty() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please log in to save properties in Shillong')),
      );
      return;
    }

    setState(() => _isSaving = true);
    final savedRef = FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('saved')
        .doc(widget.property.id);

    try {
      if (_isSaved) {
        await savedRef.delete();
        if (mounted) setState(() { _isSaved = false; _isSaving = false; });
      } else {
        await savedRef.set({
          'propertyId': widget.property.id,
          'title': widget.property.title,
          'price': widget.property.price,
          'locality': widget.property.address,
          'savedAt': FieldValue.serverTimestamp(),
        });
        if (mounted) setState(() { _isSaved = true; _isSaving = false; });
      }
    } catch (e) {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _callOwner() async {
    final cleanPhone = widget.property.phone.replaceAll(RegExp(r'\\s+'), '');
    final uri = Uri.parse('tel:\$cleanPhone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _openChat() async {
    try {
      final chatId = await ChatService.getOrCreateChat(widget.property);
      // Navigate to chat thread screen using chatId
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Chat initialized with owner \${widget.property.ownerName}')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open chat: \$e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.property;
    final images = p.images.isNotEmpty ? p.images : ['https://picsum.photos/800/600'];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: Text(p.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(_isSaved ? Icons.bookmark : Icons.bookmark_border,
                color: _isSaved ? const Color(0xFFE63946) : Colors.black87),
            onPressed: _toggleSaveProperty,
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            SizedBox(
              height: 280,
              child: PageView.builder(
                controller: _pageController,
                itemCount: images.length,
                onPageChanged: (i) => setState(() => _currentImageIndex = i),
                itemBuilder: (c, i) => Image.network(images[i], fit: BoxFit.cover),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('₹\${p.price.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Color(0xFF1B3524))),
                  Text(p.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  Text(p.address, style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.all(12),
        color: Colors.white,
        child: Row(
          children: [
            OutlinedButton.icon(
              onPressed: _openChat,
              icon: const Icon(Icons.chat_bubble_outline),
              label: const Text('Chat'),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _callOwner,
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1B3524), foregroundColor: Colors.white),
                icon: const Icon(Icons.phone),
                label: const Text('Call Owner'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
`;

const CHAT_SERVICE_CODE = `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/property.dart';

class ChatService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Deterministic ID generator linking property and tenant
  static String getChatId(String propertyId, String tenantId) {
    return 'chat_\${propertyId}_\$tenantId'.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
  }

  /// Get or create a chat linking Property.ownerId to the owner's Firebase uid
  static Future<String> getOrCreateChat(Property property) async {
    final currentUser = _auth.currentUser;
    if (currentUser == null) {
      throw Exception('User must be logged in to chat with property owners');
    }

    final tenantId = currentUser.uid;
    final ownerId = property.ownerId; // Directly links property ownerId to User uid
    final chatId = getChatId(property.id, tenantId);

    final chatRef = _firestore.collection('chats').doc(chatId);
    final docSnapshot = await chatRef.get();

    if (!docSnapshot.exists) {
      await chatRef.set({
        'id': chatId,
        'propertyId': property.id,
        'propertyTitle': property.title,
        'tenantId': tenantId,
        'tenantName': currentUser.displayName ?? currentUser.email?.split('@')[0] ?? 'Tenant',
        'ownerId': ownerId, // Linked to owner's uid from Property model
        'ownerName': property.ownerName,
        'lastMessage': 'Conversation started',
        'lastMessageAt': FieldValue.serverTimestamp(),
        'createdAt': FieldValue.serverTimestamp(),
      });
    }

    return chatId;
  }

  /// Send real-time chat message
  static Future<void> sendMessage(String chatId, String text) async {
    final currentUser = _auth.currentUser;
    if (currentUser == null) throw Exception('Not authenticated');

    final cleanText = text.trim();
    if (cleanText.isEmpty) return;

    final chatRef = _firestore.collection('chats').doc(chatId);
    final messagesRef = chatRef.collection('messages');

    await messagesRef.add({
      'chatId': chatId,
      'senderId': currentUser.uid,
      'senderName': currentUser.displayName ?? currentUser.email?.split('@')[0] ?? 'User',
      'text': cleanText,
      'createdAt': FieldValue.serverTimestamp(),
    });

    await chatRef.update({
      'lastMessage': cleanText,
      'lastMessageAt': FieldValue.serverTimestamp(),
    });
  }

  /// Stream real-time messages in a conversation
  static Stream<QuerySnapshot> getMessagesStream(String chatId) {
    return _firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', descending: false)
        .snapshots();
  }

  /// Stream all conversations for the current user (as tenant or owner)
  static Stream<QuerySnapshot> getUserChatsStream() {
    final currentUser = _auth.currentUser;
    if (currentUser == null) return const Stream.empty();

    return _firestore
        .collection('chats')
        .where(Filter.or(
          Filter('tenantId', isEqualTo: currentUser.uid),
          Filter('ownerId', isEqualTo: currentUser.uid),
        ))
        .snapshots();
  }
}
`;

export const FlutterCodeViewerModal: React.FC<FlutterCodeViewerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'detail' | 'chat'>('chat');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = activeTab === 'detail' ? DETAIL_SCREEN_CODE : CHAT_SERVICE_CODE;
  const currentFileName = activeTab === 'detail' ? 'property_detail_screen.dart' : 'chat_service.dart';
  const currentPath = activeTab === 'detail' ? 'lib/screens/property_detail_screen.dart' : 'lib/services/chat_service.dart';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileCode className="w-4 h-4" />
            </div>
            {/* File Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('chat');
                  setCopied(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'chat'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                chat_service.dart
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('detail');
                  setCopied(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'detail'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                property_detail_screen.dart
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Dart'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Path Bar */}
        <div className="px-5 py-2 bg-slate-950 border-b border-slate-800/80 text-[11px] font-mono text-emerald-400 flex items-center justify-between">
          <span>{currentPath}</span>
          <span className="text-slate-500 font-sans">
            {activeTab === 'chat'
              ? 'Firestore real-time ChatService linking Property.ownerId -> User uid'
              : 'Complete Flutter screen with carousel & owner actions'}
          </span>
        </div>

        {/* Code Content */}
        <div className="overflow-auto flex-1 p-5 bg-[#0d1512] font-mono text-xs text-slate-300 leading-relaxed selection:bg-emerald-500/30">
          <pre>{currentCode}</pre>
        </div>
      </div>
    </div>
  );
};
