// component/tasker/FilterModal.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FilterModal = ({
  visible,
  onClose,
  selectedStatus,
  selectedCategory,
  sortBy,
  onStatusChange,
  onCategoryChange,
  onSortChange,
  onClearFilters,
  activeTab
}) => {
  // Status options based on active tab
  const getStatusOptions = () => {
    const baseOptions = [
      { value: 'all', label: 'All Status' },
    ];

    switch (activeTab) {
      case 'applications':
        return [
          ...baseOptions,
          { value: 'pending', label: 'Pending' },
          { value: 'accepted', label: 'Accepted' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'in-progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
          { value: 'review', label: 'Under Review' }
        ];
      
      case 'bids':
        return [
          ...baseOptions,
          { value: 'pending', label: 'Pending' },
          { value: 'accepted', label: 'Accepted' },
          { value: 'rejected', label: 'Rejected' }
        ];
      
      case 'service_requests':
        return [
          ...baseOptions,
          { value: 'pending', label: 'Pending' },
          { value: 'quoted', label: 'Quoted' },
          { value: 'booked', label: 'Booked' },
          { value: 'in-progress', label: 'In Progress' },
          { value: 'review', label: 'Review' },
          { value: 'completed', label: 'Completed' },
          { value: 'canceled', label: 'Canceled' }
        ];
      
      default:
        return baseOptions;
    }
  };

  // Category options based on active tab
  const getCategoryOptions = () => {
    const baseOptions = [
      { value: 'all', label: 'All Categories' },
    ];

    if (activeTab === 'service_requests') {
      return [
        ...baseOptions,
        { value: 'Home Services', label: 'Home Services' },
        { value: 'Repair & Maintenance', label: 'Repair & Maintenance' },
        { value: 'Delivery & Errands', label: 'Delivery & Errands' },
        { value: 'Digital Services', label: 'Digital Services' },
        { value: 'Consultation', label: 'Consultation' },
        { value: 'Others', label: 'Others' }
      ];
    }

    return [
      ...baseOptions,
      { value: 'Home Services', label: 'Home Services' },
      { value: 'Delivery & Errands', label: 'Delivery & Errands' },
      { value: 'Digital Services', label: 'Digital Services' },
      { value: 'Writing & Assistance', label: 'Writing & Assistance' },
      { value: 'Learning & Tutoring', label: 'Learning & Tutoring' },
      { value: 'Creative Tasks', label: 'Creative Tasks' },
      { value: 'Event Support', label: 'Event Support' },
      { value: 'Others', label: 'Others' }
    ];
  };

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'budget-high', label: 'Budget: High to Low' },
    { value: 'budget-low', label: 'Budget: Low to High' }
  ];

  const statusOptions = getStatusOptions();
  const categoryOptions = getCategoryOptions();

  const FilterChip = ({ option, isActive, onPress }) => (
    <TouchableOpacity
      style={[
        styles.chip,
        isActive && styles.chipActive
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.chipText,
        isActive && styles.chipTextActive
      ]}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );

  const FilterSection = ({ title, options, selectedValue, onValueChange }) => (
    <View style={styles.filterSection}>
      <Text style={styles.filterLabel}>{title}</Text>
      <View style={styles.filterChips}>
        {options.map(option => (
          <FilterChip
            key={option.value}
            option={option}
            isActive={selectedValue === option.value}
            onPress={() => onValueChange(option.value)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters & Sort</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            <FilterSection
              title="Status"
              options={statusOptions}
              selectedValue={selectedStatus}
              onValueChange={onStatusChange}
            />

            <FilterSection
              title="Category"
              options={categoryOptions}
              selectedValue={selectedCategory}
              onValueChange={onCategoryChange}
            />

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.filterChips}>
                {sortOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      sortBy === option.value && styles.chipActive
                    ]}
                    onPress={() => onSortChange(option.value)}
                  >
                    <Text style={[
                      styles.chipText,
                      sortBy === option.value && styles.chipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={onClearFilters}
            >
              <Text style={styles.secondaryButtonText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={onClose}
            >
              <Text style={styles.primaryButtonText}>Apply Filters</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    marginBottom: 25,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default FilterModal;