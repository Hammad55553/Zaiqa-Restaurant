import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Send, MessageSquare, Clock, Check, CheckCheck, Smile } from 'lucide-react-native';
import { API_BASE, WS_URL } from '../../config';

interface ChatMessage {
  id: number | string;
  sender_username: string;
  sender_name?: string;
  sender_role: string;
  text: string;
  created_at: string;
  status?: string; // For optimistic UI
  receipts?: any[];
  reactions?: any[];
}

interface ChatTabProps {
  currentUser: {
    username: string;
    role: string;
    name?: string;
  };
}

export default function ChatTab({ currentUser }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial Fetch & WebSocket setup
  useEffect(() => {
    fetchHistory();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.warn('Failed to load chat history', err);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
    }
  };

  const connectWebSocket = () => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      setIsOnline(true);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'CHAT_MESSAGE') {
          setMessages(prev => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, data];
          });
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        } else if (data.type === 'CHAT_RECEIPT_UPDATE' || data.type === 'CHAT_REACTION_UPDATE') {
          // Refresh history gracefully if receipts or reactions update to stay in sync
          fetchHistory();
        }
      } catch (err) {
        // Ignore parsing errors
      }
    };

    ws.onclose = () => {
      setIsOnline(false);
      // Reconnect logic
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          connectWebSocket();
        }
      }, 5000);
    };

    ws.onerror = () => {
      setIsOnline(false);
    };

    wsRef.current = ws;
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: tempId,
      sender_username: currentUser.username,
      sender_name: currentUser.name || currentUser.username,
      sender_role: currentUser.role,
      text: trimmed,
      created_at: new Date().toISOString(),
      status: 'pending',
      receipts: [],
      reactions: []
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // If WebSocket is open, we can send it there, OR just REST POST and let WS broadcast it.
      // REST POST is reliable.
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_username: currentUser.username,
          sender_name: currentUser.name,
          sender_role: currentUser.role,
          text: trimmed
        })
      });

      if (!res.ok) {
        throw new Error('Failed to send');
      }

      // We don't necessarily need to replace the temp message here because the WebSocket
      // will broadcast the saved message back to us, and we'll have duplicate if we're not careful.
      // Easiest is to re-fetch history or let WS handle it and filter temp.
      fetchHistory();
    } catch (err) {
      console.warn('Chat send failed:', err);
    }
  };

  const getRoleColors = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
      case 'waiter': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      case 'kitchen': return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
      case 'rider': return { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5' };
      default: return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };
    }
  };

  const renderTicks = (msg: ChatMessage) => {
    if (msg.status === 'pending') {
      return <Clock size={10} color="#94a3b8" />;
    }
    const receipts = msg.receipts || [];
    const others = receipts.filter(r => r.username.toLowerCase() !== currentUser.username.toLowerCase());
    if (others.length === 0) {
      return <Check size={12} color="#cbd5e1" />;
    }
    const isRead = others.some(r => r.status === 'read');
    if (isRead) {
      return <CheckCheck size={12} color="#3b82f6" />;
    }
    return <CheckCheck size={12} color="#94a3b8" />;
  };

  if (isLoading && messages.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading Broadcast Chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBg}>
            <MessageSquare size={20} color="#f97316" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Broadcast Chat</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#16a34a' : '#ef4444' }]} />
              <Text style={styles.headerSubtitle}>{isOnline ? 'Live Connected' : 'Connecting...'}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea} 
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageSquare size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubText}>Start the conversation with your team.</Text>
          </View>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_username.toLowerCase() === currentUser.username.toLowerCase();
            const colors = getRoleColors(msg.sender_role);
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View 
                key={msg.id || index} 
                style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}
              >
                {!isMe && (
                  <View style={styles.senderInfo}>
                    <Text style={styles.senderName}>{msg.sender_name || msg.sender_username}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <Text style={[styles.roleText, { color: colors.text }]}>{msg.sender_role}</Text>
                    </View>
                  </View>
                )}

                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                    {msg.text}
                  </Text>

                  {/* Inline Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <View style={[styles.reactionsStrip, isMe ? { right: 8 } : { left: 8 }]}>
                      {Array.from(new Set(msg.reactions.map((r: any) => r.reaction))).map((emoji: any, i) => (
                        <Text key={i} style={styles.reactionEmoji}>{emoji}</Text>
                      ))}
                      <Text style={styles.reactionCount}>{msg.reactions.length}</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.metaRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                  <Clock size={10} color="#94a3b8" />
                  <Text style={styles.timeText}>{time}</Text>
                  {isMe && renderTicks(msg)}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Type message here..."
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Send size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  messageWrapper: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  messageWrapperMe: {
    alignSelf: 'flex-end',
  },
  messageWrapperOther: {
    alignSelf: 'flex-start',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
    gap: 6,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  bubble: {
    padding: 14,
    borderRadius: 16,
    position: 'relative',
  },
  bubbleMe: {
    backgroundColor: '#f97316',
    borderTopRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#ffffff',
  },
  messageTextOther: {
    color: '#0f172a',
  },
  reactionsStrip: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginRight: 4,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
    maxHeight: 100,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
