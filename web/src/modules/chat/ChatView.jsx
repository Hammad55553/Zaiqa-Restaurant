import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Clock, ShieldCheck, X, Check, CheckCheck, Info, Smile } from 'lucide-react';
import { syncService } from '../../services/syncService';
import { API_BASE } from '../../config';

const ChatView = ({ currentUser }) => {
    // Fallback if currentUser not passed
    const activeUser = currentUser || (() => {
        try {
            const saved = localStorage.getItem('pos_current_user');
            return saved ? JSON.parse(saved) : { username: 'Staff', role: 'staff' };
        } catch {
            return { username: 'Staff', role: 'staff' };
        }
    })();

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isOnline, setIsOnline] = useState(true);
    const [offlineQueue, setOfflineQueue] = useState([]);
    const [selectedMessage, setSelectedMessage] = useState(null); // For reaction/info popover
    const [infoModalMessage, setInfoModalMessage] = useState(null); // For detailed info modal
    
    const messagesEndRef = useRef(null);

    // Fetch message history
    const fetchHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/chat`);
            if (!res.ok) throw new Error('Failed to load chat history');
            const data = await res.json();
            
            // Mark unread messages as read automatically
            data.forEach(msg => {
                const myReceipt = msg.receipts?.find(r => r.username.toLowerCase() === activeUser.username.toLowerCase());
                if (msg.sender_username.toLowerCase() !== activeUser.username.toLowerCase() && (!myReceipt || myReceipt.status !== 'read')) {
                    syncService.sendChatReceipt(msg.id, activeUser.username, 'read');
                }
            });

            setMessages(data);
        } catch (err) {
            console.error('Error fetching chat logs:', err);
            setError('Could not load chat history. Please verify connection.');
        } finally {
            setIsLoading(false);
        }
    };

    // Load offline queue on mount
    useEffect(() => {
        try {
            const savedQueue = localStorage.getItem('chat_offline_queue');
            if (savedQueue) {
                setOfflineQueue(JSON.parse(savedQueue));
            }
        } catch (e) {
            console.error('Error parsing offline queue:', e);
        }
        
        fetchHistory();

        // Subscriptions
        const unsubscribeMsg = syncService.subscribe('chat_message', (msg) => {
            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                
                // If it is not my message, send delivery receipt instantly
                if (msg.sender_username.toLowerCase() !== activeUser.username.toLowerCase()) {
                    syncService.sendChatReceipt(msg.id, activeUser.username, 'read');
                }
                return [...prev, msg];
            });
        });

        const unsubscribeReceipt = syncService.subscribe('chat_receipt_update', (update) => {
            setMessages((prev) => 
                prev.map((m) => {
                    if (m.id === update.message_id) {
                        const existingReceipts = m.receipts || [];
                        const index = existingReceipts.findIndex(r => r.username.toLowerCase() === update.username.toLowerCase());
                        let newReceipts = [...existingReceipts];
                        const receiptObj = { message_id: update.message_id, username: update.username, status: update.status, updated_at: update.updated_at };
                        
                        if (index > -1) {
                            // Only upgrade status (don't downgrade from read to delivered)
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

        const unsubscribeReaction = syncService.subscribe('chat_reaction_update', (update) => {
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

        const unsubscribeStatus = syncService.subscribe('connection_status', (status) => {
            setIsOnline(status.online);
        });

        return () => {
            unsubscribeMsg();
            unsubscribeReceipt();
            unsubscribeReaction();
            unsubscribeStatus();
        };
    }, []);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send offline queue when back online
    useEffect(() => {
        if (isOnline && offlineQueue.length > 0) {
            console.log('🔄 Restored connection. Flushing offline chat queue:', offlineQueue);
            const queueCopy = [...offlineQueue];
            setOfflineQueue([]);
            localStorage.removeItem('chat_offline_queue');

            queueCopy.forEach(async (qMsg) => {
                const sent = syncService.sendChatMessage(activeUser.username, activeUser.role, qMsg.text);
                if (!sent) {
                    // Put back in queue if it failed
                    setOfflineQueue(prev => {
                        const updated = [...prev, qMsg];
                        localStorage.setItem('chat_offline_queue', JSON.stringify(updated));
                        return updated;
                    });
                }
            });
            // Reload history to replace temp messages
            setTimeout(() => fetchHistory(), 1000);
        }
    }, [isOnline, offlineQueue]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const trimmed = inputText.trim();
        if (!trimmed) return;

        setInputText('');

        if (isOnline) {
            const sent = syncService.sendChatMessage(activeUser.username, activeUser.role, trimmed);
            if (!sent) {
                // Fallback to queue if ws failed
                addToOfflineQueue(trimmed);
            }
        } else {
            addToOfflineQueue(trimmed);
        }
    };

    const addToOfflineQueue = (text) => {
        const tempId = `offline-${Date.now()}`;
        const tempMsg = {
            id: tempId,
            sender_username: activeUser.username,
            sender_role: activeUser.role,
            text,
            created_at: new Date().toISOString(),
            status: 'pending',
            receipts: [],
            reactions: []
        };

        setMessages(prev => [...prev, tempMsg]);
        setOfflineQueue(prev => {
            const updated = [...prev, tempMsg];
            localStorage.setItem('chat_offline_queue', JSON.stringify(updated));
            return updated;
        });
    };

    const getRoleColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
            case 'waiter':
                return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
            case 'kitchen':
                return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
            case 'rider':
                return { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5' };
            default:
                return { bg: '#f4f4f5', text: '#71717a', border: '#e4e4e7' };
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    };

    const handleSelectReaction = (msg, emoji) => {
        syncService.sendChatReaction(msg.id, activeUser.username, emoji);
        setSelectedMessage(null);
    };

    const handleRemoveReaction = (msg) => {
        syncService.sendChatReaction(msg.id, activeUser.username, null);
        setSelectedMessage(null);
    };

    const renderTicks = (msg) => {
        if (msg.status === 'pending' || String(msg.id).startsWith('offline-')) {
            return <Clock size={12} style={{ color: '#94a3b8' }} />;
        }

        const receipts = msg.receipts || [];
        const othersReceipts = receipts.filter(r => r.username.toLowerCase() !== activeUser.username.toLowerCase());
        
        if (othersReceipts.length === 0) {
            // Only sent to server
            return <Check size={12} style={{ color: '#cbd5e1' }} />;
        }

        const isRead = othersReceipts.some(r => r.status === 'read');
        if (isRead) {
            return <CheckCheck size={12} style={{ color: '#3b82f6' }} />; // Blue ticks
        }

        // Otherwise it is delivered
        return <CheckCheck size={12} style={{ color: '#94a3b8' }} />; // Gray double ticks
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '25px',
            backgroundColor: '#f8fafc',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Watermark logo */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(./Logo.jpg)`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: 0.02, pointerEvents: 'none', zIndex: 0 }} />

            {/* HEADER */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'white',
                padding: '20px 25px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                position: 'relative',
                zIndex: 2,
                flexShrink: 0
            }}>
                <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                        <div style={{ background: '#fff7ed', padding: '8px', borderRadius: '10px' }}>
                            <MessageSquare size={28} color="#f97316" />
                        </div>
                        ZAIQA BROADCAST CHAT
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '2px', margin: 0 }}>
                        Real-time internal communication. Hover or click messages to React and view Info.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '6px 12px',
                        borderRadius: '20px',
                        background: isOnline ? '#f0fdf4' : '#fef2f2',
                        color: isOnline ? '#16a34a' : '#ef4444',
                        border: `1px solid ${isOnline ? '#bbf7d0' : '#fca5a5'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#16a34a' : '#ef4444', display: 'inline-block' }}></span>
                        {isOnline ? 'LIVE CONNECTED' : 'OFFLINE MODE'}
                    </span>
                    <button
                        onClick={fetchHistory}
                        style={{ background: 'white', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '10px', fontWeight: 800, fontSize: '0.75rem', color: '#475569', cursor: 'pointer' }}
                    >
                        REFRESH
                    </button>
                </div>
            </header>

            {/* CHAT CONTAINER */}
            <div style={{
                flex: 1,
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 1
            }}>
                {/* MESSAGES LIST */}
                <div style={{
                    flex: 1,
                    padding: '20px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    backgroundColor: '#fafafa'
                }}>
                    {isLoading && messages.length === 0 ? (
                        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#94a3b8' }}>
                            <div className="animate-spin" style={{ width: '30px', height: '30px', border: '3px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '10px' }} />
                            <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>Loading chat history...</p>
                        </div>
                    ) : error ? (
                        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#dc2626', padding: '20px', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: 800 }}>⚠️ {error}</p>
                            <button onClick={fetchHistory} style={{ marginTop: '10px', padding: '6px 12px', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Retry Connection</button>
                        </div>
                    ) : messages.length === 0 ? (
                        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#94a3b8' }}>
                            <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
                            <p style={{ fontSize: '0.9rem', fontWeight: 800 }}>No messages yet</p>
                            <p style={{ fontSize: '0.75rem' }}>Send a message to start the conversation.</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isMe = msg.sender_username?.toLowerCase() === activeUser.username?.toLowerCase();
                            const colors = getRoleColor(msg.sender_role);
                            const msgReactions = msg.reactions || [];

                            return (
                                <div
                                    key={msg.id || index}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isMe ? 'flex-end' : 'flex-start',
                                        maxWidth: '75%',
                                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Sender Meta Info */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', padding: '0 4px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>
                                            {msg.sender_username}
                                        </span>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 900,
                                            textTransform: 'uppercase',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: colors.bg,
                                            color: colors.text,
                                            border: `1px solid ${colors.border}`
                                        }}>
                                            {msg.sender_role}
                                        </span>
                                    </div>

                                    {/* Message Bubble + Action Button Wrapper */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMe ? 'row' : 'row-reverse' }}>
                                        {/* Action Button (three dots/smiley) */}
                                        {!String(msg.id).startsWith('offline-') && (
                                            <button 
                                                onClick={() => setSelectedMessage(selectedMessage?.id === msg.id ? null : msg)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#94a3b8',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseOver={(e) => e.target.style.color = '#475569'}
                                                onMouseOut={(e) => e.target.style.color = '#94a3b8'}
                                            >
                                                <Smile size={16} />
                                            </button>
                                        )}

                                        {/* Main Bubble */}
                                        <div style={{
                                            padding: '12px 16px',
                                            borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0',
                                            backgroundColor: isMe ? '#f97316' : '#ffffff',
                                            color: isMe ? '#ffffff' : '#1e293b',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03)',
                                            border: isMe ? 'none' : '1px solid #e2e8f0',
                                            lineHeight: '1.5',
                                            fontSize: '0.9rem',
                                            fontWeight: 500,
                                            wordBreak: 'break-word',
                                            whiteSpace: 'pre-wrap',
                                            position: 'relative'
                                        }}>
                                            {msg.text}

                                            {/* Reactions display nested inside bottom edge */}
                                            {msgReactions.length > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '-12px',
                                                    right: isMe ? 'auto' : '8px',
                                                    left: isMe ? '8px' : 'auto',
                                                    background: '#ffffff',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '12px',
                                                    padding: '2px 6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                                    zIndex: 5
                                                }}>
                                                    {Array.from(new Set(msgReactions.map(r => r.reaction))).map((emoji, i) => (
                                                        <span key={i} style={{ fontSize: '0.75rem' }}>{emoji}</span>
                                                    ))}
                                                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>
                                                        {msgReactions.length}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timestamp and Ticks */}
                                    <div style={{
                                        fontSize: '0.65rem',
                                        color: '#94a3b8',
                                        marginTop: msgReactions.length > 0 ? '14px' : '4px',
                                        padding: '0 4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <Clock size={10} />
                                        {formatTime(msg.created_at)}
                                        {isMe && renderTicks(msg)}
                                    </div>

                                    {/* Action Popover Menu (Reactions row & Info button) */}
                                    {selectedMessage?.id === msg.id && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: isMe ? 0 : 'auto',
                                            left: isMe ? 'auto' : 0,
                                            background: '#ffffff',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '12px',
                                            padding: '8px 12px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                            zIndex: 20,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            marginTop: '6px'
                                        }}>
                                            {/* Reactions picker */}
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => handleSelectReaction(msg, emoji)}
                                                        style={{ fontSize: '1.25rem', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', borderRadius: '4px' }}
                                                        onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
                                                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                                {msgReactions.some(r => r.username.toLowerCase() === activeUser.username.toLowerCase()) && (
                                                    <button 
                                                        onClick={() => handleRemoveReaction(msg)}
                                                        style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>

                                            {/* Divider */}
                                            <div style={{ height: '1px', background: '#f1f5f9' }} />

                                            {/* Info and Close Options */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        setInfoModalMessage(msg);
                                                        setSelectedMessage(null);
                                                    }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#475569',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: 0
                                                    }}
                                                >
                                                    <Info size={12} /> Message Info
                                                </button>
                                                <button
                                                    onClick={() => setSelectedMessage(null)}
                                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: 0 }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* CHAT INPUT BAR */}
                <form
                    onSubmit={handleSendMessage}
                    style={{
                        padding: '15px 20px',
                        background: 'white',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center'
                    }}
                >
                    <input
                        type="text"
                        placeholder={isOnline ? "Type message here..." : "Offline. Message will be queued and sent later..."}
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            outline: 'none',
                            backgroundColor: isOnline ? '#fafafa' : '#f8fafc'
                        }}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        style={{
                            background: inputText.trim() ? '#f97316' : '#cbd5e1',
                            color: 'white',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '10px',
                            cursor: inputText.trim() ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>

            {/* DETAILED MESSAGE INFO MODAL */}
            {infoModalMessage && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        width: '90%',
                        maxWidth: '480px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Modal Header */}
                        <div style={{ padding: '20px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1e293b' }}>Message Info</h3>
                            <button onClick={() => setInfoModalMessage(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '50%' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                            {/* Message Preview */}
                            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                                    Message Text
                                </p>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                                    {infoModalMessage.text}
                                </p>
                            </div>

                            {/* Reactions Section (Everyone can see) */}
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 900, color: '#f97316', textTransform: 'uppercase', tracking: '0.05em' }}>
                                    Reactions ({infoModalMessage.reactions?.length || 0})
                                </h4>
                                {(!infoModalMessage.reactions || infoModalMessage.reactions.length === 0) ? (
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No reactions yet</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {infoModalMessage.reactions.map((react, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>{react.username}</span>
                                                <span style={{ fontSize: '1.2rem' }}>{react.reaction}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Read Receipts Section (Only sender can see) */}
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 900, color: '#f97316', textTransform: 'uppercase', tracking: '0.05em' }}>
                                    Receipt Status
                                </h4>
                                {infoModalMessage.sender_username.toLowerCase() !== activeUser.username.toLowerCase() ? (
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#ef4444', fontWeight: 700, background: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                                        ⚠️ Read logs are private and only visible to the sender of this message.
                                    </p>
                                ) : (!infoModalMessage.receipts || infoModalMessage.receipts.length === 0) ? (
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No receipts log found</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {infoModalMessage.receipts.map((receipt, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                                <div>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block' }}>{receipt.username}</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{new Date(receipt.updated_at).toLocaleString()}</span>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 900,
                                                    textTransform: 'uppercase',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: receipt.status === 'read' ? '#dbeafe' : '#f1f5f9',
                                                    color: receipt.status === 'read' ? '#2563eb' : '#64748b',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    {receipt.status === 'read' ? (
                                                        <>
                                                            <CheckCheck size={10} color="#2563eb" /> Read
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check size={10} color="#64748b" /> Delivered
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatView;
