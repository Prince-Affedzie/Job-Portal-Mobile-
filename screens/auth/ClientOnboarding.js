import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { navigate } from '../../services/navigationService';
import { completeProfile, fetchUser } from '../../api/authApi';
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = 'onboarding_draft';

const TaskPosterOnboarding = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser } = useContext(AuthContext);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');

  const regionSuggestions = [
    { value: "Greater Accra", label: "Greater Accra" },
    { value: "Ahafo", label: "Ahafo" },
    { value: "Ashanti", label: "Ashanti" },
    { value: "Bono East", label: "Bono East" },
    { value: "Brong Ahafo", label: "Brong Ahafo" },
    { value: "Central", label: "Central" },
    { value: "Eastern", label: "Eastern" },
    { value: "Northern", label: "Northern" },
    { value: "North East", label: "North East" },
    { value: "Oti", label: "Oti" },
    { value: "Savannah", label: "Savannah" },
    { value: "Upper East", label: "Upper East" },
    { value: "Upper West", label: "Upper West" },
    { value: "Volta", label: "Volta" },
    { value: "Western North", label: "Western North" },
    { value: "Western", label: "Western" },
  ];

  const [profile, setProfile] = useState({
    phone: "",
    location: { city: "", region: "", town: "" },
    profileImage: null,
    profileImageUri: "",
  });

  const [errors, setErrors] = useState({});

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (profile.phone || profile.location.city || profile.location.region) {
      saveDraft();
    }
  }, [profile]);

  const loadDraft = async () => {
    try {
      const draft = await AsyncStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        setProfile(prev => ({
          ...prev,
          phone: parsedDraft.phone || prev.phone,
          location: parsedDraft.location || prev.location,
        }));
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
        phone: profile.phone,
        location: profile.location,
      }));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const validateForm = () => {
    let formErrors = {};
    let isValid = true;

    if (!profile.phone.trim()) {
      formErrors.phone = "Phone number is required";
      isValid = false;
    } else {
      const cleaned = profile.phone.replace(/[^0-9]/g, '');
      if (cleaned.length < 9 || cleaned.length > 13) {
        formErrors.phone = "Please enter a valid phone number";
        isValid = false;
      }
    }

    if (!profile.location.region) {
      formErrors.region = "Region is required";
      isValid = false;
    }

    if (!profile.location.city.trim()) {
      formErrors.city = "City is required";
      isValid = false;
    }

    setErrors(formErrors);
    return isValid;
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleLocationChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      location: { ...prev.location, [field]: value },
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleImageUpload = async (useCamera = false) => {
    try {
      let result;

      if (useCamera) {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libraryPermission.granted) {
          Alert.alert('Permission Required', 'Please allow access to your photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          setErrors(prev => ({ ...prev, profileImage: "Image too large (max 5MB)" }));
          return;
        }

        setProfile(prev => ({
          ...prev,
          profileImage: {
            uri: asset.uri,
            type: 'image/jpeg',
            name: `profile-${Date.now()}.jpg`
          },
          profileImageUri: asset.uri,
        }));
        
        if (errors.profileImage) {
          setErrors(prev => ({ ...prev, profileImage: null }));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setErrors(prev => ({ ...prev, profileImage: "Failed to select image. Please try again." }));
    }
  };

  const removeImage = () => {
    setProfile(prev => ({
      ...prev,
      profileImage: null,
      profileImageUri: "",
    }));
  };

  const handleSubmit = async (skipImage = false) => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setErrors({});

      const formData = new FormData();
      
      formData.append("phone", profile.phone);
      formData.append("location[city]", profile.location.city);
      formData.append("location[region]", profile.location.region);
      formData.append("location[town]", profile.location.town || "");
      
      if (!skipImage && profile.profileImage) {
        formData.append("profileImage", profile.profileImage);
      }

      const response = await completeProfile(formData);
      
      if (response.status === 200) {
        const res = await fetchUser();
        setUser(res.data);
        await clearDraft();

        Alert.alert(
          "🎉 Profile Complete!", 
          "You're all set to start posting tasks and connecting with skilled taskers.",
          [
            { 
              text: 'Get Started', 
              onPress: () => navigate('PosterStack'),
              style: 'default'
            }
          ]
        );
      }  
     
    } catch (error) {
      console.error('Profile completion error:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        "Unable to complete profile. Please check your connection and try again.";
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRegions = regionSuggestions.filter(region =>
    region.label.toLowerCase().includes(regionSearch.toLowerCase())
  );

  const RegionModal = () => (
    <Modal
      visible={showRegionModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowRegionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Region</Text>
            <TouchableOpacity 
              onPress={() => setShowRegionModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search regions..."
              value={regionSearch}
              onChangeText={setRegionSearch}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredRegions}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.regionItem,
                  profile.location.region === item.value && styles.regionItemSelected
                ]}
                onPress={() => {
                  handleLocationChange('region', item.value);
                  setShowRegionModal(false);
                  setRegionSearch('');
                }}
              >
                <Text style={[
                  styles.regionItemText,
                  profile.location.region === item.value && styles.regionItemTextSelected
                ]}>
                  {item.label}
                </Text>
                {profile.location.region === item.value && (
                  <Ionicons name="checkmark" size={18} color="#6366F1" />
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Set up your account to start posting tasks
            </Text>
          </View>

          <View style={styles.card}>
            {/* Error Banner */}
            {errors.submit && (
              <View style={styles.errorBanner}>
                <Ionicons name="warning" size={18} color="#DC2626" />
                <Text style={styles.errorBannerText}>{errors.submit}</Text>
              </View>
            )}

            {/* Contact Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="person" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={[
                    styles.inputWrapper,
                    errors.phone && styles.inputError
                  ]}>
                    <TextInput
                      style={styles.input}
                      placeholder="024 123 4567"
                      value={profile.phone}
                      onChangeText={(value) => handleChange('phone', value)}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Region</Text>
                  <TouchableOpacity
                    style={[
                      styles.inputWrapper,
                      errors.region && styles.inputError
                    ]}
                    onPress={() => setShowRegionModal(true)}
                  >
                    <Text style={[
                      styles.pickerText,
                      !profile.location.region && styles.pickerPlaceholder
                    ]}>
                      {profile.location.region || "Select region"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#6B7280" />
                  </TouchableOpacity>
                  {errors.region && <Text style={styles.errorText}>{errors.region}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>City</Text>
                  <View style={[
                    styles.inputWrapper,
                    errors.city && styles.inputError
                  ]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Accra"
                      value={profile.location.city}
                      onChangeText={(value) => handleLocationChange('city', value)}
                    />
                  </View>
                  {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Area (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Osu"
                      value={profile.location.town}
                      onChangeText={(value) => handleLocationChange('town', value)}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Profile Photo Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.sectionTitle}>Profile Photo</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalText}>Optional</Text>
                </View>
              </View>

              <Text style={styles.sectionDescription}>
                Add a photo to build trust with taskers
              </Text>

              {!profile.profileImageUri ? (
                <View style={styles.uploadOptions}>
                  <TouchableOpacity 
                    style={styles.uploadOption}
                    onPress={() => handleImageUpload(false)}
                  >
                    <Ionicons name="image" size={24} color="#6366F1" />
                    <Text style={styles.uploadOptionText}>Choose Photo</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.uploadOption}
                    onPress={() => handleImageUpload(true)}
                  >
                    <Ionicons name="camera" size={24} color="#6366F1" />
                    <Text style={styles.uploadOptionText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoPreview}>
                  <Image 
                    source={{ uri: profile.profileImageUri }}
                    style={styles.photoImage}
                  />
                  <View style={styles.photoActions}>
                    <TouchableOpacity 
                      style={styles.photoAction}
                      onPress={() => handleImageUpload(false)}
                    >
                      <Text style={styles.photoActionText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.photoAction}
                      onPress={removeImage}
                    >
                      <Text style={[styles.photoActionText, styles.removeText]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Submit Section */}
            <View style={styles.submitSection}>
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled
                ]}
                onPress={() => handleSubmit(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>
                      Complete Profile
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              {!profile.profileImageUri && (
                <TouchableOpacity 
                  style={styles.skipButton}
                  onPress={() => handleSubmit(true)}
                  disabled={isSubmitting}
                >
                 {/* <Text style={styles.skipButtonText}>Skip for now</Text>*/}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Info Card 
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={18} color="#6366F1" />
            <Text style={styles.infoText}>
              Complete profiles get 3x more responses from taskers
            </Text>
          </View>*/}
        </ScrollView>
      </KeyboardAvoidingView>

      <RegionModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    gap: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  optionalBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  optionalText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 48,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  pickerPlaceholder: {
    color: '#9CA3AF',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  uploadOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  photoPreview: {
    alignItems: 'center',
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#F3F4F6',
  },
  photoActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  photoAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  removeText: {
    color: '#DC2626',
  },
  submitSection: {
    padding: 24,
    gap: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  regionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  regionItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  regionItemText: {
    fontSize: 16,
    color: '#374151',
  },
  regionItemTextSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
});

export default TaskPosterOnboarding;