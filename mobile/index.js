/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';

// Register background message handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message received in background/killed state:', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
