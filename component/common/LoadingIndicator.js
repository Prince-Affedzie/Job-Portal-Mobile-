// components/LoadingIndicator.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const LoadingIndicator = ({
  size = 'medium',
  type = 'spinner',
  text = 'Loading...',
  showLogo = true,
  backgroundColor = 'rgba(255, 255, 255, 0.95)',
  textColor = '#6366F1',
  overlay = false,
}) => {
  const spinValue = new Animated.Value(0);
  const pulseValue = new Animated.Value(1);

  // Spinning animation
  React.useEffect(() => {
    if (type === 'spinner') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [type]);

  // Pulsing animation
  React.useEffect(() => {
    if (type === 'pulse') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [type]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getSize = () => {
    switch (size) {
      case 'small': return 40;
      case 'large': return 120;
      case 'medium':
      default: return 80;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 12;
      case 'large': return 18;
      case 'medium':
      default: return 14;
    }
  };

  const renderSpinner = () => (
    <Animated.View
      style={[
        styles.spinnerContainer,
        {
          width: getSize(),
          height: getSize(),
          transform: [{ rotate: spin }],
        },
      ]}
    >
      <View style={[styles.spinnerRing, styles.spinnerRingOuter]}>
        <View style={[styles.spinnerSegment, styles.spinnerSegmentPrimary]} />
        <View style={[styles.spinnerSegment, styles.spinnerSegmentSecondary]} />
        <View style={[styles.spinnerSegment, styles.spinnerSegmentAccent]} />
      </View>
      {showLogo && (
        <View style={styles.logoContainer}>
          <Ionicons name="chatbubbles" size={getSize() * 0.4} color="#6366F1" />
        </View>
      )}
    </Animated.View>
  );

  const renderPulse = () => (
    <Animated.View
      style={[
        styles.pulseContainer,
        {
          width: getSize(),
          height: getSize(),
          transform: [{ scale: pulseValue }],
        },
      ]}
    >
      <View style={styles.pulseCircle}>
        <Ionicons name="work-outline" size={getSize() * 0.5} color="#FFFFFF" />
      </View>
      <View style={styles.pulseRing} />
    </Animated.View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: textColor,
              transform: [
                {
                  scale: pulseValue.interpolate({
                    inputRange: [1, 1.2],
                    outputRange: [1, 1.5],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );

  const renderContent = () => {
    switch (type) {
      case 'pulse':
        return renderPulse();
      case 'dots':
        return renderDots();
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
        {text && (
          <Text style={[styles.text, { color: textColor, fontSize: getFontSize() }]}>
            {text}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // Changed from padding: 20 to flex: 1
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 50,
  },
  spinnerRingOuter: {
    borderWidth: 3,
    borderColor: 'transparent',
  },
  spinnerSegment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderLeftColor: '#6366F1',
    borderTopColor: '#6366F1',
  },
  spinnerSegmentPrimary: {
    borderLeftColor: '#6366F1',
    borderTopColor: '#6366F1',
  },
  spinnerSegmentSecondary: {
    transform: [{ rotate: '120deg' }],
    borderLeftColor: '#8B5CF6',
    borderTopColor: '#8B5CF6',
  },
  spinnerSegmentAccent: {
    transform: [{ rotate: '240deg' }],
    borderLeftColor: '#10B981',
    borderTopColor: '#10B981',
  },
  logoContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Pulse Styles
  pulseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseCircle: {
    width: '60%',
    height: '60%',
    borderRadius: 50,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    zIndex: 1,
  },
  // Dots Styles
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  text: {
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'System',
  },
});

export default LoadingIndicator;