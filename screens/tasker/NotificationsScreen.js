import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  Switch,
  Alert // Added Alert import
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';
import NotificationDetailModal from '../../component/common/NotificationDetailModal';

const { width } = Dimensions.get('window');

const NotificationsScreen = ({ navigation }) => {
  const { notifications, loading, loadNotifications, markNotificationAsRead } = useContext(NotificationContext);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'important'
  const [notificationSettings, setNotificationSettings] = useState({
    taskAlerts: true,
    messages: true,
    applications: true,
    promotions: false,
    sound: true,
    vibration: true,
  });
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(2));
  const { user } = useContext(AuthContext);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    // Start the fade animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    loadNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications().finally(() => setRefreshing(false));
  };

  const clearAll = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', onPress: () => {
          // Implement clear all logic here
          Alert.alert('Notifications cleared');
        }}
      ]
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'application':
        return { icon: 'document-text', color: '#10B981' };
      case 'message':
        return { icon: 'chatbubble-ellipses', color: '#6366F1' };
      case 'task':
        return { icon: 'briefcase', color: '#F59E0B' };
      case 'payment':
        return { icon: 'cash', color: '#10B981' };
      case 'rating':
        return { icon: 'star', color: '#F59E0B' };
      case 'system':
        return { icon: 'notifications', color: '#6366F1' };
      default:
        return { icon: 'notifications', color: '#94A3B8' };
    }
  };
const handleNotificationPress = (notification) => {
    if (markNotificationAsRead) {
      markNotificationAsRead(notification.id);
    }
    
    // Show the modal with the notification details
    setSelectedNotification(notification);
    setModalVisible(true);
  };

    const handleNotificationAction = (notification) => {
    setModalVisible(false);
    
    // Handle different notification actions
    switch (notification.action) {
      case 'view_task':
        navigation.navigate('TaskDetails', { taskId: notification.taskId });
        break;
      case 'open_chat':
        navigation.navigate('Messages', { chatId: notification.chatId });
        break;
      case 'view_earnings':
        navigation.navigate('Earnings');
        break;
      case 'view_profile':
        navigation.navigate('Profile');
        break;
      default:
        break;
    }
  };


  // Add a fallback in case notifications is undefined
  const safeNotifications = notifications || [];
  
  const filteredNotifications = safeNotifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'important') return notification.important;
    return true;
  });

  const unreadCount = safeNotifications.filter(n => !n.read).length;

  const NotificationItem = ({ notification }) => {
    const { icon, color } = getNotificationIcon(notification.type);
    
    return (
      <TouchableOpacity
        style={[styles.notificationItem, !notification.read && styles.unreadNotification]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.notificationIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          <View style={styles.notificationText}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {notification.type}
            </Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
            <Text style={styles.notificationTime}>
              {new Date(notification.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {!notification.read && (
            <View style={styles.unreadBadge} />
          )}
          {notification.important && (
            <Ionicons name="alert-circle" size={16} color="#EF4444" style={styles.importantIcon} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const SettingsToggle = ({ label, value, onValueChange, description }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E2E8F0', true: '#6366F1' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            {/*<Text style={styles.headerSubtitle}>
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </Text>*/}
          </View>
         {/* <View style={styles.headerActions}>
            {safeNotifications.length > 0 && (
              <TouchableOpacity style={styles.actionButton} onPress={clearAll}>
                <Ionicons name="trash" size={20} color="#EF4444" />
                <Text style={[styles.actionText, styles.clearText]}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View> */}
        </View>

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
            onPress={() => setFilter('unread')}
          >
            <View style={styles.filterBadge}>
              <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
                Unread
              </Text>
              {unreadCount > 0 && (
                <View style={styles.unreadCountBadge}>
                  <Text style={styles.unreadCountText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'important' && styles.activeFilterTab]}
            onPress={() => setFilter('important')}
          >
            <Text style={[styles.filterText, filter === 'important' && styles.activeFilterText]}>
              Important
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Notifications List */}
        <View style={styles.notificationsSection}>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off" size={64} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>
                {filter === 'all' ? 'No notifications' : `No ${filter} notifications`}
              </Text>
              <Text style={styles.emptyStateText}>
                {filter === 'all' 
                  ? "You're all caught up! New notifications will appear here."
                  : `You don't have any ${filter} notifications at the moment.`
                }
              </Text>
            </View>
          )}
        </View>

        {/* Notification Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsTitle}>Notification Settings</Text>
          <View style={styles.settingsCard}>
            <SettingsToggle
              label="Task Alerts"
              value={notificationSettings.taskAlerts}
              onValueChange={(value) => setNotificationSettings({...notificationSettings, taskAlerts: value})}
              description="Get notified about new tasks and updates"
            />
            <SettingsToggle
              label="Messages"
              value={notificationSettings.messages}
              onValueChange={(value) => setNotificationSettings({...notificationSettings, messages: value})}
              description="Notify about new messages from clients"
            />
            <SettingsToggle
              label="Application Updates"
              value={notificationSettings.applications}
              onValueChange={(value) => setNotificationSettings({...notificationSettings, applications: value})}
              description="Updates on your job applications"
            />
            <SettingsToggle
              label="Promotional Notifications"
              value={notificationSettings.promotions}
              onValueChange={(value) => setNotificationSettings({...notificationSettings, promotions: value})}
              description="Special offers and promotions"
            />
            <SettingsToggle
              label="Sound"
              value={notificationSettings.sound}
              onValueChange={(value) => setNotificationSettings({...notificationSettings, sound: value})}
              description="Play sound for notifications"
            />
            <SettingsToggle
              label="Vibration"
              value={notificationSettings.vibration}
              onValueChange={(value) => setNotificationSettings({...notificationSettings, vibration: value})}
              description="Vibrate for notifications"
            />
          </View>
        </View>
      </Animated.ScrollView>
      <NotificationDetailModal
        visible={modalVisible}
        notification={selectedNotification}
        onClose={() => setModalVisible(false)}
        onAction={handleNotificationAction}
      />
    </SafeAreaView>
  );
};

// Your styles remain the same...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  scrollContent: {
    paddingBottom: 40,
  },
 header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginBottom:20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  clearText: {
    color: '#EF4444',
  },
  filterContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 4,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 80,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadCountBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationsSection: {
    marginBottom: 24,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  notificationText: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    marginLeft: 4,
  },
  importantIcon: {
    marginLeft: 4,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  settingsSection: {
    paddingHorizontal: 16,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});

export default NotificationsScreen;