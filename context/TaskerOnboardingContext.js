import React, { createContext, useContext, useState, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeProfile, fetchUser, uploadProfileImage, uploadIdCard } from '../api/authApi';
import { sendFileToS3 } from '../api/commonApi';
import { AuthContext } from './AuthContext';

const TaskerOnboardingContext = createContext();

// Initial state matching your web form structure
const initialState = {
  // Step 1: Basic Info
  bio: '',
  phone: '',
  
  // Step 2: Location
  location: {
    region: '',
    city: '',
    town: '',
    street: ''
  },
  
  // Step 3: Skills
  skills: [],
  
  // Step 4: Profile Image - FIXED: Consistent structure
  profileImage: {
    uri: '',
    type: '',
    name: ''
  },
  
  // Step 5: ID Card
  idCard: {
    uri: '',
    type: '',
    name: '',
    front: '', // For front side of ID
    back: ''  // For back side of ID (optional based on your requirements)
  },
  
  // Onboarding progress
  currentStep: 1,
  totalSteps: 6, // Updated from 5 to 6
  isSubmitting: false,
  
  // Validation errors
  errors: {}
};

// Action types
const ACTION_TYPES = {
  UPDATE_BASIC_INFO: 'UPDATE_BASIC_INFO',
  UPDATE_LOCATION: 'UPDATE_LOCATION',
  UPDATE_SKILLS: 'UPDATE_SKILLS',
  UPDATE_PROFILE_IMAGE: 'UPDATE_PROFILE_IMAGE',
  UPDATE_ID_CARD: 'UPDATE_ID_CARD',
  SET_CURRENT_STEP: 'SET_CURRENT_STEP',
  SET_ERRORS: 'SET_ERRORS',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
  SET_SUBMITTING: 'SET_SUBMITTING',
  RESET_ONBOARDING: 'RESET_ONBOARDING',
  LOAD_SAVED_PROGRESS: 'LOAD_SAVED_PROGRESS'
};

// Reducer function
const onboardingReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.UPDATE_BASIC_INFO:
      return {
        ...state,
        bio: action.payload.bio !== undefined ? action.payload.bio : state.bio,
        phone: action.payload.phone !== undefined ? action.payload.phone : state.phone,
        errors: {
          ...state.errors,
          bio: null,
          phone: null
        }
      };

    case ACTION_TYPES.UPDATE_LOCATION:
      return {
        ...state,
        location: {
          ...state.location,
          ...action.payload
        },
        errors: {
          ...state.errors,
          region: null,
          city: null,
          town: null,
          street: null
        }
      };

    case ACTION_TYPES.UPDATE_SKILLS:
      return {
        ...state,
        skills: action.payload,
        errors: {
          ...state.errors,
          skills: null
        }
      };

    case ACTION_TYPES.UPDATE_PROFILE_IMAGE:
      return {
        ...state,
        profileImage: {
          uri: action.payload.uri || '',
          type: action.payload.type || 'image/jpeg',
          name: action.payload.name || 'profile.jpg',
          width: action.payload.width,
          height: action.payload.height
        },
        errors: {
          ...state.errors,
          profileImage: null
        }
      };

    case ACTION_TYPES.UPDATE_ID_CARD:
      return {
        ...state,
        idCard: {
          ...state.idCard,
          ...action.payload
        },
        errors: {
          ...state.errors,
          idCard: null
        }
      };

    case ACTION_TYPES.SET_CURRENT_STEP:
      return {
        ...state,
        currentStep: action.payload
      };

    case ACTION_TYPES.SET_ERRORS:
      return {
        ...state,
        errors: action.payload // Replace errors entirely, don't merge
      };

    case ACTION_TYPES.CLEAR_ERRORS:
      return {
        ...state,
        errors: {}
      };

    case ACTION_TYPES.SET_SUBMITTING:
      return {
        ...state,
        isSubmitting: action.payload
      };

    case ACTION_TYPES.RESET_ONBOARDING:
      return {
        ...initialState
      };

    case ACTION_TYPES.LOAD_SAVED_PROGRESS:
      return {
        ...state,
        ...action.payload
      };

    default:
      return state;
  }
};

// Storage keys
const STORAGE_KEYS = {
  ONBOARDING_DATA: '@tasker_onboarding_data',
  ONBOARDING_STEP: '@tasker_onboarding_step'
};

