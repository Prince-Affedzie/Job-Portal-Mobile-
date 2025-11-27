// component/tasker/SearchBar.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchBar = ({
  activeTab,
  initialQuery = '',
  onSearch,
  onOpenFilter,
  hasActiveFilters,
  onClearFilters
}) => {
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setLocalQuery(initialQuery);
  }, [initialQuery]);

  const handleSearch = () => {
    onSearch?.(localQuery.trim());
    searchInputRef.current?.blur();
  };

  const handleClearSearch = () => {
    setLocalQuery('');
    onSearch?.('');
  };

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'applications':
        return 'Search applications...';
      case 'bids':
        return 'Search bids...';
      case 'service_requests':
        return 'Search service requests...';
      default:
        return 'Search...';
    }
  };

  return (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchInputWrapper}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder={getPlaceholder()}
          placeholderTextColor="#9CA3AF"
          value={localQuery}
          onChangeText={setLocalQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {localQuery ? (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity 
        style={[
          styles.filterButton,
          hasActiveFilters && styles.filterButtonActive
        ]} 
        onPress={onOpenFilter}
      >
        <Ionicons 
          name="options-outline" 
          size={22} 
          color={hasActiveFilters ? "#FFFFFF" : "#6B7280"} 
        />
        {hasActiveFilters && <View style={styles.filterDot} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 1,
    marginVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 10,
    borderColor: '#F3F4F6',
    marginHorizontal: 6,
    borderRadius: 12,
    borderBottomWidth: 4,
    borderBottomColor: '#F3F4F6',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: '#111827',
  },
  clearSearchButton: {
    padding: 4,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#4F46E5',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});

export default SearchBar;