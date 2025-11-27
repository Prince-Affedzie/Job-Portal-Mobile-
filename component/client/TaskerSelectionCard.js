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

  return (
    <TouchableOpacity 
      style={[
        styles.taskerCard,
        isSelected && styles.selectedTaskerCard
      ]}
      onPress={() => onToggleSelect(tasker)}
      activeOpacity={0.7}
    >
      {/* Selection Checkbox */}
      <View style={styles.selectionContainer}>
        <View style={[
          styles.checkbox,
          isSelected && styles.checkboxSelected
        ]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
        </View>
      </View>

      {/* Tasker Info */}
      <View style={styles.taskerInfo}>
        <View style={styles.taskerHeader}>
          <Image
            source={{ uri: tasker.profileImage || 'https://via.placeholder.com/70' }}
            style={styles.taskerImage}
          />
          <View style={styles.taskerDetails}>
            <Text style={styles.taskerName} numberOfLines={1}>
              {tasker.name}
            </Text>
            <Text style={styles.taskerSkill} numberOfLines={1}>
              Available
            </Text>
            
            {/* Location Information */}
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={12} color="#8E8E93" />
              <Text style={styles.locationText} numberOfLines={1}>
                {formatTaskerLocation(tasker.location) || 'Location not specified'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.taskerMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {tasker.rating?.toFixed(1) || 'New'}
            </Text>
            {tasker.numberOfRatings > 0 && (
              <Text style={styles.reviewCount}>
                ({tasker.numberOfRatings})
              </Text>
            )}
          </View>
          <View style={styles.divider} />
          <View style={styles.distanceContainer}>
            <Ionicons name="navigate-outline" size={13} color="#8E8E93" />
            <Text style={styles.distanceText}>
              {formatDistance(tasker.distance)}
            </Text>
          </View>
        </View>
      </View>

      {/* Individual Action Button */}
      <TouchableOpacity 
        style={styles.viewProfileButton}
        onPress={(e) => {
          e.stopPropagation(); // Prevent card selection
          onViewProfile(tasker);
        }}
      >
        <Text style={styles.viewProfileText}>View</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedTaskerCard: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  selectionContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  taskerInfo: {
    flex: 1,
  },
  taskerHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  taskerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  taskerDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  taskerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  taskerSkill: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
  },
  taskerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#000',
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 2,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: '#C7C7CC',
    marginHorizontal: 10,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
  },
  viewProfileButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    marginLeft: 8,
  },
  viewProfileText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
});

export default TaskerSelectionCard;