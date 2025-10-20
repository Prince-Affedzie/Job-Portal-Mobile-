import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  StatusBar,
  Switch,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';
import NotificationDetailModal from '../../component/common/NotificationDetailModal';
import Header from "../../component/tasker/Header";
import LoadingIndicator from '../../component/common/LoadingIndicator';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const NotificationsScreen = ({ navigation }) => {
  const { 
    notifications, 
    loading, 
    loadNotifications, 
    markAllNotificationsAsRead,
    deleteNotification,
    deleteBulkNotifications
  } = useContext(NotificationContext);
  
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
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
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  
  // Modal animation values
  const [modalScale] = useState(new Animated.Value(0.8));
  const [modalOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    loadNotifications();
  }, []);

  const openModal = (notification) => {
    setSelectedNotification(notification);
    setModalVisible(true);
    
    // Reset animation values
    modalScale.setValue(0.8);
    modalOpacity.setValue(0);
    
    // Animate modal in
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setModalVisible(false);
      setSelectedNotification(null);
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications().finally(() => setRefreshing(false));
  };

  // Mark all as read functionality
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = safeNotifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) {
      Alert.alert('Info', 'All notifications are already read');
      return;
    }

    try {
      setIsProcessing(true);
      await markAllNotificationsAsRead();
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      Alert.alert('Error', 'Failed to mark notifications as read');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete selected notifications
  const handleDeleteSelected = async () => {
    if (selectedNotifications.length === 0) {
      Alert.alert('Info', 'No notifications selected');
      return;
    }

    try {
      setIsProcessing(true);
      await deleteBulkNotifications(selectedNotifications);
      setSelectedNotifications([]);
      setSelectMode(false);
      setShowDeleteConfirm(false);
      Alert.alert('Success', `${selectedNotifications.length} notification(s) deleted successfully`);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete notifications');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle selection of a notification
  const toggleSelection = (id) => {
    if (selectedNotifications.includes(id)) {
      setSelectedNotifications(selectedNotifications.filter(item => item !== id));
    } else {
      setSelectedNotifications([...selectedNotifications, id]);
    }
  };

  // Select all notifications
  const selectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(note => note._id));
    }
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
    if (selectMode) {
      toggleSelection(notification._id);
      return;
    }
    openModal(notification);
  };

  const handleNotificationAction = (notification) => {
    closeModal();
    
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
    const isSelected = selectedNotifications.includes(notification._id);
    const [pressAnim] = useState(new Animated.Value(1));

    const handlePressIn = () => {
      if (selectMode) return;
      Animated.spring(pressAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      if (selectMode) return;
      Animated.spring(pressAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View
        style={[
          {
            transform: [{ scale: pressAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.notificationItem, 
            !notification.read && styles.unreadNotification,
            isSelected && styles.selectedNotification,
            selectMode && styles.selectModeItem,
            styles.clickableNotification // Added for better clickable appearance
          ]}
          onPress={() => handleNotificationPress(notification)}
          onLongPress={() => {
            setSelectMode(true);
            toggleSelection(notification._id);
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
          delayLongPress={500}
        >
          {selectMode && (
            <View style={styles.selectionCheckbox}>
              <Ionicons 
                name={isSelected ? "checkbox" : "square-outline"} 
                size={24} 
                color={isSelected ? '#6366F1' : '#94A3B8'} 
              />
            </View>
          )}
          
          <View style={styles.notificationContent}>
            <View style={[styles.notificationIcon, { backgroundColor: color + '20' }]}>
              <Ionicons name={icon} size={20} color={color} />
            </View>
            <View style={styles.notificationText}>
              <Text style={styles.notificationTitle} numberOfLines={1}>
                {notification.title}
              </Text>
              <Text style={styles.notificationMessage} numberOfLines={2}>
                {notification.message}
              </Text>
              <Text style={styles.notificationTime}>
                {new Date(notification.createdAt).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.notificationRightSection}>
              {!notification.read && !selectMode && (
                <View style={styles.unreadBadge} />
              )}
              {notification.important && !selectMode && (
                <Ionicons name="alert-circle" size={16} color="#EF4444" style={styles.importantIcon} />
              )}
              {/* Chevron icon to indicate clickability */}
              {!selectMode && (
                <Ionicons 
                  name="chevron-forward" 
                  size={16} 
                  color="#CBD5E1" 
                  style={styles.chevronIcon}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
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

  // Render Header Actions Component
  const renderHeaderActions = () => {
    if (safeNotifications.length === 0) return null;

    return (
      <View style={styles.headerActions}>
        {selectMode ? (
          <>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={selectAll}
            >
              <Ionicons name="checkbox-outline" size={20} color="#6366F1" />
              <Text style={styles.actionText}>
                {selectedNotifications.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            
            {selectedNotifications.length > 0 && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => setShowDeleteConfirm(true)}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={[styles.actionText, styles.deleteText]}>
                  Delete ({selectedNotifications.length})
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                setSelectMode(false);
                setSelectedNotifications([]);
              }}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleMarkAllAsRead}
              disabled={isProcessing || unreadCount === 0}
            >
              <Text style={styles.actionText}>Mark All Read</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setSelectMode(true)}
            >
              <Ionicons name="checkbox-outline" size={20} color="#6366F1" />
              <Text style={styles.actionText}>Select</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <LoadingIndicator text='Loading Notifications'/>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header with Actions */}
      <StatusBar/>
      <View style={styles.headerContainer}>
        <Header 
          title="Notifications" 
           rightComponent={renderHeaderActions()}
           showProfile={false}
        />
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 0 }]}
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
        {/* Stats Overview */}
        <View style={styles.statsCard}>
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.statsContent}>
              <View style={styles.statsHeader}>
                <Ionicons name="notifications" size={24} color="#FFFFFF" />
                <Text style={styles.statsTitle}>Notifications</Text>
              </View>
              <Text style={styles.statsSubtitle}>
                {unreadCount > 0 
                  ? `You have ${unreadCount} unread notifications`
                  : 'You have no unread notifications'
                }
              </Text>
            </View>
          </LinearGradient>
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

        {/* Selection Info Bar */}
        {selectMode && (
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedNotifications.length} selected
            </Text>
            <TouchableOpacity 
              style={styles.cancelSelectionButton}
              onPress={() => {
                setSelectMode(false);
                setSelectedNotifications([]);
              }}
            >
              <Ionicons name="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications List */}
        <View style={styles.notificationsSection}>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationItem key={notification._id} notification={notification} />
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={24} color="#EF4444" />
              <Text style={styles.modalTitle}>Confirm Deletion</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalMessage}>
              Are you sure you want to delete {selectedNotifications.length} selected notification(s)? 
              This action cannot be undone.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButtonModal]}
                onPress={handleDeleteSelected}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteButtonText}>
                    Yes, Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Animated Notification Detail Modal */}
     
        <View 
          style={
            styles.modalOverlay
           
          }
        >
          <View 
            style={
              styles.detailModalContent
              }
          >
            <NotificationDetailModal
              visible={modalVisible}
              notification={selectedNotification}
              onClose={closeModal}
              onAction={handleNotificationAction}
            />
          </View>
        </View>
     
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFF',
    
  },
  headerContainer: {
   backgroundColor: '#dark-header-color',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  clearText: {
    color: '#EF4444',
  },
  deleteText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statsGradient: {
    padding: 20,
    borderRadius: 16,
  },
  statsContent: {
    gap: 8,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
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
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
  },
  cancelSelectionButton: {
    padding: 4,
  },
  notificationsSection: {
    marginBottom: 24,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  clickableNotification: {
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
    borderLeftColor: '#6366F1',
  },
  selectedNotification: {
    backgroundColor: '#EEF2FF',
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  selectModeItem: {
    paddingLeft: 8,
  },
  selectionCheckbox: {
    marginRight: 12,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
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
  notificationRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  importantIcon: {
    marginTop: 4,
  },
  chevronIcon: {
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
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  detailModalContent: {
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '500',
  },
  deleteButtonModal: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default NotificationsScreen;