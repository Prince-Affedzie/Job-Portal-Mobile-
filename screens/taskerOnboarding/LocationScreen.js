import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  LayoutAnimation,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { REGIONS } from '../../data/taskerOnboardingData';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const LocationScreen = () => {
  const { 
    location, 
    updateLocation, 
    goToNextStep, 
    goToPreviousStep,
    errors,
    clearErrors 
  } = useTaskerOnboarding();
  
  const navigation = useNavigation();
  const cityInputRef = useRef();
  const townInputRef = useRef();

  // Enhanced state management
  const [formData, setFormData] = useState({
    region: location.region || '',
    city: location.city || '',
    town: location.town || '',
    street: location.street || '',
  });

  const [showRegionModal, setShowRegionModal] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Filter regions based on search
  const filteredRegions = useMemo(() => {
    if (!searchQuery) return REGIONS;
    return REGIONS.filter(region =>
      region.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Auto-focus and animations on mount
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }, 200);

      return () => clearTimeout(timer);
    }, [fadeAnim, slideAnim])
  );

  // Enhanced validation
  const isFormValid = useMemo(() => {
    return formData.region.trim().length > 0 && 
           formData.city.trim().length >= 2;
  }, [formData.region, formData.city]);

  // Smart location detection
  const detectCurrentLocation = async () => {
    setIsDetectingLocation(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Access Required',
          'Please enable location services to automatically detect your area.',
          [{ text: 'OK' }]
        );
        return;
      }

      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const [address] = await Location.reverseGeocodeAsync({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      });

      if (address) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        
        setFormData(prev => ({
          ...prev,
          city: address.city || prev.city,
          region: address.region || prev.region,
        }));
      }
    } catch (error) {
      console.log('Location detection error:', error);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Enhanced form handling
  const handleChange = useCallback((field, value) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      clearErrors();
    }
  }, [errors, clearErrors]);

  const handleRegionSelect = (region) => {
    handleChange('region', region);
    setShowRegionModal(false);
    setSearchQuery('');
  };

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 15, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleSubmit = async () => {
    if (!isFormValid) {
      triggerShake();
      return;
    }

    updateLocation(formData);
    
    // Smooth transition
    LayoutAnimation.configureNext({
      duration: 400,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
    });

    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (goToNextStep()) {
      navigation.navigate('Skills');
    }
  };

  const handleBack = () => {
    updateLocation(formData);
    goToPreviousStep();
    navigation.goBack();
  };

  const styles = {
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      padding: 24,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: '#1C1E21',
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 17,
      color: '#65676B',
      lineHeight: 22,
    },
    locationDetection: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F0F8FF',
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
      borderLeftWidth: 4,
      borderLeftColor: '#007AFF',
    },
    detectionText: {
      flex: 1,
      fontSize: 15,
      color: '#007AFF',
      fontWeight: '500',
      marginLeft: 12,
    },
    inputContainer: {
      marginBottom: 24,
    },
    labelContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1C1E21',
      letterSpacing: -0.3,
    },
    optionalLabel: {
      fontSize: 14,
      color: '#8A8D91',
      fontWeight: '500',
    },
    inputWrapper: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 2,
      borderColor: '#E4E6EA',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    inputWrapperFocused: {
      borderColor: '#007AFF',
      shadowColor: '#007AFF',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    inputWrapperError: {
      borderColor: '#FF3B30',
      shadowColor: '#FF3B30',
      shadowOpacity: 0.1,
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
    },
    selectorText: {
      fontSize: 17,
      color: '#1C1E21',
      fontWeight: '400',
    },
    selectorPlaceholder: {
      fontSize: 17,
      color: '#8A8D91',
    },
    textInput: {
      padding: 20,
      fontSize: 17,
      color: '#1C1E21',
      fontWeight: '400',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingLeft: 4,
    },
    errorText: {
      fontSize: 14,
      color: '#FF3B30',
      fontWeight: '500',
      marginLeft: 6,
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 16,
    },
    progressStep: {
      alignItems: 'center',
      marginHorizontal: 6,
    },
    progressDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#E4E6EA',
      marginBottom: 6,
    },
    progressDotCompleted: {
      backgroundColor: '#34C759',
    },
    progressDotActive: {
      backgroundColor: '#007AFF',
      transform: [{ scale: 1.2 }],
    },
    progressLabel: {
      fontSize: 12,
      color: '#65676B',
      fontWeight: '500',
    },
    progressLabelActive: {
      color: '#007AFF',
      fontWeight: '600',
    },
    footer: {
      backgroundColor: '#FFFFFF',
      padding: 24,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      borderTopWidth: 1,
      borderTopColor: '#E4E6EA',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    backButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      backgroundColor: '#F8F9FA',
      borderRadius: 16,
      borderWidth: 2,
      borderColor: '#E4E6EA',
      gap: 8,
    },
    backButtonText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#65676B',
    },
    continueButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      backgroundColor: '#007AFF',
      borderRadius: 16,
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      gap: 8,
      transform: [{ scale: isFormValid ? 1 : 0.98 }],
    },
    continueButtonDisabled: {
      backgroundColor: '#E4E6EA',
      shadowOpacity: 0,
      elevation: 0,
    },
    continueButtonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '600',
    },
  };

  const modalStyles = {
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    content: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: height * 0.8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 16,
    },
    header: {
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: '#E4E6EA',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: 17,
      color: '#1C1E21',
      marginLeft: 12,
    },
    list: {
      maxHeight: height * 0.6,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    itemSelected: {
      backgroundColor: '#F0F6FF',
    },
    itemText: {
      fontSize: 17,
      color: '#1C1E21',
      fontWeight: '400',
    },
    itemTextSelected: {
      color: '#007AFF',
      fontWeight: '600',
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: '#8A8D91',
      marginTop: 12,
    },
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={{ 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Set Your Location</Text>
              <Text style={styles.subtitle}>
                Help us connect you with opportunities in your area
              </Text>
            </View>

            {/* Location Detection */}
            <TouchableOpacity 
              style={styles.locationDetection}
              onPress={detectCurrentLocation}
              disabled={isDetectingLocation}
            >
              <Ionicons 
                name="navigate" 
                size={20} 
                color="#007AFF" 
              />
              <Text style={styles.detectionText}>
                {isDetectingLocation ? 'Detecting your location...' : 'Use my current location'}
              </Text>
              {isDetectingLocation ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="chevron-forward" size={16} color="#007AFF" />
              )}
            </TouchableOpacity>

            {/* Region Selector */}
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Region *</Text>
                <TouchableOpacity
                  style={[
                    styles.inputWrapper,
                    focusedField === 'region' && styles.inputWrapperFocused,
                    errors.region && styles.inputWrapperError
                  ]}
                  onPress={() => setShowRegionModal(true)}
                >
                  <View style={styles.selector}>
                    <Text style={formData.region ? styles.selectorText : styles.selectorPlaceholder}>
                      {formData.region || 'Select your region'}
                    </Text>
                    <Ionicons 
                      name="chevron-down" 
                      size={20} 
                      color={formData.region ? "#007AFF" : "#8A8D91"} 
                    />
                  </View>
                </TouchableOpacity>
                {errors.region && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="warning" size={16} color="#FF3B30" />
                    <Text style={styles.errorText}>{errors.region}</Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* City Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>City *</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'city' && styles.inputWrapperFocused,
                errors.city && styles.inputWrapperError
              ]}>
                <TextInput
                  ref={cityInputRef}
                  style={styles.textInput}
                  placeholder="Enter your city"
                  placeholderTextColor="#8A8D91"
                  value={formData.city}
                  onChangeText={(text) => handleChange('city', text)}
                  onFocus={() => setFocusedField('city')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => townInputRef.current?.focus()}
                  selectionColor="#007AFF"
                />
              </View>
              {errors.city && (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning" size={16} color="#FF3B30" />
                  <Text style={styles.errorText}>{errors.city}</Text>
                </View>
              )}
            </View>

            {/* Optional Fields */}
            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Suburb / Town</Text>
                <Text style={styles.optionalLabel}>Optional</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={townInputRef}
                  style={styles.textInput}
                  placeholder="Enter your suburb or town"
                  placeholderTextColor="#8A8D91"
                  value={formData.town}
                  onChangeText={(text) => handleChange('town', text)}
                  onFocus={() => setFocusedField('town')}
                  onBlur={() => setFocusedField(null)}
                  selectionColor="#007AFF"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Street Address</Text>
                <Text style={styles.optionalLabel}>Optional</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your street address"
                  placeholderTextColor="#8A8D91"
                  value={formData.street}
                  onChangeText={(text) => handleChange('street', text)}
                  onFocus={() => setFocusedField('street')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={handleSubmit}
                  selectionColor="#007AFF"
                />
              </View>
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              {['Profile', 'Location', 'Skills', 'Photo', 'Review'].map((step, index) => (
                <View key={step} style={styles.progressStep}>
                  <View style={[
                    styles.progressDot,
                    index < 1 && styles.progressDotCompleted,
                    index === 1 && styles.progressDotActive
                  ]} />
                  <Text style={[
                    styles.progressLabel,
                    index === 1 && styles.progressLabelActive
                  ]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={20} color="#65676B" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.continueButton,
                !isFormValid && styles.continueButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Go to Skills</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Region Modal */}
        <Modal
          visible={showRegionModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowRegionModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowRegionModal(false)}>
            <View style={modalStyles.overlay}>
              <TouchableWithoutFeedback>
                <View style={modalStyles.content}>
                  <View style={modalStyles.header}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#1C1E21' }}>
                      Select Your Region
                    </Text>
                    <TouchableOpacity 
                      onPress={() => setShowRegionModal(false)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close" size={24} color="#65676B" />
                    </TouchableOpacity>
                  </View>

                  {/* Search Bar */}
                  <View style={modalStyles.searchContainer}>
                    <Ionicons name="search" size={20} color="#8A8D91" />
                    <TextInput
                      style={modalStyles.searchInput}
                      placeholder="Search regions..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor="#8A8D91"
                    />
                  </View>

                  <ScrollView style={modalStyles.list}>
                    {filteredRegions.length > 0 ? (
                      filteredRegions.map((region) => (
                        <TouchableOpacity
                          key={region.value}
                          style={[
                            modalStyles.item,
                            formData.region === region.value && modalStyles.itemSelected
                          ]}
                          onPress={() => handleRegionSelect(region.value)}
                        >
                          <Text style={[
                            modalStyles.itemText,
                            formData.region === region.value && modalStyles.itemTextSelected
                          ]}>
                            {region.label}
                          </Text>
                          {formData.region === region.value && (
                            <Ionicons name="checkmark" size={20} color="#007AFF" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={modalStyles.emptyState}>
                        <Ionicons name="search-outline" size={48} color="#E4E6EA" />
                        <Text style={modalStyles.emptyText}>No regions found</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LocationScreen;