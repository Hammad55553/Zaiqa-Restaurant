import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import WaiterDashboard from './src/screens/WaiterDashboard';
import KitchenDashboard from './src/screens/kitchen/KitchenDashboard';
import SplashScreen from './src/components/SplashScreen';
import { ToastProvider } from './src/components/Toast';
import { loadServerIP } from './src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<{ username: string; role: 'waiter' | 'kitchen' } | null>(null);
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

  const handleLoginSuccess = (username: string, role: 'waiter' | 'kitchen') => {
    setUser({ username, role });
  };

  const handleLogout = () => {
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
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
          <View style={styles.content}>
            {user ? (
              user.role === 'kitchen' ? (
                <KitchenDashboard username={user.username} onLogout={handleLogout} />
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
