// ─────────────────────────────────────────────────────────────────────────────
// SERVER CONFIG
// ─────────────────────────────────────────────────────────────────────────────
// Counter 1 (Server Machine) IP: 192.168.100.57
//
// Counter 2, 3, etc. setup:
//   1. Dono computers ek hi WiFi/LAN pe hone chahiye
//   2. Counter 2 ke browser mein yeh URL kholo:
//      http://192.168.100.57:5173
//   3. Bas! Sab data share hoga automatically
//
// Agar IP change ho jaye to sirf SERVER_IP update karo neeche:
// ─────────────────────────────────────────────────────────────────────────────

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.protocol === 'file:' ||
   window.location.hostname === '' ||
   navigator.userAgent.toLowerCase().includes('electron'));

const SERVER_IP = isLocal ? 'localhost' : (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
const SERVER_PORT = '5005';

export const SERVER_URL = `http://${SERVER_IP}:${SERVER_PORT}`;
export const API_BASE   = `${SERVER_URL}/api`;
export const WS_URL     = `${typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost'}:${SERVER_PORT}`;

