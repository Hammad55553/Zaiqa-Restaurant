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
export const GST_RATE = 16;

export const setServerIP = async (ip: string) => {
  serverIP = ip;
  const newUrls = getUrlsForIP(ip);
  API_BASE = newUrls.api;
  WS_URL = newUrls.ws;
  await AsyncStorage.setItem('SERVER_IP', ip);
};

export const loadServerIP = async () => {
  const ip = await AsyncStorage.getItem('SERVER_IP');
  if (ip) {
    serverIP = ip;
    const newUrls = getUrlsForIP(ip);
    API_BASE = newUrls.api;
    WS_URL = newUrls.ws;
  }
  return serverIP;
};
