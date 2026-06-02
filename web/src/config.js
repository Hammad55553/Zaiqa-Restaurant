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

const SERVER_IP   = '192.168.100.57';
const SERVER_PORT = '5005';

export const SERVER_URL = `http://${SERVER_IP}:${SERVER_PORT}`;
export const API_BASE   = `${SERVER_URL}/api`;
