import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NotificationDetailModal = ({ visible, notification, onClose, onAction }) => {
  if (!notification) return null;

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

  const getActionButtonText = (action) => {
    switch (action) {
      case 'view_task':
        return 'View Task';
      case 'open_chat':
        return 'Open Chat';
      case 'view_earnings':
        return 'View Earnings';
      case 'view_profile':
        return 'View Profile';
      default:
        return 'View Details';
    }
  };

  const { icon, color } = getNotificationIcon(notification.type);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.titleContainer}>
                  <View style={[styles.modalIcon, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon} size={24} color={color} />
                  </View>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {notification.type}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Notification Message */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Message</Text>
                  <Text style={styles.messageText}>{notification.message}</Text>
                </View>

                {/* Notification Details */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Details</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={18} color="#64748B" />
                      <Text style={styles.detailText}>{new Date(notification.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="alert-circle-outline" size={18} color="#64748B" />
                      <Text style={styles.detailText}>
                        Status: {notification.read ? 'Read' : 'Unread'}
                      </Text>
                    </View>
                    {notification.important && (
                      <View style={styles.detailItem}>
                        <Ionicons name="flag" size={18} color="#EF4444" />
                        <Text style={[styles.detailText, { color: '#EF4444' }]}>
                          Important
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Additional Information (if available) */}
                {(notification.taskId || notification.chatId) && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Additional Information</Text>
                    {notification.taskId && (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Task ID:</Text>
                        <Text style={styles.infoValue}>{notification.taskId}</Text>
                      </View>
                    )}
                    {notification.chatId && (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Chat ID:</Text>
                        <Text style={styles.infoValue}>{notification.chatId}</Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Action Button */}
              {notification.action && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => onAction(notification)}
                >
                  <Text style={styles.actionButtonText}>
                    {getActionButtonText(notification.action)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  messageText: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
  },
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#6366F1',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationDetailModal;