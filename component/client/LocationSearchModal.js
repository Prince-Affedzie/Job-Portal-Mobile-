import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Animated,
  Modal as RNModal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatAddress, getLocationIcon } from '../../utils/locationUtils';

const LocationSuggestionItem = ({ suggestion, onSelect }) => (
  <TouchableOpacity
    style={styles.suggestionItem}
    onPress={() => onSelect(suggestion)}
    activeOpacity={0.7}
  >
    <View style={styles.suggestionIconContainer}>
      <Ionicons
        name={getLocationIcon(suggestion.type)}
        size={22}
        color="#007AFF"
      />
    </View>
    <View style={styles.suggestionTextContainer}>
      <Text style={styles.suggestionMainText} numberOfLines={1}>
        {formatAddress(suggestion)}
      </Text>
      <Text style={styles.suggestionSubText} numberOfLines={2}>
        {suggestion.displayName}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
  </TouchableOpacity>
);

const LocationModal = ({
  visible,
  onClose,
  locationQuery,
  onLocationQueryChange,
  locationSuggestions,
  searchingLocations,
  onLocationSelect,
  slideAnim,
  backdropAnim,
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Choose Location</Text>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.modalSearchContainer}>
              <View style={styles.modalInputContainer}>
                <View style={styles.modalIconSquare}>
                  <Ionicons name="search" size={20} color="#FFF" />
                </View>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Search for a location"
                  placeholderTextColor="#8E8E93"
                  value={locationQuery}
                  onChangeText={onLocationQueryChange}
                  autoFocus
                  returnKeyType="done"
                />
                {locationQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      onLocationQueryChange('');
                    }}
                  >
                    <Ionicons name="close-circle" size={22} color="#C7C7CC" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.modalBody}>
              {searchingLocations ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color="#000" />
                  <Text style={styles.modalLoadingText}>
                    Searching locations...
                  </Text>
                </View>
              ) : locationSuggestions.length > 0 ? (
                <>
                  <Text style={styles.resultsCount}>
                    {locationSuggestions.length} location
                    {locationSuggestions.length !== 1 ? 's' : ''} found
                  </Text>
                  <ScrollView
                    style={styles.modalScrollView}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={false}
                  >
                    {locationSuggestions.map((item, index) => (
                      <React.Fragment key={item.id}>
                        <LocationSuggestionItem
                          suggestion={item}
                          onSelect={onLocationSelect}
                        />
                        {index < locationSuggestions.length - 1 && (
                          <View style={styles.modalSeparator} />
                        )}
                      </React.Fragment>
                    ))}
                  </ScrollView>
                </>
              ) : locationQuery.length >= 2 ? (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="location-outline" size={64} color="#C7C7CC" />
                  <Text style={styles.modalEmptyTitle}>No locations found</Text>
                  <Text style={styles.modalEmptyText}>
                    Try a different search term
                  </Text>
                </View>
              ) : (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="map-outline" size={64} color="#C7C7CC" />
                  <Text style={styles.modalEmptyTitle}>Start typing</Text>
                  <Text style={styles.modalEmptyText}>
                    Enter at least 2 characters to search
                  </Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#FFF',
  },
  backButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 32,
  },
  modalSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  modalIconSquare: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTextInput: {
    flex: 1,
    fontSize: 17,
    color: '#000',
    padding: 0,
    fontWeight: '400',
  },
  modalBody: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalScrollView: {
    flex: 1,
  },
  resultsCount: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
  },
  suggestionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  suggestionTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  suggestionMainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  suggestionSubText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 19,
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginLeft: 70,
  },
  modalLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  modalEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  modalEmptyText: {
    fontSize: 15,
    color: '#C7C7CC',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default LocationModal;