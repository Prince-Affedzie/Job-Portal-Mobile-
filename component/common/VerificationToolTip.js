// components/common/VerificationTooltip.js
import React, { useContext, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Linking,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const VERIFICATION_FORM_URL = 'https://forms.gle/iF4MZ6RiBcUseJmR9';

const VerificationTooltip = ({ 
  placement = 'right', // 'right', 'left'
  offset = 16,
  autoShow = true,
  showOn = ['job_seeker'],
  maxWidth = 280, // Slimmer width
  persistUntilVerified = true,
  onDismiss,
  shadow = true,
}) => {
  const { user } = useContext(AuthContext);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Check if user should see the tooltip
  const shouldShowTooltip = () => {
    if (!user) return false;
    
    const userType = user.role || user.userType;
    if (!showOn.includes(userType)) return false;
    
    const isVerified = user.isVerified || user.verified || user.verificationStatus === 'verified';
    
    if (isVerified && persistUntilVerified) return false;
    if (dismissed && !persistUntilVerified) return false;
    
    return true;
  };

  useEffect(() => {
    if (autoShow && shouldShowTooltip()) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        showTooltip();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, autoShow]);

  const showTooltip = () => {
    setVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideTooltip = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setDismissed(true);
      if (onDismiss) onDismiss();
    });
  };

  const handleVerifyNow = async () => {
    try {
      const supported = await Linking.canOpenURL(VERIFICATION_FORM_URL);
      if (supported) {
        await Linking.openURL(VERIFICATION_FORM_URL);
        hideTooltip();
      }
    } catch (error) {
      console.error('Error opening verification form:', error);
    }
  };

  const handleSkip = () => {
    hideTooltip();
  };

  // Calculate animation based on placement
  const getAnimationValues = () => {
    const isRight = placement === 'right';
    return {
      translateX: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [isRight ? 30 : -30, 0],
      }),
      [isRight ? 'right' : 'left']: offset,
      top: height * 0.4, // Positioned more vertically centered
    };
  };

  if (!visible || !user) return null;

  const animationValues = getAnimationValues();
  const isRight = placement === 'right';

  return (
    <Animated.View
      style={[
        styles.tooltipContainer,
        {
          opacity: opacityAnim,
          transform: [{ translateX: animationValues.translateX }],
          maxWidth,
          width: maxWidth, // Fixed width for consistency
          ...animationValues,
          ...(shadow && styles.shadow),
        },
      ]}
    >
      {/* Slim arrow pointing to edge */}
      <View style={[
        styles.tooltipArrow,
        isRight ? styles.arrowLeft : styles.arrowRight,
      ]} />
      
      {/* Compact Tooltip Content */}
      <View style={styles.tooltipContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Verify Account</Text>
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={hideTooltip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        
        {/* Short description */}
        <Text style={styles.description}>
          Verify your skills to be able to apply and access premium jobs and build client trust.
        </Text>
        
        {/* Benefits - compact layout */}
        <View style={styles.benefits}>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.benefitText}>Higher acceptance rate</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.benefitText}>Premium job access</Text>
          </View>
        </View>
        
        {/* Action buttons - stacked vertically */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn]}
            onPress={handleVerifyNow}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryBtnText}>Start Verification</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.btn, styles.secondaryBtn]}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Remind later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tooltipContainer: {
    position: 'absolute',
    zIndex: 9999,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipArrow: {
    position: 'absolute',
    top: 24,
    width: 0,
    height: 0,
    borderStyle: 'solid',
  },
  arrowLeft: {
    left: -8,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#FFFFFF',
  },
  arrowRight: {
    right: -8,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  tooltipContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  benefits: {
    marginBottom: 16,
    gap: 6,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benefitText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  actions: {
    gap: 8,
  },
  btn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#6366F1',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  secondaryBtnText: {
    color: '#64748B',
    fontWeight: '500',
    fontSize: 13,
  },
});

export default VerificationTooltip;