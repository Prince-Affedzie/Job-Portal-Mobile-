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
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useNavigation } from '@react-navigation/native';
import { navigate } from '../../services/navigationService';
import { completeProfile, fetchUser, uploadProfileImage } from '../../api/authApi';
import { sendFileToS3 } from '../../api/commonApi';
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const DRAFT_KEY = 'onboarding_draft';

const TaskPosterOnboarding = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser } = useContext(AuthContext);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

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

  // Upload image to S3
  const uploadImageToS3 = async (imageData) => {
    try {
      // Extract file info from imageData
      const filename = imageData.name || 'profile.jpg';
      const type = imageData.type || 'image/jpeg';
      
      // Create file object
      const file = {
        uri: imageData.uri,
        name: filename,
        type: type,
      };

      // Get pre-signed URL from backend
      const res = await uploadProfileImage({ 
        filename: file.name, 
        contentType: file.type 
      });
      
      if (res.status !== 200) {
        throw new Error('Failed to get upload URL');
      }

      const { fileKey, fileUrl, publicUrl } = res.data;
      
      if (!fileUrl) {
        throw new Error('No upload URL in response');
      }
      
      // Upload file to S3 using the pre-signed URL
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
          Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,  // Disabled native editor
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
          allowsEditing: false,  // Disabled native editor
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
      
      // Upload profile image to S3 if it exists and not skipped
      if (!skipImage && profile.profileImage) {
        console.log('Uploading profile image to S3...');
        try {
          profileImageUrl = await uploadImageToS3(profile.profileImage);
          console.log('Profile image uploaded successfully:', profileImageUrl);
        } catch (uploadError) {
          console.error('Failed to upload profile image:', uploadError);
          throw new Error('Failed to upload profile image. Please try again.');
        }
      } else {
        console.log('No profile image to upload');
      }

      // Prepare data for API - using regular object instead of FormData
      const requestData = {
        phone: profile.phone,
        location: {
          city: profile.location.city,
          region: profile.location.region,
          town: profile.location.town || ""
        }
      };

      // Add profile image URL if it was uploaded
      if (profileImageUrl) {
        requestData.profileImage = profileImageUrl;
      }

      // Log request data for debugging
      console.log('Request data being sent:', {
        phone: profile.phone,
        location: profile.location,
        hasProfileImage: !!profileImageUrl,
        profileImageUrl: profileImageUrl
      });

      const response = await completeProfile(requestData);
      
      if (response.status === 200) {
        const res = await fetchUser();
        setUser(res.data);
        await clearDraft();

        Alert.alert(
          "🎉 Profile Complete!", 
          "You're all set to start Hiring and connecting with skilled taskers.",
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
        "Unable to complete profile. Please check your connection and try again.";
      
      Alert.alert('Error', errorMessage);
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
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Select Region</Text>
            <TouchableOpacity 
              onPress={() => setShowRegionModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#6366F1" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search regions..."
              placeholderTextColor="#9CA3AF"
              value={regionSearch}
              onChangeText={setRegionSearch}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredRegions}
            keyExtractor={(item) => item.value}
            renderItem={({ item, index }) => (
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                }}
              >
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
                  <View style={styles.regionItemContent}>
                    <View style={[
                      styles.regionIcon,
                      { backgroundColor: profile.location.region === item.value ? '#6366F1' : '#F3F4F6' }
                    ]}>
                      <Ionicons 
                        name="location" 
                        size={16} 
                        color={profile.location.region === item.value ? '#FFFFFF' : '#6B7280'} 
                      />
                    </View>
                    <Text style={[
                      styles.regionItemText,
                      profile.location.region === item.value && styles.regionItemTextSelected
                    ]}>
                      {item.label}
                    </Text>
                  </View>
                  {profile.location.region === item.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#6366F1" />
                  )}
                </TouchableOpacity>
              </Animated.View>
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Enhanced Header */}
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.headerIcon}>
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                style={styles.headerIconGradient}
              >
                <Ionicons name="person-add" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Set up your account to start hiring skilled taskers for your projects
            </Text>
            
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={[styles.progressFill, { width: '70%' }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.progressText}>70% Complete</Text>
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Enhanced Error Banner */}
            {errors.submit && (
              <View style={styles.errorBanner}>
                <View style={styles.errorIcon}>
                  <Ionicons name="warning" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.errorContent}>
                  <Text style={styles.errorBannerTitle}>Something went wrong</Text>
                  <Text style={styles.errorBannerText}>{errors.submit}</Text>
                </View>
              </View>
            )}

            {/* Contact Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={styles.sectionIcon}
                >
                  <Ionicons name="person" size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.sectionText}>
                  <Text style={styles.sectionTitle}>Basic Information</Text>
                  <Text style={styles.sectionSubtitle}>Tell us about yourself</Text>
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Phone Number
                    <Text style={styles.required}> *</Text>
                  </Text>
                  <View style={[
                    styles.inputWrapper,
                    errors.phone && styles.inputError
                  ]}>
                    <Ionicons name="call" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="024 123 4567"
                      placeholderTextColor="#9CA3AF"
                      value={profile.phone}
                      onChangeText={(value) => handleChange('phone', value)}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {errors.phone && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="information-circle" size={14} color="#EF4444" />
                      <Text style={styles.errorText}>{errors.phone}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Region
                    <Text style={styles.required}> *</Text>
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.inputWrapper,
                      errors.region && styles.inputError
                    ]}
                    onPress={() => setShowRegionModal(true)}
                  >
                    <Ionicons name="location" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <Text style={[
                      styles.pickerText,
                      !profile.location.region && styles.pickerPlaceholder
                    ]}>
                      {profile.location.region || "Select region"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                  {errors.region && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="information-circle" size={14} color="#EF4444" />
                      <Text style={styles.errorText}>{errors.region}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    City
                    <Text style={styles.required}> *</Text>
                  </Text>
                  <View style={[
                    styles.inputWrapper,
                    errors.city && styles.inputError
                  ]}>
                    <Ionicons name="business" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Accra"
                      placeholderTextColor="#9CA3AF"
                      value={profile.location.city}
                      onChangeText={(value) => handleLocationChange('city', value)}
                    />
                  </View>
                  {errors.city && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="information-circle" size={14} color="#EF4444" />
                      <Text style={styles.errorText}>{errors.city}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Town/Suburb/Area(Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="navigate" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g Tema community 1"
                      placeholderTextColor="#9CA3AF"
                      value={profile.location.town}
                      onChangeText={(value) => handleLocationChange('town', value)}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Enhanced Profile Photo Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.sectionIcon}
                >
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.sectionText}>
                  <Text style={styles.sectionTitle}>Profile Photo</Text>
                  <Text style={styles.sectionSubtitle}>Build trust with taskers</Text>
                </View>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalText}>Optional</Text>
                </View>
              </View>

              {!profile.profileImageUri ? (
                <View style={styles.uploadCard}>
                  <View style={styles.uploadIllustration}>
                    <Ionicons name="camera-outline" size={48} color="#6366F1" />
                  </View>
                  <Text style={styles.uploadTitle}>Add a Profile Photo</Text>
                  <Text style={styles.uploadDescription}>
                    Help taskers recognize you and build trust in the community
                  </Text>
                  
                  <View style={styles.uploadOptions}>
                    <TouchableOpacity 
                      style={styles.uploadOptionPrimary}
                      onPress={() => handleImageUpload(false)}
                    >
                      <Ionicons name="image" size={20} color="#FFFFFF" />
                      <Text style={styles.uploadOptionPrimaryText}>Choose from Library</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.uploadOptionSecondary}
                      onPress={() => handleImageUpload(true)}
                    >
                      <Ionicons name="camera" size={20} color="#6366F1" />
                      <Text style={styles.uploadOptionSecondaryText}>Take Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPreviewCard}>
                  <Image 
                    source={{ uri: profile.profileImageUri }}
                    style={styles.photoImage}
                  />
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoTitle}>Profile Photo Added</Text>
                    <Text style={styles.photoDescription}>Looking good!</Text>
                  </View>
                  <View style={styles.photoActions}>
                    <TouchableOpacity 
                      style={styles.photoAction}
                      onPress={() => handleImageUpload(false)}
                    >
                      <Ionicons name="refresh" size={16} color="#6366F1" />
                      <Text style={styles.photoActionText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.photoAction}
                      onPress={removeImage}
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                      <Text style={styles.photoActionTextRemove}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Enhanced Submit Section */}
            <View style={styles.submitSection}>
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled
                ]}
                onPress={() => handleSubmit(false)}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>
                        Complete Profile
                      </Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

             {/* {!profile.profileImageUri && (
                <TouchableOpacity 
                  style={styles.skipButton}
                  onPress={() => handleSubmit(true)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.skipButtonText}>Skip for now</Text>
                  <Ionicons name="arrow-forward" size={16} color="#6B7280" />
                </TouchableOpacity>
              )}*/}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <RegionModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    paddingTop: 20,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 16,
  },
  headerIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
   
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 0,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
   
    borderColor: '#F1F5F9',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    gap: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    flex: 1,
  },
  errorBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 2,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
    opacity: 0.9,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  optionalBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  optionalText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
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
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    padding: 0,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  pickerPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  uploadCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 32,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  uploadIllustration: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  uploadOptions: {
    width: '100%',
    gap: 12,
  },
  uploadOptionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadOptionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadOptionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  uploadOptionSecondaryText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  photoPreviewCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  photoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photoInfo: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  photoDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  photoAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  photoActionTextRemove: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  submitSection: {
    padding: 24,
    gap: 16,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 6,
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontSize: 16,
    color: '#1F2937',
  },
  regionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  regionItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  regionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionItemSelected: {
    backgroundColor: '#F8FAFC',
  },
  regionItemText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  regionItemTextSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
});

export default TaskPosterOnboarding;