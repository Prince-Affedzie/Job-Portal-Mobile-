// components/NotificationPermissionBanner.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import usePushNotifications from '../../hooks/usePushNotifications';  // adjust path

const DISMISS_KEY = 'notification_banner_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function NotificationPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const { expoPushToken } = usePushNotifications();  // we use the hook to get the token after permission

  // Check permission and dismissed state on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          setVisible(false);
          return;
        }

        const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
        if (dismissed) {
          const parsed = JSON.parse(dismissed);
          if (Date.now() - parsed.timestamp < DISMISS_DURATION) {
            setVisible(false);
            return;
          }
        }
        // Permission not granted and not recently dismissed – show banner
        setVisible(true);
      } catch (error) {
        console.log('NotificationBanner error:', error);
      }
    })();
  }, []);

  const handleAllow = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        // The usePushNotifications hook will automatically send the new token
        // after the next re‑render because expoPushToken changes.
        // If you want to force it immediately, you could call a re‑register function.
        // For simplicity, we just close the banner and let the hook do its job.
        setVisible(false);
        // Optional: call a function from the hook to re‑fetch token (if needed)
      } else {
        // User denied – still close the banner, but record dismissal
        await dismissBanner();
      }
    } catch (error) {
      console.log('Permission request error:', error);
    }
  };

  const dismissBanner = async () => {
    try {
      await AsyncStorage.setItem(DISMISS_KEY, JSON.stringify({ timestamp: Date.now() }));
    } catch (error) {
      console.log('AsyncStorage error:', error);
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="notifications-outline" size={32} color="#1E3A6E" />
          </View>

          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.message}>
            Get instant alerts when you receive new messages, bookings, or job
            updates. We'll never spam you.
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.allowButton}
              onPress={handleAllow}
              activeOpacity={0.9}
            >
              <Ionicons name="notifications" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.allowText}>Allow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.laterButton}
              onPress={dismissBanner}
              activeOpacity={0.8}
            >
              <Text style={styles.laterText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  allowButton: {
    flex: 2,
    backgroundColor: '#1E3A6E',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E3A6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  allowText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  laterButton: {
    flex: 1,
    backgroundColor: '#F1F4F9',
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E8EE',
  },
  laterText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
});