import React, { useState, useEffect, useRef } from 'react';
import { Property, UserRole } from '../types/property';
import { Chat, ChatMessage, ChatService } from '../services/chatService';
import { translations } from '../i18n/khasi';
import {
  X,
  Send,
  MessageSquare,
  ShieldCheck,
  Building,
  User,
  Clock,
  Sparkles,
  Phone,
} from 'lucide-react';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property | null;
  currentUser: { uid: string; email: string; displayName?: string; role: UserRole } | null;
  onOpenAuth: () => void;
  lang: 'en' | 'kh';
  initialChatId?: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  property,
  currentUser,
  onOpenAuth,
  lang,
  initialChatId,
}) => {
  const t = translations[lang];
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or fetch the chat
  useEffect(() => {
    if (!isOpen) return;

    if (!currentUser) {
      setLoading(false);
      return;
    }

    let unsubMessages: (() => void) | null = null;

    async function initChat() {
      setLoading(true);
      try {
        let activeChat: Chat | null = null;

        if (property) {
          activeChat = await ChatService.getOrCreateChat(property, currentUser!);
        } else if (initialChatId) {
          // If launched from user conversations list
          activeChat = { id: initialChatId } as any;
        }

        if (activeChat) {
          setChat(activeChat);
          unsubMessages = ChatService.subscribeToChatMessages(
            activeChat.id,
            (newMsgs) => {
              setMessages(newMsgs);
              setLoading(false);
            },
            (err) => {
              console.warn('Chat messages sync note:', err);
              setLoading(false);
            }
          );
        }
      } catch (err) {
        console.error('Failed to initialize chat:', err);
        setLoading(false);
      }
    }

    initChat();

    return () => {
      if (unsubMessages) unsubMessages();
    };
  }, [isOpen, property, initialChatId, currentUser]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chat || !currentUser) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await ChatService.sendMessage(
        chat.id,
        {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email.split('@')[0],
        },
        text
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const sendQuickPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg h-[88vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chat Header */}
        <div className="px-4 py-3 bg-[#1B3524] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm border border-emerald-500/30 shrink-0">
              {property?.ownerName ? property.ownerName.charAt(0) : 'O'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-sm text-white truncate">
                  {property?.ownerName || chat?.ownerName || 'Property Owner'}
                </span>
                <span className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded font-medium shrink-0">
                  Landlord
                </span>
              </div>
              <div className="text-[11px] text-emerald-200/80 truncate">
                {property?.title || chat?.propertyTitle || 'Shillong Hill Listing'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {property?.phone && (
              <a
                href={`tel:${property.phone}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
                title="Call Owner"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Property Reference Mini-Bar */}
        {property && (
          <div className="px-4 py-2 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate text-slate-700">
              <Building className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate font-medium">{property.title}</span>
              <span className="text-slate-400">·</span>
              <span className="font-bold text-emerald-800">
                {property.type === 'rent'
                  ? `₹${property.price.toLocaleString()}/mo`
                  : `₹${(property.price / 100000).toFixed(1)}L`}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 shrink-0">{property.locality}</span>
          </div>
        )}

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8F9FA]">
          {!currentUser ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Sign in to message the owner</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Log in with your account to chat directly with {property?.ownerName || 'the owner'} about this property in Shillong.
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-5 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-semibold hover:bg-emerald-900 transition-colors shadow-xs"
              >
                Sign In / Sign Up
              </button>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              <div className="w-5 h-5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mr-2" />
              Connecting to secure Firestore conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs text-xs text-slate-600 max-w-sm">
                <div className="font-bold text-slate-800 mb-1 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Direct Landlord Connect
                </div>
                Ask about availability, move-in dates, water supply schedule, or arrange an in-person visit.
              </div>

              {/* Quick Prompt Chips */}
              <div className="space-y-1.5 w-full max-w-xs">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Quick Questions
                </div>
                {[
                  'Is this cottage still available for rent?',
                  'Can I visit tomorrow afternoon?',
                  'Does it have 24/7 running water?',
                  'Is car parking included inside the compound?',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendQuickPrompt(prompt)}
                    className="w-full text-left p-2 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs text-slate-700 transition-all text-ellipsis overflow-hidden"
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser.uid;
              const timeString = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      isMe
                        ? 'bg-emerald-800 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                    }`}
                  >
                    {!isMe && (
                      <div className="text-[10px] font-bold text-emerald-700 mb-0.5">
                        {msg.senderName}
                      </div>
                    )}
                    <div>{msg.text}</div>
                    <div
                      className={`text-[9px] mt-1 text-right font-mono ${
                        isMe ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      {timeString}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        {currentUser && (
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Write a message to landlord..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:border-emerald-600 focus:bg-white outline-hidden transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="w-10 h-10 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs shrink-0"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
