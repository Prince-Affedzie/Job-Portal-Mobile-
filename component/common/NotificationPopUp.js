import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationContext } from '../../context/NotificationContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NotificationPopup = () => {
  const { notifications, socket } = useContext(NotificationContext);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (socket) {
      socket.on('notification', (notification) => {
        setCurrentNotification(notification);
        // Trigger animation for new notification
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          dismissNotification();
        }, 5000);
      });
    }

    return () => {
      if (socket) {
        socket.off('notification');
      }
    };
  }, [socket]);

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentNotification(null);
    });
  };

  if (!currentNotification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.notification}>
        <View style={styles.iconContainer}>
          <Ionicons name="notifications" size={24} color="#3B82F6" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>
            {currentNotification.title || 'New Notification'}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {currentNotification.message || 'You have a new notification.'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissNotification}
        >
          <Ionicons name="close" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    width: SCREEN_WIDTH - 32,
    marginHorizontal: 16,
    zIndex: 1000,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 8,
  },
});

export default NotificationPopup;