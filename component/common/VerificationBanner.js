// components/common/VerificationBanner.js - Adjusted Top Position (Pushed Down)
import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const VERIFICATION_FORM_URL = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform';

const VerificationBanner = ({ 
  showCloseButton = true,
  autoHideDuration = 10000, // Auto-hide after 10 seconds
}) => {
  const { user } = useContext(AuthContext);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current; // Start off-screen top

  useEffect(() => {
    const shouldShow = () => {
      if (!user) return false;
      const userType = user.role || user.userType;
      const isVerified = user.isVerified || user.verified;
      return userType === 'job_seeker' && !isVerified;
    };

    if (shouldShow()) {
      setVisible(true);
      
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();

      if (autoHideDuration) {
        const timer = setTimeout(() => hideBanner(), autoHideDuration);
        return () => clearTimeout(timer);
      }
    }
  }, [user, autoHideDuration]);

  const hideBanner = () => {
    Animated.spring(translateY, {
      toValue: -100,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const handleVerifyNow = async () => {
    try {
      await Linking.openURL(VERIFICATION_FORM_URL);
      hideBanner();
    } catch (error) {
      console.error('Error opening verification form:', error);
    }
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={styles.content}>
        <View style={styles.textSection}>
          <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          <View style={styles.textWrapper}>
            <Text style={styles.title}>Skill Verification Required</Text>
            <Text style={styles.subtitle}>Unlock premium features by verifying your skills</Text>
          </View>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.button} onPress={handleVerifyNow}>
            <Text style={styles.buttonText}>Start Now</Text>
          </TouchableOpacity>

          {showCloseButton && (
            <TouchableOpacity onPress={hideBanner} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,                  // Stick to very top
    left: 0,
    right: 0,
    backgroundColor: '#6366F1',
    paddingTop: 40,
    paddingHorizontal:8,          // ← KEY CHANGE: Pushes content down ~50px (adjust as needed)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 16,       // Extra bottom padding for balance
  },
  textSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  textWrapper: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VerificationBanner;