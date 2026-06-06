import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Single Toast Item ────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, { bg: string; border: string; icon: React.FC<any>; iconColor: string }> = {
  success: {
    bg: '#0f2318',
    border: '#22c55e',
    icon: CheckCircle,
    iconColor: '#22c55e',
  },
  error: {
    bg: '#1f0a0a',
    border: '#ef4444',
    icon: XCircle,
    iconColor: '#ef4444',
  },
  warning: {
    bg: '#1c1400',
    border: '#f59e0b',
    icon: AlertTriangle,
    iconColor: '#f59e0b',
  },
  info: {
    bg: '#071526',
    border: '#3b82f6',
    icon: Info,
    iconColor: '#3b82f6',
  },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const slideY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const config = TOAST_CONFIG[toast.type];
  const Icon = config.icon;

  React.useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 3.5s
    const timer = setTimeout(() => dismiss(), 3500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: -120,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  };

  return (
    <Animated.View
      style={[
        styles.toastCard,
        {
          backgroundColor: config.bg,
          borderLeftColor: config.border,
          transform: [{ translateY: slideY }],
          opacity,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <Icon size={22} color={config.iconColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.toastTitle, { color: config.iconColor }]}>{toast.title}</Text>
        {toast.message ? (
          <Text style={styles.toastMessage}>{toast.message}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={16} color="#94a3b8" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev.slice(-2), { id, type, title, message }]); // max 3 at once
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ctx: ToastContextValue = {
    showToast,
    success: (title, msg) => showToast('success', title, msg),
    error: (title, msg) => showToast('error', title, msg),
    warning: (title, msg) => showToast('warning', title, msg),
    info: (title, msg) => showToast('info', title, msg),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map(t => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 10,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 14,
    paddingRight: 12,
    paddingLeft: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
    gap: 12,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  toastMessage: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
});
