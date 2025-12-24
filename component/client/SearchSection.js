import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchSection = ({
  searchQuery,
  onSearchQueryChange,
  onServiceFocus,
  onServiceBlur,
  locationQuery,
  onLocationQueryChange,
  onLocationFocus,
  searchingLocations,
  onSearch,
  onClearAll,
  error,
  loading,
  serviceSuggestionsComponent,
  showServiceSuggestions,
}) => {
  const locationInputRef = useRef(null);
  const skillInputRef = useRef(null);

  return (
    <View style={styles.searchSection}>
      {/* Service Input */}
      <View style={styles.inputGroup}>
        <View style={styles.inputContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="construct" size={18} color="#FFF" />
          </View>
          <TextInput
            ref={skillInputRef}
            style={styles.textInput}
            placeholder="What service do you need?"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            onFocus={onServiceFocus}
            onBlur={onServiceBlur}
            onSubmitEditing={() => locationInputRef.current?.focus()}
            returnKeyType="next"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchQueryChange('')}>
              <Ionicons name="close-circle" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          )}
        </View>
        {serviceSuggestionsComponent}
      </View>

      {/* Location Input */}
      <View style={styles.inputGroup}>
        <View style={styles.inputContainer}>
          <View style={styles.iconSquare}>
            <Ionicons name="location" size={18} color="#FFF" />
          </View>
          <TextInput
            ref={locationInputRef}
            style={styles.textInput}
            placeholder="Enter your location"
            placeholderTextColor="#8E8E93"
            value={locationQuery}
            onChangeText={onLocationQueryChange}
            onFocus={onLocationFocus}
            onSubmitEditing={onSearch}
            returnKeyType="search"
            showSoftInputOnFocus={false}
            onTouchStart={onLocationFocus}
          />
          {searchingLocations ? (
            <ActivityIndicator size="small" color="#000" />
          ) : locationQuery.length > 0 ? (
            <TouchableOpacity onPress={() => onLocationQueryChange('')}>
              <Ionicons name="close-circle" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Search Button */}
      {(searchQuery.trim() || locationQuery.trim()) && (
        <TouchableOpacity
          style={[
            styles.searchButton,
            (!searchQuery.trim() || !locationQuery.trim()) && styles.searchButtonDisabled,
          ]}
          onPress={onSearch}
          disabled={!searchQuery.trim() || !locationQuery.trim()}
        >
          <Ionicons name="search" size={20} color="#FFF" />
          <Text style={styles.searchButtonText}>Search Taskers</Text>
        </TouchableOpacity>
      )}

      {/* Clear All Button */}
      {(searchQuery.trim() || locationQuery.trim()) && (
        <TouchableOpacity style={styles.clearButton} onPress={onClearAll}>
          <Ionicons name="close-circle" size={16} color="#8E8E93" />
          <Text style={styles.clearButtonText}>Clear all</Text>
        </TouchableOpacity>
      )}

      {/* Error Message */}
      {error && !loading && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
  inputGroup: {
    marginBottom: 12,
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSquare: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
    fontWeight: '400',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 6,
  },
  clearButtonText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    flex: 1,
    fontWeight: '400',
  },
});

export default SearchSection;