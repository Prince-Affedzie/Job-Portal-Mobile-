import React, { createContext, useState, useEffect, useContext } from "react";
import { Alert } from "react-native";
import io from 'socket.io-client'
import Constants from "expo-constants";

import { 
  createNotification, 
  getNotifications, 
  markNotificationAsRead,
  deleteNotification as deleteNotificationApi, // Rename the import
  deleteBulkNotifications as deleteBulkNotificationsApi // Rename the import
} from "../api/notificationApi"
import { AuthContext } from "./AuthContext";

const BackendURL = Constants.expoConfig.extra?.EXPO_PUBLIC_BACKEND_URL;

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  

  // Load notifications
  const loadNotifications = async () => {
    if (!token || ! user) return;
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data || []);
    } catch (err) {
      console.log("Failed to load notifications:", err);
      Alert.alert("Error", "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const addNotification = async (data) => {
    try {
      await createNotification(data);
    } catch (err) {
      console.log("Failed to generate notification:", err);
    } 
  }

  // Fixed: Use different name for the function
  const deleteSingleNotification = async (id) => {
    try {
      const response = await deleteNotificationApi(id); // Use the renamed import
      if (response?.status === 200) {
        // Remove the deleted notification from state
        setNotifications(prev => prev.filter(notification => notification._id !== id));
        return response;
      }
    } catch (err) {
      console.error("Delete notification error:", err);
      Alert.alert('Error', 'Failed to delete notification');
      throw err; // Re-throw to handle in component
    }
  };

  // Fixed: Use different name for the function
  const deleteMultipleNotifications = async (selectedNotifications) => {
    if (selectedNotifications.length === 0) {
      Alert.alert('Info', 'No notifications selected');
      return;
    }
    try {
      const response = await deleteBulkNotificationsApi(selectedNotifications); // Use the renamed import
      if (response?.status === 200) {
        // Remove deleted notifications from state
        setNotifications(prev => 
          prev.filter(notification => !selectedNotifications.includes(notification._id))
        );
        return response;
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      Alert.alert('Error', 'Failed to delete notifications');
      throw err; // Re-throw to handle in component
    }
  };

  const markAllNotificationsAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
    if (unreadIds.length === 0) {
      Alert.alert('Info', 'All notifications are already read');
      return;
    }

    try {
      const response = await markNotificationAsRead({ ids: unreadIds });
      if (response?.status === 200) {
        // Update notifications state to mark them as read
        setNotifications(prev => 
          prev.map(notification => 
            unreadIds.includes(notification._id) 
              ? { ...notification, read: true }
              : notification
          )
        );
        return response;
      }
    } catch (err) {
      console.error("Mark all as read error:", err);
      Alert.alert('Error', 'Failed to mark notifications as read');
      throw err; // Re-throw to handle in component
    }
  };

  // Load notifications on component mount
  useEffect(() => {
    if (token) {
      loadNotifications();
    }
  }, [token]);




  // In NotificationProvider

useEffect(() => {
  if (!user || !token) return;

  const newSocket = io(BackendURL, {
    auth: { token },
    
    // ── Reconnection settings ──────────────────────────────────────
    reconnection: true,
    reconnectionAttempts: Infinity,   // keep trying forever
    reconnectionDelay: 1000,          // start with 1 second delay
    reconnectionDelayMax: 30000,      // max 30 seconds between attempts
    randomizationFactor: 0.5,        // add randomness to prevent thundering herd
    timeout: 20000,                   // connection timeout
    
    // ── Transport settings ─────────────────────────────────────────
    transports: ['websocket', 'polling'],
    upgrade: true,                    // try to upgrade to WebSocket
  });

  setSocket(newSocket);

  // ── Connection events ────────────────────────────────────────────
  newSocket.on('connect', () => {
    console.log('🟢 Socket connected:', newSocket.id);
  });

  newSocket.on('connect_error', (err) => {
    console.error('🔴 Socket connection error:', err.message);
    // Socket.IO will automatically retry with the reconnection settings above
  });

  newSocket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
  });

  newSocket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Socket reconnection attempt #${attemptNumber}`);
  });

  newSocket.on('reconnect_error', (err) => {
    console.error('🔴 Socket reconnection error:', err.message);
  });

  newSocket.on('reconnect_failed', () => {
    console.error('🔴 Socket reconnection failed after all attempts');
  });

  newSocket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
    // Socket.IO will auto-reconnect unless it was intentional
  });

  // ── Notification listener ────────────────────────────────────────
  newSocket.on('notification', (notification) => {
    setNotifications((prev) => [notification, ...prev]);
  });

  // ── Cleanup ──────────────────────────────────────────────────────
  return () => {
    console.log('Cleaning up socket connection');
    newSocket.off('notification');
    newSocket.off('connect');
    newSocket.off('connect_error');
    newSocket.off('reconnect');
    newSocket.off('reconnect_attempt');
    newSocket.off('reconnect_error');
    newSocket.off('reconnect_failed');
    newSocket.off('disconnect');
    newSocket.disconnect();
  };
}, [BackendURL, token, user]);
  
    

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        loadNotifications,
        addNotification,
        markAllNotificationsAsRead,
        deleteBulkNotifications: deleteMultipleNotifications, // Use the fixed function
        deleteNotification: deleteSingleNotification,
        socket // Use the fixed function
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};