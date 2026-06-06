import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Wifi, WifiOff, Loader } from 'lucide-react-native';
import { ServerStatus } from '../hooks/useServerStatus';

interface NetworkStatusBarProps {
  status: ServerStatus;
  onRetry?: () => void;
  queueCount?: number;
}

export default function NetworkStatusBar({ status, onRetry, queueCount = 0 }: NetworkStatusBarProps) {
  const translateY = useRef(new Animated.Value(-48)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Spin animation for checking state
  useEffect(() => {
    if (status === 'checking') {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [status]);

  // Slide in when offline/checking, slide out when online
  useEffect(() => {
    const shouldShow = status === 'offline' || status === 'checking';
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: shouldShow ? 0 : -48,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: shouldShow ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [status]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const isOffline = status === 'offline';
  const isChecking = status === 'checking';

  const bgColor = isOffline ? '#7f1d1d' : '#1c1400';
  const textColor = isOffline ? '#fca5a5' : '#fef08a';

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: bgColor, transform: [{ translateY }], opacity },
      ]}
    >
      <View style={styles.left}>
        {isChecking ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Loader size={14} color={textColor} />
          </Animated.View>
        ) : (
          <WifiOff size={14} color={textColor} />
        )}
        <Text style={[styles.text, { color: textColor }]}>
          {isChecking ? 'Connecting to server…' : `No server connection${queueCount > 0 ? ` · ${queueCount} order${queueCount > 1 ? 's' : ''} queued` : ''}`}
        </Text>
      </View>
      {isOffline && onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
