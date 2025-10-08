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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { REGIONS } from '../../data/taskerOnboardingData';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

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
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredRegions = useMemo(() => {
    if (!searchQuery) return REGIONS;
    return REGIONS.filter(region =>
      region.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const isFormValid = useMemo(() => {
    return formData.region.trim().length > 0 && 
           formData.city.trim().length >= 2;
  }, [formData.region, formData.city]);

  const detectCurrentLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Access Needed',
          'Please enable location services to detect your area.',
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
        setFormData(prev => ({
          ...prev,
          city: address.city || prev.city,
          region: address.region || prev.region,
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to detect location. Please try again or enter manually.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      clearErrors();
    }
  }, [errors, clearErrors]);

  const handleRegionSelect = (region) => {
    handleChange('region', region);
    setShowRegionModal(false);
    setSearchQuery('');
    cityInputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!isFormValid) {
      Alert.alert(
        'Incomplete Information',
        'Please select a region and enter a city.',
        [{ text: 'OK' }]
      );
      return;
    }

    updateLocation(formData);
    if (goToNextStep()) {
      navigation.navigate('Skills');
    }
  };

  const handleBack = () => {
    updateLocation(formData);
    goToPreviousStep();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : hp('2%')}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.header}>
              <Text style={styles.title}>Set Your Location</Text>
              <Text style={styles.subtitle}>
                Enter your location to connect with local opportunities
              </Text>
            </View>

            <TouchableOpacity
              style={styles.locationDetection}
              onPress={detectCurrentLocation}
              disabled={isDetectingLocation}
              accessibilityLabel="Use current location"
              accessibilityHint="Detect your location automatically using device GPS"
            >
              <Ionicons name="navigate" size={wp('5%')} color="#007AFF" />
              <Text style={styles.detectionText}>
                {isDetectingLocation ? 'Detecting...' : 'Use My Current Location'}
              </Text>
              {isDetectingLocation && <ActivityIndicator size="small" color="#007AFF" />}
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Region *</Text>
              <TouchableOpacity
                style={[
                  styles.inputWrapper,
                  focusedField === 'region' && styles.inputWrapperFocused,
                  errors.region && styles.inputWrapperError,
                ]}
                onPress={() => setShowRegionModal(true)}
                accessibilityLabel="Select region"
                accessibilityHint="Open a list to choose your region"
              >
                <View style={styles.selector}>
                  <Text style={formData.region ? styles.selectorText : styles.selectorPlaceholder}>
                    {formData.region || 'Select your region'}
                  </Text>
                  <Ionicons name="chevron-down" size={wp('5%')} color={formData.region ? "#007AFF" : "#8E8E93"} />
                </View>
              </TouchableOpacity>
              {errors.region && <Text style={styles.errorText}>{errors.region}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>City *</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'city' && styles.inputWrapperFocused,
                errors.city && styles.inputWrapperError,
              ]}>
                <TextInput
                  ref={cityInputRef}
                  style={styles.textInput}
                  placeholder="Enter your city"
                  placeholderTextColor="#8E8E93"
                  value={formData.city}
                  onChangeText={(text) => handleChange('city', text)}
                  onFocus={() => setFocusedField('city')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => townInputRef.current?.focus()}
                  selectionColor="#007AFF"
                  returnKeyType="next"
                  accessibilityLabel="City"
                  accessibilityHint="Enter the city where you offer services"
                />
              </View>
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>

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
                  placeholderTextColor="#8E8E93"
                  value={formData.town}
                  onChangeText={(text) => handleChange('town', text)}
                  onFocus={() => setFocusedField('town')}
                  onBlur={() => setFocusedField(null)}
                  selectionColor="#007AFF"
                  returnKeyType="next"
                  accessibilityLabel="Suburb or town"
                  accessibilityHint="Optionally enter your suburb or town"
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
                  placeholderTextColor="#8E8E93"
                  value={formData.street}
                  onChangeText={(text) => handleChange('street', text)}
                  onFocus={() => setFocusedField('street')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={handleSubmit}
                  selectionColor="#007AFF"
                  returnKeyType="done"
                  accessibilityLabel="Street address"
                  accessibilityHint="Optionally enter your street address"
                />
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <SafeAreaView style={styles.footer} edges={['bottom']}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              accessibilityLabel="Go back"
              accessibilityHint="Return to the previous screen"
            >
              <Ionicons name="arrow-back" size={wp('5%')} color="#65676B" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.continueButton, !isFormValid && styles.continueButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isFormValid}
              activeOpacity={0.8}
              accessibilityLabel="Continue to skills"
              accessibilityHint={isFormValid ? "Proceed to the skills screen" : "Complete region and city to continue"}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={wp('5%')} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

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
                  <Text style={modalStyles.headerText}>Select Region</Text>
                  <TouchableOpacity 
                    onPress={() => setShowRegionModal(false)}
                    accessibilityLabel="Close region selector"
                    accessibilityHint="Close the region selection modal"
                  >
                    <Ionicons name="close" size={wp('6%')} color="#65676B" />
                  </TouchableOpacity>
                </View>
                <View style={modalStyles.searchContainer}>
                  <Ionicons name="search" size={wp('5%')} color="#8E8E93" />
                  <TextInput
                    style={modalStyles.searchInput}
                    placeholder="Search regions..."
                    placeholderTextColor="#8E8E93"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    accessibilityLabel="Search regions"
                    accessibilityHint="Type to filter the list of regions"
                  />
                </View>
                <ScrollView style={modalStyles.list}>
                  {filteredRegions.length > 0 ? (
                    filteredRegions.map((region) => (
                      <TouchableOpacity
                        key={region.value}
                        style={modalStyles.item}
                        onPress={() => handleRegionSelect(region.value)}
                        accessibilityLabel={`Select ${region.label}`}
                        accessibilityHint={`Set ${region.label} as your region`}
                      >
                        <Text style={[
                          modalStyles.itemText,
                          formData.region === region.value && modalStyles.itemTextSelected
                        ]}>
                          {region.label}
                        </Text>
                        {formData.region === region.value && (
                          <Ionicons name="checkmark" size={wp('5%')} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={modalStyles.emptyState}>
                      <Text style={modalStyles.emptyText}>No regions found</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
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
    padding: wp('5%'),
    paddingBottom: hp('10%'),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp('4%'),
  },
  title: {
    fontSize: wp('7%'),
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: hp('1%'),
  },
  subtitle: {
    fontSize: wp('4%'),
    color: '#65676B',
    textAlign: 'center',
    lineHeight: wp('5.5%'),
  },
  locationDetection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: wp('4%'),
    borderRadius: wp('3%'),
    marginBottom: hp('3%'),
    borderWidth: 1,
    borderColor: '#E4E6EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detectionText: {
    flex: 1,
    fontSize: wp('4%'),
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: wp('2%'),
  },
  inputContainer: {
    marginBottom: hp('4%'),
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1%'),
  },
  label: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    color: '#1C1E21',
  },
  optionalLabel: {
    fontSize: wp('3.5%'),
    color: '#8E8E93',
    fontWeight: '500',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: wp('3%'),
    borderWidth: 1,
    borderColor: '#E4E6EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputWrapperFocused: {
    borderColor: '#007AFF',
  },
  inputWrapperError: {
    borderColor: '#FF3B30',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp('4%'),
  },
  selectorText: {
    fontSize: wp('4%'),
    color: '#1C1E21',
  },
  selectorPlaceholder: {
    fontSize: wp('4%'),
    color: '#8E8E93',
  },
  textInput: {
    padding: wp('4%'),
    fontSize: wp('4%'),
    color: '#1C1E21',
    lineHeight: wp('5.5%'),
  },
  errorText: {
    fontSize: wp('3.5%'),
    color: '#FF3B30',
    marginTop: hp('1%'),
  },
  footer: {
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    paddingBottom: Platform.OS === 'ios' ? hp('4%') : hp('3%'),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E6EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: wp('3%'),
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp('3%'),
    backgroundColor: '#F8F9FA',
    borderRadius: wp('3%'),
    borderWidth: 1,
    borderColor: '#E4E6EA',
  },
  backButtonText: {
    fontSize: wp('4%'),
    color: '#65676B',
    fontWeight: '600',
    marginLeft: wp('2%'),
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp('3%'),
    backgroundColor: '#007AFF',
    borderRadius: wp('3%'),
  },
  continueButtonDisabled: {
    backgroundColor: '#AEAEB2',
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: wp('4%'),
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: wp('2%'),
  },
};

const modalStyles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: wp('5%'),
    borderTopRightRadius: wp('5%'),
    maxHeight: hp('80%'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('4%'),
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6EA',
  },
  headerText: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#1C1E21',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: wp('3%'),
    padding: wp('3%'),
    margin: wp('4%'),
  },
  searchInput: {
    flex: 1,
    fontSize: wp('4%'),
    color: '#1C1E21',
    marginLeft: wp('2%'),
  },
  list: {
    maxHeight: hp('60%'),
  },
  item: {
    padding: wp('4%'),
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6EA',
  },
  itemText: {
    fontSize: wp('4%'),
    color: '#1C1E21',
  },
  itemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyState: {
    padding: wp('8%'),
    alignItems: 'center',
  },
  emptyText: {
    fontSize: wp('4%'),
    color: '#8E8E93',
  },
};

export default LocationScreen;