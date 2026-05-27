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
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useNavigation } from '@react-navigation/native';
import { navigate } from '../../services/navigationService';
import { completeProfile, fetchUser, uploadProfileImage } from '../../api/authApi';
import { sendFileToS3 } from '../../api/commonApi';
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const DRAFT_KEY = 'client_onboarding_draft';

// ─── Theme: Pacific Indigo & Warm Gold ──────────────────────────────────────
const C = {
  bg: '#F9FAFC',
  surface: '#FFFFFF',
  border: '#E4E8EE',
  accent: '#1E3A6E',         // deep indigo
  accentLight: '#DDE7F5',
  gold: '#D49B3F',
  goldLight: '#FCF3E1',
  green: '#0F766E',
  greenLight: '#D1FAE5',
  red: '#DC2626',
  redLight: '#FEE2E2',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
  shadow: '#1E3A6E14',
};

const TaskPosterOnboarding = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser } = useContext(AuthContext);
  const navigation = useNavigation();

  const [profile, setProfile] = useState({
    phone: '',
    profileImage: null,
    profileImageUri: '',
  });

  const [errors, setErrors] = useState({});


  const handleChange = (field, value) => {
  setProfile(prev => ({ ...prev, [field]: value }));
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: null }));
  }
};

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (profile.phone) {
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

  // ── Image upload logic (unchanged) ──────────────────────────────────────
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

  // ── Validation ─────────────────────────────────────────────────────────
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

    setErrors(formErrors);
    return isValid;
  };

  // ── Submit handler ─────────────────────────────────────────────────────
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
        profileImage: profileImageUrl || undefined,
      };

      const response = await completeProfile(requestData);
      
      if (response.status === 200) {
        const res = await fetchUser();
        console.log(res.data)
        setUser(res.data);
        await clearDraft();

       Alert.alert(
  "Profile Complete!", 
  "You're ready to start hiring taskers.",
  [
    { 
      text: 'Get Started', 
      onPress: () => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'PosterStack' }],
        });
      },
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
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
              Tell us a little about yourself to get started
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            
            {/* Phone Number */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Phone Number</Text>
              <View style={[
                styles.phoneRow,
                errors.phone && styles.inputError
              ]}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>🇬🇭 +233</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="XX XXX XXXX"
                  placeholderTextColor={C.textMuted}
                  value={profile.phone}
                  onChangeText={(value) => handleChange('phone', value)}
                  keyboardType="phone-pad"
                  maxLength={12}
                />
              </View>
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            {/* Profile Photo */}
            <View style={styles.formSection}>
              <View style={styles.photoHeader}>
                <Text style={styles.sectionLabel}>Profile Photo</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              
              {/* Photo preview / picker (matching tasker step 1) */}
              <View style={styles.photoHero}>
                <TouchableOpacity onPress={() => handleImageUpload(false)} activeOpacity={0.85} style={styles.photoCircleWrap}>
                  {profile.profileImageUri ? (
                    <Image source={{ uri: profile.profileImageUri }} style={styles.photoCircle} />
                  ) : (
                    <LinearGradient colors={[C.accentLight, C.surface]} style={styles.photoCircle}>
                      <Ionicons name="person" size={52} color={C.textMuted} />
                    </LinearGradient>
                  )}
                  <View style={styles.photoEditBadge}>
                    <Ionicons name="camera" size={18} color={C.white} />
                  </View>
                </TouchableOpacity>
              </View>

              {profile.profileImageUri && (
                <View style={styles.photoActions}>
                  <TouchableOpacity 
                    style={styles.photoActionButton}
                    onPress={() => handleImageUpload(false)}
                  >
                    <Ionicons name="create-outline" size={16} color={C.accent} />
                    <Text style={styles.photoActionText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.photoActionButton}
                    onPress={removeImage}
                  >
                    <Ionicons name="trash-outline" size={16} color={C.red} />
                    <Text style={styles.photoActionTextRemove}>Remove</Text>
                  </TouchableOpacity>
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
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={isSubmitting ? [C.textMuted, C.textMuted] : [C.accent, '#152C4F']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Complete Profile</Text>
                    <Ionicons name="arrow-forward" size={20} color={C.white} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Optional skip photo */}
            {!profile.profileImageUri && (
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={() => handleSubmit(true)}
                disabled={isSubmitting}
              >
                <Text style={styles.skipButtonText}>Skip photo for now</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};



// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    backgroundColor: C.bg,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: C.textSecondary,
    lineHeight: 24,
  },
  form: {
    paddingHorizontal: 24,
  },
  formSection: {
    marginBottom: 36,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 16,
    letterSpacing: 0.1,
  },

  // Phone
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden',
    height: 56,
  },
  inputError: {
    borderColor: C.red,
    backgroundColor: C.redLight,
  },
  phonePrefix: {
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: C.border,
    justifyContent: 'center',
    height: '100%',
    backgroundColor: C.bg,
  },
  phonePrefixText: {
    fontSize: 16,
    color: C.textPrimary,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: C.textPrimary,
    paddingHorizontal: 14,
    height: '100%',
  },
  errorText: {
    fontSize: 13,
    color: C.red,
    marginTop: 6,
    fontWeight: '500',
  },

  // Photo section (mimics tasker Step 1)
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  optionalBadge: {
    fontSize: 13,
    color: C.textMuted,
    backgroundColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
  },
  photoHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoCircleWrap: {
    position: 'relative',
  },
  photoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: C.border,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.accent,
    borderWidth: 3,
    borderColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.accent,
  },
  photoActionTextRemove: {
    fontSize: 14,
    fontWeight: '600',
    color: C.red,
  },
  uploadTips: {
    marginTop: 4,
  },
  tip: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 4,
  },

  // Submit button
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 16,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  submitButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  skipButton: {
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
  },
  skipButtonText: {
    color: C.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
  },
});

export default TaskPosterOnboarding;