// components/client/TaskerSelectionCard.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TaskerSelectionCard = ({ tasker, isSelected, onToggleSelect, onViewProfile }) => {
  const formatTaskerLocation = (location) => {
    if (!location) return null;
    const parts = [];
    if (location.street) parts.push(location.street);
    if (location.town) parts.push(location.town);
    if (location.city) parts.push(location.city);
    if (location.region) parts.push(location.region);
    const uniqueParts = [...new Set(parts)];
    return uniqueParts.join(', ') || null;
  };

  const formatDistance = (meters) => {
    if (!meters) return 'Nearby';
    return meters < 1000 
      ? `${Math.round(meters)}m` 
      : `${(meters / 1000).toFixed(1)}km`;
  };

  const calculateCompletionRate = (tasks) => {
    if (!tasks || tasks.total === 0) return 0;
    return Math.round((tasks.completed / tasks.total) * 100);
  };

  return (
    <View style={[
      styles.cardContainer,
      isSelected && styles.selectedCardContainer
    ]}>
      <TouchableOpacity 
        style={styles.cardTouchable}
        onPress={() => onToggleSelect(tasker)}
        activeOpacity={0.9}
      >
        {/* Main Content Container */}
        <View style={styles.mainContent}>
          {/* Selection Indicator */}
          <View style={styles.selectionIndicator}>
            <View style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected
            ]}>
              {isSelected && (
                <Ionicons 
                  name="checkmark-sharp" 
                  size={14} 
                  color="#FFFFFF" 
                />
              )}
            </View>
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            {/* Avatar with Status */}
            <View style={styles.avatarContainer}>
              <Image
                source={{ 
                  uri: tasker.profileImage || 'https://via.placeholder.com/70'
                }}
                style={styles.avatar}
              />
              {tasker.isOnline && (
                <View style={styles.onlineIndicator} />
              )}
            </View>

            {/* Tasker Details */}
            <View style={styles.detailsContainer}>
              {/* Name and Rating Row */}
              <View style={styles.nameRatingRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {tasker.name}
                </Text>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingValue}>
                    {tasker.rating?.toFixed(1) || 'New'}
                  </Text>
                  {tasker.numberOfRatings > 0 && (
                    <Text style={styles.ratingCount}>
                      ({tasker.numberOfRatings})
                    </Text>
                  )}
                </View>
              </View>

              {/* Skills/Tags */}
              <View style={styles.tagsContainer}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    Available
                  </Text>
                </View>
                {tasker.tasks && (
                  <View style={[styles.tag, styles.completionTag]}>
                    <Ionicons name="checkmark-circle" size={10} color="#10B981" />
                    <Text style={styles.completionText}>
                      {calculateCompletionRate(tasker.tasks)}% completion
                    </Text>
                  </View>
                )}
              </View>

              {/* Location Info */}
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#6366F1" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {formatTaskerLocation(tasker.location) || 'Location not specified'}
                </Text>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                {/* Distance */}
                <View style={styles.statItem}>
                  <Ionicons name="navigate-outline" size={14} color="#8B5CF6" />
                  <Text style={styles.statText}>
                    {formatDistance(tasker.distance)}
                  </Text>
                </View>

                {/* Separator */}
                <View style={styles.statSeparator} />

                {/* Experience */}
                {tasker.experience && (
                  <View style={styles.statItem}>
                    <Ionicons name="briefcase-outline" size={14} color="#F59E0B" />
                    <Text style={styles.statText}>
                      {tasker.experience}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Action Button - Separate from selection area */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onViewProfile(tasker);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="eye-outline" size={16} color="#6366F1" />
          <Text style={styles.actionButtonText}>
            View
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Card Container
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    marginHorizontal:12,
  },
  selectedCardContainer: {
    borderColor: '#6366F1',
    backgroundColor: '#F8FAFF',
    shadowColor: '#6366F1',
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },

  // Touchable Area
  cardTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },

  // Main Content
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Selection Indicator
  selectionIndicator: {
    marginRight: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  checkboxSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },

  // Profile Section
  profileSection: {
    flex: 1,
    flexDirection: 'row',
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Details Container
  detailsContainer: {
    flex: 1,
  },

  // Name and Rating
  nameRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  ratingCount: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '500',
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3730A3',
  },
  completionTag: {
    backgroundColor: '#F0FDF4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statSeparator: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 10,
  },

  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
});

export default TaskerSelectionCard;