import React, { createContext, useContext, useState, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeProfile, fetchUser, uploadProfileImage, uploadIdCard } from '../api/authApi';
import { sendFileToS3 } from '../api/commonApi';
import { getAllServices } from '../api/commonApi';
import { AuthContext } from './AuthContext';

const TaskerOnboardingContext = createContext();

// Initial state with NEW STEP ORDER (6 steps total)
const initialState = {
  // Step 1: Skills & Services (moved to first)
  skills: [],
  primaryService: null, 
  secondaryServices: [], 
  allServices: [], 
  
  // Step 2: Basic Info (moved to second)
  bio: '',
  phone: '',
  
  // Step 3: Location (moved to third)
  location: {
    region: '',
    city: '',
    town: '',
    street: ''
  },
  
  // Step 4: Profile Image (moved to fourth)
  profileImage: {
    uri: '',
    type: '',
    name: ''
  },
  
  // Step 5: ID Card (moved to fifth)
  idCard: {
    uri: '',
    type: '',
    name: '',
    front: '',
    back: ''
  },
  
  // Step 6: Review & Submit (remains as step 6)
  // No additional state needed for review, it just displays collected data
  
  // Onboarding progress - 6 STEPS TOTAL
  currentStep: 1,
  totalSteps: 6, // Keep as 6 steps
  
  // State flags
  isSubmitting: false,
  
  // Validation errors
  errors: {},
  servicesLoading: false,
  servicesError: null
};

// Action types (no changes needed)
const ACTION_TYPES = {
  UPDATE_BASIC_INFO: 'UPDATE_BASIC_INFO',
  UPDATE_LOCATION: 'UPDATE_LOCATION',
  UPDATE_SKILLS: 'UPDATE_SKILLS',
  UPDATE_SERVICES: 'UPDATE_SERVICES',
  SET_ALL_SERVICES: 'SET_ALL_SERVICES',
  SET_SERVICES_LOADING: 'SET_SERVICES_LOADING',
  SET_SERVICES_ERROR: 'SET_SERVICES_ERROR',
  UPDATE_PROFILE_IMAGE: 'UPDATE_PROFILE_IMAGE',
  UPDATE_ID_CARD: 'UPDATE_ID_CARD',
  SET_CURRENT_STEP: 'SET_CURRENT_STEP',
  SET_ERRORS: 'SET_ERRORS',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
  SET_SUBMITTING: 'SET_SUBMITTING',
  RESET_ONBOARDING: 'RESET_ONBOARDING',
  LOAD_SAVED_PROGRESS: 'LOAD_SAVED_PROGRESS'
};

