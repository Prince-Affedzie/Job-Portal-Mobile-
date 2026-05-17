// component/common/PaymentSafetyBanner.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Colors = {
  amber: '#D49B3F',        // warm gold
  amberBg: '#FCF3E1',
  amberDark: '#5C3D10',
  white: '#FFFFFF',
};

const DISMISS_KEY = 'payment_safety_banner_dismissed';
const COOLDOWN_DAYS = 30;

export default function TaskerPaymentSafetyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DISMISS_KEY);
        if (!raw) return setVisible(true);
        const dismissed = JSON.parse(raw);
        if ((Date.now() - dismissed.timestamp) / 86400000 >= COOLDOWN_DAYS) {
          await AsyncStorage.removeItem(DISMISS_KEY);
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    })();
  }, []);

  const dismiss = async () => {
    await AsyncStorage.setItem(DISMISS_KEY, JSON.stringify({ timestamp: Date.now() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Ionicons name="shield-checkmark-outline" size={14} color={Colors.amberDark} style={{ marginRight: 6 }} />
        <Text style={styles.text} numberOfLines={2}>
          Never pay any money to anyone to secure a gig.
        </Text>
        <TouchableOpacity style={styles.gotIt} onPress={dismiss} activeOpacity={0.8}>
          <Text style={styles.gotItText}>Got it</Text>
        </TouchableOpacity>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={dismiss}>
          <Ionicons name="close" size={16} color={Colors.amberDark} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.amberBg,
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.amber + '30',
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: Colors.amberDark,
    lineHeight: 17,
    marginRight: 8,
  },
  gotIt: {
    backgroundColor: Colors.amber,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
  },
  gotItText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});