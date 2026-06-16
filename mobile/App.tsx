import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import WaiterDashboard from './src/screens/WaiterDashboard';
import KitchenDashboard from './src/screens/kitchen/KitchenDashboard';
import RiderDashboard from './src/screens/RiderDashboard';
import SplashScreen from './src/components/SplashScreen';
import { ToastProvider } from './src/components/Toast';
import { loadServerIP } from './src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useToast } from './src/components/Toast';
import { WS_URL } from './src/config';
import { DeviceEventEmitter, Vibration, useRef } from 'react-native';

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

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SYNC_TRIGGER') {
            DeviceEventEmitter.emit('SYNC_TRIGGER', data);
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
        reconnectTimer = setTimeout(connect, 4000);
      };

      ws.onerror = (err) => {
        console.error('🔌 Mobile WS error:', err);
      };
    }

    connect();

    return () => {
      active = false;
      if (wsRef.current) wsRef.current.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  return null;
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<{ username: string; role: 'waiter' | 'kitchen' | 'rider' } | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    loadServerIP().then(() => {
      AsyncStorage.getItem('LOGGED_IN_USER').then((val) => {
        if (val) {
          try {
            setUser(JSON.parse(val));
          } catch (e) {}
        }
        setConfigLoaded(true);
      });
    });
  }, []);

  const handleLoginSuccess = (username: string, role: 'waiter' | 'kitchen' | 'rider') => {
    setUser({ username, role });
  };

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: () => {
            AsyncStorage.removeItem('LOGGED_IN_USER').then(() => {
              setUser(null);
            });
          } 
        }
      ]
    );
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
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
          <View style={styles.content}>
            {user ? (
              user.role === 'kitchen' ? (
                <KitchenDashboard username={user.username} onLogout={handleLogout} />
              ) : user.role === 'rider' ? (
                <RiderDashboard username={user.username} onLogout={handleLogout} />
              ) : (
                <WaiterDashboard username={user.username} onLogout={handleLogout} />
              )
            ) : (
              <LoginScreen onLoginSuccess={handleLoginSuccess} />
            )}
          </View>
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
    backgroundColor: '#f8fafc',
  },
});

export default App;
