// components/client/BookNowFAB.js
import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * BookNowFAB
 *
 * Props:
 *  - tasker       {object|null}  The currently selected tasker (null = hidden)
 *  - onPress      {function}     Called when the button is pressed → navigate to Booking
 *  - isVisible    {bool}         Convenience override (defaults to !!tasker)
 */
const BookNowFAB = ({ tasker, onPress, isVisible }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const visible = isVisible !== undefined ? isVisible : !!tasker;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: visible ? 1 : 0.85,
        damping: 18,
        stiffness: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  // Pulse when tasker changes (new selection)
  useEffect(() => {
    if (!tasker) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.04, duration: 120, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, damping: 14, stiffness: 200, useNativeDriver: true }),
    ]).start();
  }, [tasker?._id]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        style={styles.fabTouchable}
        onPress={onPress}
        activeOpacity={0.88}
      >
        {/* Tasker mini-avatar */}
        {tasker?.brandBanner ||tasker?.profileImage ? (
          <Image
            source={{ uri:  tasker.brandBanner || tasker.profileImage }}
            style={styles.taskerAvatar}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={18} color="#FFFFFF" />
          </View>
        )}

        <View style={styles.labelGroup}>
          <Text style={styles.fabLabel}>Book Now</Text>
          <Text style={styles.fabSubLabel} numberOfLines={1}>
            {tasker?.businessName || 'Selected Tasker'}
          </Text>
        </View>

        <View style={styles.arrowWrap}>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    right: 20,
    zIndex: 1000,
    borderRadius: 18,
    backgroundColor: '#0F1729',
    // Shadow
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  fabTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 14,
  },
  taskerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelGroup: {
    flex: 1,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  fabSubLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
  },
  arrowWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BookNowFAB;