import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const WorkaFlowLogo = require('../../assets/Logominimal(2).png');
const { width, height } = Dimensions.get('window');

const LoadingIndicator = ({
  size = 'medium',
  type = 'dots', // 'spinner', 'pulse', 'dots', 'progress'
  text = 'Loading...',
  showLogo = true,
  backgroundColor = 'rgba(255, 255, 255, 0.98)',
  textColor = '#4F46E5',
  overlay = false,
  logoStyle = 'breathe', // 'breathe', 'pulse', 'glow', 'bounce', 'rotate'
  progress = 0, // For progress bar (0-100)
  theme = 'default', // 'default', 'dark', 'vibrant'
}) => {
  const spinValue = new Animated.Value(0);
  const pulseValue = new Animated.Value(1);
  const breatheValue = new Animated.Value(1);
  const glowValue = new Animated.Value(0);
  const bounceValue = new Animated.Value(0);
  const rotateValue = new Animated.Value(0);
  const progressValue = new Animated.Value(0);

  // Theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'dark':
        return {
          primary: '#1F2937',
          secondary: '#4B5563',
          accent: '#60A5FA',
          text: '#F3F4F6',
        };
      case 'vibrant':
        return {
          primary: '#EC4899',
          secondary: '#F59E0B',
          accent: '#10B981',
          text: '#FFFFFF',
        };
      default:
        return {
          primary: '#4F46E5',
          secondary: '#4A4F8C',
          accent: '#2D325D',
          text: textColor,
        };
    }
  };

  const colors = getThemeColors();

  // Breathe animation
  React.useEffect(() => {
    if (showLogo && logoStyle === 'breathe') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheValue, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(breatheValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showLogo, logoStyle]);

  // Glow animation
  React.useEffect(() => {
    if (showLogo && logoStyle === 'glow') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowValue, {
            toValue: 0.8,
            duration: 1200,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(glowValue, {
            toValue: 0.2,
            duration: 1200,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showLogo, logoStyle]);

  // Bounce animation
  React.useEffect(() => {
    if (showLogo && logoStyle === 'bounce') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceValue, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.bounce),
            useNativeDriver: true,
          }),
          Animated.timing(bounceValue, {
            toValue: 0,
            duration: 500,
            easing: Easing.in(Easing.bounce),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showLogo, logoStyle]);

  // Rotate animation
  React.useEffect(() => {
    if (showLogo && logoStyle === 'rotate') {
      Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [showLogo, logoStyle]);

  // Spinner animation
  React.useEffect(() => {
    if (type === 'spinner') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [type]);

  // Pulse animation
  React.useEffect(() => {
    if (type === 'pulse' || logoStyle === 'pulse') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.15,
            duration: 700,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 700,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [type, logoStyle]);

  // Progress animation
  React.useEffect(() => {
    if (type === 'progress') {
      Animated.timing(progressValue, {
        toValue: progress / 100,
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }).start();
    }
  }, [progress, type]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bounce = bounceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const glowOpacity = glowValue.interpolate({
    inputRange: [0, 0.8],
    outputRange: [0.2, 0.6],
  });

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const getSize = () => {
    switch (size) {
      case 'small': return 48;
      case 'large': return 128;
      case 'medium':
      default: return 80;
    }
  };

  const getLogoSize = () => {
    switch (size) {
      case 'small': return 32;
      case 'large': return 80;
      case 'medium':
      default: return 56;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'large': return 20;
      case 'medium':
      default: return 16;
    }
  };

  const renderLogo = () => {
    const logoSize = getLogoSize();
    
    const logoContent = (
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={[
          styles.logoGradient,
          {
            width: logoSize * 2.4,
            height: logoSize * 2.4,
            borderRadius: logoSize * 0.7,
          }
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[
          styles.logoInnerContainer,
          {
            width: logoSize * 2.2,
            height: logoSize * 2.2,
            borderRadius: logoSize * 0.55,
          }
        ]}>
          <Image 
            source={WorkaFlowLogo} 
            style={[
              styles.logoImage,
              {
                width: logoSize * 1.2,
                height: logoSize * 1.2,
              }
            ]}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>
    );

    switch (logoStyle) {
      case 'breathe':
        return (
          <Animated.View style={{ transform: [{ scale: breatheValue }] }}>
            {logoContent}
          </Animated.View>
        );
      case 'glow':
        return (
          <View style={styles.glowLogoContainer}>
            <Animated.View 
              style={[
                styles.glowEffect,
                {
                  width: logoSize * 2.8,
                  height: logoSize * 2.8,
                  borderRadius: logoSize * 1.4,
                  opacity: glowOpacity,
                  backgroundColor: colors.accent,
                }
              ]} 
            />
            {logoContent}
          </View>
        );
      case 'bounce':
        return (
          <Animated.View style={{ transform: [{ translateY: bounce }] }}>
            {logoContent}
          </Animated.View>
        );
      case 'rotate':
        return (
          <Animated.View style={{ transform: [{ rotate }] }}>
            {logoContent}
          </Animated.View>
        );
      case 'pulse':
      default:
        return (
          <Animated.View style={{ transform: [{ scale: pulseValue }] }}>
            {logoContent}
          </Animated.View>
        );
    }
  };

  const renderSpinner = () => (
    <View style={[
      styles.spinnerContainer,
      {
        width: getSize(),
        height: getSize(),
      },
    ]}>
      <Animated.View
        style={[
          styles.spinnerRing,
          { transform: [{ rotate: spin }], borderColor: colors.accent }
        ]}
      >
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.spinnerGradient}
        />
      </Animated.View>
      {showLogo && (
        <View style={styles.logoContainer}>
          {renderLogo()}
        </View>
      )}
    </View>
  );

  const renderPulse = () => (
    <View style={[
      styles.pulseContainer,
      {
        width: getSize(),
        height: getSize(),
      },
    ]}>
      <Animated.View
        style={[
          styles.pulseRing,
          { 
            transform: [{ scale: pulseValue }], 
            backgroundColor: `rgba(${parseInt(colors.primary.slice(1,3), 16)},${parseInt(colors.primary.slice(3,5), 16)},${parseInt(colors.primary.slice(5,7), 16)},0.2)` 
          }
        ]}
      />
      <View style={[styles.pulseCircle, { backgroundColor: colors.primary }]}>
        {showLogo ? renderLogo() : (
          <Ionicons name="sparkles" size={getSize() * 0.5} color="#FFFFFF" />
        )}
      </View>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {showLogo && (
        <View style={styles.dotsLogoContainer}>
          {renderLogo()}
        </View>
      )}
      <View style={styles.dotsAnimationContainer}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: colors.accent,
                transform: [
                  {
                    scale: pulseValue.interpolate({
                      inputRange: [1, 1.15],
                      outputRange: [1, 1.4],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  const renderProgress = () => (
    <View style={[styles.progressContainer, { width: getSize() * 2 }]}>
      {showLogo && (
        <View style={styles.progressLogoContainer}>
          {renderLogo()}
        </View>
      )}
      <View style={[styles.progressBar, { backgroundColor: `rgba(${parseInt(colors.primary.slice(1,3), 16)},${parseInt(colors.primary.slice(3,5), 16)},${parseInt(colors.primary.slice(5,7), 16)},0.2)` }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressWidth,
              backgroundColor: colors.primary,
            }
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: colors.text, fontSize: getFontSize() }]}>
        {`${Math.round(progress)}%`}
      </Text>
    </View>
  );

  const renderContent = () => {
    switch (type) {
      case 'pulse':
        return renderPulse();
      case 'dots':
        return renderDots();
      case 'progress':
        return renderProgress();
      case 'spinner':
      default:
        return renderSpinner();
    }
  };

  const containerStyle = [
    styles.container,
    overlay && styles.overlayContainer,
    overlay && { backgroundColor },
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.content}>
        {renderContent()}
        {text && type !== 'progress' && (
          <Text style={[styles.text, { color: colors.text, fontSize: getFontSize() }]}>
            {text}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Logo Styles
  logoGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  logoInnerContainer: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  glowLogoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    zIndex: -1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  logoContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Spinner Styles
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  spinnerRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  spinnerGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
  },
  // Pulse Styles
  pulseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseCircle: {
    width: '70%',
    height: '70%',
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pulseRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    zIndex: 1,
  },
  // Dots Styles
  dotsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsLogoContainer: {
    marginBottom: 20,
  },
  dotsAnimationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  // Progress Styles
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLogoContainer: {
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 12,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'System',
  },
  text: {
    marginTop: 20,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
});

export default LoadingIndicator;