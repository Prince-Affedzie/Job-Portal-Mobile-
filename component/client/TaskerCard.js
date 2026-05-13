import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * TaskerCard – updated for separated TaskerProfile schema
 *
 * Expected tasker object:
 * {
 *   _id,
 *   businessName,
 *   name,                // fallback from user account
 *   brandBanner,         // URL – high priority
 *   profileImage,        // fallback if no brandBanner
 *   tagline,
 *   servicesOffered: [{ name, priceType, price, currency, ... }],
 *   rating,
 *   numberOfRatings,
 *   distance,
 *   isVerified,
 *   location: { city, region }
 * }
 */

const TaskerCard = ({ tasker, isSelected, onSelect, onViewProfile }) => {
  // ── Derived values ────────────────────────────────────────────
  const displayName = tasker.businessName || tasker.name || 'Professional Tasker';
  const primaryService = tasker.servicesOffered?.[0];
  const rateString = primaryService
    ? `${primaryService.currency || 'GHS'} ${primaryService.price} (${primaryService.priceType})`
    : null;
  const locationStr = tasker.location?.city || tasker.location?.region || 'Available Nationwide';

  // ── Image priority: brandBanner > profileImage > placeholder
  const imageSource =
    tasker.brandBanner ||
    tasker.profileImage ||
    'https://res.cloudinary.com/duv3qvvjz/image/upload/v1766495900/DefaultiImagePlaceHolder_r6ai4x.jpg';

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      activeOpacity={0.9}
      onPress={() => onSelect(tasker)}
    >
      {/* Selected checkmark badge */}
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        </View>
      )}

      {/* Image section */}
      <View style={styles.imageSection}>
        <Image
          source={{ uri: imageSource }}
          style={styles.coverImage}
          resizeMode="cover"
        />

        {/* Verified badge */}
        {tasker.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          </View>
        )}

        {/* Rating + distance overlay */}
        <View style={styles.overlayBadges}>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {tasker.rating?.toFixed(1) || '5.0'}
            </Text>
            {tasker.numberOfRatings > 0 && (
              <Text style={styles.ratingCount}>({tasker.numberOfRatings})</Text>
            )}
          </View>

          {tasker.distance != null && (
            <View style={styles.distancePill}>
              <Ionicons name="navigate" size={11} color="#FFFFFF" />
              <Text style={styles.distanceText}>
                {typeof tasker.distance === 'number'
                  ? `${((tasker.distance)/1000).toFixed(1)} km`
                  : tasker.distance}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Details */}
      <View style={styles.details}>
        {/* Name & tagline */}
        <View style={styles.nameRow}>
          <Text style={styles.businessName} numberOfLines={1}>
            {displayName}
          </Text>
          {tasker.isVerified && (
            <Ionicons name="shield-checkmark" size={16} color="#0E9F6E" />
          )}
        </View>

        {tasker.tagline ? (
          <Text style={styles.tagline} numberOfLines={1}>
            {tasker.tagline}
          </Text>
        ) : null}

        {/* Primary service info */}
        {primaryService && (
          <View style={styles.serviceRow}>
            <View style={styles.serviceBadge}>
              <Ionicons name="construct-outline" size={12} color="#1E3A6E" />
              <Text style={styles.serviceName} numberOfLines={1}>
                {primaryService.name}
              </Text>
            </View>
            {rateString && (
              <Text style={styles.rateText}>{rateString}</Text>
            )}
          </View>
        )}

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color="#6B7280" />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationStr}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.viewProfileBtn}
            onPress={() => onViewProfile(tasker)}
            activeOpacity={0.75}
          >
            <Text style={styles.viewProfileText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selectBtn, isSelected && styles.selectBtnActive]}
            onPress={() => onSelect(tasker)}
            activeOpacity={0.85}
          >
            {isSelected ? (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.selectBtnText}>Selected</Text>
              </>
            ) : (
              <>
                <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                <Text style={styles.selectBtnText}>Select</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#1E3A6E',      // soft indigo shadow
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: '#1E3A6E',
    borderWidth: 2,
    shadowColor: '#1E3A6E',
    shadowOpacity: 0.18,
    elevation: 8,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 20,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E3A6E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Image
  imageSection: {
    height: 160,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#0E9F6E',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  overlayBadges: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'flex-end',
    gap: 6,
    zIndex: 10,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  ratingCount: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  distanceText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Details
  details: {
    padding: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  tagline: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 18,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },
  serviceName: {
    fontSize: 12,
    color: '#1E3A6E',
    fontWeight: '600',
  },
  rateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E9F6E',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  viewProfileBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  viewProfileText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  selectBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A6E',   // indigo
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  selectBtnActive: {
    backgroundColor: '#D49B3F',   // gold when selected
  },
  selectBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default TaskerCard;