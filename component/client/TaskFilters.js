// component/tasker/TaskFilters.js
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const statusFilters = ['All', 'Open', 'Assigned', 'In Progress', 'Review', 'Completed'];
const categoryFilters = ['All', 'Home Services', 'Delivery & Errands', 'Digital Services', 'Writing & Assistance', 'Learning & Tutoring', 'Creative Tasks', 'Event Support', 'Others'];

const requestedStatusFilters = ['All', 'Pending', 'Quoted', 'Booked', 'In Progress', 'Review', 'Completed', 'Canceled'];

const TaskFilters = ({
  selectedFilter,
  setSelectedFilter,
  selectedCategory,
  setSelectedCategory,
  hasActiveFilters,
  clearFilters,
  taskType
}) => {
  const currentStatusFilters = taskType === 'requested' ? requestedStatusFilters : statusFilters;

  return (
    <View style={styles.filtersExpanded}>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChips}>
            {currentStatusFilters.map((filter) => (
              <TouchableOpacity 
                key={filter}
                style={[
                  styles.filterChip,
                  selectedFilter === filter && styles.filterChipActive
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedFilter === filter && styles.filterChipTextActive
                ]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChips}>
            {categoryFilters.map((category) => (
              <TouchableOpacity 
                key={category}
                style={[
                  styles.filterChip,
                  selectedCategory === category && styles.filterChipActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedCategory === category && styles.filterChipTextActive
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {hasActiveFilters && (
        <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
          <Ionicons name="close" size={16} color="#6366F1" />
          <Text style={styles.clearFiltersText}>Clear All Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  filtersExpanded: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
});

export default TaskFilters;