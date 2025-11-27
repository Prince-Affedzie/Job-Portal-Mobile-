// component/tasker/TaskCard.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TaskCard = ({ item, type, onPress }) => {
  const renderApplicationCard = () => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.employerInfo}>
            <Text style={styles.employerName} numberOfLines={1}>
              {item.employer?.name || 'Unknown Employer'}
            </Text>
            {item.employer?.rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {parseFloat(item.employer.rating).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.budgetBadge}>
          <Text style={styles.budgetAmount}>₵{item.budget || '0'}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description || 'No description provided'}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{item.category || 'General'}</Text>
          </View>
          <Text style={styles.timeText}>
            {formatDate(item.appliedAt)}
          </Text>
        </View>
        
        <StatusBadge status={item.status} type="application" />
      </View>
    </TouchableOpacity>
  );

  const renderBidCard = () => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {item.task?.title}
          </Text>
          <View style={styles.employerInfo}>
            <Text style={styles.employerName} numberOfLines={1}>
              {item.task?.employer?.name || 'Unknown Employer'}
            </Text>
            {item.task?.employer?.rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {parseFloat(item.task.employer.rating).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={[styles.budgetBadge, styles.bidBadge]}>
          <Text style={styles.bidAmount}>₵{item.bid?.amount}</Text>
        </View>
      </View>

      <View style={styles.bidMessageBox}>
        <Text style={styles.bidMessageText} numberOfLines={2}>
          {item.bid?.message || 'No message provided'}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{item.task?.category || 'General'}</Text>
          </View>
          <Text style={styles.timeText}>
            {formatDate(item.bid?.createdAt)}
          </Text>
        </View>
        
        <StatusBadge status={item.bid?.status} type="bid" />
      </View>
    </TouchableOpacity>
  );

  const renderServiceRequestCard = () => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {item.type}
          </Text>
          <View style={styles.employerInfo}>
            <Text style={styles.employerName} numberOfLines={1}>
              {item.client?.name || 'Client'}
            </Text>
            {item.client?.rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {parseFloat(item.client.rating).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.budgetBadge}>
          <Text style={styles.budgetAmount}>
            {item.budget ? `₵${item.budget}` : 'Flexible'}
          </Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description || 'No description provided'}
      </Text>

      {item.requirements && item.requirements.length > 0 && (
        <View style={styles.requirementsBox}>
          <Text style={styles.requirementsText} numberOfLines={2}>
            Requirements: {item.requirements.slice(0, 3).join(', ')}
            {item.requirements.length > 3 && '...'}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>Service Request</Text>
          </View>
          <Text style={styles.timeText}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        
        <StatusBadge status={item.status} type="service_request" />
      </View>
    </TouchableOpacity>
  );

  switch (type) {
    case 'applications':
      return renderApplicationCard();
    case 'bids':
      return renderBidCard();
    case 'service_requests':
      return renderServiceRequestCard();
    default:
      return renderApplicationCard();
  }
};

const StatusBadge = ({ status, type }) => {
  const getStatusConfig = (status, type) => {
    const baseConfigs = {
      application: {
        'pending': { bg: '#FEF3C7', text: '#92400E', label: 'Pending', icon: 'time-outline' },
        'open': { bg: '#DBEAFE', text: '#1E40AF', label: 'Open', icon: 'lock-open-outline' },
        'in-progress': { bg: '#E0E7FF', text: '#4338CA', label: 'In Progress', icon: 'play-circle-outline' },
        'review': { bg: '#FEF3C7', text: '#92400E', label: 'Review', icon: 'eye-outline' },
        'accepted': { bg: '#D1FAE5', text: '#065F46', label: 'Accepted', icon: 'checkmark-circle' },
        'rejected': { bg: '#FEE2E2', text: '#991B1B', label: 'Not Selected', icon: 'close-circle-outline' },
        'completed': { bg: '#D1FAE5', text: '#065F46', label: 'Completed', icon: 'checkmark-done-circle' },
        'closed': { bg: '#F3F4F6', text: '#374151', label: 'Closed', icon: 'lock-closed-outline' },
        'assigned': { bg: '#E0E7FF', text: '#3730A3', label: 'Assigned', icon: 'person-circle-outline' },
      },
      bid: {
        'pending': { bg: '#FEF3C7', text: '#92400E', label: 'Pending', icon: 'time-outline' },
        'accepted': { bg: '#D1FAE5', text: '#065F46', label: 'Accepted', icon: 'checkmark-circle' },
        'rejected': { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected', icon: 'close-circle-outline' },
      },
      service_request: {
        'pending': { bg: '#FEF3C7', text: '#92400E', label: 'Pending', icon: 'time-outline' },
        'quoted': { bg: '#DBEAFE', text: '#1E40AF', label: 'Quoted', icon: 'chatbubble-outline' },
        'booked': { bg: '#E0E7FF', text: '#4338CA', label: 'Booked', icon: 'bookmark-outline' },
        'in-progress': { bg: '#E0E7FF', text: '#4338CA', label: 'In Progress', icon: 'play-circle-outline' },
        'review': { bg: '#FEF3C7', text: '#92400E', label: 'Review', icon: 'eye-outline' },
        'completed': { bg: '#D1FAE5', text: '#065F46', label: 'Completed', icon: 'checkmark-done-circle' },
        'canceled': { bg: '#FEE2E2', text: '#991B1B', label: 'Canceled', icon: 'close-circle-outline' },
      }
    };

    const configs = baseConfigs[type] || baseConfigs.application;
    return configs[status?.toLowerCase()] || { 
      bg: '#F3F4F6', 
      text: '#6B7280', 
      label: status || 'Unknown',
      icon: 'help-circle-outline'
    };
  };

  const config = getStatusConfig(status, type);

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={13} color={config.text} />
      <Text style={[styles.statusText, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  );
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (error) {
    return 'N/A';
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 6,
  },
  employerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  employerName: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  budgetBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  bidBadge: {
    backgroundColor: '#EEF2FF',
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  bidMessageBox: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  bidMessageText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  requirementsBox: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 3,
    borderLeftColor: '#0EA5E9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  requirementsText: {
    fontSize: 13,
    color: '#0369A1',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default TaskCard;