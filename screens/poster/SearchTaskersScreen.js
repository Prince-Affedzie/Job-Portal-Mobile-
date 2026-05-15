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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// APIs and Services
import { searchTaskers } from '../../api/bidApi';
import { navigate } from '../../services/navigationService';

// Components
import Header from '../../component/tasker/Header';
import BookNowFAB from '../../component/client/BookNowFAB';

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

const TASKER_AVATARS = [
  'https://res.cloudinary.com/duv3qvvjz/image/upload/f_auto,q_auto/w_200,h_200,c_fill,g_face,r_max/v1767132141/casual-young-african-man-smiling-isolated-white_pjfa64.jpg',
  'https://res.cloudinary.com/duv3qvvjz/image/upload/f_auto,q_auto/w_200,h_200,c_fill,g_face,r_max/v1767132132/african-teenage-girl-portrait-happy-smiling-face_iqapqm.jpg',
  'https://res.cloudinary.com/duv3qvvjz/image/upload/f_auto,q_auto/w_200,h_200,c_fill,g_face,r_max/attractive-plus-size-model-white-shirt-apparel_szenla.jpg',
  'https://res.cloudinary.com/duv3qvvjz/image/upload/f_auto,q_auto/w_200,h_200,c_fill,g_face,r_max/blackprofile_lee5qh.jpg',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80&crop=faces',
  'https://images.unsplash.com/photo-1494790108755-2616b786d4d1?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80&crop=faces',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80&crop=faces',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80&crop=faces',
];

