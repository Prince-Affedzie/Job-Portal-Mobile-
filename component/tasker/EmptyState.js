// component/tasker/EmptyState.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { navigate } from '../../services/navigationService';

const EmptyState = ({
  activeTab,
  hasOriginalData,
  hasActiveFilters,
  onClearFilters,
  onExploreTasks
}) => {
  const getEmptyStateConfig = () => {
    if (hasOriginalData && hasActiveFilters) {
      return {
        icon: 'search-outline',
        title: 'No Results Found',
        message: 'Try adjusting your search or filters to find what you\'re looking for.',
        buttonText: 'Clear Filters',
        onPress: onClearFilters,
        buttonIcon: 'refresh-outline'
      };
    }

    switch (activeTab) {
      case 'applications':
        return {
          icon: 'document-text-outline',
          title: 'You have not shown interest on any Task Yet',
          message: 'Explore available tasks and show interest or bid on ones that match your skills.',
          buttonText: 'Explore Tasks',
          onPress: onExploreTasks,
          buttonIcon: 'compass-outline'
        };
      
      case 'bids':
        return {
          icon: 'pricetags-outline',
          title: 'No Bids Placed',
          message: 'Browse open bidding tasks and submit your proposals to get started.',
          buttonText: 'Explore Tasks',
          onPress: onExploreTasks,
          buttonIcon: 'compass-outline'
        };
      
      case 'service_requests':
        return {
          icon: 'mail-outline',
          title: 'No Service Requests',
          message: 'Service requests come from clients who discover your profile. Enhance your profile to attract more direct hiring opportunities.',
          buttonText: 'Update Profile',
          onPress: () => navigate('Profile'),
          buttonIcon: 'person-outline'
        };
      
      default:
        return {
          icon: 'document-text-outline',
          title: 'No Tasks Found',
          message: 'Get started by exploring available tasks in your area.',
          buttonText: 'Explore Tasks',
          onPress: onExploreTasks,
          buttonIcon: 'compass-outline'
        };
    }
  };

  const config = getEmptyStateConfig();

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name={config.icon} size={56} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>{config.title}</Text>
      <Text style={styles.emptyMessage}>{config.message}</Text>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={config.onPress}
      >
        <Ionicons name={config.buttonIcon} size={18} color="#FFFFFF" />
        <Text style={styles.actionButtonText}>{config.buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EmptyState;