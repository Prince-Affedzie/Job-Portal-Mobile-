// component/tasker/TaskActionModal.js
import React from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const { height } = Dimensions.get('window');

const TaskActionModal = ({
  visible,
  onClose,
  task,
  onActionSelect,
  deletionError,
  deletingTasks
}) => {
  if (!task) return null;

  const isRequested = task.isRequested;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Task Actions</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {deletionError && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={18} color="#FFF" />
              <Text style={styles.errorText}>Deletion failed: {deletionError}</Text>
            </View>
          )}
          
          <View style={styles.actionList}>
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => onActionSelect('View Details')}
            >
              <Ionicons name="eye-outline" size={22} color="#2196F3" />
              <Text style={styles.actionText}>View Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => onActionSelect('Edit')}
            >
              <Ionicons name="create-outline" size={22} color="#FF9800" />
              <Text style={styles.actionText}>
                {isRequested ? 'Edit Request' : 'Edit Task'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => onActionSelect('View Applicants')}
            >
              <Ionicons 
                name={isRequested ? "chatbubble-outline" : "people-outline"} 
                size={22} 
                color="#9C27B0" 
              />
              <Text style={styles.actionText}>
                {isRequested ? 'View Offers' : 'View Applicants'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.actionItem,
                deletingTasks[task._id] && styles.disabledAction
              ]}
              onPress={() => onActionSelect('Delete')}
              disabled={deletingTasks[task._id]}
            >
              {deletingTasks[task._id] ? (
                <ActivityIndicator size="small" color="#F44336" />
              ) : (
                <Ionicons name="trash-outline" size={22} color="#F44336" />
              )}
              <Text style={[styles.actionText, styles.deleteText]}>
                {deletingTasks[task._id] ? 'Deleting...' : `Delete ${isRequested ? 'Request' : 'Task'}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    bottom:17,
    maxHeight: height * 0.6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  actionList: {
    // Action list container
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  deleteText: {
    color: '#F44336',
  },
  disabledAction: {
    opacity: 0.5,
  },
  errorBanner: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TaskActionModal;