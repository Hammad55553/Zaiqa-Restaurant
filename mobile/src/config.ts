import AsyncStorage from '@react-native-async-storage/async-storage';

export let serverIP = '10.65.43.124'; // fallback default IP

export let API_BASE = `http://${serverIP}:5005/api`;
export let WS_URL = `ws://${serverIP}:5005`;
export const GST_RATE = 16;

export const setServerIP = async (ip: string) => {
  serverIP = ip;
  API_BASE = `http://${ip}:5005/api`;
  WS_URL = `ws://${ip}:5005`;
  await AsyncStorage.setItem('SERVER_IP', ip);
};

export const loadServerIP = async () => {
  const ip = await AsyncStorage.getItem('SERVER_IP');
  if (ip) {
    serverIP = ip;
    API_BASE = `http://${ip}:5005/api`;
    WS_URL = `ws://${ip}:5005`;
  }
  return serverIP;
};
