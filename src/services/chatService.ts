import {
  db,
  auth,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { Property } from '../types/property';

export interface Chat {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocality: string;
  propertyPrice: number;
  propertyImage?: string;
  tenantId: string;
  tenantName: string;
  ownerId: string; // Linked to Property ownerId / User uid
  ownerName: string;
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export class ChatService {
  /**
   * Generates a deterministic chat ID linking a property and tenant
   */
  static getChatId(propertyId: string, tenantId: string): string {
    return `chat_${propertyId}_${tenantId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Retrieves an existing chat or creates a new one between tenant and property owner
   * Linking Property.ownerId to the owner's Firebase User uid.
   */
  static async getOrCreateChat(
    property: Property,
    tenant: { uid: string; displayName?: string; email?: string }
  ): Promise<Chat> {
    const chatId = this.getChatId(property.id, tenant.uid);
    const chatDocRef = doc(db, 'chats', chatId);
    const path = `chats/${chatId}`;

    try {
      const snap = await getDoc(chatDocRef);
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as any) } as Chat;
      }

      const now = new Date().toISOString();
      const newChat: Chat = {
        id: chatId,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocality: property.locality,
        propertyPrice: property.price,
        propertyImage: property.images?.[0] || '',
        tenantId: tenant.uid,
        tenantName: tenant.displayName || tenant.email?.split('@')[0] || 'Shillong Seeker',
        ownerId: property.ownerId, // Links property.ownerId to Firebase user uid
        ownerName: property.ownerName || 'Property Owner',
        lastMessage: 'Chat started',
        lastMessageAt: now,
        updatedAt: now,
        createdAt: now,
      };

      await setDoc(chatDocRef, newChat);
      return newChat;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  }

  /**
   * Sends a real-time message in the chat and updates conversation preview
   */
  static async sendMessage(
    chatId: string,
    sender: { uid: string; displayName?: string },
    text: string
  ): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msgDocRef = doc(db, 'chats', chatId, 'messages', messageId);
    const chatDocRef = doc(db, 'chats', chatId);
    const path = `chats/${chatId}/messages/${messageId}`;
    const now = new Date().toISOString();

    const messageData: ChatMessage = {
      id: messageId,
      chatId,
      senderId: sender.uid,
      senderName: sender.displayName || 'User',
      text: trimmed,
      createdAt: now,
    };

    try {
      await setDoc(msgDocRef, messageData);
      await updateDoc(chatDocRef, {
        lastMessage: trimmed,
        lastMessageAt: now,
        updatedAt: now,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Subscribes to real-time messages within a specific chat
   */
  static subscribeToChatMessages(
    chatId: string,
    onMessages: (messages: ChatMessage[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const messagesCol = collection(db, 'chats', chatId, 'messages');

    return onSnapshot(
      messagesCol,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...(doc.data() as any) });
        });
        // Sort chronologically
        msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        onMessages(msgs);
      },
      (error) => {
        console.warn('Real-time chat messages listener warning:', error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Subscribes to all chats where the user is either the tenant or the owner
   */
  static subscribeToUserChats(
    userId: string,
    onChats: (chats: Chat[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const chatsCol = collection(db, 'chats');

    return onSnapshot(
      chatsCol,
      (snapshot) => {
        const userChats: Chat[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as any;
          if (data.tenantId === userId || data.ownerId === userId) {
            userChats.push({ id: doc.id, ...data });
          }
        });
        userChats.sort(
          (a, b) =>
            new Date(b.lastMessageAt || b.updatedAt).getTime() -
            new Date(a.lastMessageAt || a.updatedAt).getTime()
        );
        onChats(userChats);
      },
      (error) => {
        console.warn('Real-time chats list listener warning:', error);
        if (onError) onError(error);
      }
    );
  }
}
