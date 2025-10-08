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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

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

  const autoCropToSquare = async (uri) => {
    try {
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
            accessibilityLabel="Cancel cropping"
            accessibilityHint="Discard the current photo and return to the profile image screen"
          >
            <Text style={styles.cropCancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cropConfirmButton}
            onPress={handleCustomCropComplete}
            disabled={isUploading}
            accessibilityLabel="Use this photo"
            accessibilityHint="Confirm and save the cropped photo as your profile image"
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
            accessibilityLabel="Take photo"
            accessibilityHint="Open the camera to take a new profile photo"
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
            accessibilityLabel="Choose from library"
            accessibilityHint="Select an existing photo from your photo library"
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
            accessibilityLabel="Cancel photo selection"
            accessibilityHint="Close the photo selection options"
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
                    accessibilityLabel="Edit profile photo"
                    accessibilityHint="Open options to change or take a new profile photo"
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
                accessibilityLabel="Add profile photo"
                accessibilityHint="Open options to take or select a profile photo"
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
                accessibilityLabel="Change profile photo"
                accessibilityHint="Open options to select a different photo"
              >
                <Ionicons name="camera-outline" size={18} color="#1877F2" />
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.removePhotoButton}
                onPress={removeImage}
                activeOpacity={0.7}
                accessibilityLabel="Remove profile photo"
                accessibilityHint="Remove the current profile photo"
              >
                <Ionicons name="trash-outline" size={18} color="#E41E3F" />
                <Text style={styles.removePhotoText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
          accessibilityLabel="Go back"
          accessibilityHint="Return to the previous step in the onboarding process"
        >
          <Ionicons name="chevron-back" size={20} color="#65676B" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {image ? (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
            accessibilityLabel="Continue to review"
            accessibilityHint="Proceed to the review step with the selected profile photo"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
            accessibilityLabel="Skip adding photo"
            accessibilityHint="Skip adding a profile photo and proceed to the next step"
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
    paddingBottom: hp('20%'), // Increased padding to ensure content is not cut off
  },
  header: {
    padding: wp('5%'),
    paddingTop: hp('2%'),
  },
  title: {
    fontSize: wp('7%'),
    fontWeight: 'bold',
    color: '#1C1E21',
    marginBottom: hp('1%'),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: wp('4%'),
    color: '#65676B',
    textAlign: 'center',
    lineHeight: wp('5.5%'),
  },
  previewSection: {
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('4%'),
  },
  imageWrapper: {
    alignItems: 'center',
  },
  imageContainer: {
    width: wp('50%'),
    height: wp('50%'),
    borderRadius: wp('25%'),
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
    borderRadius: wp('24%'),
  },
  editButton: {
    position: 'absolute',
    bottom: wp('2.5%'),
    right: wp('2.5%'),
    backgroundColor: '#1877F2',
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderIcon: {
    marginBottom: hp('1%'),
  },
  placeholderText: {
    fontSize: wp('4%'),
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
    borderRadius: wp('24%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: hp('1%'),
    fontSize: wp('3.5%'),
    color: '#FFFFFF',
    fontWeight: '500',
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp('2%'),
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.5%'),
    backgroundColor: '#E8F5E8',
    borderRadius: wp('6%'),
  },
  successText: {
    marginLeft: wp('2%'),
    fontSize: wp('3.5%'),
    color: '#42B883',
    fontWeight: '500',
  },
  actionButtons: {
    marginTop: hp('4%'),
    alignItems: 'center',
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1877F2',
    paddingHorizontal: wp('7.5%'),
    paddingVertical: hp('2%'),
    borderRadius: wp('6%'),
    minWidth: wp('40%'),
    justifyContent: 'center',
  },
  primaryActionText: {
    marginLeft: wp('2%'),
    fontSize: wp('4%'),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: hp('3%'),
    gap: wp('5%'),
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('5%'),
    backgroundColor: '#E7F3FF',
  },
  changePhotoText: {
    marginLeft: wp('1.5%'),
    fontSize: wp('3.5%'),
    color: '#1877F2',
    fontWeight: '500',
  },
  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('5%'),
    backgroundColor: '#FFEBEE',
  },
  removePhotoText: {
    marginLeft: wp('1.5%'),
    fontSize: wp('3.5%'),
    color: '#E41E3F',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    paddingBottom: Platform.OS === 'ios' ? hp('6%') : hp('8%'), // Extra padding for system UI
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E6EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('5%'),
    minWidth: wp('25%'),
    justifyContent: 'center',
    backgroundColor: '#F0F2F5',
  },
  backButtonText: {
    marginLeft: wp('1%'),
    fontSize: wp('4%'),
    color: '#65676B',
    fontWeight: '500',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1877F2',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('5%'),
    minWidth: wp('30%'),
    justifyContent: 'center',
  },
  continueButtonText: {
    marginRight: wp('1%'),
    fontSize: wp('4%'),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('5%'),
    minWidth: wp('30%'),
    justifyContent: 'center',
    backgroundColor: '#F0F2F5',
  },
  skipButtonText: {
    marginRight: wp('1%'),
    fontSize: wp('4%'),
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
    borderTopLeftRadius: wp('5%'),
    borderTopRightRadius: wp('5%'),
    paddingBottom: hp('2%'),
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: hp('2.5%'),
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6EA',
  },
  modalTitle: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    color: '#1C1E21',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  optionTextContainer: {
    marginLeft: wp('4%'),
    flex: 1,
  },
  optionTitle: {
    fontSize: wp('4%'),
    fontWeight: '500',
    color: '#1C1E21',
    marginBottom: hp('0.5%'),
  },
  optionDescription: {
    fontSize: wp('3.5%'),
    color: '#65676B',
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: hp('2%'),
    marginTop: hp('1%'),
  },
  modalCancelText: {
    fontSize: wp('4%'),
    color: '#1877F2',
    fontWeight: '500',
  },
  cropContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  cropTitle: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cropSubtitle: {
    fontSize: wp('3.5%'),
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: hp('1%'),
  },
  cropPreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cropPreviewImage: {
    width: screenWidth,
    height: hp('60%'),
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
  cropCircle: {
    width: wp('60%'),
    height: wp('60%'),
    borderRadius: wp('30%'),
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  cropGuideText: {
    marginTop: hp('2%'),
    fontSize: wp('3.5%'),
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  cropControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cropCancelButton: {
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('2%'),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cropCancelText: {
    fontSize: wp('4%'),
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  cropConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('2%'),
    backgroundColor: '#1877F2',
    minWidth: wp('30%'),
    justifyContent: 'center',
  },
  cropConfirmText: {
    marginLeft: wp('2%'),
    fontSize: wp('4%'),
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
};

export default ProfileImageScreen;