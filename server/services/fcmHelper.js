// ARCHITECTURE NOTE: Firebase Admin SDK is used ONLY to broadcast push notifications (FCM) for the group chat.
// All transactional databases and cloud syncing operations are handled exclusively by Supabase.

const fs = require('fs');
const path = require('path');

let admin = null;
const serviceAccountPath = path.resolve(__dirname, '../config/firebase-service-account.json');

if (fs.existsSync(serviceAccountPath)) {
  try {
    const adminSDK = require('firebase-admin');
    const serviceAccount = require(serviceAccountPath);
    adminSDK.initializeApp({
      credential: adminSDK.cert(serviceAccount)
    });
    admin = adminSDK;
    console.log('🔥 Firebase Admin initialized successfully for FCM.');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin:', err.message);
  }
} else {
  console.log('📡 FCM Info: firebase-service-account.json not found. Skipping Firebase push notifications.');
}

/**
 * Send a push notification to a topic or specific token.
 * Falls back gracefully if FCM is not configured.
 * @param {object} messagePayload - The push message config
 */
async function sendPushNotification(messagePayload) {
  if (!admin) {
    console.log(`📡 FCM Push stubbed. Message: "${messagePayload.notification?.title || 'Notification'}"`);
    return;
  }

  try {
    const response = await admin.messaging().send(messagePayload);
    console.log('✅ FCM Push Notification sent successfully:', response);
    return response;
  } catch (err) {
    console.error('❌ Failed to send FCM Push Notification:', err.message);
  }
}

/**
 * Broadcast a chat message push notification.
 * @param {string} sender 
 * @param {string} text 
 */
function broadcastChatNotification(sender, text) {
  const payload = {
    topic: 'chat',
    notification: {
      title: `Message from ${sender} 💬`,
      body: text.length > 50 ? `${text.substring(0, 47)}...` : text,
    },
    data: {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      type: 'chat_message',
      sender,
      text,
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'chat_channel',
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  return sendPushNotification(payload);
}

module.exports = {
  sendPushNotification,
  broadcastChatNotification
};
