// components/client/SelectionHeader.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SelectionHeader = ({ 
  selectedCount, 
  totalCount, 
  onSelectAll, 
  onClearAll,
  allSelected 
}) => {
  if (selectedCount === 0) return null;

  return (
    <View style={styles.selectionHeader}>
      {/* Top Row - Action Buttons */}
      <View style={styles.topRow}>
        <View style={styles.selectionInfo}>
          <View style={styles.infoContainer}>
            <View style={styles.countBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.countText}>{selectedCount}</Text>
            </View>
            <Text style={styles.selectedCount}>
              {selectedCount} of {totalCount} 
            </Text>
          </View>
        </View>
        
        <View style={styles.selectionActions}>
          <TouchableOpacity 
            style={[
              styles.actionButton,
              styles.selectAllButton,
              allSelected && styles.actionButtonActive
            ]}
            onPress={onSelectAll}
          >
            <Ionicons 
              name={allSelected ? "checkmark-done" : "checkmark-circle-outline"} 
              size={18} 
              color={allSelected ? "#FFFFFF" : "#6366F1"} 
            />
            <Text style={[
              styles.actionText,
              allSelected && styles.actionTextActive
            ]}>
              {allSelected ? 'Selected' : 'Select All'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.clearButton]}
            onPress={onClearAll}
          >
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={[styles.actionText, styles.clearText]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Row - Subtitle */}
      <View style={styles.bottomRow}>
        <Text style={styles.selectionSubtitle}>
          Tap taskers to select or deselect
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  selectionHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bottomRow: {
    paddingLeft: 28, // Align with the count badge + spacing
  },
  selectionInfo: {
    flex: 1,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  selectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  selectAllButton: {
    borderColor: '#6366F1',
  },
  actionButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  clearButton: {
    borderColor: '#FECACA',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  actionTextActive: {
    color: '#FFFFFF',
  },
  clearText: {
    color: '#EF4444',
  },
});

export default SelectionHeader;