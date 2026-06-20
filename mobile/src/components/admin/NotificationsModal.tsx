import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell, X, AlertCircle } from 'lucide-react-native';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onClearAll: () => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationsModal({
  visible,
  onClose,
  notifications,
  onClearAll,
  onMarkAllAsRead,
}: NotificationsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.slipModalOverlay}>
        <View style={[styles.slipCard, { maxHeight: '80%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Bell size={20} color="#f97316" />
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>Admin Alerts ({notifications.filter(n => !n.read).length})</Text>
            </View>
            <TouchableOpacity onPress={() => { onMarkAllAsRead(); onClose(); }}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {notifications.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Bell size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: 'bold' }}>No notifications yet</Text>
              </View>
            ) : (
              notifications.map((n) => (
                <View
                  key={n.id}
                  style={{
                    flexDirection: 'row',
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: n.read ? '#f8fafc' : '#fff7ed',
                    borderWidth: 1,
                    borderColor: n.read ? '#e2e8f0' : '#ffedd5',
                    marginBottom: 8,
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: n.title.includes('Stock') ? '#fee2e2' : '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {n.title.includes('Stock') ? (
                      <AlertCircle size={16} color="#ef4444" />
                    ) : (
                      <Bell size={16} color="#64748b" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#0f172a' }}>{n.title}</Text>
                      <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold' }}>{n.time}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#475569', marginTop: 2, fontWeight: '700' }}>{n.desc}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12, borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 16 }}>
            <TouchableOpacity
              style={[styles.slipActionBtn, { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' }]}
              onPress={onClearAll}
              activeOpacity={0.7}
            >
              <Text style={[styles.slipActionBtnText, { color: '#475569' }]}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.slipActionBtn, { backgroundColor: '#f97316' }]}
              onPress={onMarkAllAsRead}
              activeOpacity={0.7}
            >
              <Text style={styles.slipActionBtnText}>Mark All Read</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  slipModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  slipCard: {
    width: '95%',
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  slipActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slipActionBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
});
