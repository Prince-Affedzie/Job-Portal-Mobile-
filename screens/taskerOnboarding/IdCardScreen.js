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

const IdCardScreen = () => {
  const { 
    idCard, 
    updateIdCard, 
    goToNextStep, 
    goToPreviousStep,
    errors,
    clearErrors
  } = useTaskerOnboarding();
  
  const navigation = useNavigation();

  const [image, setImage] = useState(idCard?.uri || null);
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
          'We need camera access to take photos of your ID card. Please enable this in your device settings.',
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
          'We need access to your photo library to select ID card images. Please enable this in your device settings.',
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
        aspect: [3, 2], // ID card aspect ratio
        quality: 0.9, // Higher quality for document clarity
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
        allowsEditing: false,
        aspect: [3, 2], // ID card aspect ratio
        quality: 0.9, // Higher quality for document clarity
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
          { resize: { width: 800, height: 533 } }, // Higher resolution for ID card
        ],
        { compress: 0.9, format: SaveFormat.JPEG }
      );
      
      return manipResult;
    } catch (error) {
      throw new Error('Failed to crop image');
    }
  };

  const autoCropToDocument = async (uri) => {
    try {
      return new Promise((resolve, reject) => {
        Image.getSize(uri, (width, height) => {
          // Maintain document aspect ratio (3:2)
          const targetAspect = 3/2;
          const currentAspect = width / height;
          
          let cropWidth, cropHeight, offsetX, offsetY;
          
          if (currentAspect > targetAspect) {
            // Image is wider than target, crop width
            cropHeight = height;
            cropWidth = cropHeight * targetAspect;
            offsetX = (width - cropWidth) / 2;
            offsetY = 0;
          } else {
            // Image is taller than target, crop height
            cropWidth = width;
            cropHeight = cropWidth / targetAspect;
            offsetX = 0;
            offsetY = (height - cropHeight) / 2;
          }
          
          cropImage(uri, {
            x: offsetX,
            y: offsetY,
            width: cropWidth,
            height: cropHeight,
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
      
      // Clear any previous errors
      clearErrors();
      
      const imageData = {
        uri: imageAsset.uri,
        width: imageAsset.width,
        height: imageAsset.height,
        type: imageAsset.type || 'image/jpeg',
        name: 'id-card.jpg'
      };

      setImage(imageAsset.uri);
      updateIdCard(imageData);
      
    } catch (error) {
      Alert.alert('Upload Failed', 'Something went wrong while processing your ID card image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCustomCropComplete = async () => {
    try {
      setIsUploading(true);
      setShowCropInterface(false);
      
      const croppedImage = await autoCropToDocument(imageToCrop);
      
      const imageData = {
        uri: croppedImage.uri,
        width: croppedImage.width,
        height: croppedImage.height,
        type: 'image/jpeg',
        name: 'id-card.jpg'
      };

      setImage(croppedImage.uri);
      updateIdCard(imageData);
      setImageToCrop(null);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to crop ID card image. Please try again.');
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
          <Text style={styles.cropTitle}>Crop Your ID Card</Text>
          <Text style={styles.cropSubtitle}>
            Ensure your ID card fits within the frame and all details are clearly visible
          </Text>
        </View>

        <View style={styles.cropPreviewContainer}>
          <Image 
            source={{ uri: imageToCrop }} 
            style={styles.cropPreviewImage}
            resizeMode="contain"
          />
          <View style={styles.cropOverlay}>
            <View style={styles.cropDocumentFrame} />
            <Text style={styles.cropGuideText}>
              Make sure all four corners of your ID card are visible
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
            accessibilityHint="Discard the current ID card photo and return to the ID card screen"
          >
            <Text style={styles.cropCancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cropConfirmButton}
            onPress={handleCustomCropComplete}
            disabled={isUploading}
            accessibilityLabel="Use this ID card photo"
            accessibilityHint="Confirm and save the cropped ID card photo"
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
      'Remove ID Card',
      'Are you sure you want to remove your ID card photo? This is required for verification.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setImage(null);
            updateIdCard({ uri: '', image: null });
          }
        },
      ]
    );
  };

  const handleContinue = () => {
    if (!image) {
      Alert.alert(
        'ID Card Required',
        'Please upload your ID card photo to continue with verification.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (goToNextStep()) {
      
      navigation.navigate('Review'); 
    }
  };

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
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
            <Text style={styles.modalTitle}>Upload ID Card</Text>
            <Text style={styles.modalSubtitle}>
              Take a clear photo of your government-issued ID card
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.modalOption}
            onPress={takePhotoWithCamera}
            accessibilityLabel="Take photo of ID card"
            accessibilityHint="Open the camera to take a photo of your ID card"
          >
            <Ionicons name="camera" size={24} color="#007AFF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Take Photo</Text>
              <Text style={styles.optionDescription}>Use your camera to capture ID card</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.modalOption}
            onPress={pickImageFromGallery}
            accessibilityLabel="Choose ID card from library"
            accessibilityHint="Select an existing photo of your ID card from your photo library"
          >
            <Ionicons name="images" size={24} color="#007AFF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Choose from Library</Text>
              <Text style={styles.optionDescription}>Select existing ID card photo</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.requirementsSection}>
            <Text style={styles.requirementsTitle}>Photo Requirements:</Text>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.requirementText}>Government-issued ID card</Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.requirementText}>Clear and legible text</Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.requirementText}>All four corners visible</Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.requirementText}>Good lighting, no glare</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.modalCancel}
            onPress={() => setShowOptions(false)}
            accessibilityLabel="Cancel ID card selection"
            accessibilityHint="Close the ID card selection options"
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
            {image ? 'ID Card Uploaded!' : 'Verify Your Identity'}
          </Text>
          <Text style={styles.subtitle}>
            {image 
              ? 'Your ID card has been successfully uploaded for verification.'
              : 'Upload a clear photo of your government-issued ID card for verification purposes. This helps ensure safety and trust in our community.'
            }
          </Text>
        </View>

        {/* Error Message */}
        {errors.idCard && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{errors.idCard}</Text>
          </View>
        )}

        <View style={styles.previewSection}>
          <View style={styles.imageWrapper}>
            <View style={[
              styles.imageContainer,
              image && styles.imageContainerWithPhoto
            ]}>
              {image ? (
                <>
                  <Image source={{ uri: image }} style={styles.idCardImage} />
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => setShowOptions(true)}
                    activeOpacity={0.8}
                    accessibilityLabel="Edit ID card photo"
                    accessibilityHint="Open options to change or take a new ID card photo"
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.placeholder}>
                  <View style={styles.placeholderIcon}>
                    <Ionicons name="card" size={48} color="#8A8D91" />
                  </View>
                  <Text style={styles.placeholderText}>No ID card uploaded</Text>
                  <Text style={styles.placeholderSubtext}>
                    Required for verification
                  </Text>
                </View>
              )}
              
              {isUploading && (
                <View style={styles.loadingOverlay}>
                  <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color="#1877F2" />
                    <Text style={styles.loadingText}>Processing ID card...</Text>
                  </View>
                </View>
              )}
            </View>

            {image && (
              <View style={styles.successIndicator}>
                <Ionicons name="checkmark-circle" size={20} color="#42B883" />
                <Text style={styles.successText}>ID card uploaded successfully</Text>
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
                accessibilityLabel="Upload ID card"
                accessibilityHint="Open options to take or select an ID card photo"
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Upload ID Card</Text>
              </TouchableOpacity>
            </View>
          )}

          {image && (
            <View style={styles.photoActions}>
              <TouchableOpacity 
                style={styles.changePhotoButton}
                onPress={() => setShowOptions(true)}
                activeOpacity={0.7}
                accessibilityLabel="Change ID card photo"
                accessibilityHint="Open options to select a different ID card photo"
              >
                <Ionicons name="camera-outline" size={18} color="#1877F2" />
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.removePhotoButton}
                onPress={removeImage}
                activeOpacity={0.7}
                accessibilityLabel="Remove ID card photo"
                accessibilityHint="Remove the current ID card photo"
              >
                <Ionicons name="trash-outline" size={18} color="#E41E3F" />
                <Text style={styles.removePhotoText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Ionicons name="shield-checkmark" size={20} color="#34C759" />
            <View style={styles.securityTextContainer}>
              <Text style={styles.securityTitle}>Your Security Matters</Text>
              <Text style={styles.securityDescription}>
                Your ID card information is encrypted and stored securely. We only use it for verification purposes and never share it with third parties.
              </Text>
            </View>
          </View>
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

        <TouchableOpacity
          style={[
            styles.continueButton,
            !image && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={!image}
          accessibilityLabel={image ? "Continue to next step" : "Upload ID card to continue"}
          accessibilityHint={image ? "Proceed to the next step with the uploaded ID card" : "ID card upload is required to continue"}
        >
          <Text style={[
            styles.continueButtonText,
            !image && styles.continueButtonTextDisabled
          ]}>
            Continue
          </Text>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={image ? "#FFFFFF" : "#A0A4A8"} 
          />
        </TouchableOpacity>
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
    paddingBottom: hp('20%'),
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.5%'),
    marginHorizontal: wp('5%'),
    marginTop: hp('1%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    marginLeft: wp('2%'),
    fontSize: wp('3.5%'),
    color: '#D32F2F',
    fontWeight: '500',
    flex: 1,
  },
  previewSection: {
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('4%'),
  },
  imageWrapper: {
    alignItems: 'center',
  },
  imageContainer: {
    width: wp('70%'),
    height: wp('46.67%'), // 3:2 aspect ratio
    borderRadius: wp('4%'),
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#E4E6EA',
    borderStyle: 'dashed',
  },
  imageContainerWithPhoto: {
    borderColor: '#1877F2',
    borderStyle: 'solid',
  },
  idCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: wp('3%'),
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
    padding: wp('5%'),
  },
  placeholderIcon: {
    marginBottom: hp('1%'),
  },
  placeholderText: {
    fontSize: wp('4%'),
    color: '#8A8D91',
    fontWeight: '500',
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: wp('3%'),
    color: '#A0A4A8',
    textAlign: 'center',
    marginTop: hp('0.5%'),
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: wp('3%'),
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
    minWidth: wp('50%'),
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
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: hp('4%'),
    padding: wp('4%'),
    backgroundColor: '#F0F9FF',
    borderRadius: wp('3%'),
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  securityTextContainer: {
    flex: 1,
    marginLeft: wp('3%'),
  },
  securityTitle: {
    fontSize: wp('3.8%'),
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: hp('0.5%'),
  },
  securityDescription: {
    fontSize: wp('3.2%'),
    color: '#64748B',
    lineHeight: wp('4.2%'),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    paddingBottom: Platform.OS === 'ios' ? hp('6%') : hp('8%'),
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
  continueButtonDisabled: {
    backgroundColor: '#F0F2F5',
  },
  continueButtonText: {
    marginRight: wp('1%'),
    fontSize: wp('4%'),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#A0A4A8',
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
  modalSubtitle: {
    fontSize: wp('3.5%'),
    color: '#65676B',
    textAlign: 'center',
    marginTop: hp('0.5%'),
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
  requirementsSection: {
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    backgroundColor: '#F8F9FA',
    marginHorizontal: wp('5%'),
    marginTop: hp('2%'),
    borderRadius: wp('3%'),
  },
  requirementsTitle: {
    fontSize: wp('3.8%'),
    fontWeight: '600',
    color: '#1C1E21',
    marginBottom: hp('1%'),
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('0.5%'),
  },
  requirementText: {
    marginLeft: wp('2%'),
    fontSize: wp('3.2%'),
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
  cropDocumentFrame: {
    width: wp('70%'),
    height: wp('46.67%'), // 3:2 aspect ratio
    borderRadius: wp('2%'),
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

export default IdCardScreen;