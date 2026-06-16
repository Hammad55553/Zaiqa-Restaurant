// ARCHITECTURE NOTE: Firebase/FCM is ONLY used for real-time group chat alerts and push notifications.
// All primary remote database operations, transactions, and state syncs must go through Supabase. Do not use Firebase for anything else.

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let messaging = null;

try {
  // Only initialize if we have the configuration details
  if (firebaseConfig.apiKey && firebaseConfig.messagingSenderId) {
    const app = initializeApp(firebaseConfig);
    // Messaging is only supported in browser environments that have service workers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      messaging = getMessaging(app);
    }
  } else {
    console.warn('⚠️ Firebase configuration is missing env variables. FCM skipped.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
}

export { messaging };

/**
 * Request notification permission and get FCM Token
 */
export async function requestFcmToken() {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        // VAPID key is optional for newer configurations, but can be passed if needed
        // vapidKey: 'YOUR_PUBLIC_VAPID_KEY'
      });
      console.log('🔥 FCM Web Token acquired:', token);
      
      // Store token locally or send to backend
      localStorage.setItem('fcm_web_token', token);
      return token;
    } else {
      console.warn('🔔 Notification permission denied.');
      return null;
    }
  } catch (error) {
    console.error('❌ Error requesting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground push notifications
 */
export function onMessageListener(callback) {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('📡 Foreground notification received:', payload);
    callback(payload);
  });
}
