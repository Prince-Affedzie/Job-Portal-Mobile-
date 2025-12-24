import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Animated, 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// APIs and Services
import { searchTaskers } from '../../api/bidApi';
import { navigate } from '../../services/navigationService';

// Components
import Header from '../../component/tasker/Header';
import RequestServiceFAB from '../../component/client/RequestServiceFAB';
import SelectionHeader from '../../component/client/SelectionHeader';
import TaskerSelectionCard from '../../component/client/TaskerSelectionCard';

// New Components
import SearchSection from '../../component/client/SearchSection';
import ServiceSuggestions from '../../component/client/ServiceSuggestions';
import TaskerCard from '../../component/client/TaskerCard';
import LocationModal from '../../component/client/LocationSearchModal';

// Constants and Utils
import { SERVICE_SUGGESTIONS, POPULAR_SERVICES_COUNT } from '../../constants/serviceSuggestions';
import { filterServiceSuggestions } from '../../utils/searchUtils';
import { useLocationSearch } from '../../hooks/useLocationSearch';

const { height } = Dimensions.get('window');

const SearchTaskersScreen = ({ navigation }) => {
  // State
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [locationDetails, setLocationDetails] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [serviceSuggestions, setServiceSuggestions] = useState([]);
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const [isServiceInputFocused, setIsServiceInputFocused] = useState(false);
  const [selectedTaskers, setSelectedTaskers] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Hooks and Refs
  const locationSearch = useLocationSearch();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Derived values
  const showFAB = searchResults.length > 0 && hasSearched && !loading;

  // Effects
  useEffect(() => {
    const filtered = filterServiceSuggestions(searchQuery, SERVICE_SUGGESTIONS);
    setServiceSuggestions(filtered);
    setShowServiceSuggestions(filtered.length > 0 && isServiceInputFocused);
  }, [searchQuery, isServiceInputFocused]);

  useEffect(() => {
    if (!searchQuery.trim() && !location.trim()) {
      resetSearchState();
    }
  }, [searchQuery, location]);

  useEffect(() => {
    if (showLocationModal) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [showLocationModal]);

  useEffect(() => {
    if (searchResults.length > 0) {
      setSelectedTaskers([]);
      setIsSelectionMode(false);
    }
  }, [searchResults]);

  useEffect(() => {
    locationSearch.debouncedSearch(locationSearch.locationQuery);
  }, [locationSearch.locationQuery]);

  // Helper functions
  const resetSearchState = () => {
    setHasSearched(false);
    setSearchResults([]);
    setError(null);
    setSelectedTaskers([]);
    setIsSelectionMode(false);
    setShowServiceSuggestions(false);
  };

  const clearAllInputs = () => {
    setSearchQuery('');
    setLocation('');
    locationSearch.clearSearch();
    setLocationDetails(null);
    resetSearchState();
    setShowLocationModal(false);
  };

  // Event handlers
  const handleServiceSelect = (serviceName) => {
    setSearchQuery(serviceName);
    setShowServiceSuggestions(false);
    setHasSearched(false);
  };

  const handleServiceFocus = () => {
    setIsServiceInputFocused(true);
    if (searchQuery.trim().length > 0) setShowServiceSuggestions(true);
  };

  const handleServiceBlur = () => {
    setIsServiceInputFocused(false);
    setTimeout(() => setShowServiceSuggestions(false), 200);
  };

  const handleSkillChange = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      resetSearchState();
    }
  };

  const handleLocationFocus = () => {
    setShowLocationModal(true);
  };

  const handleLocationQueryChange = (text) => {
    locationSearch.setLocationQuery(text);
    if (text.length > 2 && !showLocationModal) {
      setShowLocationModal(true);
    }
    if (!text.trim()) {
      setLocation('');
      setLocationDetails(null);
    }
  };

  const handleLocationSelect = (suggestion) => {
    const { suburb, city, town, village, county, state, region } = suggestion.address;
    const addressString = `${suburb || town || village || ""}, ${city || county || ""}, ${state || region || ""}`
      .trim()
      .replace(/^, |, $/g, '');

    setLocation(addressString);
    locationSearch.setLocationQuery(addressString);
    setLocationDetails({
      village,
      town,
      suburb: suburb || town || village,
      city: city || county,
      region: state || region,
      coordinates: [suggestion.lat, suggestion.lon],
    });
    setShowLocationModal(false);
  };

  const toggleTaskerSelection = (tasker) => {
    setSelectedTaskers((prev) => {
      const exists = prev.find((t) => t._id === tasker._id);
      return exists ? prev.filter((t) => t._id !== tasker._id) : [...prev, tasker];
    });
  };

  const selectAllTaskers = () => setSelectedTaskers([...searchResults]);
  const clearAllSelection = () => setSelectedTaskers([]);

  const handleFABPress = () => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    } else if (selectedTaskers.length > 0) {
      navigate('ServiceRequestForm', {
        selectedTaskers,
        serviceType: searchQuery,
        location: locationDetails || {
          suburb: location,
          city: location,
          region: location,
          town: location,
          village: location,
        },
        notifiedTaskers: selectedTaskers.map((t) => t._id),
      });
    } else {
      setIsSelectionMode(false);
    }
  };

  const handleViewProfile = (tasker) => {
    navigate('ApplicantProfile', { applicant: tasker });
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
    setShowServiceSuggestions(false);
    setShowLocationModal(false);
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
        if (!response.data.data.length) {
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

  // Render helpers
  const getSections = () => {
    const sections = [{ type: 'search', key: 'search' }];

    if (loading) {
      sections.push({ type: 'loading', key: 'loading' });
      return sections;
    }

    if (searchResults.length > 0) {
      sections.push({ type: 'resultsHeader', key: 'resultsHeader' });
      searchResults.forEach((tasker, idx) => {
        sections.push({ type: 'tasker', key: `tasker-${tasker._id || idx}`, tasker });
      });
      return sections;
    }

    if (hasSearched) {
      sections.push({ type: 'empty', key: 'empty' });
      return sections;
    }

    sections.push({ type: 'discovery', key: 'discovery' });
    return sections;
  };

  const renderSection = ({ item }) => {
    switch (item.type) {
      case 'search':
        return (
          <SearchSection
            searchQuery={searchQuery}
            onSearchQueryChange={handleSkillChange}
            onServiceFocus={handleServiceFocus}
            onServiceBlur={handleServiceBlur}
            locationQuery={locationSearch.locationQuery}
            onLocationQueryChange={handleLocationQueryChange}
            onLocationFocus={handleLocationFocus}
            searchingLocations={locationSearch.searchingLocations}
            onSearch={handleSearch}
            onClearAll={clearAllInputs}
            error={error}
            loading={loading}
            serviceSuggestionsComponent={
              <ServiceSuggestions
                suggestions={serviceSuggestions}
                onSelect={handleServiceSelect}
                visible={showServiceSuggestions}
              />
            }
          />
        );

      case 'loading':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Finding taskers near you...</Text>
          </View>
        );

      case 'resultsHeader':
        return (
          <View style={styles.resultsSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultsTitle}>
                {searchResults.length} Tasker{searchResults.length !== 1 ? 's' : ''} Found
              </Text>
              <Text style={styles.resultsSubtitle}>
                for "{searchQuery}" near {locationDetails?.city || location}
              </Text>
              {isSelectionMode && (
                <View style={styles.selectionInfoContainer}>
                  <Text style={styles.selectionModeText}>
                    Select multiple taskers to receive competitive offers
                  </Text>
                  <Text style={styles.selectionSubtext}>
                    Invite multiple professionals to submit proposals, then choose the best offer
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      case 'tasker':
        return isSelectionMode ? (
          <TaskerSelectionCard
            tasker={item.tasker}
            isSelected={selectedTaskers.some((t) => t._id === item.tasker._id)}
            onToggleSelect={toggleTaskerSelection}
            onViewProfile={handleViewProfile}
          />
        ) : (
          <TaskerCard tasker={item.tasker} onViewProfile={handleViewProfile} searchQuery={searchQuery} />
        );

      case 'empty':
        return (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No taskers found</Text>
            <Text style={styles.emptyText}>Try adjusting your search terms or location</Text>
          </View>
        );

      case 'discovery':
        return (
          <View style={styles.discoveryContent}>
            <Text style={styles.discoveryTitle}>Find Taskers Near You</Text>
            <Text style={styles.discoverySubtitle}>
              Browse popular services or search for specific needs
            </Text>
            <View style={styles.popularServicesGrid}>
              {SERVICE_SUGGESTIONS.slice(0, POPULAR_SERVICES_COUNT).map((service, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.popularServiceCard}
                  onPress={() => handleServiceSelect(service)}
                >
                  <Text style={styles.popularServiceText}>{service}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <Header title="Find Taskers" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isSelectionMode && (
          <SelectionHeader
            selectedCount={selectedTaskers.length}
            totalCount={searchResults.length}
            onSelectAll={selectAllTaskers}
            onClearAll={clearAllSelection}
            allSelected={selectedTaskers.length === searchResults.length}
          />
        )}

        <FlatList
          data={getSections()}
          renderItem={renderSection}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        />
      </KeyboardAvoidingView>

      <RequestServiceFAB
        selectedCount={selectedTaskers.length}
        onPress={handleFABPress}
        isVisible={showFAB}
        isSelectionMode={isSelectionMode}
      />

      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        locationQuery={locationSearch.locationQuery}
        onLocationQueryChange={handleLocationQueryChange}
        locationSuggestions={locationSearch.locationSuggestions}
        searchingLocations={locationSearch.searchingLocations}
        onLocationSelect={handleLocationSelect}
        slideAnim={slideAnim}
        backdropAnim={backdropAnim}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  listContent: {
    paddingBottom: 100,
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
  discoveryContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  discoveryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  discoverySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 20,
  },
  popularServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  popularServiceCard: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  popularServiceText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
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
});

export default SearchTaskersScreen;