import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { taskerCardUtils } from '../../utils/taskerUtils';

const TaskerCard = ({ tasker, onViewProfile, searchQuery }) => {
  const { formatTaskerRate, formatTaskerLocation, formatDistance } = taskerCardUtils;

  return (
    <TouchableOpacity
      style={styles.taskerCard}
      activeOpacity={0.8}
      onPress={() => onViewProfile(tasker)}
    >
      {/* Top Section with Image and Badges */}
      <View style={styles.taskerTopSection}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{
              uri:
                tasker.profileImage ||
                'https://res.cloudinary.com/duv3qvvjz/image/upload/v1766495900/DefaultiImagePlaceHolder_r6ai4x.jpg',
            }}
            style={styles.profileImage}
          />

          {tasker.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </View>
          )}

          {tasker.isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.ratingBadge}>
          <View style={styles.ratingStars}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {tasker.rating?.toFixed(1) || '5.0'}
            </Text>
            {tasker.numberOfRatings > 0 && (
              <Text style={styles.ratingCount}>({tasker.numberOfRatings})</Text>
            )}
          </View>
          {tasker.distance && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={12} color="#FFFFFF" />
              <Text style={styles.distanceText}>
                {formatDistance(tasker.distance)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Tasker Details Section */}
      <View style={styles.taskerDetails}>
        <View style={styles.nameAndRate}>
          <View style={styles.nameContainer}>
            <Text style={styles.taskerName} numberOfLines={1}>
              {tasker.name || 'Professional Tasker'}
            </Text>
            {tasker.isPro && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.hourlyRate}>{formatTaskerRate(tasker)}</Text>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.locationText} numberOfLines={1}>
            {formatTaskerLocation(tasker.location) || 'Available Nationwide'}
          </Text>
        </View>

        {tasker.Bio && (
          <Text style={styles.taskerBio} numberOfLines={2}>
            {tasker.Bio.length > 80
              ? `${tasker.Bio.substring(0, 80)}...`
              : tasker.Bio}
          </Text>
        )}

        <View style={styles.statsRow}>
          {tasker.completedJobs > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="checkmark-done" size={14} color="#10B981" />
              <Text style={styles.statText}>{tasker.completedJobs} jobs</Text>
            </View>
          )}

          {tasker.responseRate && (
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={14} color="#6366F1" />
              <Text style={styles.statText}>{tasker.responseRate}% response</Text>
            </View>
          )}

          {tasker.onTimeRate && (
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={14} color="#F59E0B" />
              <Text style={styles.statText}>{tasker.onTimeRate}% on time</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.hireButton}
            onPress={() => onViewProfile(tasker)}
          >
            <Text style={styles.hireButtonText}>View Profile</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  taskerTopSection: {
    position: 'relative',
    height: 160,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  profileImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '150%',
    resizeMode: 'cover',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#10B981',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'flex-end',
    gap: 6,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  ratingCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  taskerDetails: {
    padding: 16,
  },
  nameAndRate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  taskerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  proBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hourlyRate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  taskerBio: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  hireButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  hireButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default TaskerCard;