const SearchTaskersScreen = ({ navigation }) => {
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
  const [selectedTasker, setSelectedTasker] = useState(null); // single selection
  const [showLocationModal, setShowLocationModal] = useState(false);

  const locationSearch = useLocationSearch();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const showFAB = selectedTasker !== null;

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
      setSelectedTasker(null);
    }
  }, [searchResults]);

  useEffect(() => {
    locationSearch.debouncedSearch(locationSearch.locationQuery);
  }, [locationSearch.locationQuery]);

  const resetSearchState = () => {
    setHasSearched(false);
    setSearchResults([]);
    setError(null);
    setSelectedTasker(null);
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

  const handleServiceSelect = (serviceName) => {
    setSearchQuery(serviceName);
    setIsServiceInputFocused(false);
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
    if (!text.trim()) resetSearchState();
  };

  const handleLocationFocus = () => setShowLocationModal(true);

  const handleLocationQueryChange = (text) => {
    locationSearch.setLocationQuery(text);
    if (text.length > 2 && !showLocationModal) setShowLocationModal(true);
    if (!text.trim()) {
      setLocation('');
      setLocationDetails(null);
    }
  };

  const handleLocationSelect = (suggestion) => {
    const { suburb, city, town, village, county, state, region } = suggestion.address;
    const addressString = `${suburb || town || village || ''}, ${city || county || ''}, ${state || region || ''}`
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

  // Single-select toggle: tapping the same tasker deselects
  const handleSelectTasker = (tasker) => {
    const taskerId = tasker._id || tasker.id;

  setSelectedTasker((prev) => {
    const prevId = prev?._id || prev?.id;
    // If the same tasker is already selected, deselect – otherwise select
    if (prevId && taskerId && prevId === taskerId) return null;
    return tasker;
  });
  };

  const handleBookNow = () => {
    if (!selectedTasker) return;
    navigate('Booking', {
      selectedTasker,
      serviceType: searchQuery,
      location: locationDetails || {
        suburb: location,
        city: location,
        region: location,
        town: location,
        village: location,
      },
    });
  };

  const handleViewProfile = (tasker) => {
    navigate('ApplicantProfile', { taskerId: tasker._id });
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !location.trim()) {
      setError('Please enter both service needed and your location');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults([]);
    setSelectedTasker(null);
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
            <ActivityIndicator size="large" color="#1A56DB" />
            <Text style={styles.loadingText}>Finding taskers near you...</Text>
          </View>
        );

      case 'resultsHeader':
        return (
          <View style={styles.resultsSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultsTitle}>
                {searchResults.length} Tasker{searchResults.length !== 1 ? 's' : ''} Available
              </Text>
              <Text style={styles.resultsSubtitle}>
                "{searchQuery}" near {locationDetails?.city || location}
              </Text>
              <View style={styles.bookingHintContainer}>
                <Ionicons name="information-circle-outline" size={16} color="#1A56DB" />
                <Text style={styles.bookingHintText}>
                  Tap a tasker's card to select, then press Book Now
                </Text>
              </View>
            </View>
          </View>
        );

      case 'tasker':
        return (
          <TaskerCard
            tasker={item.tasker}
            isSelected={selectedTasker?._id === item.tasker._id}
            onSelect={handleSelectTasker}
            onViewProfile={handleViewProfile}
            searchQuery={searchQuery}
          />
        );

      case 'empty':
        return (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="search-outline" size={36} color="#1A56DB" />
            </View>
            <Text style={styles.emptyTitle}>No taskers found</Text>
            <Text style={styles.emptyText}>Try adjusting your search terms or location</Text>
          </View>
        );

      case 'discovery':
        return (
          <View style={styles.discoveryContent}>
            <View style={styles.avatarsHeader}>
              <Text style={styles.avatarsTitle}>Taskers Ready to Help</Text>
              <Text style={styles.avatarsSubtitle}>
                {TASKER_AVATARS.length}+ vetted professionals in your area
              </Text>
            </View>

            <View style={styles.avatarGroup}>
              {TASKER_AVATARS.slice(0, 5).map((avatar, index) => (
                <Image
                  key={index}
                  source={{ uri: avatar }}
                  style={[styles.groupAvatar, { marginLeft: index > 0 ? -20 : 0 }]}
                  resizeMode="cover"
                />
              ))}
              <View style={styles.avatarCountBadge}>
                <Text style={styles.avatarCountText}>+{TASKER_AVATARS.length}</Text>
              </View>
            </View>

            <View style={styles.welcomeMessage}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="hand-left" size={22} color="#1A56DB" />
              </View>
              <Text style={styles.welcomeText}>
                Hi there! Search for a service and your location to find and book a tasker instantly.
              </Text>
            </View>

            <View style={styles.popularServicesSection}>
              <Text style={styles.sectionTitle}>Popular Services</Text>
              <Text style={styles.sectionSubtitle}>Tap any service to start your search</Text>
              <View style={styles.popularServicesGrid}>
                {SERVICE_SUGGESTIONS.slice(0, POPULAR_SERVICES_COUNT).map((service, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.popularServiceCard}
                    onPress={() => handleServiceSelect(service)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.popularServiceText}>{service}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>How it works</Text>
              {[
                { icon: 'search-outline', color: '#1A56DB', bg: '#EBF5FF', text: 'Search for any service and enter your location' },
                { icon: 'person-outline', color: '#0E9F6E', bg: '#E3FCEC', text: 'Browse profiles and select your preferred tasker' },
                { icon: 'calendar-outline', color: '#7E3AF2', bg: '#F3F0FF', text: 'Confirm your booking and get it done' },
              ].map((tip, i) => (
                <View key={i} style={styles.tipItem}>
                  <View style={[styles.tipIcon, { backgroundColor: tip.bg }]}>
                    <Ionicons name={tip.icon} size={16} color={tip.color} />
                  </View>
                  <Text style={styles.tipText}>{tip.text}</Text>
                </View>
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header title="Find Taskers" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={getSections()}
          renderItem={renderSection}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        />
      </KeyboardAvoidingView>

      <BookNowFAB
        tasker={selectedTasker}
        onPress={handleBookNow}
        isVisible={true}
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
    backgroundColor: '#F8FAFF',
  },
  listContent: {
    paddingBottom: 110,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
  },
  resultsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  resultHeader: {
    marginBottom: 8,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  resultsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  bookingHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1A56DB',
  },
  bookingHintText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '500',
    flex: 1,
  },
  discoveryContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  avatarsHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  avatarsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#E5E7EB',
    elevation: 2,
  },
  avatarCountBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A56DB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginLeft: -20,
    elevation: 3,
  },
  avatarCountText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  welcomeMessage: {
    backgroundColor: '#EBF5FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#1A56DB',
  },
  welcomeIcon: {
    marginRight: 12,
    marginTop: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 21,
    fontWeight: '500',
    flex: 1,
  },
  popularServicesSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },
  popularServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularServiceCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  popularServiceText: {
    fontSize: 13,
    color: '#1A56DB',
    fontWeight: '600',
  },
  tipsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    elevation: 1,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SearchTaskersScreen;