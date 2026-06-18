import AsyncStorage from '@react-native-async-storage/async-storage';

export let serverIP = '10.65.43.124'; // fallback default IP

const getUrlsForIP = (ip: string) => {
  const cleanIp = ip.trim();
  if (cleanIp.startsWith('http://') || cleanIp.startsWith('https://')) {
    const isHttps = cleanIp.startsWith('https://');
    return {
      api: cleanIp.endsWith('/') ? `${cleanIp}api` : `${cleanIp}/api`,
      ws: cleanIp.replace('http://', 'ws://').replace('https://', 'wss://')
    };
  }
  
  if (cleanIp.includes('.') && !/^[0-9.]+$/.test(cleanIp)) {
    // Domain name (e.g. zaiqah-pos.onrender.com)
    return {
      api: `https://${cleanIp}/api`,
      ws: `wss://${cleanIp}`
    };
  }

  // Raw IP Address (local network)
  return {
    api: `http://${cleanIp}:5005/api`,
    ws: `ws://${cleanIp}:5005`
  };
};

const urls = getUrlsForIP(serverIP);
export let API_BASE = urls.api;
export let WS_URL = urls.ws;
export let GST_RATE = 0;

export const setServerIP = async (ip: string) => {
  serverIP = ip;
  const newUrls = getUrlsForIP(ip);
  API_BASE = newUrls.api;
  WS_URL = newUrls.ws;
  await AsyncStorage.setItem('SERVER_IP', ip);
  await loadServerSettings();
};

export const loadServerSettings = async () => {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    if (res.ok) {
      const settings = await res.json();
      if (settings.global_gst_rate !== undefined) {
        GST_RATE = parseFloat(settings.global_gst_rate);
        await AsyncStorage.setItem('GST_RATE', String(GST_RATE));
      }
    }
  } catch (e) {
    const cachedGst = await AsyncStorage.getItem('GST_RATE');
    if (cachedGst) {
      GST_RATE = parseFloat(cachedGst);
    }
  }
};

export const loadServerIP = async () => {
  const ip = await AsyncStorage.getItem('SERVER_IP');
  if (ip) {
    serverIP = ip;
    const newUrls = getUrlsForIP(ip);
    API_BASE = newUrls.api;
    WS_URL = newUrls.ws;
  }
  const cachedGst = await AsyncStorage.getItem('GST_RATE');
  if (cachedGst) {
    GST_RATE = parseFloat(cachedGst);
  }
  // Try to refresh from server in background
  loadServerSettings();
  return serverIP;
};
