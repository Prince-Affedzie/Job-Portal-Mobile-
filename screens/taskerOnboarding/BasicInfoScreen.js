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
  Dimensions,
  LayoutAnimation,
  UIManager,
  Alert,
  StatusBar,
  I18nManager,
  Keyboard,
} from 'react-native';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');
const isRTL = I18nManager.isRTL;

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
  const phoneInputRef = useRef();
  const bioInputRef = useRef();
  
  // Enhanced state management
  const [formData, setFormData] = useState({
    bio: bio || '',
    phone: phone || '',
  });
  
  const [focusedField, setFocusedField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Enhanced animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const headerScrollAnim = useRef(new Animated.Value(0)).current;

  // Keyboard listeners
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

  // Auto-focus and animations on mount
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        bioInputRef.current?.focus();
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(progressAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }, 400);

      return () => clearTimeout(timer);
    }, [fadeAnim, slideAnim, progressAnim])
  );

  // Enhanced validation with detailed checks
  const validation = useMemo(() => {
    const bioValid = formData.bio.trim().length >= 10;
    const phoneValid = formData.phone.trim().length >= 10 && 
                      /^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone);
    
    return {
      bio: {
        valid: bioValid,
        message: bioValid ? '' : 'Bio should be at least 10 characters',
        length: formData.bio.length
      },
      phone: {
        valid: phoneValid,
        message: phoneValid ? '' : 'Enter a valid phone number'
      },
      isFormValid: bioValid && phoneValid
    };
  }, [formData.bio, formData.phone]);

  // Enhanced shake animation with haptic feedback
  const triggerShake = useCallback((field) => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();

    // Haptic feedback on error
    if (Platform.OS === 'ios') {
      // ReactNativeHapticFeedback.trigger('impactMedium');
    }
  }, [shakeAnim]);

  // Optimized form handling with debouncing
  const handleChange = useCallback((field, value) => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
    });
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      clearErrors();
    }

    // Animate button on valid input
    if (validation.isFormValid) {
      Animated.spring(buttonScaleAnim, {
        toValue: 1.02,
        friction: 4,
        useNativeDriver: true,
      }).start();
    }
  }, [errors, clearErrors, validation.isFormValid]);

  const handleSubmit = async () => {
    if (!validation.isFormValid) {
      triggerShake();
      
      if (!validation.bio.valid) {
        Alert.alert(
          "✨ Make Your Profile Shine",
          "A compelling bio helps clients understand your expertise. Share your professional story in at least 10 characters.",
          [{ text: "Got It", style: "default" }]
        );
      } else if (!validation.phone.valid) {
        Alert.alert(
          "📞 Contact Information",
          "Please enter a valid phone number so clients can reach you easily.",
          [{ text: "OK", style: "default" }]
        );
      }
      return;
    }

    setIsSubmitting(true);
    
    // Enhanced success animation
    Animated.parallel([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(progressAnim, {
        toValue: 2,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      updateBasicInfo(formData);
      
      // Smooth transition with success feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (goToNextStep()) {
        navigation.navigate('Location');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced character count with gradient colors
  const getCharCountColor = () => {
    const length = formData.bio.length;
    if (length === 0) return '#8E8E93';
    if (length < 10) return '#FF3B30';
    if (length < 100) return '#FF9500';
    if (length < 400) return '#34C759';
    return '#FF3B30';
  };

  const getProgressPercentage = () => {
    return Math.min((formData.bio.length / 500) * 100, 100);
  };

  // Responsive design values
  const responsive = {
    padding: width < 375 ? 16 : 24,
    titleSize: width < 375 ? 28 : 32,
    subtitleSize: width < 375 ? 15 : 17,
  };

  const styles = {
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    statusBar: {
      backgroundColor: '#FFFFFF',
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      padding: responsive.padding,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    header: {
      marginBottom: 40,
      alignItems: 'center',
    },
    headerCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 24,
      marginBottom: 32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 8,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
    },
    title: {
      fontSize: responsive.titleSize,
      fontWeight: '800',
      color: '#1C1E21',
      marginBottom: 12,
      textAlign: 'center',
      letterSpacing: -0.8,
      lineHeight: responsive.titleSize * 1.2,
    },
    subtitle: {
      fontSize: responsive.subtitleSize,
      color: '#65676B',
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: width * 0.85,
      fontWeight: '400',
    },
    progressBar: {
      height: 6,
      backgroundColor: '#E4E6EA',
      borderRadius: 3,
      marginTop: 16,
      overflow: 'hidden',
    },
    progressFill: {
     height: '100%',
     backgroundColor: '#007AFF',
     borderRadius: 3,
     flex: 1, // Use flex instead of width
    },

    inputContainer: {
      marginBottom: 28,
    },
    labelContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    label: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1C1E21',
      letterSpacing: -0.3,
    },
    charCount: {
      fontSize: 14,
      fontWeight: '600',
      color: getCharCountColor(),
    },
    inputWrapper: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      borderWidth: 2,
      borderColor: '#F0F2F5',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      overflow: 'hidden',
    },
    inputWrapperFocused: {
      borderColor: '#007AFF',
      shadowColor: '#007AFF',
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    inputWrapperError: {
      borderColor: '#FF3B30',
      shadowColor: '#FF3B30',
      shadowOpacity: 0.15,
    },
    textInput: {
      padding: 20,
      fontSize: 17,
      color: '#1C1E21',
      fontWeight: '400',
      lineHeight: 22,
      textAlign: isRTL ? 'right' : 'left',
    },
    textArea: {
      height: 140,
      textAlignVertical: 'top',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingLeft: 4,
      backgroundColor: '#FFF2F2',
      padding: 12,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#FF3B30',
    },
    errorText: {
      fontSize: 14,
      color: '#FF3B30',
      fontWeight: '500',
      marginLeft: 8,
      flex: 1,
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 40,
      marginBottom: 20,
      paddingHorizontal: 8,
    },
    progressStep: {
      alignItems: 'center',
      flex: 1,
    },
    progressDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#E4E6EA',
      marginBottom: 8,
      borderWidth: 3,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    progressDotActive: {
      backgroundColor: '#007AFF',
      transform: [{ scale: 1.1 }],
    },
    progressDotCompleted: {
      backgroundColor: '#34C759',
    },
    progressLabel: {
      fontSize: 11,
      color: '#8A8D91',
      fontWeight: '600',
      textAlign: 'center',
    },
    progressLabelActive: {
      color: '#007AFF',
      fontWeight: '700',
    },
    tipContainer: {
      backgroundColor: 'rgba(0, 122, 255, 0.05)',
      padding: 20,
      borderRadius: 20,
      marginTop: 24,
      borderWidth: 1,
      borderColor: 'rgba(0, 122, 255, 0.1)',
    },
    tipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    tipIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#007AFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    tipTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#007AFF',
    },
    tipText: {
      fontSize: 14,
      color: '#007AFF',
      fontWeight: '500',
      lineHeight: 20,
      opacity: 0.9,
    },
    footer: {
      backgroundColor: '#FFFFFF',
      padding: responsive.padding,
      paddingBottom: Platform.OS === 'ios' ? (keyboardVisible ? 20 : 40) : 24,
      borderTopWidth: 1,
      borderTopColor: '#E4E6EA',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 12,
    },
    button: {
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
      overflow: 'hidden',
    },
    buttonGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    buttonIcon: {
      marginLeft: 8,
      transform: [{ scaleX: isRTL ? -1 : 1 }],
    },
    loadingDots: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#FFFFFF',
      marginHorizontal: 2,
    },
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#FFFFFF" 
        translucent={false}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEventThrottle={16}
        >
          <Animated.View style={{ 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }}>
            {/* Enhanced Header Card */}
            <View style={styles.headerCard}>
              <View style={styles.header}>
                <Text style={styles.title}>Create Your Professional Profile</Text>
                <Text style={styles.subtitle}>
                  Start with a compelling bio that showcases your expertise and experience to potential clients
                </Text>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.progressBar}>
  <Animated.View 
    style={[
      styles.progressFill,
      { 
        transform: [{
          scaleX: progressAnim.interpolate({
            inputRange: [0, 1, 2],
            outputRange: [0, getProgressPercentage() / 100, 1]
          })
        }]
      }
    ]} 
  />
</View>
            </View>

            {/* Bio Input */}
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <View style={styles.inputContainer}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Professional Summary</Text>
                  <Text style={styles.charCount}>
                    {formData.bio.length}/500
                  </Text>
                </View>
                
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'bio' && styles.inputWrapperFocused,
                  errors.bio && styles.inputWrapperError
                ]}>
                  <TextInput
                    ref={bioInputRef}
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Describe your professional background, key skills, achievements, and what makes you unique. Clients love detailed profiles!"
                    placeholderTextColor="#8A8D91"
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
                  />
                </View>
                
                {errors.bio && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="warning" size={18} color="#FF3B30" />
                    <Text style={styles.errorText}>{errors.bio}</Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* Phone Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              
              <View style={[
                styles.inputWrapper,
                focusedField === 'phone' && styles.inputWrapperFocused,
                errors.phone && styles.inputWrapperError
              ]}>
                <TextInput
                  ref={phoneInputRef}
                  style={styles.textInput}
                  placeholder="+233 (0) 20 4567 897"
                  placeholderTextColor="#8A8D91"
                  value={formData.phone}
                  onChangeText={(text) => handleChange('phone', text)}
                  keyboardType="phone-pad"
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={handleSubmit}
                  editable={!isSubmitting}
                  selectionColor="#007AFF"
                  returnKeyType="done"
                />
              </View>
              
              {errors.phone && (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning" size={18} color="#FF3B30" />
                  <Text style={styles.errorText}>{errors.phone}</Text>
                </View>
              )}
            </View>

            {/* Enhanced Progress Indicator */}
            <View style={styles.progressContainer}>
              {['Bio', 'Location', 'Skills', 'Photo', 'Review'].map((step, index) => (
                <View key={step} style={styles.progressStep}>
                  <View style={[
                    styles.progressDot,
                    index === 0 && styles.progressDotActive,
                    index < 0 && styles.progressDotCompleted
                  ]} />
                  <Text style={[
                    styles.progressLabel,
                    index === 0 && styles.progressLabelActive
                  ]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>

            {/* Enhanced Tip Card */}
            <View style={styles.tipContainer}>
              <View style={styles.tipHeader}>
                <View style={styles.tipIcon}>
                  <Ionicons name="bulb" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.tipTitle}>Pro Tip</Text>
              </View>
              <Text style={styles.tipText}>
                Profiles with detailed bios get 3x more client requests. Include specific skills, 
                years of experience, and notable achievements to stand out.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Enhanced Fixed Footer */}
        <View style={styles.footer}>
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={!validation.isFormValid || isSubmitting}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={validation.isFormValid ? ['#007AFF', '#0056CC'] : ['#C7C7CC', '#AEAEB2']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              
              <View style={styles.buttonContent}>
                {isSubmitting ? (
                  <View style={styles.loadingDots}>
                    <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
                    <Animated.View style={[styles.dot, { opacity: fadeAnim, animationDelay: '0.2s' }]} />
                    <Animated.View style={[styles.dot, { opacity: fadeAnim, animationDelay: '0.4s' }]} />
                  </View>
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {validation.isFormValid ? 'Continue to Location' : 'Complete Your Profile'}
                    </Text>
                    <Ionicons 
                      name="arrow-forward" 
                      size={20} 
                      color="#FFFFFF" 
                      style={styles.buttonIcon}
                    />
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default BasicInfoScreen;