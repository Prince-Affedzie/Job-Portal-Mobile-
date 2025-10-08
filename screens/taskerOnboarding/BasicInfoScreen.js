import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  StatusBar,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const BasicInfoScreen = () => {
  const { 
    bio, 
    phone, 
    updateBasicInfo, 
    goToNextStep, 
    errors,
    clearErrors 
  } = useTaskerOnboarding();
  
  const navigation = useNavigation();
  const bioInputRef = useRef();
  const phoneInputRef = useRef();
  
  const [formData, setFormData] = useState({
    bio: bio || '',
    phone: phone || '',
  });
  const [focusedField, setFocusedField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const validation = useMemo(() => {
    const bioValid = formData.bio.trim().length >= 10;
    const phoneValid = formData.phone.trim().length >= 10 && 
                      /^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone);
    
    return {
      bio: {
        valid: bioValid,
        message: bioValid ? '' : 'Bio must be at least 10 characters',
      },
      phone: {
        valid: phoneValid,
        message: phoneValid ? '' : 'Enter a valid phone number (e.g., +233 20 456 7897)',
      },
      isFormValid: bioValid && phoneValid,
    };
  }, [formData.bio, formData.phone]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      clearErrors();
    }
  }, [errors, clearErrors]);

  const handleSubmit = async () => {
    if (!validation.isFormValid) {
      Alert.alert(
        'Incomplete Information',
        validation.bio.message || validation.phone.message,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      updateBasicInfo(formData);
      if (goToNextStep()) {
        navigation.navigate('Location');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : hp('2%')}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.header}>
              <Text style={styles.title}>Your Professional Profile</Text>
              <Text style={styles.subtitle}>
                Add your bio and phone number to help clients get to know you
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Professional Summary</Text>
                <Text style={styles.charCount}>{formData.bio.length}/500</Text>
              </View>
              <View style={[
                styles.inputWrapper,
                focusedField === 'bio' && styles.inputWrapperFocused,
                !validation.bio.valid && errors.bio && styles.inputWrapperError,
              ]}>
                <TextInput
                  ref={bioInputRef}
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe your skills, experience, and what makes you unique"
                  placeholderTextColor="#8E8E93"
                  value={formData.bio}
                  onChangeText={(text) => handleChange('bio', text)}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  onFocus={() => setFocusedField('bio')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => phoneInputRef.current?.focus()}
                  editable={!isSubmitting}
                  selectionColor="#007AFF"
                  returnKeyType="next"
                  accessibilityLabel="Professional summary"
                  accessibilityHint="Enter a bio describing your professional background, at least 10 characters"
                />
              </View>
              {!validation.bio.valid && errors.bio && (
                <Text style={styles.errorText}>{validation.bio.message}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'phone' && styles.inputWrapperFocused,
                !validation.phone.valid && errors.phone && styles.inputWrapperError,
              ]}>
                <TextInput
                  ref={phoneInputRef}
                  style={styles.textInput}
                  placeholder="+233 20 456 7897"
                  placeholderTextColor="#8E8E93"
                  value={formData.phone}
                  onChangeText={(text) => handleChange('phone', text)}
                  keyboardType="phone-pad"
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={handleSubmit}
                  editable={!isSubmitting}
                  selectionColor="#007AFF"
                  returnKeyType="done"
                  accessibilityLabel="Phone number"
                  accessibilityHint="Enter your phone number for client contact"
                />
              </View>
              {!validation.phone.valid && errors.phone && (
                <Text style={styles.errorText}>{validation.phone.message}</Text>
              )}
            </View>
          </Animated.View>
        </ScrollView>

        <SafeAreaView style={styles.footer} edges={['bottom']}>
          <TouchableOpacity
            style={[styles.button, !validation.isFormValid && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || !validation.isFormValid}
            activeOpacity={0.8}
            accessibilityLabel="Continue to location"
            accessibilityHint={validation.isFormValid ? "Proceed to the location screen" : "Complete bio and phone number to continue"}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={wp('5%')} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: wp('5%'),
    paddingBottom: hp('10%'),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp('4%'),
  },
  title: {
    fontSize: wp('7%'),
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: hp('1%'),
  },
  subtitle: {
    fontSize: wp('4%'),
    color: '#65676B',
    textAlign: 'center',
    lineHeight: wp('5.5%'),
  },
  inputContainer: {
    marginBottom: hp('4%'),
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1%'),
  },
  label: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    color: '#1C1E21',
  },
  charCount: {
    fontSize: wp('3.5%'),
    color: '#8E8E93',
    fontWeight: '500',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: wp('3%'),
    borderWidth: 1,
    borderColor: '#E4E6EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputWrapperFocused: {
    borderColor: '#007AFF',
  },
  inputWrapperError: {
    borderColor: '#FF3B30',
  },
  textInput: {
    padding: wp('4%'),
    fontSize: wp('4%'),
    color: '#1C1E21',
    lineHeight: wp('5.5%'),
  },
  textArea: {
    height: hp('20%'),
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: wp('3.5%'),
    color: '#FF3B30',
    marginTop: hp('1%'),
  },
  footer: {
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    paddingBottom: Platform.OS === 'ios' ? hp('4%') : hp('3%'),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E6EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    borderRadius: wp('3%'),
  },
  buttonDisabled: {
    backgroundColor: '#AEAEB2',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: wp('4%'),
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: wp('2%'),
  },
};

export default BasicInfoScreen;