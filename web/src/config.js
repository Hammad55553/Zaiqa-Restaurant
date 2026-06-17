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

let savedIP = '';
if (typeof window !== 'undefined' && window.localStorage) {
  savedIP = window.localStorage.getItem('zaiqa_server_ip') || '';
}

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.protocol === 'file:' ||
   window.location.hostname === '' ||
   navigator.userAgent.toLowerCase().includes('electron'));

const SERVER_IP = savedIP || (isLocal ? 'localhost' : (typeof window !== 'undefined' ? window.location.hostname : 'localhost'));

const getUrls = (ip) => {
  const cleanIp = ip.trim();
  if (cleanIp.startsWith('http://') || cleanIp.startsWith('https://')) {
    return {
      server: cleanIp,
      api: cleanIp.endsWith('/') ? `${cleanIp}api` : `${cleanIp}/api`,
      ws: cleanIp.replace('http://', 'ws://').replace('https://', 'wss://')
    };
  }
  
  if (cleanIp.includes('.') && !/^[0-9.]+$/.test(cleanIp) && cleanIp !== 'localhost' && cleanIp !== '127.0.0.1') {
    // Hosted Domain (e.g. zaiqa-pos.onrender.com)
    return {
      server: `https://${cleanIp}`,
      api: `https://${cleanIp}/api`,
      ws: `wss://${cleanIp}`
    };
  }

  // Local IP or localhost
  return {
    server: `http://${cleanIp}:5005`,
    api: `http://${cleanIp}:5005/api`,
    ws: `${typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${cleanIp}:5005`
  };
};

const configUrls = getUrls(SERVER_IP);

export const SERVER_URL = configUrls.server;
export const API_BASE   = configUrls.api;
export const WS_URL     = configUrls.ws;

