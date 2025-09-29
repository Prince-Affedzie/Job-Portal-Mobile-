import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
  screenHeight,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

const ProfileImageScreen = () => {
  const { 
    profileImageUri, 
    updateProfileImage, 
    goToNextStep, 
    goToPreviousStep,
  } = useTaskerOnboarding();
  
  const navigation = useNavigation();

  const [image, setImage] = useState(profileImageUri || null);
  const [isUploading, setIsUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [showCropInterface, setShowCropInterface] = useState(false);

  // Enhanced permission handling
  const requestPermissions = async (isCamera = false) => {
    if (isCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'We need camera access to take photos. Please enable this in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => ImagePicker.requestCameraPermissionsAsync() }
          ]
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'We need access to your photo library to select images. Please enable this in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
          ]
        );
        return false;
      }
    }
    return true;
  };

  // Enhanced image picker with better UX
  const pickImageFromGallery = async () => {
    try {
      const hasPermission = await requestPermissions(false);
      if (!hasPermission) return;

      setShowOptions(false);
      setIsUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled) {
        // Use Expo's built-in cropping
        handleImageSelection(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const hasPermission = await requestPermissions(true);
      if (!hasPermission) return;

      setShowOptions(false);
      setIsUploading(true);

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        handleImageSelection(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  // Custom cropping function using expo-image-manipulator
  const cropImage = async (uri, cropRegion) => {
    try {
      const manipResult = await manipulateAsync(
        uri,
        [
          {
            crop: {
              originX: cropRegion.x,
              originY: cropRegion.y,
              width: cropRegion.width,
              height: cropRegion.height,
            },
          },
          { resize: { width: 500, height: 500 } },
        ],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      
      return manipResult;
    } catch (error) {
      throw new Error('Failed to crop image');
    }
  };

  // Simple auto-crop to square
  const autoCropToSquare = async (uri) => {
    try {
      // Get image dimensions first
      return new Promise((resolve, reject) => {
        Image.getSize(uri, (width, height) => {
          const size = Math.min(width, height);
          const offsetX = (width - size) / 2;
          const offsetY = (height - size) / 2;
          
          cropImage(uri, {
            x: offsetX,
            y: offsetY,
            width: size,
            height: size,
          })
          .then(resolve)
          .catch(reject);
        }, reject);
      });
    } catch (error) {
      throw error;
    }
  };

  const handleImageSelection = async (imageAsset) => {
    try {
      setIsUploading(true);
      
      const imageData = {
        uri: imageAsset.uri,
        width: imageAsset.width,
        height: imageAsset.height,
      };

      setImage(imageAsset.uri);
      updateProfileImage(imageData);
      
    } catch (error) {
      Alert.alert('Upload Failed', 'Something went wrong while processing your image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCustomCropComplete = async () => {
    try {
      setIsUploading(true);
      setShowCropInterface(false);
      
      const croppedImage = await autoCropToSquare(imageToCrop);
      
      const imageData = {
        uri: croppedImage.uri,
        width: croppedImage.width,
        height: croppedImage.height,
      };

      setImage(croppedImage.uri);
      updateProfileImage(imageData);
      setImageToCrop(null);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to crop image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Simple Crop Interface Modal
  const CropInterfaceModal = () => (
    <Modal
      visible={showCropInterface}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCropInterface(false)}
    >
      <SafeAreaView style={styles.cropContainer}>
        <View style={styles.cropHeader}>
          <Text style={styles.cropTitle}>Crop Your Photo</Text>
          <Text style={styles.cropSubtitle}>
            We'll automatically crop your photo to a perfect square for your profile
          </Text>
        </View>

        <View style={styles.cropPreviewContainer}>
          <Image 
            source={{ uri: imageToCrop }} 
            style={styles.cropPreviewImage}
            resizeMode="contain"
          />
          <View style={styles.cropOverlay}>
            <View style={styles.cropCircle} />
            <Text style={styles.cropGuideText}>
              Your face should be centered within the circle
            </Text>
          </View>
        </View>

        <View style={styles.cropControls}>
          <TouchableOpacity 
            style={styles.cropCancelButton}
            onPress={() => {
              setShowCropInterface(false);
              setImageToCrop(null);
            }}
          >
            <Text style={styles.cropCancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cropConfirmButton}
            onPress={handleCustomCropComplete}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.cropConfirmText}>Use This Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const removeImage = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setImage(null);
            updateProfileImage({ uri: '', image: null });
          }
        },
      ]
    );
  };

  const handleContinue = () => {
    if (goToNextStep()) {
      navigation.navigate('Review');
    }
  };

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Profile Photo?',
      'Profiles with professional photos receive 3x more responses from clients. You can always add one later.',
      [
        { text: 'Go Back', style: 'cancel' },
        { 
          text: 'Skip for Now', 
          style: 'default',
          onPress: handleContinue
        },
      ]
    );
  };

  const PhotoOptionsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showOptions}
      onRequestClose={() => setShowOptions(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowOptions(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Profile Photo</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.modalOption}
            onPress={takePhotoWithCamera}
          >
            <Ionicons name="camera" size={24} color="#007AFF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Take Photo</Text>
              <Text style={styles.optionDescription}>Use your camera</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.modalOption}
            onPress={pickImageFromGallery}
          >
            <Ionicons name="images" size={24} color="#007AFF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Choose from Library</Text>
              <Text style={styles.optionDescription}>Select an existing photo</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.modalCancel}
            onPress={() => setShowOptions(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" /> 
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {image ? 'Looking great!' : 'Add your photo'}
          </Text>
          <Text style={styles.subtitle}>
            {image 
              ? 'Your professional photo is ready. This helps clients trust and connect with you.'
              : 'A professional photo helps you stand out and build trust with potential clients.'
            }
          </Text>
        </View>

        <View style={styles.previewSection}>
          <View style={styles.imageWrapper}>
            <View style={[
              styles.imageContainer,
              image && styles.imageContainerWithPhoto
            ]}>
              {image ? (
                <>
                  <Image source={{ uri: image }} style={styles.profileImage} />
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => setShowOptions(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.placeholder}>
                  <View style={styles.placeholderIcon}>
                    <Ionicons name="person" size={48} color="#8A8D91" />
                  </View>
                  <Text style={styles.placeholderText}>No photo selected</Text>
                </View>
              )}
              
              {isUploading && (
                <View style={styles.loadingOverlay}>
                  <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color="#1877F2" />
                    <Text style={styles.loadingText}>Processing image...</Text>
                  </View>
                </View>
              )}
            </View>

            {image && (
              <View style={styles.successIndicator}>
                <Ionicons name="checkmark-circle" size={20} color="#42B883" />
                <Text style={styles.successText}>Photo uploaded successfully</Text>
              </View>
            )}
          </View>

          {!image && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.primaryActionButton}
                onPress={() => setShowOptions(true)}
                activeOpacity={0.8}
                disabled={isUploading}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Add Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          {image && (
            <View style={styles.photoActions}>
              <TouchableOpacity 
                style={styles.changePhotoButton}
                onPress={() => setShowOptions(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={18} color="#1877F2" />
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.removePhotoButton}
                onPress={removeImage}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#E41E3F" />
                <Text style={styles.removePhotoText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Why add a photo?</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="eye" size={20} color="#1877F2" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Get 3x more views</Text>
                <Text style={styles.benefitDescription}>Profiles with photos are viewed significantly more</Text>
              </View>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="shield-checkmark" size={20} color="#1877F2" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Build trust faster</Text>
                <Text style={styles.benefitDescription}>Clients prefer to hire people they can see</Text>
              </View>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#1877F2" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>More client messages</Text>
                <Text style={styles.benefitDescription}>Professional photos lead to more inquiries</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.guidelinesSection}>
          <Text style={styles.guidelinesTitle}>Photo guidelines</Text>
          <View style={styles.guidelinesList}>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={16} color="#42B883" />
              <Text style={styles.guidelineText}>Clear, well-lit headshot</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={16} color="#42B883" />
              <Text style={styles.guidelineText}>Face the camera and smile naturally</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={16} color="#42B883" />
              <Text style={styles.guidelineText}>Professional attire preferred</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="close-circle" size={16} color="#E41E3F" />
              <Text style={styles.guidelineText}>Avoid group photos, filters, or sunglasses</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color="#65676B" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {image ? (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
            <Ionicons name="chevron-forward" size={20} color="#65676B" />
          </TouchableOpacity>
        )}
      </View>

      <PhotoOptionsModal />
      <CropInterfaceModal />
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1E21',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#65676B',
    textAlign: 'center',
    lineHeight: 22,
  },
  previewSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  imageWrapper: {
    alignItems: 'center',
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 4,
    borderColor: '#E4E6EA',
  },
  imageContainerWithPhoto: {
    borderColor: '#1877F2',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 96,
  },
  editButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#1877F2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderIcon: {
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 16,
    color: '#8A8D91',
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#E8F5E8',
    borderRadius: 25,
  },
  successText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#42B883',
    fontWeight: '500',
  },
  actionButtons: {
    marginTop: 30,
    alignItems: 'center',
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1877F2',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 150,
    justifyContent: 'center',
  },
  primaryActionText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 20,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#E7F3FF',
  },
  changePhotoText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#1877F2',
    fontWeight: '500',
  },
  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
  },
  removePhotoText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#E41E3F',
    fontWeight: '500',
  },
  benefitsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1E21',
    marginBottom: 15,
  },
  benefitsList: {
    gap: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E7F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  benefitContent: {
    flex: 1,
    paddingTop: 2,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1E21',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#65676B',
    lineHeight: 18,
  },
  guidelinesSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    borderRadius: 12,
  },
  guidelinesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1E21',
    marginBottom: 15,
  },
  guidelinesList: {
    gap: 10,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guidelineText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#65676B',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E6EA',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    marginLeft: 5,
    fontSize: 16,
    color: '#65676B',
    fontWeight: '500',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1877F2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  continueButtonText: {
    marginRight: 5,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
  },
  skipButtonText: {
    marginRight: 5,
    fontSize: 16,
    color: '#65676B',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1E21',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  optionTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1E21',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: '#65676B',
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 10,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#1877F2',
    fontWeight: '500',
  },
  // IMPROVED CROP INTERFACE STYLES
  cropContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  cropHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 80,
    justifyContent: 'center',
  },
  cropHeaderButtonText: {
    marginLeft: 5,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  cropSaveButton: {
    backgroundColor: '#1877F2',
  },
  cropTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cropImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cropImage: {
    width: screenWidth,
    height: screenHeight * 0.6,
  },
  cropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropSquare: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  cropCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#1877F2',
    top: -2,
    left: -2,
  },
  cropCornerTopRight: {
    top: -2,
    right: -2,
    left: 'auto',
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderLeftWidth: 0,
  },
  cropCornerBottomLeft: {
    bottom: -2,
    left: -2,
    top: 'auto',
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderTopWidth: 0,
  },
  cropCornerBottomRight: {
    bottom: -2,
    right: -2,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  cropInstructions: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  cropInstructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  cropInstructionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  cropBottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cropCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cropCancelButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  cropConfirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1877F2',
    minWidth: 120,
  },
  cropConfirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
};


export default ProfileImageScreen;