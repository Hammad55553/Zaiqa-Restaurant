import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface LogoLoaderProps {
  size?: number;
}

export default function LogoLoader({ size = screenWidth * 0.75 }: LogoLoaderProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        source={require('../../assets/foodpre.json')}
        autoPlay
        loop
        renderMode="AUTOMATIC"
        style={styles.lottie}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  lottie: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});
