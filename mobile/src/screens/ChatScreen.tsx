import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  DeviceEventEmitter,
  SafeAreaView,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Send, ArrowLeft, Clock, Check, CheckCheck, Smile, Info, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config';

interface Receipt {
  message_id: number;
  username: string;
  status: 'delivered' | 'read';
  updated_at: string;
}

interface Reaction {
  message_id: number;
  username: string;
  reaction: string;
}

interface Message {
  id: number | string;
  sender_username: string;
  sender_name?: string;
  sender_role: string;
  text: string;
  created_at: string;
  status?: 'pending';
  receipts?: Receipt[];
  reactions?: Reaction[];
}

interface ChatScreenProps {
  username: string;
  name?: string;
  role: string;
  onBack: () => void;
}

export default function ChatScreen({ username, name, role, onBack }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<Message[]>([]);
  
  // Modals / Menu State
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Fetch chat history
  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/chat`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      
      // Auto-send read receipts for unread messages
      data.forEach((msg: Message) => {
        const myReceipt = msg.receipts?.find(r => r.username.toLowerCase() === username.toLowerCase());
        if (msg.sender_username.toLowerCase() !== username.toLowerCase() && (!myReceipt || myReceipt.status !== 'read')) {
          DeviceEventEmitter.emit('SEND_WS_PAYLOAD', {
            type: 'CHAT_MESSAGE_READ',
            message_id: msg.id,
            username
          });
        }
      });

      setMessages(data);
    } catch (err: any) {
      console.error('Error fetching chat history:', err);
      setError('Failed to connect to chat server.');
    } finally {
      setLoading(false);
    }
  };

  // Load offline queue on mount
  useEffect(() => {
    AsyncStorage.getItem('mobile_chat_offline_queue').then((val) => {
      if (val) {
        try {
          setOfflineQueue(JSON.parse(val));
        } catch(e){}
      }
    });
  }, []);

  useEffect(() => {
    fetchHistory();

    // Listen to real-time chat messages
    const chatListener = DeviceEventEmitter.addListener('CHAT_MESSAGE', (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        
        // Auto mark as read if screen is open
        if (msg.sender_username.toLowerCase() !== username.toLowerCase()) {
          DeviceEventEmitter.emit('SEND_WS_PAYLOAD', {
            type: 'CHAT_MESSAGE_READ',
            message_id: msg.id,
            username
          });
        }
        return [...prev, msg];
      });
    });

    // Listen to receipt updates
    const receiptListener = DeviceEventEmitter.addListener('CHAT_RECEIPT_UPDATE', (update) => {
      setMessages((prev) => 
        prev.map((m) => {
          if (m.id === update.message_id) {
            const existingReceipts = m.receipts || [];
            const index = existingReceipts.findIndex(r => r.username.toLowerCase() === update.username.toLowerCase());
            let newReceipts = [...existingReceipts];
            const receiptObj = { message_id: update.message_id, username: update.username, status: update.status, updated_at: update.updated_at };
            
            if (index > -1) {
              if (existingReceipts[index].status === 'read' && update.status === 'delivered') {
                return m;
              }
              newReceipts[index] = receiptObj;
            } else {
              newReceipts.push(receiptObj);
            }
            return { ...m, receipts: newReceipts };
          }
          return m;
        })
      );
    });

    // Listen to reaction updates
    const reactionListener = DeviceEventEmitter.addListener('CHAT_REACTION_UPDATE', (update) => {
      setMessages((prev) => 
        prev.map((m) => {
          if (m.id === update.message_id) {
            const existingReactions = m.reactions || [];
            let newReactions = existingReactions.filter(r => r.username.toLowerCase() !== update.username.toLowerCase());
            if (update.reaction) {
              newReactions.push({ message_id: update.message_id, username: update.username, reaction: update.reaction });
            }
            return { ...m, reactions: newReactions };
          }
          return m;
        })
      );
    });

    // Listen to connection changes
    const connectionListener = DeviceEventEmitter.addListener('CHAT_CONNECTION_STATUS', (status) => {
      setIsOnline(status.online);
    });

    return () => {
      chatListener.remove();
      receiptListener.remove();
      reactionListener.remove();
      connectionListener.remove();
    };
  }, []);

  // Flush offline queue when status turns back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      console.log('🔄 Mobile restored connection. Flushing offline queue:', offlineQueue);
      const queueCopy = [...offlineQueue];
      setOfflineQueue([]);
      AsyncStorage.removeItem('mobile_chat_offline_queue');

      queueCopy.forEach(async (qMsg) => {
        try {
          await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender_username: username,
              sender_name: name || username,
              sender_role: role,
              text: qMsg.text,
            }),
          });
        } catch (e) {
          // Re-queue on failure
          setOfflineQueue(prev => {
            const updated = [...prev, qMsg];
            AsyncStorage.setItem('mobile_chat_offline_queue', JSON.stringify(updated));
            return updated;
          });
        }
      });
      
      setTimeout(() => fetchHistory(), 1000);
    }
  }, [isOnline, offlineQueue]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    setInputText('');

    if (isOnline) {
      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_username: username,
            sender_name: name || username,
            sender_role: role,
            text: trimmed,
          }),
        });

        if (!res.ok) {
          addToOfflineQueue(trimmed);
        }
      } catch (err) {
        addToOfflineQueue(trimmed);
      }
    } else {
      addToOfflineQueue(trimmed);
    }
  };

  const addToOfflineQueue = (text: string) => {
    const tempMsg: Message = {
      id: `offline-${Date.now()}`,
      sender_username: username,
      sender_name: name || username,
      sender_role: role,
      text,
      created_at: new Date().toISOString(),
      status: 'pending',
      receipts: [],
      reactions: []
    };

    setMessages((prev) => [...prev, tempMsg]);
    setOfflineQueue((prev) => {
      const updated = [...prev, tempMsg];
      AsyncStorage.setItem('mobile_chat_offline_queue', JSON.stringify(updated));
      return updated;
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    if (!activeMessage) return;
    DeviceEventEmitter.emit('SEND_WS_PAYLOAD', {
      type: 'CHAT_MESSAGE_REACTION',
      message_id: activeMessage.id,
      username,
      reaction: emoji
    });
    setShowMenu(false);
    setActiveMessage(null);
  };

  const handleRemoveReaction = () => {
    if (!activeMessage) return;
    DeviceEventEmitter.emit('SEND_WS_PAYLOAD', {
      type: 'CHAT_MESSAGE_REACTION',
      message_id: activeMessage.id,
      username,
      reaction: null
    });
    setShowMenu(false);
    setActiveMessage(null);
  };

  const getRoleBadgeStyle = (senderRole: string) => {
    switch (senderRole?.toLowerCase()) {
      case 'admin':
        return { bg: '#fee2e2', text: '#dc2626' };
      case 'waiter':
        return { bg: '#eff6ff', text: '#2563eb' };
      case 'kitchen':
        return { bg: '#f0fdf4', text: '#16a34a' };
      case 'rider':
        return { bg: '#fff7ed', text: '#ea580c' };
      default:
        return { bg: '#f4f4f5', text: '#71717a' };
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const renderTicks = (msg: Message) => {
    if (msg.status === 'pending' || String(msg.id).startsWith('offline-')) {
      return <Clock size={10} color="#94a3b8" />;
    }

    const receipts = msg.receipts || [];
    const othersReceipts = receipts.filter(r => r.username.toLowerCase() !== username.toLowerCase());
    
    if (othersReceipts.length === 0) {
      return <Check size={10} color="#cbd5e1" />;
    }

    const isRead = othersReceipts.some(r => r.status === 'read');
    if (isRead) {
      return <CheckCheck size={10} color="#3b82f6" />;
    }

    return <CheckCheck size={10} color="#94a3b8" />;
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.sender_username?.toLowerCase() === username?.toLowerCase();
    const colors = getRoleBadgeStyle(item.sender_role);
    const msgReactions = item.reactions || [];

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isMe && (
          <View style={styles.senderHeader}>
            <Text style={styles.senderName}>{item.sender_name || item.sender_username}</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.bg }]}>
              <Text style={[styles.roleText, { color: colors.text }]}>{item.sender_role.toUpperCase()}</Text>
            </View>
          </View>
        )}
        {isMe && (
          <View style={styles.senderHeaderMe}>
            <View style={[styles.roleBadge, { backgroundColor: colors.bg }]}>
              <Text style={[styles.roleText, { color: colors.text }]}>YOU</Text>
            </View>
          </View>
        )}

        <TouchableOpacity 
          activeOpacity={0.8}
          onLongPress={() => {
            if (!String(item.id).startsWith('offline-')) {
              setActiveMessage(item);
              setShowMenu(true);
            }
          }}
          style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}
        >
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>

          {/* Reactions inside the bubble */}
          {msgReactions.length > 0 && (
            <View style={[styles.reactionContainer, isMe ? styles.reactionMe : styles.reactionOther]}>
              {Array.from(new Set(msgReactions.map(r => r.reaction))).map((emoji, i) => (
                <Text key={i} style={{ fontSize: 10 }}>{emoji}</Text>
              ))}
              <Text style={styles.reactionCount}>{msgReactions.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.timeContainer}>
          <Clock size={10} color="#94a3b8" />
          <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          {isMe && <View style={{ marginLeft: 6 }}>{renderTicks(item)}</View>}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Zaiqa Staff Broadcast</Text>
          <Text style={styles.headerSubtitle}>
            {isOnline ? 'Real-time group chat' : 'Offline Mode (Queued)'}
          </Text>
        </View>
        <TouchableOpacity onPress={fetchHistory} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.chatArea}>
          {loading && messages.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchHistory} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}
        </View>

        {/* INPUT BAR */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={isOnline ? "Type message here..." : "Offline. Queueing message..."}
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.disabledSendBtn]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Send size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* LONG-PRESS OPTIONS MENU MODAL */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowMenu(false);
          setActiveMessage(null);
        }}
      >
        <TouchableWithoutFeedback onPress={() => {
          setShowMenu(false);
          setActiveMessage(null);
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuContainer}>
                <Text style={styles.menuTitle}>React or Options</Text>
                
                {/* Reactions Row */}
                <View style={styles.reactionPickerRow}>
                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.reactionPickBtn}
                      onPress={() => handleEmojiSelect(emoji)}
                    >
                      <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {activeMessage && activeMessage.reactions?.some(r => r.username.toLowerCase() === username.toLowerCase()) && (
                  <TouchableOpacity style={styles.menuItem} onPress={handleRemoveReaction}>
                    <Text style={styles.removeReactionText}>Remove reaction</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.menuDivider} />

                {/* Option 2: Message Info */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    setShowInfoModal(true);
                  }}
                >
                  <Info size={20} color="#475569" style={{ marginRight: 10 }} />
                  <Text style={styles.menuItemText}>Message Info</Text>
                </TouchableOpacity>

                {/* Option 3: Cancel */}
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    setShowMenu(false);
                    setActiveMessage(null);
                  }}
                >
                  <X size={20} color="#94a3b8" style={{ marginRight: 10 }} />
                  <Text style={[styles.menuItemText, { color: '#94a3b8' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MESSAGE INFO MODAL */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowInfoModal(false);
          setActiveMessage(null);
        }}
      >
        <TouchableWithoutFeedback onPress={() => {
          setShowInfoModal(false);
          setActiveMessage(null);
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.infoModalContainer}>
                {/* Header */}
                <View style={styles.infoModalHeader}>
                  <Text style={styles.infoModalTitle}>Message Info</Text>
                  <TouchableOpacity onPress={() => {
                    setShowInfoModal(false);
                    setActiveMessage(null);
                  }}>
                    <X size={22} color="#475569" />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                {activeMessage && (
                  <ScrollView contentContainerStyle={styles.infoModalContent}>
                    {/* Message Preview */}
                    <View style={styles.infoMsgPreview}>
                      <Text style={styles.infoPreviewLabel}>Message Text</Text>
                      <Text style={styles.infoPreviewText}>{activeMessage.text}</Text>
                    </View>

                    {/* Reactions List */}
                    <View style={styles.infoSection}>
                      <Text style={styles.infoSectionTitle}>Reactions ({activeMessage.reactions?.length || 0})</Text>
                      {(!activeMessage.reactions || activeMessage.reactions.length === 0) ? (
                        <Text style={styles.infoPlaceholder}>No reactions yet</Text>
                      ) : (
                        activeMessage.reactions.map((react, idx) => (
                          <View key={idx} style={styles.infoReceiptRow}>
                            <Text style={styles.receiptUser}>{react.username}</Text>
                            <Text style={{ fontSize: 18 }}>{react.reaction}</Text>
                          </View>
                        ))
                      )}
                    </View>

                    {/* Receipts Log (Only Sender sees) */}
                    <View style={styles.infoSection}>
                      <Text style={styles.infoSectionTitle}>Receipt Logs</Text>
                      {activeMessage.sender_username.toLowerCase() !== username.toLowerCase() ? (
                        <Text style={styles.receiptPrivateText}>
                          ⚠️ Read receipts details are private and only viewable by the sender of this message.
                        </Text>
                      ) : (!activeMessage.receipts || activeMessage.receipts.length === 0) ? (
                        <Text style={styles.infoPlaceholder}>No delivery/read data logged yet</Text>
                      ) : (
                        activeMessage.receipts.map((receipt, idx) => (
                          <View key={idx} style={styles.infoReceiptRow}>
                            <View>
                              <Text style={styles.receiptUser}>{receipt.username}</Text>
                              <Text style={styles.receiptTime}>
                                {new Date(receipt.updated_at).toLocaleString()}
                              </Text>
                            </View>
                            <View style={[
                              styles.statusLabel,
                              { backgroundColor: receipt.status === 'read' ? '#dbeafe' : '#f1f5f9' }
                            ]}>
                              <Text style={[
                                styles.statusLabelText,
                                { color: receipt.status === 'read' ? '#2563eb' : '#64748b' }
                              ]}>
                                {receipt.status.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '700',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f97316',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  messageRow: {
    marginBottom: 16,
    maxWidth: '80%',
    position: 'relative'
  },
  myMessageRow: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageRow: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderHeaderMe: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginRight: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 8,
    fontWeight: '900',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative'
  },
  myBubble: {
    backgroundColor: '#f97316',
    borderTopRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  otherMessageText: {
    color: '#1e293b',
    fontWeight: '500',
  },
  reactionContainer: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  reactionMe: {
    left: 8,
  },
  reactionOther: {
    right: 8,
  },
  reactionCount: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    marginLeft: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timeText: {
    fontSize: 9,
    color: '#94a3b8',
    marginLeft: 4,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    marginRight: 12,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendBtn: {
    backgroundColor: '#cbd5e1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  reactionPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  reactionPickBtn: {
    padding: 6,
    borderRadius: 8,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  removeReactionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ef4444',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 6,
  },
  infoModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    height: '75%',
    padding: 24,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 16,
    marginBottom: 16,
  },
  infoModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
  },
  infoModalContent: {
    paddingBottom: 30,
  },
  infoMsgPreview: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 20,
  },
  infoPreviewLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  infoPreviewText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#f97316',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoPlaceholder: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  receiptPrivateText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '700',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    lineHeight: 18,
  },
  infoReceiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  receiptUser: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  receiptTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  statusLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusLabelText: {
    fontSize: 9,
    fontWeight: '900',
  },
});
