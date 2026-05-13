import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const WorkaFlowLogo = require('../../assets/workaflow_icon.png');
const { width } = Dimensions.get('window');

const LoadingIndicator = ({
  size = 'medium',
  type = 'dots',          // 'spinner', 'pulse', 'dots', 'progress'
  text = 'Loading...',
  showLogo = true,
  backgroundColor = 'rgba(255, 255, 255, 0.98)',
  textColor = '#4F46E5',
  overlay = false,
  logoStyle = 'glow',     // 'breathe', 'glow', 'bounce', 'rotate' (only if showLogo)
  progress = 0,
  theme = 'default',       // 'default', 'dark', 'vibrant'
}) => {
  // ── Animation values ────────────────────────────────────────────
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const breatheValue = useRef(new Animated.Value(1)).current;
  const glowValue = useRef(new Animated.Value(0)).current;
  const bounceValue = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(new Animated.Value(0)).current;

  // Individual dot values for sequential wave
  const dotOpacity1 = useRef(new Animated.Value(0.3)).current;
  const dotOpacity2 = useRef(new Animated.Value(0.3)).current;
  const dotOpacity3 = useRef(new Animated.Value(0.3)).current;
  const dotTranslate1 = useRef(new Animated.Value(0)).current;
  const dotTranslate2 = useRef(new Animated.Value(0)).current;
  const dotTranslate3 = useRef(new Animated.Value(0)).current;

  // Theme colours
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

  // ── Logo animations ──────────────────────────────────────────────
  useEffect(() => {
    if (showLogo) {
      let anim;
      switch (logoStyle) {
        case 'breathe':
          anim = Animated.loop(
            Animated.sequence([
              Animated.timing(breatheValue, { toValue: 1.1, duration: 1000, easing: Easing.bezier(0.4,0,0.2,1), useNativeDriver: true }),
              Animated.timing(breatheValue, { toValue: 1, duration: 1000, easing: Easing.bezier(0.4,0,0.2,1), useNativeDriver: true }),
            ])
          );
          break;
        case 'glow':
          anim = Animated.loop(
            Animated.sequence([
              Animated.timing(glowValue, { toValue: 0.8, duration: 1200, easing: Easing.bezier(0.4,0,0.2,1), useNativeDriver: true }),
              Animated.timing(glowValue, { toValue: 0.2, duration: 1200, easing: Easing.bezier(0.4,0,0.2,1), useNativeDriver: true }),
            ])
          );
          break;
        case 'bounce':
          anim = Animated.loop(
            Animated.sequence([
              Animated.timing(bounceValue, { toValue: 1, duration: 500, easing: Easing.out(Easing.bounce), useNativeDriver: true }),
              Animated.timing(bounceValue, { toValue: 0, duration: 500, easing: Easing.in(Easing.bounce), useNativeDriver: true }),
            ])
          );
          break;
        case 'rotate':
          anim = Animated.loop(
            Animated.timing(rotateValue, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
          );
          break;
        default:
          anim = null;
      }
      if (anim) anim.start();
      return () => anim?.stop();
    }
  }, [showLogo, logoStyle]);

  // ── Spinner / pulse / progress animations (only used for those types)
  useEffect(() => {
    if (type === 'spinner') {
      const anim = Animated.loop(
        Animated.timing(spinValue, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
      );
      anim.start();
      return () => anim.stop();
    }
    if (type === 'pulse') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, { toValue: 1.15, duration: 700, easing: Easing.bezier(0.4,0,0.2,1), useNativeDriver: true }),
          Animated.timing(pulseValue, { toValue: 1, duration: 700, easing: Easing.bezier(0.4,0,0.2,1), useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
    if (type === 'progress') {
      Animated.timing(progressValue, {
        toValue: progress / 100,
        duration: 300,
        easing: Easing.bezier(0.4,0,0.2,1),
        useNativeDriver: false,
      }).start();
    }
  }, [type, progress]);

  // ── Dot wave animation (runs continuously) ───────────────────────
  useEffect(() => {
    if (type === 'dots') {
      const createWave = (value, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(value, { toValue: 1, duration: 400, easing: Easing.ease, useNativeDriver: true }),
            Animated.timing(value, { toValue: 0, duration: 400, easing: Easing.ease, useNativeDriver: true }),
          ])
        );
      };
      const anim1 = createWave(dotTranslate1, 0);
      const anim2 = createWave(dotTranslate2, 150);
      const anim3 = createWave(dotTranslate3, 300);
      anim1.start();
      anim2.start();
      anim3.start();
      return () => { anim1.stop(); anim2.stop(); anim3.stop(); };
    }
  }, [type]);

  // ── Interpolations ───────────────────────────────────────────────
  const spin = spinValue.interpolate({ inputRange: [0,1], outputRange: ['0deg','360deg'] });
  const bounce = bounceValue.interpolate({ inputRange: [0,1], outputRange: [0, -12] });
  const glowOpacity = glowValue.interpolate({ inputRange: [0,0.8], outputRange: [0.2,0.6] });
  const rotate = rotateValue.interpolate({ inputRange: [0,1], outputRange: ['0deg','360deg'] });
  const progressWidth = progressValue.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] });

  // ── Sizes ────────────────────────────────────────────────────────
  const getSize = () => { switch (size) { case 'small': return 48; case 'large': return 128; default: return 80; } };
  const getLogoSize = () => { switch (size) { case 'small': return 32; case 'large': return 80; default: return 56; } };
  const getFontSize = () => { switch (size) { case 'small': return 14; case 'large': return 20; default: return 16; } };

  // ── Logo rendering ───────────────────────────────────────────────
  const renderLogo = () => {
    const lSize = getLogoSize();
    const logoContent = (
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={[styles.logoGradient, {
          width: lSize * 2.4,
          height: lSize * 2.4,
          borderRadius: lSize * 0.7,
        }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={[styles.logoInnerContainer, {
          width: lSize * 2.2,
          height: lSize * 2.2,
          borderRadius: lSize * 0.55,
        }]}>
          <Image
            source={WorkaFlowLogo}
            style={[styles.logoImage, { width: lSize * 1.2, height: lSize * 1.2 }]}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>
    );

    switch (logoStyle) {
      case 'breathe': return <Animated.View style={{ transform: [{ scale: breatheValue }] }}>{logoContent}</Animated.View>;
      case 'glow':
        return (
          <View style={styles.glowLogoContainer}>
            <Animated.View style={[styles.glowEffect, {
              width: lSize * 2.8, height: lSize * 2.8, borderRadius: lSize * 1.4,
              opacity: glowOpacity, backgroundColor: colors.accent,
            }]} />
            {logoContent}
          </View>
        );
      case 'bounce': return <Animated.View style={{ transform: [{ translateY: bounce }] }}>{logoContent}</Animated.View>;
      case 'rotate': return <Animated.View style={{ transform: [{ rotate }] }}>{logoContent}</Animated.View>;
      default: return <Animated.View style={{ transform: [{ scale: pulseValue }] }}>{logoContent}</Animated.View>;
    }
  };

  // ── Content renderers ────────────────────────────────────────────
  const renderSpinner = () => (
    <View style={[styles.spinnerContainer, { width: getSize(), height: getSize() }]}>
      <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: spin }], borderColor: colors.accent }]}>
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.spinnerGradient} />
      </Animated.View>
      {showLogo && <View style={styles.logoContainer}>{renderLogo()}</View>}
    </View>
  );

  const renderPulse = () => (
    <View style={[styles.pulseContainer, { width: getSize(), height: getSize() }]}>
      <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseValue }], backgroundColor: `${colors.primary}20` }]} />
      <View style={[styles.pulseCircle, { backgroundColor: colors.primary }]}>
        {showLogo ? renderLogo() : <Ionicons name="sparkles" size={getSize() * 0.5} color="#FFFFFF" />}
      </View>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {showLogo && <View style={styles.dotsLogoContainer}>{renderLogo()}</View>}
      <View style={styles.dotsAnimationContainer}>
        <Animated.View style={[styles.dot, { backgroundColor: colors.accent, opacity: dotTranslate1.interpolate({ inputRange: [0,1], outputRange: [0.3,1] }), transform: [{ translateY: dotTranslate1.interpolate({ inputRange: [0,1], outputRange: [0, -8] }) }] }]} />
        <Animated.View style={[styles.dot, { backgroundColor: colors.accent, opacity: dotTranslate2.interpolate({ inputRange: [0,1], outputRange: [0.3,1] }), transform: [{ translateY: dotTranslate2.interpolate({ inputRange: [0,1], outputRange: [0, -8] }) }] }]} />
        <Animated.View style={[styles.dot, { backgroundColor: colors.accent, opacity: dotTranslate3.interpolate({ inputRange: [0,1], outputRange: [0.3,1] }), transform: [{ translateY: dotTranslate3.interpolate({ inputRange: [0,1], outputRange: [0, -8] }) }] }]} />
      </View>
    </View>
  );

  const renderProgress = () => (
    <View style={[styles.progressContainer, { width: getSize() * 2 }]}>
      {showLogo && <View style={styles.progressLogoContainer}>{renderLogo()}</View>}
      <View style={[styles.progressBar, { backgroundColor: `${colors.primary}20` }]}>
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.progressText, { color: colors.text, fontSize: getFontSize() }]}>
        {`${Math.round(progress)}%`}
      </Text>
    </View>
  );

  const renderContent = () => {
    switch (type) {
      case 'spinner': return renderSpinner();
      case 'pulse':   return renderPulse();
      case 'progress':return renderProgress();
      default:        return renderDots();  // dots is now the default
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
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.98)' },
  content: { alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  // Logo
  logoGradient: { justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 },
  logoInnerContainer: { backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  glowLogoContainer: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  glowEffect: { position: 'absolute', zIndex: -1, shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12 },
  logoContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  // Spinner
  spinnerContainer: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  spinnerRing: { position: 'absolute', width: '100%', height: '100%', borderRadius: 9999, borderWidth: 4, borderColor: 'transparent' },
  spinnerGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 9999 },
  // Pulse
  pulseContainer: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  pulseCircle: { width: '70%', height: '70%', borderRadius: 9999, justifyContent: 'center', alignItems: 'center', zIndex: 2, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  pulseRing: { position: 'absolute', width: '100%', height: '100%', borderRadius: 9999, zIndex: 1 },
  // Dots
  dotsContainer: { alignItems: 'center', justifyContent: 'center' },
  dotsLogoContainer: { marginBottom: 20 },
  dotsAnimationContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48 },
  dot: { width: 12, height: 12, borderRadius: 6, marginHorizontal: 6 },
  // Progress
  progressContainer: { alignItems: 'center', justifyContent: 'center' },
  progressLogoContainer: { marginBottom: 16 },
  progressBar: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { marginTop: 12, fontWeight: '700', textAlign: 'center' },
  text: { marginTop: 20, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
});

export default LoadingIndicator;