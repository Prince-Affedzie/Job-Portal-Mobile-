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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const WorkaFlowLogo = require('../assets/Logominimal(2).png');

const SplashScreen = ({ onAnimationComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence of animations
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
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      
      // Glow effect
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      
      // Hold for a moment
      Animated.delay(500),
      
      // Complete and transition
    ]).start(() => {
      // Call completion callback after animations
      setTimeout(onAnimationComplete, 300);
    });
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#1A1F3B" 
        translucent 
      />
      
      <LinearGradient
        colors={['#1A1F3B', '#2D325D', '#1A1F3B']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Animated Logo Container */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ],
            },
          ]}
        >
          {/* Outer Glow Effect */}
          <Animated.View 
            style={[
              styles.glowEffect,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2]
                })}]
              }
            ]} 
          />
          
          {/* Main Logo Gradient */}
          <LinearGradient
            colors={['#667eea', '#764ba2', '#667eea']}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.logoInnerContainer}>
              <Image 
                source={WorkaFlowLogo} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
          
          {/* Subtle Particles/Dots */}
          <View style={styles.particlesContainer}>
            {[0, 1, 2, 3].map((item) => (
              <Animated.View
                key={item}
                style={[
                  styles.particle,
                  {
                    opacity: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.6]
                    }),
                    transform: [
                      { 
                        translateY: glowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -10]
                        })
                      }
                    ]
                  }
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* App Name */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim }
              ],
            },
          ]}
        >
          <Text style={styles.appName}>WORKAFLOW</Text>
          <Text style={styles.tagline}>Where Talent Meets Opportunity</Text>
        </Animated.View>

        {/* Loading Indicator */}
        <Animated.View
          style={[
            styles.loadingContainer,
            {
              opacity: glowAnim,
            },
          ]}
        >
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.loadingDot,
                  {
                    transform: [
                      {
                        scale: glowAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [1, 1.5, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
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
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 40,
  },
  glowEffect: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#667eea',
    zIndex: -1,
  },
  logoGradient: {
    width: 140,
    height: 140,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  logoInnerContainer: {
    width: 128,
    height: 128,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  particlesContainer: {
    position: 'absolute',
    top: -20,
    flexDirection: 'row',
    gap: 8,
  },
  particle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default SplashScreen;