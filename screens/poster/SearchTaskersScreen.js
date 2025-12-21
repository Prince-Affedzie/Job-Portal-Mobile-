// screens/client/SearchTaskersScreen.js - COMPLETE FIXED VERSION
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchTaskers } from '../../api/bidApi';
import Header from '../../component/tasker/Header';
import { navigate } from '../../services/navigationService';

// Import components
import TaskerSelectionCard from '../../component/client/TaskerSelectionCard';
import RequestServiceFAB from '../../component/client/RequestServiceFAB';
import SelectionHeader from '../../component/client/SelectionHeader';

const { width, height } = Dimensions.get('window');

// Service suggestions database
const SERVICE_SUGGESTIONS = [
  'Plumbing', 'Electrical Repairs', 'Carpentry', 'Painting', 'Cleaning Services',
  'Graphic Design', 'Video Editing', 'Photo Editing', 'Digital Marketing',
  'Video Production', 'Interior Design',
  'Web Development', 'Animation', 'Motion Graphics',
  'Video Production',

  // Digital & Tech
  'Software Engineering', 'Mobile App Development', 'UI/UX Design',
   'SEO/SEM', 'Social Media Management', 'Data Analysis', 'AI/ML',
  'Cybersecurity', 'Network Administration', 'IT Support', 'Cloud Computing',
  
  // Creative & Design
  'Logo Design', 'Brand Identity', 'Interior Decor', 'Interior Design',
  'Architectural Design', '3D Modeling', 'Animation', 'Motion Graphics',
  'Video Production', 'Photography', 'Illustration', 'Fashion Design',
  'Product Design', 'Creative Writing',
  
  // Home & Professional Services
  'Gardening', 'Landscaping', 'Moving & Packing', 'Home Appliance Repair',
  'HVAC Installation', 'CCTV Installation', 'Home Security', 'Home Renovation',
  'Event Planning', 'Catering', 'Personal Training', 'Tutoring',
  'Language Translation', 'Virtual Assistance', 'Accounting',
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

  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [searchingLocations, setSearchingLocations] = useState(false);

  const [selectedTaskers, setSelectedTaskers] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const locationInputRef = useRef(null);
  const skillInputRef = useRef(null);
  
  const debounceTimeout = useRef(null);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // ====== FIX 1: Consistent Modal Triggering ======
  const showLocationModal = () => {
   
    setShowLocationSuggestions(true);
  };

  // Filter service suggestions
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      const filtered = SERVICE_SUGGESTIONS
        .filter(service => 
          service.toLowerCase().includes(query) ||
          query.split(' ').some(word => service.toLowerCase().includes(word))
        )
        .slice(0, 8);
      
      setServiceSuggestions(filtered);
      setShowServiceSuggestions(filtered.length > 0 && isServiceInputFocused);
    } else {
      setServiceSuggestions([]);
      setShowServiceSuggestions(false);
    }
  }, [searchQuery, isServiceInputFocused]);

  // Reset when inputs cleared
  useEffect(() => {
    if (!searchQuery.trim() && !location.trim()) {
      setHasSearched(false);
      setSearchResults([]);
      setError(null);
      setSelectedTaskers([]);
      setIsSelectionMode(false);
      setShowServiceSuggestions(false);
    }
  }, [searchQuery, location]);

  // Modal animation
  useEffect(() => {
  
    if (showLocationSuggestions) {
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
  }, [showLocationSuggestions]);

  // Reset selection on new results
  useEffect(() => {
    if (searchResults.length > 0) {
      setSelectedTaskers([]);
      setIsSelectionMode(false);
    }
  }, [searchResults]);

  const handleServiceSelect = (serviceName) => {
    setSearchQuery(serviceName);
    setShowServiceSuggestions(false);
    setHasSearched(false);
    setTimeout(() => locationInputRef.current?.focus(), 100);
  };

  const handleServiceFocus = () => {
    setIsServiceInputFocused(true);
    if (searchQuery.trim().length > 0) setShowServiceSuggestions(true);
  };

  const handleServiceBlur = () => {
    setIsServiceInputFocused(false);
    setTimeout(() => setShowServiceSuggestions(false), 200);
  };

  // ====== FIX 2: Proper Skill Input Handling ======
  const handleSkillChange = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setHasSearched(false);
      setSearchResults([]);
      setSelectedTaskers([]);
      setIsSelectionMode(false);
    }
  };

  const toggleTaskerSelection = (tasker) => {
    setSelectedTaskers(prev => {
      const exists = prev.find(t => t._id === tasker._id);
      return exists ? prev.filter(t => t._id !== tasker._id) : [...prev, tasker];
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
        location: locationDetails || { suburb: location, city: location, region: location, town: location, village: location },
        notifiedTaskers: selectedTaskers.map(t => t._id)
      });
    } else {
      setIsSelectionMode(false);
    }
  };

  const handleViewProfile = (tasker) => {
    navigate('ApplicantProfile', { applicant: tasker });
  };

  // Service Suggestions Dropdown
  const ServiceSuggestionsDropdown = () => {
    if (!showServiceSuggestions || serviceSuggestions.length === 0) return null;

    return (
      <View style={styles.serviceSuggestionsContainer}>
        <View style={styles.suggestionsHeader}>
          <Text style={styles.suggestionsTitle}>Suggested Services</Text>
          <Text style={styles.suggestionsSubtitle}>{serviceSuggestions.length} suggestions</Text>
        </View>
        {/* Using View instead of FlatList to avoid nesting warnings */}
        <View style={styles.suggestionsList}>
          {serviceSuggestions.map((item, index) => (
            <React.Fragment key={`service-${index}`}>
              <TouchableOpacity 
                style={styles.suggestionItem} 
                onPress={() => handleServiceSelect(item)} 
                activeOpacity={0.7}
              >
                <View style={styles.suggestionIconContainer}>
                  <Ionicons name="search" size={18} color="#6366F1" />
                </View>
                <Text style={styles.suggestionText} numberOfLines={1}>{item}</Text>
              </TouchableOpacity>
              {index < serviceSuggestions.length - 1 && (
                <View style={styles.suggestionSeparator} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };


// TaskerCard (inspired by TaskRabbit/Fiverr)
const TaskerCard = ({ tasker }) => {
 
  const getServiceBadgeColor = () => {
    const service = searchQuery.toLowerCase();
    if (service.includes('clean') || service.includes('home')) return '#10B981';
    if (service.includes('tech') || service.includes('digital')) return '#6366F1';
    if (service.includes('design') || service.includes('creative')) return '#8B5CF6';
    if (service.includes('repair') || service.includes('install')) return '#F59E0B';
    return '#3B82F6';
  };

  // Format hourly rate or budget
  const formatRate = () => {
    if (tasker.hourlyRate) return `GHS ${tasker.hourlyRate}/hr`;
    if (tasker.minBudget && tasker.maxBudget) return `GHS ${tasker.minBudget}-${tasker.maxBudget}`;
    if (tasker.budget) return `GHS ${tasker.budget}`;
    return 'Contact for price';
  };

  // Get tasker's primary skill
  const getPrimarySkill = () => {
    if (tasker.skills?.length > 0) return tasker.skills[0];
    if (tasker.category) return tasker.category;
    return 'Skilled Professional';
  };

  return (
    <TouchableOpacity 
      style={styles.taskerCard}
      activeOpacity={0.8}
      onPress={() => handleViewProfile(tasker)}
    >
      {/* Top Section with Image and Badges */}
      <View style={styles.taskerTopSection}>
        {/* Large Profile Image */}
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: tasker.profileImage || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80' }}
            style={styles.profileImage}
          />
          
          {/* Verified Badge */}
          {tasker.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </View>
          )}
          
          {/* Online Status Indicator */}
          {tasker.isOnline && (
            <View style={styles.onlineIndicator} />
          )}
        </View>

        {/* Rating and Distance Badge */}
        <View style={styles.ratingBadge}>
          <View style={styles.ratingStars}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>{tasker.rating?.toFixed(1) || '5.0'}</Text>
            {tasker.numberOfRatings > 0 && (
              <Text style={styles.ratingCount}>({tasker.numberOfRatings})</Text>
            )}
          </View>
          {tasker.distance && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={12} color="#FFFFFF" />
              <Text style={styles.distanceText}>{formatDistance(tasker.distance)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tasker Details Section */}
      <View style={styles.taskerDetails}>
        <View style={styles.nameAndRate}>
          <View style={styles.nameContainer}>
            <Text style={styles.taskerName} numberOfLines={1}>
              {tasker.name || 'Professional Tasker'}
            </Text>
            {tasker.isPro && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.hourlyRate}>{formatRate()}</Text>
        </View>

        {/* Primary Skill */}
        <View style={styles.skillBadge}>
          <Ionicons name="briefcase-outline" size={14} color={getServiceBadgeColor()} />
          <Text style={[styles.skillText, { color: getServiceBadgeColor() }]} numberOfLines={1}>
            {getPrimarySkill()}
          </Text>
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.locationText} numberOfLines={1}>
            {formatTaskerLocation(tasker.location) || 'Available Nationwide'}
          </Text>
        </View>

        {/* Brief Description/Highlights */}
        {tasker.Bio && (
          <Text style={styles.taskerBio} numberOfLines={2}>
            {tasker.Bio.length > 80 ? `${tasker.Bio.substring(0, 80)}...` : tasker.Bio}
          </Text>
        )}

        {/* Stats Row (like Fiverr) */}
        <View style={styles.statsRow}>
          {tasker.completedJobs > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="checkmark-done" size={14} color="#10B981" />
              <Text style={styles.statText}>{tasker.completedJobs} jobs</Text>
            </View>
          )}
          
          {tasker.responseRate && (
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={14} color="#6366F1" />
              <Text style={styles.statText}>{tasker.responseRate}% response</Text>
            </View>
          )}

          {tasker.onTimeRate && (
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={14} color="#F59E0B" />
              <Text style={styles.statText}>{tasker.onTimeRate}% on time</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/*<TouchableOpacity 
            style={styles.messageButton}
            onPress={() => navigate('Chat', { 
              userId: tasker._id,
              userName: tasker.name 
            })}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6366F1" />
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>*/}

          <TouchableOpacity 
            style={styles.hireButton}
            onPress={() => handleViewProfile(tasker)}
          >
            <Text style={styles.hireButtonText}>View Profile</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};
  // ====== FIX 3: Proper Location Input Handling ======
  const handleLocationFocus = () => {
    showLocationModal();
  };

  const handleLocationQueryChange = (text) => {
   
    setLocationQuery(text);
    
    // Show modal when user starts typing (if not already shown)
    if (text.length > 2 && !showLocationSuggestions) {
      showLocationModal();
    }
    
    // Clear location data if text is empty
    if (!text.trim()) {
      setLocation('');
      setLocationDetails(null);
      // Don't hide modal - let user keep typing
    }
  };

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
    setShowServiceSuggestions(false);
    setShowLocationSuggestions(false);
  };

  const formatTaskerLocation = (location) => {
    if (!location) return null;
    const parts = [];
    if (location.street) parts.push(location.street);
    if (location.town) parts.push(location.town);
    if (location.city) parts.push(location.city);
    if (location.region) parts.push(location.region);
    return [...new Set(parts)].join(', ') || null;
  };

  const formatDistance = (meters) => {
    if (!meters) return 'Nearby';
    return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
  };

  // Location search
  const searchLocations = useCallback(async (query) => {
    if (!query.trim() || query.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    setSearchingLocations(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=20&countrycodes=gh&addressdetails=1`,
        { headers: { 'User-Agent': 'WorkaflowApp/1.0(support@Workaflow.com)' } }
      );
      const data = await response.json();
      const suggestions = data.map(item => ({
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
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => searchLocations(locationQuery), 300);
    return () => clearTimeout(debounceTimeout.current);
  }, [locationQuery, searchLocations]);

  const handleLocationSelect = (suggestion) => {
    const { suburb, city, town, village, county, state, region } = suggestion.address;
    const addressString = `${suburb || town || village || ""}, ${city || county || ""}, ${state || region || ""}`.trim().replace(/^, |, $/g, '');
    
    setLocation(addressString);
    setLocationQuery(addressString);
    setLocationDetails({
      village, town, suburb: suburb || town || village, city: city || county, region: state || region,
      coordinates: [suggestion.lat, suggestion.lon]
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
    setShowServiceSuggestions(false);
    setShowLocationSuggestions(false);
    setHasSearched(true);

    try {
      const searchData = {
        searchQuery: searchQuery.trim(),
        address: locationDetails || { suburb: location, city: location, region: location, town: location, village: location },
      };

      const response = await searchTaskers(searchData);
      if (response.data.success) {
        setSearchResults(response.data.data || []);
        if (!response.data.data.length) setError('No taskers found. Try different search terms.');
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
    const parts = [];
    if (address.suburb || address.town || address.village) parts.push(address.suburb || address.town || address.village);
    if (address.city || address.county) parts.push(address.city || address.county);
    if (address.state || address.region) parts.push(address.state || address.region);
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
    <TouchableOpacity style={styles.suggestionItem} onPress={() => handleLocationSelect(suggestion)} activeOpacity={0.7}>
      <View style={styles.suggestionIconContainer}>
        <Ionicons name={getLocationIcon(suggestion.type)} size={22} color="#007AFF" />
      </View>
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.suggestionMainText} numberOfLines={1}>{formatAddress(suggestion)}</Text>
        <Text style={styles.suggestionSubText} numberOfLines={2}>{suggestion.displayName}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  const showFAB = searchResults.length > 0 && hasSearched && !loading;

  // Build dynamic sections for FlatList
  const getSections = () => {
    const sections = [];

    // Always show search inputs
    sections.push({ type: 'search', key: 'search' });

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
          <View style={styles.searchSection}>
            {/* Service Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputContainer}>
                <View style={styles.iconCircle}><Ionicons name="construct" size={18} color="#FFF" /></View>
                <TextInput
                  ref={skillInputRef}
                  style={styles.textInput}
                  placeholder="What service do you need?"
                  placeholderTextColor="#8E8E93"
                  value={searchQuery}
                  onChangeText={handleSkillChange}
                  onFocus={handleServiceFocus}
                  onBlur={handleServiceBlur}
                  onSubmitEditing={() => {
                    locationInputRef.current?.focus();
                    //showLocationModal(); // Open modal when moving to location
                  }}
                  returnKeyType="next"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color="#C7C7CC" /></TouchableOpacity>
                )}
              </View>
              <ServiceSuggestionsDropdown />
            </View>

            {/* ====== FIX 4: Correct Location Input Element ====== */}
            <View style={styles.inputGroup}>
              <View style={styles.inputContainer}>
                <View style={styles.iconSquare}><Ionicons name="location" size={18} color="#FFF" /></View>
                <TextInput
                  ref={locationInputRef}
                  style={styles.textInput}
                  placeholder="Enter your location"
                  placeholderTextColor="#8E8E93"
                  value={locationQuery}
                  onChangeText={handleLocationQueryChange}
                  onFocus={handleLocationFocus}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  // Make it clear this opens a modal
                  showSoftInputOnFocus={false} // This prevents keyboard from opening
                  onTouchStart={handleLocationFocus} // Alternative trigger
                />
                {searchingLocations ? <ActivityIndicator size="small" color="#000" /> : locationQuery.length > 0 && (
                  <TouchableOpacity onPress={() => { 
                    setLocationQuery(''); 
                    setLocation(''); 
                    setLocationDetails(null); 
                  }}>
                    <Ionicons name="close-circle" size={20} color="#C7C7CC" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Search Button */}
            {(searchQuery.trim() || location.trim()) && (
              <TouchableOpacity
                style={[styles.searchButton, (!searchQuery.trim() || !location.trim()) && styles.searchButtonDisabled]}
                onPress={handleSearch}
                disabled={!searchQuery.trim() || !location.trim()}
              >
                <Ionicons name="search" size={20} color="#FFF" />
                <Text style={styles.searchButtonText}>Search Taskers</Text>
              </TouchableOpacity>
            )}

            {/* Clear All Button */}
            {(searchQuery.trim() || location.trim()) && (
              <TouchableOpacity style={styles.clearButton} onPress={clearAllInputs}>
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
              <Text style={styles.resultsTitle}>{searchResults.length} Tasker{searchResults.length !== 1 ? 's' : ''} Found</Text>
              <Text style={styles.resultsSubtitle}>for "{searchQuery}" near {locationDetails?.city || location}</Text>
              {isSelectionMode && (
                <View style={styles.selectionInfoContainer}>
                  <Text style={styles.selectionModeText}>Select multiple taskers to receive competitive offers</Text>
                  <Text style={styles.selectionSubtext}>Invite multiple professionals to submit proposals, then choose the best offer</Text>
                </View>
              )}
            </View>
          </View>
        );

      case 'tasker':
        return isSelectionMode ? (
          <TaskerSelectionCard
            tasker={item.tasker}
            isSelected={selectedTaskers.some(t => t._id === item.tasker._id)}
            onToggleSelect={toggleTaskerSelection}
            onViewProfile={handleViewProfile}
          />
        ) : (
          <TaskerCard tasker={item.tasker} />
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
            <Text style={styles.discoverySubtitle}>Browse popular services or search for specific needs</Text>
            <View style={styles.popularServicesGrid}>
              {SERVICE_SUGGESTIONS.slice(0, 12).map((service, index) => (
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
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
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          // ====== FIX 5: Remove nested scrollview warning ======
          ListHeaderComponent={null}
          ListFooterComponent={null}
        />
      </KeyboardAvoidingView>

      <RequestServiceFAB
        selectedCount={selectedTaskers.length}
        onPress={handleFABPress}
        isVisible={showFAB}
        isSelectionMode={isSelectionMode}
      />

      {/* ====== FIX 6: Location Modal without nested FlatList ====== */}
      <Modal 
        visible={showLocationSuggestions} 
        transparent 
        animationType="none" 
        onRequestClose={() => setShowLocationSuggestions(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
            <TouchableOpacity 
              style={{ flex: 1 }} 
              activeOpacity={1} 
              onPress={() => setShowLocationSuggestions(false)}
            />
          </Animated.View>

          <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowLocationSuggestions(false)} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Choose Location</Text>
                <View style={styles.headerSpacer} />
              </View>

              <View style={styles.modalSearchContainer}>
                <View style={styles.modalInputContainer}>
                  <View style={styles.modalIconSquare}><Ionicons name="search" size={20} color="#FFF" /></View>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="Search for a location"
                    placeholderTextColor="#8E8E93"
                    value={locationQuery}
                    onChangeText={handleLocationQueryChange}
                    autoFocus
                    returnKeyType="done"
                  />
                  {locationQuery.length > 0 && (
                    <TouchableOpacity onPress={() => { 
                      setLocationQuery(''); 
                      setShowLocationSuggestions(true); // Keep modal open
                    }}>
                      <Ionicons name="close-circle" size={22} color="#C7C7CC" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* ====== Using ScrollView instead of FlatList ====== */}
              <View style={styles.modalBody}>
                {searchingLocations ? (
                  <View style={styles.modalLoadingContainer}>
                    <ActivityIndicator size="large" color="#000" />
                    <Text style={styles.modalLoadingText}>Searching locations...</Text>
                  </View>
                ) : locationSuggestions.length > 0 ? (
                  <>
                    <Text style={styles.resultsCount}>{locationSuggestions.length} location{locationSuggestions.length !== 1 ? 's' : ''} found</Text>
                    <ScrollView 
                      style={styles.modalScrollView}
                      keyboardShouldPersistTaps="always"
                      showsVerticalScrollIndicator={false}
                    >
                      {locationSuggestions.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <LocationSuggestionItem suggestion={item} />
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
                    <Text style={styles.modalEmptyText}>Try a different search term</Text>
                  </View>
                ) : (
                  <View style={styles.modalEmptyState}>
                    <Ionicons name="map-outline" size={64} color="#C7C7CC" />
                    <Text style={styles.modalEmptyTitle}>Start typing</Text>
                    <Text style={styles.modalEmptyText}>Enter at least 2 characters to search</Text>
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
  listContent: {
    paddingBottom: 100,
  },
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
  
  // Service Suggestions Styles
  serviceSuggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    zIndex: 1000,
  },
  suggestionsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  suggestionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  suggestionsSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  suggestionsList: {
    paddingBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
  },
  suggestionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '400',
  },
  suggestionSeparator: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginLeft: 60,
  },
  
  // Search Button
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
  
  // Clear Button
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
  
  // Error
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
  
  // Loading
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
  
  // Results
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
  
  taskerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },

  
  taskerTopSection: {
    position: 'relative',
    height: 160,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },

  profileImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },

  profileImage: {
    width: '100%',
    height: '150%',
    resizeMode: 'cover',
  },

  verifiedBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#10B981',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  onlineIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'flex-end',
    gap: 6,
  },

  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },

  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },

  ratingCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },

  distanceText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

 
  taskerDetails: {
    padding: 16,
  },

  nameAndRate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },

  taskerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },

  proBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },

  proBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  hourlyRate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },

  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },

  skillText: {
    fontSize: 13,
    fontWeight: '600',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },

  locationText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },

  taskerBio: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 14,
    fontStyle: 'italic',
  },

 
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  messageButtonText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },

  hireButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },

  hireButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  
  // Discovery Content
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
  
  // Empty State
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

  // MODAL STYLES
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

export default SearchTaskersScreen;