import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/property.dart';

class ChatMessage {
  final String id;
  final String chatId;
  final String senderId;
  final String senderName;
  final String text;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.chatId,
    required this.senderId,
    required this.senderName,
    required this.text,
    required this.createdAt,
  });

  factory ChatMessage.fromMap(Map<String, dynamic> map, String docId) {
    return ChatMessage(
      id: docId,
      chatId: map['chatId'] ?? '',
      senderId: map['senderId'] ?? '',
      senderName: map['senderName'] ?? '',
      text: map['text'] ?? '',
      createdAt: map['createdAt'] is Timestamp
          ? (map['createdAt'] as Timestamp).toDate()
          : DateTime.tryParse(map['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() => {
        'chatId': chatId,
        'senderId': senderId,
        'senderName': senderName,
        'text': text,
        'createdAt': FieldValue.serverTimestamp(),
      };
}

class ChatConversation {
  final String id;
  final String propertyId;
  final String propertyTitle;
  final String tenantId;
  final String tenantName;
  final String ownerId; // Linked to Property.ownerId / User.uid
  final String ownerName;
  final String lastMessage;
  final DateTime lastMessageAt;

  ChatConversation({
    required this.id,
    required this.propertyId,
    required this.propertyTitle,
    required this.tenantId,
    required this.tenantName,
    required this.ownerId,
    required this.ownerName,
    required this.lastMessage,
    required this.lastMessageAt,
  });

  factory ChatConversation.fromMap(Map<String, dynamic> map, String docId) {
    return ChatConversation(
      id: docId,
      propertyId: map['propertyId'] ?? '',
      propertyTitle: map['propertyTitle'] ?? '',
      tenantId: map['tenantId'] ?? '',
      tenantName: map['tenantName'] ?? '',
      ownerId: map['ownerId'] ?? '',
      ownerName: map['ownerName'] ?? '',
      lastMessage: map['lastMessage'] ?? '',
      lastMessageAt: map['lastMessageAt'] is Timestamp
          ? (map['lastMessageAt'] as Timestamp).toDate()
          : DateTime.now(),
    );
  }
}

class ChatService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Deterministic ID generator linking property and tenant
  static String getChatId(String propertyId, String tenantId) {
    return 'chat_${propertyId}_$tenantId'.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
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
        'ownerId': ownerId, // Linked to owner's uid
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
  static Stream<List<ChatMessage>> getMessagesStream(String chatId) {
    return _firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', descending: false)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ChatMessage.fromMap(doc.data(), doc.id))
            .toList());
  }

  /// Stream all conversations for the current user (as tenant or owner)
  static Stream<List<ChatConversation>> getUserChatsStream() {
    final currentUser = _auth.currentUser;
    if (currentUser == null) return const Stream.empty();

    return _firestore
        .collection('chats')
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ChatConversation.fromMap(doc.data(), doc.id))
            .where((chat) => chat.tenantId == currentUser.uid || chat.ownerId == currentUser.uid)
            .toList());
  }
}