export const TaskerOnboardingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const { setUser } = useContext(AuthContext);

  // Save progress to AsyncStorage
  const saveProgress = async (data) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DATA, JSON.stringify(data));
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_STEP, data.currentStep.toString());
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
    }
  };

  // Load saved progress from AsyncStorage
  const loadSavedProgress = async () => {
    try {
      const [savedData, savedStep] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_STEP)
      ]);

      if (savedData) {
        const parsedData = JSON.parse(savedData);
        dispatch({
          type: ACTION_TYPES.LOAD_SAVED_PROGRESS,
          payload: {
            ...parsedData,
            currentStep: savedStep ? parseInt(savedStep) : 1
          }
        });
        return true;
      }
    } catch (error) {
      console.error('Error loading onboarding progress:', error);
    }
    return false;
  };

  // Clear saved progress
  const clearProgress = async () => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.ONBOARDING_DATA, STORAGE_KEYS.ONBOARDING_STEP]);
      dispatch({ type: ACTION_TYPES.RESET_ONBOARDING });
    } catch (error) {
      console.error('Error clearing onboarding progress:', error);
    }
  };

  // Upload image to S3
  const uploadImageToS3 = async (imageData, isIdCard = false) => {
    try {
      // Extract file info from imageData
      const filename = imageData.name || (isIdCard ? 'id-card.jpg' : 'profile.jpg');
      const type = imageData.type || 'image/jpeg';
      
      // Create file object
      const file = {
        uri: imageData.uri,
        name: filename,
        type: type,
      };

      // Get pre-signed URL from backend - use appropriate API based on file type
      const uploadFunction = isIdCard ? uploadIdCard : uploadProfileImage;
      const res = await uploadFunction({ 
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
      throw new Error(`Failed to upload ${isIdCard ? 'ID card' : 'image'}`);
    }
  };

  // Action creators
  const updateBasicInfo = (basicInfo) => {
    dispatch({ type: ACTION_TYPES.UPDATE_BASIC_INFO, payload: basicInfo });
    saveProgress({ ...state, ...basicInfo, currentStep: state.currentStep });
  };

  const updateLocation = (location) => {
    dispatch({ type: ACTION_TYPES.UPDATE_LOCATION, payload: location });
    saveProgress({ ...state, location: { ...state.location, ...location }, currentStep: state.currentStep });
  };

  const updateSkills = (skills) => {
    dispatch({ type: ACTION_TYPES.UPDATE_SKILLS, payload: skills });
    saveProgress({ ...state, skills, currentStep: state.currentStep });
  };

  const updateProfileImage = (imageData) => {
    // FIXED: Ensure consistent image data structure
    const processedImageData = {
      uri: imageData.uri,
      type: imageData.mime || imageData.type || 'image/jpeg',
      name: imageData.name || 'profile.jpg',
      width: imageData.width,
      height: imageData.height
    };
    
    dispatch({ type: ACTION_TYPES.UPDATE_PROFILE_IMAGE, payload: processedImageData });
    saveProgress({ 
      ...state, 
      profileImage: processedImageData, 
      currentStep: state.currentStep 
    });
  };

  const updateIdCard = (idCardData) => {
    const processedIdCardData = {
      uri: idCardData.uri,
      type: idCardData.mime || idCardData.type || 'image/jpeg',
      name: idCardData.name || 'id-card.jpg',
      width: idCardData.width,
      height: idCardData.height,
      front: idCardData.front || '',
      back: idCardData.back || ''
    };
    
    dispatch({ type: ACTION_TYPES.UPDATE_ID_CARD, payload: processedIdCardData });
    saveProgress({ 
      ...state, 
      idCard: processedIdCardData, 
      currentStep: state.currentStep 
    });
  };

  const setCurrentStep = (step) => {
    dispatch({ type: ACTION_TYPES.SET_CURRENT_STEP, payload: step });
    saveProgress({ ...state, currentStep: step });
  };

  const setErrors = (errors) => {
    dispatch({ type: ACTION_TYPES.SET_ERRORS, payload: errors });
  };

  const clearErrors = () => {
    dispatch({ type: ACTION_TYPES.CLEAR_ERRORS });
  };

  const setSubmitting = (isSubmitting) => {
    dispatch({ type: ACTION_TYPES.SET_SUBMITTING, payload: isSubmitting });
  };

  const resetOnboarding = () => {
    clearProgress();
  };

  // Validation functions - FIXED VERSION
  const validateStep = (step, currentState = state) => {
    const errors = {};

    switch (step) {
      case 1: // Basic Info
        if (!currentState.bio || !currentState.bio.trim()) {
          errors.bio = 'Professional summary is required';
        } else if (currentState.bio.trim().length < 10) {
          errors.bio = 'Please provide a more detailed professional summary (min. 10 characters)';
        } else if (currentState.bio.trim().length > 500) {
          errors.bio = 'Professional summary must be less than 500 characters';
        }

        if (!currentState.phone || !currentState.phone.trim()) {
          errors.phone = 'Phone number is required';
        } else if (!/^\d{10,12}$/.test(currentState.phone.replace(/[^0-9]/g, ''))) {
          errors.phone = 'Please enter a valid phone number';
        }
        break;

      case 2: // Location
        if (!currentState.location.region || !currentState.location.region.trim()) {
          errors.region = 'Region is required';
        }
        if (!currentState.location.city || !currentState.location.city.trim()) {
          errors.city = 'City is required';
        }
        break;

      case 3: // Skills
        if (!currentState.skills || currentState.skills.length === 0) {
          errors.skills = 'Please select at least one skill';
        }
        break;

      case 4: // Profile Image (optional, so no validation needed)
        // No validation required for optional profile image
        break;

      case 5: // ID Card
        if (!currentState.idCard || !currentState.idCard.uri) {
          errors.idCard = 'ID card photo is required for verification';
        }
        break;

      default:
        break;
    }

    return errors;
  };

  // FIXED: Navigation helpers - proper error handling
  const goToNextStep = () => {
    // Clear any existing errors first
    dispatch({ type: ACTION_TYPES.CLEAR_ERRORS });
    
    // Validate current step with current state
    //const validationErrors = validateStep(state.currentStep, state);
    
    // Check if there are any validation errors
   /* if (Object.keys(validationErrors).length > 0) {
      // Set errors and prevent navigation
      dispatch({ type: ACTION_TYPES.SET_ERRORS, payload: validationErrors });
      console.log('Validation failed for step', state.currentStep, ':', validationErrors);
      return false;
    }*/
    
    // No errors - proceed to next step
    const nextStep = state.currentStep + 1;
    if (nextStep <= state.totalSteps) {
      dispatch({ type: ACTION_TYPES.SET_CURRENT_STEP, payload: nextStep });
      saveProgress({ ...state, currentStep: nextStep, errors: {} });
      console.log('Moving to step', nextStep);
      return true;
    }
    
    return false;
  };

  const goToPreviousStep = () => {
    if (state.currentStep > 1) {
      // Clear errors when going back
      dispatch({ type: ACTION_TYPES.CLEAR_ERRORS });
      const prevStep = state.currentStep - 1;
      dispatch({ type: ACTION_TYPES.SET_CURRENT_STEP, payload: prevStep });
      saveProgress({ ...state, currentStep: prevStep, errors: {} });
      return true;
    }
    return false;
  };

  const goToStep = (step) => {
    if (step >= 1 && step <= state.totalSteps) {
      // Clear errors when jumping to a step
      dispatch({ type: ACTION_TYPES.CLEAR_ERRORS });
      dispatch({ type: ACTION_TYPES.SET_CURRENT_STEP, payload: step });
      saveProgress({ ...state, currentStep: step, errors: {} });
      return true;
    }
    return false;
  };

  // UPDATED: submitOnboarding function with ID card upload
  const submitOnboarding = async () => {
    try {
      setSubmitting(true);
      
      let profileImageUrl = '';
      let idCardUrl = '';
      
      // Upload profile image to S3 if it exists
      if (state.profileImage && state.profileImage.uri) {
        console.log('Uploading profile image to S3...');
        try {
          profileImageUrl = await uploadImageToS3(state.profileImage, false);
          console.log('Profile image uploaded successfully:', profileImageUrl);
        } catch (uploadError) {
          console.error('Failed to upload profile image:', uploadError);
          throw new Error('Failed to upload profile image. Please try again.');
        }
      } else {
        console.log('No profile image to upload');
      }
      
      // Upload ID card to S3 if it exists
      if (state.idCard && state.idCard.uri) {
        console.log('Uploading ID card to S3...');
        try {
          idCardUrl = await uploadImageToS3(state.idCard, true);
          console.log('ID card uploaded successfully:', idCardUrl);
        } catch (uploadError) {
          console.error('Failed to upload ID card:', uploadError);
          throw new Error('Failed to upload ID card. Please try again.');
        }
      } else {
        console.log('No ID card to upload');
      }
      
      // Prepare data for API
      const requestData = {
        Bio: state.bio,
        phone: state.phone,
        location: {
          region: state.location.region,
          city: state.location.city,
          town: state.location.town || '',
          street: state.location.street || ''
        },
        skills: state.skills
      };
      
      // Add profile image URL if it was uploaded
      if (profileImageUrl) {
        requestData.profileImage = profileImageUrl;
      }
      
      // Add ID card URL if it was uploaded
      if (idCardUrl) {
        requestData.idCard = idCardUrl;
      }
      
      // Log request data for debugging
      console.log('Request data being sent:', {
        bio: state.bio,
        phone: state.phone,
        location: state.location,
        skills: state.skills,
        hasProfileImage: !!profileImageUrl,
        profileImageUrl: profileImageUrl,
        hasIdCard: !!idCardUrl,
        idCardUrl: idCardUrl
      });
      
      // Send the data to complete profile
      const response = await completeProfile(requestData);
      
      // After Onboarding Process is Complete, we fetch the User and set it
      const res = await fetchUser();
      setUser(res.data);
      
      // Clear onboarding data after successful submission
      await clearProgress();
      
      return response;
    } catch (error) {
      console.error('Onboarding submission error:', error);
      // Log more detailed error information
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const value = {
    // State
    ...state,
    
    // Actions
    updateBasicInfo,
    updateLocation,
    updateSkills,
    updateProfileImage,
    updateIdCard,
    setCurrentStep,
    setErrors,
    clearErrors,
    setSubmitting,
    resetOnboarding,
    submitOnboarding,
    
    // Helpers
    validateStep,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    loadSavedProgress,
    clearProgress
  };

  return (
    <TaskerOnboardingContext.Provider value={value}>
      {children}
    </TaskerOnboardingContext.Provider>
  );
};

export const useTaskerOnboarding = () => {
  const context = useContext(TaskerOnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};