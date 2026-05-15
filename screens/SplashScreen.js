// screens/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const WorkaFlowLogo = require('../assets/workaflow_icon.png');

// Pacific Indigo & Warm Gold palette
const Colors = {
  primary: '#1E3A6E',
  primaryDark: '#152C4F',
  gold: '#D49B3F',
  white: '#FFFFFF',
  textLight: '#F8FAFF',
  textMuted: '#94A3B8',
};

const SplashScreen = ({ onAnimationComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Glow appears
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Loading dots appear
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Hold for a moment
      Animated.delay(300),
    ]).start(() => {
      setTimeout(onAnimationComplete, 300);
    });
  }, []);

  const glowScale = glowOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.15],
  });

  const glowAlpha = glowOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primary}
        translucent
      />

      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative gold ring */}
        <View style={styles.decorRing} />

        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY },
              ],
            },
          ]}
        >
          {/* Glow behind the logo */}
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowAlpha,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          {/* Logo with indigo-to-gold gradient border */}
          <LinearGradient
            colors={[Colors.gold, '#B07D2E']}
            style={styles.logoBorderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.logoInner}>
              <Image
                source={WorkaFlowLogo}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>

          {/* Small gold accent dot */}
          <Animated.View
            style={[styles.accentDot, { opacity: glowAlpha }]}
          />
        </Animated.View>

        {/* App Name & Tagline */}
        <Animated.View
          style={[
            styles.textContainer,
            { opacity: fadeAnim, transform: [{ translateY }] },
          ]}
        >
          <Text style={styles.appName}>WorkaFlow</Text>
          <Text style={styles.tagline}>
            Get things done, anywhere in Ghana
          </Text>
        </Animated.View>

        {/* Loading Dots */}
        <Animated.View style={[styles.loadingContainer, { opacity: loaderOpacity }]}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: glowOpacity.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    {
                      translateY: glowOpacity.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, -6, 0],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  decorRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(212, 155, 63, 0.08)',
    top: -100,
    right: -100,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.gold,
    opacity: 0.3,
  },
  logoBorderGradient: {
    width: 130,
    height: 130,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 18,
  },
  logoInner: {
    width: 118,
    height: 118,
    borderRadius: 36,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  accentDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 2,
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  tagline: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    position: 'absolute',
    bottom: 60,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
});

export default SplashScreen;