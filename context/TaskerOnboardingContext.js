import React, { createContext, useContext, useState, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeProfile, fetchUser } from '../api/authApi';
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
  
  // Onboarding progress
  currentStep: 1,
  totalSteps: 5,
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
        bio: action.payload.bio || state.bio,
        phone: action.payload.phone || state.phone,
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
          city: null
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
      // FIXED: Consistent image structure
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

    case ACTION_TYPES.SET_CURRENT_STEP:
      return {
        ...state,
        currentStep: action.payload
      };

    case ACTION_TYPES.SET_ERRORS:
      return {
        ...state,
        errors: {
          ...state.errors,
          ...action.payload
        }
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
      type: imageData.mime || 'image/jpeg',
      name: 'profile.jpg',
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

  // Validation functions
  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 1: // Basic Info
        if (!state.bio.trim()) {
          errors.bio = 'Professional summary is required';
        } else if (state.bio.length < 10) {
          errors.bio = 'Please provide a more detailed professional summary (min. 10 characters)';
        } else if (state.bio.length > 500) {
          errors.bio = 'Professional summary must be less than 500 characters';
        }

        if (!state.phone.trim()) {
          errors.phone = 'Phone number is required';
        } else if (!/^\d{10,12}$/.test(state.phone.replace(/[^0-9]/g, ''))) {
          errors.phone = 'Please enter a valid phone number';
        }
        break;

      case 2: // Location
        if (!state.location.region) {
          errors.region = 'Region is required';
        }
        if (!state.location.city.trim()) {
          errors.city = 'City is required';
        }
        break;

      case 3: // Skills
        if (state.skills.length === 0) {
          errors.skills = 'Please select at least one skill';
        }
        break;

      case 4: // Profile Image (optional, so no validation)
        break;
    }

    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return false;
    }

    clearErrors();
    return true;
  };

  // Navigation helpers
  const goToNextStep = () => {
    // Validate synchronously first
    const errors = validateStep(state.currentStep);
    
    if (Object.keys(errors).length > 0) {
      // If there are errors, set them and prevent navigation
      setErrors(errors);
      return false;
    } else {
      // If no errors, clear any existing errors and proceed
      clearErrors();
      const nextStep = state.currentStep + 1;
      setCurrentStep(nextStep);
      return true;
    }
  };

  const goToPreviousStep = () => {
    if (state.currentStep > 1) {
      setCurrentStep(state.currentStep - 1);
      return true;
    }
    return false;
  };

  const goToStep = (step) => {
    if (step >= 1 && step <= state.totalSteps) {
      setCurrentStep(step);
      return true;
    }
    return false;
  };

  // FIXED: submitOnboarding function
  const submitOnboarding = async () => {
    try {
      setSubmitting(true);
      
      // Prepare data for API
      const formData = new FormData();
      
      // Append basic info
      formData.append('Bio', state.bio);
      formData.append('phone', state.phone);
      
      // Append location
      formData.append('location[region]', state.location.region);
      formData.append('location[city]', state.location.city);
      formData.append('location[town]', state.location.town || '');
      formData.append('location[street]', state.location.street || '');
      
      // Append skills
      state.skills.forEach((skill, index) => {
        formData.append(`skills[${index}]`, skill);
      });
      
      // FIXED: Properly append profile image if it exists
      if (state.profileImage && state.profileImage.uri) {
        console.log('Appending profile image:', state.profileImage);
        
        // Create the file object properly for React Native
        formData.append('profileImage', {
          uri: state.profileImage.uri,
          type: state.profileImage.type || 'image/jpeg',
          name: state.profileImage.name || 'profile.jpg',
        });
      } else {
        console.log('No profile image to append');
      }
      
      // Log formData for debugging
      console.log('FormData being sent:', {
        bio: state.bio,
        phone: state.phone,
        location: state.location,
        skills: state.skills,
        hasProfileImage: !!(state.profileImage && state.profileImage.uri)
      });
      
      const response = await completeProfile(formData);
      
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

// Custom hook for using the onboarding context
export const useTaskerOnboarding = () => {
  const context = useContext(TaskerOnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};