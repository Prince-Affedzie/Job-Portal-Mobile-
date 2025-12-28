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
  Dimensions,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { navigate } from '../../services/navigationService';
import { completeProfile, fetchUser, uploadProfileImage } from '../../api/authApi';
import { sendFileToS3 } from '../../api/commonApi';
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const DRAFT_KEY = 'onboarding_draft';

const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Central", "Eastern", "Western", 
  "Western North", "Volta", "Oti", "Northern", "North East", 
  "Savannah", "Bono", "Bono East", "Ahafo", "Upper East", "Upper West"
];

const TaskPosterOnboarding = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser } = useContext(AuthContext);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');

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

  const uploadImageToS3 = async (imageData) => {
    try {
      const filename = imageData.name || 'profile.jpg';
      const type = imageData.type || 'image/jpeg';
      
      const file = {
        uri: imageData.uri,
        name: filename,
        type: type,
      };

      const res = await uploadProfileImage({ 
        filename: file.name, 
        contentType: file.type 
      });
      
      if (res.status !== 200) {
        throw new Error('Failed to get upload URL');
      }

      const { fileUrl, publicUrl } = res.data;
      
      if (!fileUrl) {
        throw new Error('No upload URL in response');
      }
      
      await sendFileToS3(fileUrl, file);
      return publicUrl;
      
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Failed to upload image');
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
      formErrors.region = "Please select your region";
      isValid = false;
    }

    if (!profile.location.city.trim()) {
      formErrors.city = "Please enter your city";
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

  const autoCropToSquare = async (uri) => {
    try {
      const { width: imgWidth, height: imgHeight } = await new Promise((resolve, reject) => {
        Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
      });
      const size = Math.min(imgWidth, imgHeight);
      const offsetX = (imgWidth - size) / 2;
      const offsetY = (imgHeight - size) / 2;

      const croppedImage = await manipulateAsync(
        uri,
        [{ crop: { originX: offsetX, originY: offsetY, width: size, height: size } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      return croppedImage;
    } catch (error) {
      console.error('Cropping error:', error);
      Alert.alert('Error', 'Failed to process image. Please try another one.');
      return null;
    }
  };

  const handleImageUpload = async (useCamera = false) => {
    try {
      let result;

      if (useCamera) {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          Alert.alert('Camera Access Required', 'Please allow camera access to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libraryPermission.granted) {
          Alert.alert('Photo Access Required', 'Please allow access to your photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
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

        const cropped = await autoCropToSquare(asset.uri);
        if (cropped) {
          setProfile(prev => ({
            ...prev,
            profileImage: {
              uri: cropped.uri,
              type: 'image/jpeg',
              name: `profile-${Date.now()}.jpg`
            },
            profileImageUri: cropped.uri,
          }));
          
          if (errors.profileImage) {
            setErrors(prev => ({ ...prev, profileImage: null }));
          }
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

      let profileImageUrl = '';
      
      if (!skipImage && profile.profileImage) {
        try {
          profileImageUrl = await uploadImageToS3(profile.profileImage);
        } catch (uploadError) {
          console.error('Failed to upload profile image:', uploadError);
          throw new Error('Failed to upload profile image. Please try again.');
        }
      }

      const requestData = {
        phone: profile.phone,
        location: {
          city: profile.location.city,
          region: profile.location.region,
          town: profile.location.town || ""
        }
      };

      if (profileImageUrl) {
        requestData.profileImage = profileImageUrl;
      }

      const response = await completeProfile(requestData);
      
      if (response.status === 200) {
        const res = await fetchUser();
        setUser(res.data);
        await clearDraft();

        Alert.alert(
          "Profile Complete!", 
          "You're ready to start hiring taskers.",
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
        error.message ||
        "Unable to complete profile. Please try again.";
      
      Alert.alert('Error', errorMessage);
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRegions = GHANA_REGIONS.filter(region =>
    region.toLowerCase().includes(regionSearch.toLowerCase())
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
              style={styles.modalCloseButton}
            >
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search regions..."
              placeholderTextColor="#94A3B8"
              value={regionSearch}
              onChangeText={setRegionSearch}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredRegions}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.regionItem,
                  profile.location.region === item && styles.regionItemSelected
                ]}
                onPress={() => {
                  handleLocationChange('region', item);
                  setShowRegionModal(false);
                  setRegionSearch('');
                }}
              >
                <Text style={[
                  styles.regionItemText,
                  profile.location.region === item && styles.regionItemTextSelected
                ]}>
                  {item}
                </Text>
                {profile.location.region === item && (
                  <Feather name="check" size={18} color="#6366F1" />
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
              Tell us a bit about yourself to get started
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Phone Number */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Phone Number</Text>
              <View style={[
                styles.inputContainer,
                errors.phone && styles.inputError
              ]}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>🇬🇭 +233</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor="#94A3B8"
                  value={profile.phone}
                  onChangeText={(value) => handleChange('phone', value)}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            {/* Location */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Location</Text>
              
              {/* Region */}
              <Text style={styles.fieldLabel}>Region</Text>
              <TouchableOpacity
                style={[
                  styles.inputContainer,
                  styles.selectContainer,
                  errors.region && styles.inputError
                ]}
                onPress={() => setShowRegionModal(true)}
              >
                <Text style={[
                  styles.selectText,
                  !profile.location.region && styles.placeholderText
                ]}>
                  {profile.location.region || "Select region"}
                </Text>
                <Feather name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>
              {errors.region && (
                <Text style={styles.errorText}>{errors.region}</Text>
              )}

              {/* City */}
              <Text style={styles.fieldLabel}>City</Text>
              <View style={[
                styles.inputContainer,
                errors.city && styles.inputError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor="#94A3B8"
                  value={profile.location.city}
                  onChangeText={(value) => handleLocationChange('city', value)}
                />
              </View>
              {errors.city && (
                <Text style={styles.errorText}>{errors.city}</Text>
              )}

              {/* Town (Optional) */}
              <Text style={styles.fieldLabel}>
                Town/Suburb <Text style={styles.optionalText}>(Optional)</Text>
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Town or suburb"
                  placeholderTextColor="#94A3B8"
                  value={profile.location.town}
                  onChangeText={(value) => handleLocationChange('town', value)}
                />
              </View>
            </View>

            {/* Profile Photo */}
            <View style={styles.formSection}>
              <View style={styles.photoHeader}>
                <Text style={styles.sectionLabel}>Profile Photo</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              
              {!profile.profileImageUri ? (
                <TouchableOpacity 
                  style={styles.uploadArea}
                  onPress={() => handleImageUpload(false)}
                >
                  <View style={styles.uploadIcon}>
                    <Feather name="camera" size={32} color="#6366F1" />
                  </View>
                  <Text style={styles.uploadText}>Add Photo</Text>
                  <Text style={styles.uploadHint}>Tap to upload</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.photoPreview}>
                  <Image 
                    source={{ uri: profile.profileImageUri }}
                    style={styles.photo}
                  />
                  <View style={styles.photoActions}>
                    <TouchableOpacity 
                      style={styles.photoActionButton}
                      onPress={() => handleImageUpload(false)}
                    >
                      <Feather name="edit-2" size={16} color="#6366F1" />
                      <Text style={styles.photoActionText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.photoActionButton}
                      onPress={removeImage}
                    >
                      <Feather name="trash-2" size={16} color="#EF4444" />
                      <Text style={styles.photoActionTextRemove}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.uploadTips}>
                <Text style={styles.tip}>• Clear face photo recommended</Text>
                <Text style={styles.tip}>• Max size: 5MB</Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled
              ]}
              onPress={() => handleSubmit(false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Complete Profile</Text>
                  <Feather name="arrow-right" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Optional: Skip for now */}
            {!profile.profileImageUri && (
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={() => handleSubmit(true)}
                disabled={isSubmitting}
              >
                <Text style={styles.skipButtonText}>Skip photo for now</Text>
              </TouchableOpacity>
            )}

            {/* Terms */}
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
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
    paddingBottom: 40,
  },
  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
  },
  // Form
  form: {
    paddingHorizontal: 24,
  },
  formSection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  optionalText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  phonePrefix: {
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  phonePrefixText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  selectContainer: {
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 16,
    color: '#1E293B',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  // Photo Upload
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionalBadge: {
    fontSize: 13,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    height: 200,
  },
  uploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 14,
    color: '#64748B',
  },
  // Photo Preview
  photoPreview: {
    alignItems: 'center',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  photoActionTextRemove: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
  uploadTips: {
    marginTop: 12,
  },
  tip: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  // Submit Button
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
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
    padding: 16,
  },
  skipButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalCloseButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    padding: 0,
  },
  regionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  regionItemSelected: {
    backgroundColor: '#F8FAFC',
  },
  regionItemText: {
    fontSize: 16,
    color: '#374151',
  },
  regionItemTextSelected: {
    color: '#6366F1',
    fontWeight: '500',
  },
});

export default TaskPosterOnboarding;