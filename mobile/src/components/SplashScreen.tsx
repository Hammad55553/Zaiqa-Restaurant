import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Image, Dimensions, Animated, Easing, StatusBar } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [animationState, setAnimationState] = useState<'loading' | 'cinematic'>('loading');

  // Unified animated value for cinematic transition
  const transitionVal = useRef(new Animated.Value(0)).current;
  const logoPulseVal = useRef(new Animated.Value(1)).current;

  // Pulse effect during loading phase
  useEffect(() => {
    if (animationState === 'loading') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulseVal, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(logoPulseVal, {
            toValue: 1,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      logoPulseVal.setValue(1);
    }
  }, [animationState]);

  // Loading progress simulation
  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        clearInterval(interval);

        // Transition to Cinematic
        setAnimationState('cinematic');
        
        // Single robust animation that drives everything
        Animated.timing(transitionVal, {
          toValue: 1,
          duration: 1400,
          easing: Easing.bezier(0.25, 1, 0.5, 1),
          useNativeDriver: true,
        }).start(() => {
          if (onComplete) onComplete();
        });
      } else {
        setProgress(currentProgress);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Interpolate cinematic effects from the single timeline value
  const textFadeVal = transitionVal.interpolate({
    inputRange: [0, 0.25],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const logoScaleVal = transitionVal.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [1, 1, 24],
    extrapolate: 'clamp',
  });

  const rotateYInterpolate = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
    extrapolate: 'clamp',
  });

  const logoOpacityVal = transitionVal.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Light background tech grid simulation */}
      <View style={styles.gridOverlay} />

      {/* Culinary glowing backlight */}
      <View style={styles.backlight} />

      {/* Main pulsing and zooming logo container */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: animationState === 'loading' ? logoPulseVal : logoScaleVal },
              { rotateY: rotateYInterpolate },
            ],
            opacity: logoOpacityVal,
          },
        ]}
      >
        <View style={styles.coinBorder}>
          <Image
            source={require('../../assets/Logo.jpg')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
      </Animated.View>

      {/* Brand Text Wrapper */}
      <Animated.View style={[styles.textWrapper, { opacity: textFadeVal }]}>
        <Text style={styles.titleText}>ZAIQA MAHAL</Text>
        <Text style={styles.subtitleText}>POINT OF SALE SYSTEM</Text>
      </Animated.View>

      {/* Loading Progress Bar Container */}
      <Animated.View style={[styles.loadingWrapper, { opacity: textFadeVal }]}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Loading Assets</Text>
          <Text style={styles.progressPercentage}>{progress}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backlight: {
    position: 'absolute',
    width: screenWidth * 1.5,
    height: screenWidth * 1.5,
    borderRadius: screenWidth,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  logoContainer: {
    zIndex: 10,
    marginBottom: 40,
  },
  coinBorder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: '#f97316',
    backgroundColor: '#ffffff',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
  },
  textWrapper: {
    alignItems: 'center',
    zIndex: 5,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
  },
  subtitleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 3,
    marginTop: 6,
    marginBottom: 40,
  },
  loadingWrapper: {
    width: 280,
    zIndex: 5,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  progressPercentage: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f97316',
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    padding: 1.5,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 4,
  },
});
