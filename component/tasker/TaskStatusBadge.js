// components/StatusBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StatusBadge = ({ status }) => {
  const getStatusStyle = (status) => {
    const statusMap = {
      'Pending': styles.pending,
      'Open': styles.open,
      'In-progress': styles.inProgress,
      'Review': styles.review,
      'Completed': styles.completed,
      'Rejected': styles.rejected,
      'Closed': styles.closed,
      'Assigned': styles.assigned,
      'Accepted': styles.accepted,
    };
    return statusMap[status] || styles.default;
  };

  const getStatusText = (status) => {
    const textMap = {
      'Pending': 'Pending',
      'Open': 'Open',
      'In-progress': 'In Progress',
      'Review': 'Under Review',
      'Completed': 'Completed',
      'Rejected': 'Rejected',
      'Closed': 'Closed',
      'Assigned': 'Assigned',
      'Accepted': 'Accepted',
    };
    return textMap[status] || status;
  };

  return (
    <View style={[styles.badge, getStatusStyle(status)]}>
      <Text style={styles.badgeText}>{getStatusText(status)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pending: { backgroundColor: '#F59E0B' },
  open: { backgroundColor: '#3B82F6' },
  inProgress: { backgroundColor: '#6366F1' },
  review: { backgroundColor: '#8B5CF6' },
  completed: { backgroundColor: '#10B981' },
  rejected: { backgroundColor: '#EF4444' },
  closed: { backgroundColor: '#64748B' },
  assigned: { backgroundColor: '#8B5CF6' },
  accepted: { backgroundColor: '#10B981' },
  default: { backgroundColor: '#64748B' },
});

export default StatusBadge;