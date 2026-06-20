import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, Alert, Modal, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import LoginScreen from './src/screens/LoginScreen';
import WaiterDashboard from './src/screens/WaiterDashboard';
import KitchenDashboard from './src/screens/kitchen/KitchenDashboard';
import RiderDashboard from './src/screens/RiderDashboard';
import AdminDashboard from './src/screens/AdminDashboard';
import SplashScreen from './src/components/SplashScreen';
import { ToastProvider } from './src/components/Toast';
import { loadServerIP } from './src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useToast } from './src/components/Toast';
import { WS_URL } from './src/config';
import { DeviceEventEmitter, Vibration } from 'react-native';
import { useRef } from 'react';

function WebSocketManager() {
  const toast = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let active = true;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (!active) return;
      console.log(`🔌 Connecting to Mobile WS server at ${WS_URL}`);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 Mobile WS connected');
        DeviceEventEmitter.emit('CHAT_CONNECTION_STATUS', { online: true });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SYNC_TRIGGER') {
            DeviceEventEmitter.emit('SYNC_TRIGGER', data);
          } else if (data.type === 'CHAT_MESSAGE') {
            DeviceEventEmitter.emit('CHAT_MESSAGE', data);
          } else if (data.type === 'CHAT_RECEIPT_UPDATE') {
            DeviceEventEmitter.emit('CHAT_RECEIPT_UPDATE', data);
          } else if (data.type === 'CHAT_REACTION_UPDATE') {
            DeviceEventEmitter.emit('CHAT_REACTION_UPDATE', data);
          } else if (data.type === 'NOTIFICATION') {
            toast.info(data.title, data.desc);
            Vibration.vibrate([0, 400, 100, 400]);
          }
        } catch (e) {
          console.warn('Error processing WS msg:', e);
        }
      };

      ws.onclose = () => {
        console.warn('🔌 Mobile WS disconnected. Reconnecting in 4s...');
        DeviceEventEmitter.emit('CHAT_CONNECTION_STATUS', { online: false });
        reconnectTimer = setTimeout(connect, 4000);
      };

      ws.onerror = (err) => {
        console.error('🔌 Mobile WS error:', err);
        DeviceEventEmitter.emit('CHAT_CONNECTION_STATUS', { online: false });
      };
    }

    connect();

    const sendPayloadListener = DeviceEventEmitter.addListener('SEND_WS_PAYLOAD', (payload) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
    });

    return () => {
      active = false;
      if (wsRef.current) wsRef.current.close();
      sendPayloadListener.remove();
      clearTimeout(reconnectTimer);
    };
  }, []);

  return null;
}

function FCMManager() {
  const toast = useToast();

  useEffect(() => {
    async function requestUserPermission() {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('🔥 FCM Authorization status:', authStatus);
          
          messaging()
            .subscribeToTopic('chat')
            .then(() => console.log('🔥 Subscribed to FCM topic: chat'))
            .catch((err) => console.warn('🔥 Failed to subscribe to topic:', err));
        }
      } catch (err) {
        console.warn('FCM Permission Request error:', err);
      }
    }

    requestUserPermission();

    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('🔥 Foreground FCM Message received:', remoteMessage);
      const title = remoteMessage.notification?.title || 'New Message';
      const body = remoteMessage.notification?.body || '';
      toast.info(title, body);
      Vibration.vibrate([0, 400, 100, 400]);
    });

    return unsubscribe;
  }, []);

  return null;
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<{ username: string; role: 'waiter' | 'kitchen' | 'rider' | 'admin', name?: string, permissions?: string[] } | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    loadServerIP().then(() => {
      AsyncStorage.getItem('LOGGED_IN_USER').then((val) => {
        if (val) {
          try {
            setUser(JSON.parse(val));
          } catch (e) { }
        }
        setConfigLoaded(true);
      });
    });
  }, []);

  const handleLoginSuccess = (username: string, role: 'waiter' | 'kitchen' | 'rider' | 'admin', name?: string, permissions?: string[]) => {
    setUser({ username, role, name, permissions });
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    AsyncStorage.removeItem('LOGGED_IN_USER').then(() => {
      setUser(null);
    });
  };

  if (showSplash || !configLoaded) {
    return (
      <ToastProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
          <SplashScreen onComplete={() => setShowSplash(false)} />
        </SafeAreaProvider>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <WebSocketManager />
      <FCMManager />
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent={false} />
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            {user ? (
              user.role === 'kitchen' ? (
                <KitchenDashboard username={user.username} name={user.name} permissions={user.permissions} onLogout={handleLogout} />
              ) : user.role === 'rider' ? (
                <RiderDashboard username={user.username} name={user.name} permissions={user.permissions} onLogout={handleLogout} />
              ) : user.role === 'admin' ? (
                <AdminDashboard username={user.username} name={user.name} permissions={user.permissions} onLogout={handleLogout} />
              ) : (
                <WaiterDashboard username={user.username} name={user.name} permissions={user.permissions} onLogout={handleLogout} />
              )
            ) : (
              <LoginScreen onLoginSuccess={handleLoginSuccess} />
            )}
          </View>

          {/* CUSTOM LOGOUT MODAL */}
          <Modal
            visible={showLogoutModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLogoutModal(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowLogoutModal(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                      <View style={styles.iconCircle}>
                        <LogOut size={28} color="#ef4444" />
                      </View>
                    </View>
                    
                    <Text style={styles.modalTitle}>Confirm Logout</Text>
                    <Text style={styles.modalDesc}>Are you sure you want to log out of your current session?</Text>
                    
                    <View style={styles.modalActions}>
                      <TouchableOpacity 
                        style={styles.cancelBtn} 
                        onPress={() => setShowLogoutModal(false)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.confirmBtn} 
                        onPress={confirmLogout}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.confirmBtnText}>Log Out</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

        </SafeAreaView>
      </SafeAreaProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});

export default App;
