// component/tasker/InfoBanner.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const InfoBanner = ({
  activeTab,
  hasActiveFilters,
  filteredCount,
  totalCount,
  onClearFilters
}) => {
  const getInfoMessage = () => {
    switch (activeTab) {
      case 'applications':
        return 'Tasks assigned to others won\'t appear here even if you applied';
      case 'bids':
        return 'Your bid amount and message are visible to the client';
      case 'service_requests':
        return 'Respond to service requests promptly to increase your chances';
      default:
        return 'Keep your profile updated to get more relevant tasks';
    }
  };

  if (hasActiveFilters) {
    return (
      <View style={styles.filterInfoBanner}>
        <View style={styles.filterInfoContent}>
          <Ionicons name="filter" size={16} color="#4338CA" />
          <Text style={styles.filterInfoText}>
            Showing {filteredCount} of {totalCount}
          </Text>
        </View>
        <TouchableOpacity onPress={onClearFilters}>
          <Text style={styles.clearFiltersText}>Clear</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.infoBanner}>
      <Ionicons name="information-circle-outline" size={16} color="#0EA5E9" />
      <Text style={styles.infoText}>
        {getInfoMessage()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#0369A1',
    lineHeight: 18,
  },
  filterInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterInfoText: {
    fontSize: 13,
    color: '#4338CA',
    fontWeight: '500',
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },
});

export default InfoBanner;