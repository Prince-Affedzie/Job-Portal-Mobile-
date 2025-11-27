import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  FlatList,
  Animated,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchTaskers } from '../../api/bidApi';
import Header from '../../component/tasker/Header';
import { navigate } from '../../services/navigationService';
import PopularServicesGrid from '../../component/client/PopularServicesGrid';

// Import new components
import TaskerSelectionCard from '../../component/client/TaskerSelectionCard';
import RequestServiceFAB from '../../component/client/RequestServiceFAB';
import SelectionHeader from '../../component/client/SelectionHeader';

const { width, height } = Dimensions.get('window');

const SearchTaskersScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [locationDetails, setLocationDetails] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [searchingLocations, setSearchingLocations] = useState(false);

  // Selection state
  const [selectedTaskers, setSelectedTaskers] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const locationInputRef = useRef(null);
  const skillInputRef = useRef(null);
  const debounceTimeout = useRef(null);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Reset screen when inputs are cleared
  useEffect(() => {
    if (!searchQuery.trim() && !location.trim()) {
      setHasSearched(false);
      setSearchResults([]);
      setError(null);
      setSelectedTaskers([]);
      setIsSelectionMode(false);
    }
  }, [searchQuery, location]);

  // Animate modal when it opens/closes
  useEffect(() => {
    if (showLocationSuggestions) {
      // Animate in
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 25,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showLocationSuggestions]);

  // Reset selection when search results change
  useEffect(() => {
    if (searchResults.length > 0) {
      setSelectedTaskers([]);
      setIsSelectionMode(false);
    }
  }, [searchResults]);

  const handleServiceSelect = (serviceName) => {
    setSearchQuery(serviceName);
    setHasSearched(false);
    setTimeout(() => locationInputRef.current?.focus(), 100);
  };

  // Handle tasker selection
  const toggleTaskerSelection = (tasker) => {
    setSelectedTaskers(prev => {
      const isSelected = prev.find(t => t._id === tasker._id);
      if (isSelected) {
        return prev.filter(t => t._id !== tasker._id);
      } else {
        return [...prev, tasker];
      }
    });
  };

  const selectAllTaskers = () => {
    setSelectedTaskers([...searchResults]);
  };

  const clearAllSelection = () => {
    setSelectedTaskers([]);
  };

  const handleFABPress = () => {
    if (!isSelectionMode) {
      // First click: Enter selection mode
      setIsSelectionMode(true);
    } else {
      // Second click: Either cancel or proceed to form
      if (selectedTaskers.length > 0) {
        // Navigate to request form with selected taskers
        navigate('ServiceRequestForm', {
          selectedTaskers: selectedTaskers,
          serviceType: searchQuery,
          location: locationDetails || {
            suburb: location,
            city: location,
            region: location,
            town: location,
            village: location,
          },
          notifiedTaskers: selectedTaskers.map(t => t._id)
        });
      } else {
        // Cancel selection mode
        setIsSelectionMode(false);
      }
    }
  };

  const handleViewProfile = (tasker) => {
    navigate('ApplicantProfile', { applicant: tasker });
  };

  // Original TaskerCard for normal browsing
  const TaskerCard = ({ tasker }) => (
    <TouchableOpacity 
      style={styles.taskerCard}
      activeOpacity={0.7}
      onPress={() => handleViewProfile(tasker)}
    >
      <View style={styles.taskerHeader}>
        <View style={styles.taskerImageContainer}>
          <Image
            source={{ uri: tasker.profileImage || 'https://via.placeholder.com/70' }}
            style={styles.taskerImage}
          />
          {tasker.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            </View>
          )}
        </View>
        <View style={styles.taskerInfo}>
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
                {formatDistance(tasker.distance)} away
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.taskerFooter}>
        <TouchableOpacity onPress={() => handleViewProfile(tasker)} style={styles.hireButton}>
          <Text style={styles.hireButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Handle skill input change
  const handleSkillChange = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setHasSearched(false);
      setSearchResults([]);
      setSelectedTaskers([]);
      setIsSelectionMode(false);
    }
  };

  // Handle location input focus - DON'T show modal on focus
  const handleLocationFocus = () => {
    // Only show modal if there's already text in the input
    if (locationQuery.trim().length > 0) {
      setShowLocationSuggestions(true);
    }
  };

  // Handle location query change - show modal when user starts typing
  const handleLocationQueryChange = (text) => {
    setLocationQuery(text);
    
    // Show modal when user starts typing (text length > 0)
    if (text.trim().length > 0 && !showLocationSuggestions) {
      setShowLocationSuggestions(true);
    }
    
    // Hide modal and clear location if text is empty
    if (!text.trim()) {
      setLocation('');
      setLocationDetails(null);
      setHasSearched(false);
      setSearchResults([]);
      setSelectedTaskers([]);
      setIsSelectionMode(false);
      setShowLocationSuggestions(false);
    }
  };

  // Clear all inputs and reset to initial state
  const clearAllInputs = () => {
    setSearchQuery('');
    setLocation('');
    setLocationQuery('');
    setLocationDetails(null);
    setHasSearched(false);
    setSearchResults([]);
    setError(null);
    setSelectedTaskers([]);
    setIsSelectionMode(false);
    setShowLocationSuggestions(false);
  };

  // Helper functions
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

  // Location search function
  const searchLocations = useCallback(async (query) => {
    if (!query.trim() || query.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    setSearchingLocations(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=20&countrycodes=gh&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'WorkaflowApp/1.0(support@Workaflow.com)', 
          },
        }
      );
      const data = await response.json();
      
      const suggestions = data.map((item) => ({
        id: item.place_id.toString(),
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        address: item.address,
        type: item.type,
      }));
      
      setLocationSuggestions(suggestions);
    } catch (err) {
      console.error('Location search error:', err);
      setLocationSuggestions([]);
    } finally {
      setSearchingLocations(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      searchLocations(locationQuery);
    }, 300);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [locationQuery, searchLocations]);

  const handleLocationSelect = (suggestion) => {
    const { suburb, city, town, village, county, state, region } = suggestion.address;
    const addressString = `${suburb || town || village || ""}, ${city || county || ""}, ${state || region || ""}`.trim().replace(/^, |, $/g, '');
    
    setLocation(addressString);
    setLocationQuery(addressString);
    setLocationDetails({
      village: village,
      town: town,
      suburb: suburb || town || village,
      city: city || county,
      region: state || region,
      coordinates: [
        suggestion.lat,
        suggestion.lon
      ]
    });
    setShowLocationSuggestions(false);
    Keyboard.dismiss();
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !location.trim()) {
      setError('Please enter both service needed and your location');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults([]);
    setSelectedTaskers([]);
    setIsSelectionMode(false);
    setShowLocationSuggestions(false);
    setHasSearched(true);

    try {
      const searchData = {
        searchQuery: searchQuery.trim(),
        address: locationDetails || {
          suburb: location,
          city: location,
          region: location,
          town: location,
          village: location,
        },
      };

      const response = await searchTaskers(searchData);

      if (response.data.success) {
        setSearchResults(response.data.data || []);
        if (response.data.data.length === 0) {
          setError('No taskers found. Try different search terms.');
        }
      } else {
        setError(response.data.message || 'No taskers found matching your criteria');
      }
    } catch (err) {
      setError('Unable to search right now. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, location, locationDetails]);

  const formatAddress = (suggestion) => {
    const { address } = suggestion;
    const { suburb, city, town, village, county, state, region } = address;
    
    const parts = [];
    if (suburb || town || village) parts.push(suburb || town || village);
    if (city || county) parts.push(city || county);
    if (state || region) parts.push(state || region);
    
    return parts.join(', ');
  };

  const getLocationIcon = (type) => {
    switch(type) {
      case 'city': return 'business';
      case 'town': return 'home';
      case 'village': return 'home-outline';
      default: return 'location';
    }
  };

  const LocationSuggestionItem = ({ suggestion }) => (
    <TouchableOpacity 
      style={styles.suggestionItem}
      onPress={() => handleLocationSelect(suggestion)}
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

  // Show FAB when we have search results
  const showFAB = searchResults.length > 0 && hasSearched && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <Header
        title="Find Taskers" 
      />

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        
        {/* Selection Header - Only show in selection mode */}
        {isSelectionMode && (
          <SelectionHeader
            selectedCount={selectedTaskers.length}
            totalCount={searchResults.length}
            onSelectAll={selectAllTaskers}
            onClearAll={clearAllSelection}
            allSelected={selectedTaskers.length === searchResults.length}
          />
        )}

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Search Inputs Section */}
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
                  onChangeText={handleSkillChange}
                  onSubmitEditing={() => locationInputRef.current?.focus()}
                  returnKeyType="next"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#C7C7CC" />
                  </TouchableOpacity>
                )}
              </View>
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
                  onChangeText={handleLocationQueryChange}
                  onFocus={handleLocationFocus} // Changed this line
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                {searchingLocations ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : locationQuery.length > 0 ? (
                  <TouchableOpacity onPress={() => {
                    setLocationQuery('');
                    setLocation('');
                    setLocationDetails(null);
                    setShowLocationSuggestions(false);
                  }}>
                    <Ionicons name="close-circle" size={20} color="#C7C7CC" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Search Button */}
            {(searchQuery.trim() || location.trim()) && (
              <TouchableOpacity 
                style={[
                  styles.searchButton,
                  (!searchQuery.trim() || !location.trim()) && styles.searchButtonDisabled
                ]}
                onPress={handleSearch}
                disabled={!searchQuery.trim() || !location.trim()}
              >
                <Ionicons name="search" size={20} color="#FFF" />
                <Text style={styles.searchButtonText}>Search Taskers</Text>
              </TouchableOpacity>
            )}

            {/* Clear All Button */}
            {(searchQuery.trim() || location.trim()) && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearAllInputs}
              >
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

          {/* Content based on state */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
              <Text style={styles.loadingText}>Finding taskers near you...</Text>
            </View>
          ) : searchResults.length > 0 ? (
           <View style={styles.resultsSection}>
  <View style={styles.resultHeader}>
    <Text style={styles.resultsTitle}>
      {searchResults.length} Tasker{searchResults.length !== 1 ? 's' : ''} Found
    </Text>
    <Text style={styles.resultsSubtitle}>
      for "{searchQuery}" near {locationDetails?.city || location}
    </Text>
    
    {/* Selection Mode Indicator */}
    {isSelectionMode && (
      <View style={styles.selectionInfoContainer}>
        <Text style={styles.selectionModeText}>
          Select multiple taskers to receive competitive offers
        </Text>
        <Text style={styles.selectionSubtext}>
          Invite multiple professionals to submit proposals, then choose the best offer for your needs
        </Text>
      </View>
    )}
  </View>
              
              {/* Taskers List - Show different cards based on mode */}
              {searchResults.map((tasker, index) => 
                isSelectionMode ? (
                  <TaskerSelectionCard
                    key={tasker._id || index}
                    tasker={tasker}
                    isSelected={selectedTaskers.some(t => t._id === tasker._id)}
                    onToggleSelect={toggleTaskerSelection}
                    onViewProfile={handleViewProfile}
                  />
                ) : (
                  <TaskerCard 
                    key={tasker._id || index}
                    tasker={tasker}
                  />
                )
              )}
            </View>
          ) : hasSearched ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No taskers found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search terms or location
              </Text>
            </View>
          ) : (
            <View style={styles.discoveryContent}>
              <PopularServicesGrid onServiceSelect={handleServiceSelect} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Action Button */}
      <RequestServiceFAB
        selectedCount={selectedTaskers.length}
        onPress={handleFABPress}
        isVisible={showFAB}
        isSelectionMode={isSelectionMode}
      />

      {/* FULL-SCREEN LOCATION MODAL - Only shows when user types */}
      <Modal
        visible={showLocationSuggestions}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowLocationSuggestions(false)}
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <Animated.View 
            style={[
              styles.backdrop,
              {
                opacity: backdropAnim,
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.backdropTouchable}
              activeOpacity={1}
              onPress={() => setShowLocationSuggestions(false)}
            />
          </Animated.View>

          {/* Full-Screen Content */}
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <SafeAreaView style={styles.modalSafeArea}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  onPress={() => setShowLocationSuggestions(false)}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Choose Location</Text>
                <View style={styles.headerSpacer} />
              </View>

              {/* Search Input */}
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
                    onChangeText={handleLocationQueryChange}
                    autoFocus={true}
                    returnKeyType="done"
                  />
                  {locationQuery.length > 0 && (
                    <TouchableOpacity onPress={() => {
                      setLocationQuery('');
                      setShowLocationSuggestions(false);
                    }}>
                      <Ionicons name="close-circle" size={22} color="#C7C7CC" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Suggestions List */}
              <View style={styles.modalBody}>
                {searchingLocations ? (
                  <View style={styles.modalLoadingContainer}>
                    <ActivityIndicator size="large" color="#000" />
                    <Text style={styles.modalLoadingText}>Searching locations...</Text>
                  </View>
                ) : locationSuggestions.length > 0 ? (
                  <>
                    <Text style={styles.resultsCount}>
                      {locationSuggestions.length} location{locationSuggestions.length !== 1 ? 's' : ''} found
                    </Text>
                    <FlatList
                      data={locationSuggestions}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <LocationSuggestionItem suggestion={item} />
                      )}
                      keyboardShouldPersistTaps="always"
                      ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.listContent}
                    />
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
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
  inputGroup: {
    marginBottom: 12,
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
  // Search Button Styles
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
  // Clear Button Styles
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
  suggestionsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  suggestionsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
  },
  resultsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  resultHeader: {
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
  },
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
  },
  taskerHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  taskerImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  taskerImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 1,
  },
  taskerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
    flex: 1,
  },
  taskerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 3,
  },
  taskerSkill: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 6,
    fontWeight: '500',
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
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 13,
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
  taskerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  hireButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  hireButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  discoveryContent: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    lineHeight: 20,
  },

  // MODAL STYLES - Uber Style
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
  backdropTouchable: {
    flex: 1,
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
  resultsCount: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },
  listContent: {
    paddingBottom: 20,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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

  selectionModeText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 4,
  },
  selectionInfoContainer: {
  backgroundColor: '#F0F9FF',
  padding: 12,
  borderRadius: 8,
  borderLeftWidth: 4,
  borderLeftColor: '#3B82F6',
  marginTop: 8,
},
selectionModeText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#1E40AF',
  marginBottom: 4,
},
selectionSubtext: {
  fontSize: 14,
  color: '#6B7280',
  lineHeight: 18,
},
});

export default SearchTaskersScreen;