// Reducer function (no changes needed)
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

    case ACTION_TYPES.UPDATE_SERVICES:
      return {
        ...state,
        primaryService: action.payload.primaryService !== undefined 
          ? action.payload.primaryService 
          : state.primaryService,
        secondaryServices: action.payload.secondaryServices !== undefined 
          ? action.payload.secondaryServices 
          : state.secondaryServices,
        errors: {
          ...state.errors,
          primaryService: null,
          secondaryServices: null
        }
      };

    case ACTION_TYPES.SET_ALL_SERVICES:
      return {
        ...state,
        allServices: action.payload,
        servicesLoading: false,
        servicesError: null
      };

    case ACTION_TYPES.SET_SERVICES_LOADING:
      return {
        ...state,
        servicesLoading: action.payload
      };

    case ACTION_TYPES.SET_SERVICES_ERROR:
      return {
        ...state,
        servicesError: action.payload,
        servicesLoading: false
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
        errors: action.payload
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

// Storage keys (no changes)
const STORAGE_KEYS = {
  ONBOARDING_DATA: '@tasker_onboarding_data',
  ONBOARDING_STEP: '@tasker_onboarding_step',
  SERVICES_CACHE: '@services_cache'
};

export const TaskerOnboardingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const { setUser } = useContext(AuthContext);

  const fetchAllServices = async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.SERVICES_CACHE);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (Date.now() - parsedCache.timestamp < 24 * 60 * 60 * 1000) {
          dispatch({ type: ACTION_TYPES.SET_ALL_SERVICES, payload: parsedCache.data });
          return parsedCache.data;
        }
      }

      dispatch({ type: ACTION_TYPES.SET_SERVICES_LOADING, payload: true });
      
      const response = await getAllServices();
      const services = response.data;
      
      await AsyncStorage.setItem(STORAGE_KEYS.SERVICES_CACHE, JSON.stringify({
        data: services,
        timestamp: Date.now()
      }));
      
      dispatch({ type: ACTION_TYPES.SET_ALL_SERVICES, payload: services });
      return services;
    } catch (error) {
      console.error('Error fetching services:', error);
      dispatch({ 
        type: ACTION_TYPES.SET_SERVICES_ERROR, 
        payload: error.message || 'Failed to fetch services' 
      });
      throw error;
    }
  };

  const validateServices = () => {
    const errors = {};
    if (!state.primaryService) {
      errors.primaryService = 'Please select a primary service';
    }
    if (state.secondaryServices.length > 3) {
      errors.secondaryServices = 'You can only select up to 3 secondary services';
    }
    return errors;
  };

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
      const filename = imageData.name || (isIdCard ? 'id-card.jpg' : 'profile.jpg');
      const type = imageData.type || 'image/jpeg';
      
      const file = {
        uri: imageData.uri,
        name: filename,
        type: type,
      };

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
      
      await sendFileToS3(fileUrl, file);
      
      return publicUrl;
      
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error(`Failed to upload ${isIdCard ? 'ID card' : 'image'}`);
    }
  };

  // Action creators (no changes)
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

  const updateServices = (servicesData) => {
    dispatch({ type: ACTION_TYPES.UPDATE_SERVICES, payload: servicesData });
    saveProgress({ 
      ...state, 
      ...servicesData, 
      currentStep: state.currentStep 
    });
  };

  const updateProfileImage = (imageData) => {
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

  // UPDATED: Validation functions with NEW 6-STEP ORDER
  const validateStep = (step, currentState = state) => {
    const errors = {};

    // NEW 6-STEP ORDER:
    // Step 1: Skills & Services (was step 3)
    // Step 2: Basic Info (was step 1)
    // Step 3: Location (was step 2)
    // Step 4: Profile Image (was step 4)
    // Step 5: ID Card (was step 5)
    // Step 6: Review & Submit (no validation needed)

    switch (step) {
      case 1: // NEW: Skills & Services (moved from step 3)
        if (!currentState.skills || currentState.skills.length === 0) {
          errors.skills = 'Please select at least one skill';
        }
        if (!currentState.primaryService) {
          errors.primaryService = 'Please select a primary service';
        }
        if (currentState.secondaryServices.length > 3) {
          errors.secondaryServices = 'You can only select up to 3 secondary services';
        }
        break;

      case 2: // NEW: Basic Info (moved from step 1)
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

      case 3: // NEW: Location (moved from step 2)
        if (!currentState.location.region || !currentState.location.region.trim()) {
          errors.region = 'Region is required';
        }
        if (!currentState.location.city || !currentState.location.city.trim()) {
          errors.city = 'City is required';
        }
        break;

      case 4: // Profile Image (optional)
        // No validation required for optional profile image
        break;

      case 5: // ID Card
        if (!currentState.idCard || !currentState.idCard.uri) {
          errors.idCard = 'ID card photo is required for verification';
        }
        break;

      case 6: // Review & Submit
        // No validation needed for review step
        break;

      default:
        break;
    }

    return errors;
  };

  // Navigation helpers (no changes needed)
  const goToNextStep = () => {
    dispatch({ type: ACTION_TYPES.CLEAR_ERRORS });
    
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
      dispatch({ type: ACTION_TYPES.CLEAR_ERRORS });
      dispatch({ type: ACTION_TYPES.SET_CURRENT_STEP, payload: step });
      saveProgress({ ...state, currentStep: step, errors: {} });
      return true;
    }
    return false;
  };

  // submitOnboarding function (no changes needed)
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
        primaryService: state.primaryService?.name || state.primaryService, 
        secondaryServices: state.secondaryServices.map(service => 
          service.name || service 
        ),
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
      
      console.log('Request data being sent:', {
        bio: state.bio,
        phone: state.phone,
        location: state.location,
        skills: state.skills,
        primaryService: state.primaryService,
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
    updateServices,
    fetchAllServices,
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
    validateServices,
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