import React, { useState, useContext, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
  Image,
  Dimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { navigate } from '../../services/navigationService';
import { LinearGradient } from 'expo-linear-gradient';
import { styles, colors } from "../../styles/auth/RegisterScreen.styles";

const WorkaFlowLogo = require('../../assets/Logominimal(2).png');
const { width, height } = Dimensions.get('window');

const InputField = ({ 
    label, 
    icon, 
    value, 
    onChangeText, 
    placeholder, 
    secureTextEntry = false, 
    showEyeIcon = false,
    onEyePress,
    keyboardType = "default",
    autoCapitalize = "none",
    returnKeyType = "next",
    onSubmitEditing,
    inputRef,
    focusedInput,
    setFocusedInput,
    onFocus, 
    onBlur,
    name,
    status
  }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[
        styles.inputWrapper,
        focusedInput === name && styles.inputWrapperFocused
      ]}>
        <Ionicons
          name={icon}
          size={20}
          color={focusedInput === name ? colors.primary : "#8E8E93"}
          style={styles.inputIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          value={value}
          onChangeText={onChangeText} 
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={status !== "loading"}
          onFocus={() => setFocusedInput(name)}
          onBlur={() => setFocusedInput(null)}
        />
        {showEyeIcon && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={onEyePress}
            disabled={status === "loading"}
          >
            <Ionicons
              name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={focusedInput === name ? colors.primary : "#8E8E93"}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

const RoleOption = ({ icon, title, value, selected, handleChange, status }) => (
  <TouchableOpacity
    style={[
      styles.roleOption,
      selected && styles.roleOptionSelected,
    ]}
    onPress={() => handleChange("role", value)}
    disabled={status === "loading"}
  >
    <Ionicons 
      name={icon} 
      size={20} 
      color={selected ? '#FFFFFF' : '#667eea'} 
    />
    <Text style={[
      styles.roleOptionText,
      selected && styles.roleOptionTextSelected
    ]}>
      {title}
    </Text>
  </TouchableOpacity>
);

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "job_seeker",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [status, setStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const { register } = useContext(AuthContext);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [focusedInput, setFocusedInput] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const emailInputRef = useRef();
  const passwordInputRef = useRef();
  const confirmPasswordInputRef = useRef();

  // Animation on mount
  useEffect(() => {
    Animated.sequence([
      // Logo animation first
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
        delay: 200,
      }),
      // Then content animation
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
      ]),
    ]).start();
  }, []);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return false;
    }
    
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }
    
    if (formData.password.trim() !== formData.confirmPassword.trim()) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }
    
    if (formData.password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return false;
    }
    
    if (!/[A-Z]/.test(formData.password)) {
      Alert.alert("Error", "Password must contain at least one uppercase letter");
      return false;
    }
    
    if (!/[0-9]/.test(formData.password)) {
      Alert.alert("Error", "Password must contain at least one number");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (status === "loading") return;
    if (!validateForm()) return;

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setStatus("loading");
    setStatusMessage("Creating account...");
    
    try {
      const response = await register(formData);
      if (response.status === 200) {
        setStatus("success");
        setStatusMessage("Account created successfully!");
        setTimeout(() => {
          const role = response.data.role;
          if (role === 'client') {
            navigation.navigate("ClientOnboarding");
          } else {
            navigation.navigate("TaskerOnboarding");
          }
        }, 1000);
      } else {
        throw new Error(response.data?.message || "Registration failed");
      }
    } catch (error) {
      setStatus("error");
      const errorMessage = error.response?.data?.message || 
        "An account with this email already exists. Please login instead.";
      setStatusMessage(errorMessage);
      
      // Error shake animation
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      
      setTimeout(() => {
        Alert.alert(
          "Registration Failed", 
          errorMessage,
          [
            { 
              text: "OK", 
              onPress: () => {
                setFormData(prev => ({
                  ...prev,
                  password: "",
                  confirmPassword: ""
                }));
              }
            },
            errorMessage.includes("network") && {
              text: "Try Again",
              onPress: handleSubmit
            }
          ].filter(Boolean)
        );
      }, 150);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Enhanced Header with Premium Logo */}
            <View style={styles.header}>
              <Animated.View 
                style={[
                  styles.logoContainer,
                  {
                    transform: [{ scale: logoScale }],
                  }
                ]}
              >
               
                  <View style={styles.logoInnerContainer}>
                    <Image 
                      source={WorkaFlowLogo} 
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </View>
               
                <View style={styles.logoGlow} />
                <View style={styles.logoShadow} />
              </Animated.View>
              
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>
                  Join Workaflow today to connect with top taskers and opportunities.
                </Text>
              </View>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {/* Name Field */}
              <InputField
                label="FULL NAME"
                icon="person-outline"
                name="name"
                value={formData.name}
                onChangeText={(text) => handleChange("name", text)}
                placeholder="Enter your full name"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
                focusedInput={focusedInput}
                setFocusedInput={setFocusedInput}
                status={status} 
              />

              {/* Email Field */}
              <InputField
                label="EMAIL"
                icon="mail-outline"
                name="email"
                value={formData.email}
                onChangeText={(text) => handleChange("email", text)}
                placeholder="Enter your email"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => {
                  setPasswordFocused(true);
                  passwordInputRef.current?.focus();
                }}
                inputRef={emailInputRef}
                focusedInput={focusedInput}
                setFocusedInput={setFocusedInput}
                status={status} 
              />

              {/* Password Field */}
              <InputField
                label="PASSWORD"
                icon="lock-closed-outline"
                name="password"
                value={formData.password}
                onChangeText={(text) => handleChange("password", text)}
                placeholder="Create a password"
                secureTextEntry={!showPassword}
                showEyeIcon={true}
                onEyePress={() => setShowPassword(!showPassword)}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                inputRef={passwordInputRef}
                focusedInput={focusedInput}
                setFocusedInput={setFocusedInput}
                status={status} 
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />

              {/* Password Requirements */}
              {passwordFocused && (
                <View style={styles.passwordRequirements}>
                  <Text style={styles.requirementsTitle}>Password requirements:</Text>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={formData.password.length >= 8 ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={formData.password.length >= 8 ? '#10B981' : "#8E8E93"}
                    />
                    <Text style={[
                      styles.requirementText,
                      formData.password.length >= 8 && styles.requirementMet
                    ]}>
                      8+ characters
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={/[A-Z]/.test(formData.password) ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={/[A-Z]/.test(formData.password) ? '#10B981' : "#8E8E93"}
                    />
                    <Text style={[
                      styles.requirementText,
                      /[A-Z]/.test(formData.password) && styles.requirementMet
                    ]}>
                      Uppercase letter
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={/[0-9]/.test(formData.password) ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={/[0-9]/.test(formData.password) ? '#10B981' : "#8E8E93"}
                    />
                    <Text style={[
                      styles.requirementText,
                      /[0-9]/.test(formData.password) && styles.requirementMet
                    ]}>
                      Number
                    </Text>
                  </View>
                </View>
              )}

              {/* Confirm Password Field */}
              <InputField
                label="CONFIRM PASSWORD"
                icon="lock-closed-outline"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange("confirmPassword", text)}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                showEyeIcon={true}
                onEyePress={() => setShowConfirmPassword(!showConfirmPassword)}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                inputRef={confirmPasswordInputRef}
                focusedInput={focusedInput}
                setFocusedInput={setFocusedInput}
                status={status} 
              />

              {/* Role Selection */}
              <View style={styles.roleSection}>
                <Text style={styles.roleLabel}>SELECT YOUR PURPOSE</Text>
                <View style={styles.roleContainer}>
                  <RoleOption
                    icon="search-outline"
                    title="Looking for Work"
                    value="job_seeker"
                    selected={formData.role === "job_seeker"}
                    handleChange={handleChange}
                    status={status}
                  />
                  <RoleOption
                    icon="business-outline"
                    title="I want to Hire"
                    value="client"
                    selected={formData.role === "client"}
                    handleChange={handleChange}
                    status={status}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.signupButton,
                    status === "loading" && styles.signupButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={status === "loading"}
                >
                 
                    {status === "loading" ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.signupButtonText}>Create Account</Text>
                       
                      </View>
                    )}
                  
                </TouchableOpacity>
              </Animated.View>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>
                  Already have an account?
                </Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate("Login")}
                  disabled={status === "loading"}
                >
                  
                    <LinearGradient
                    colors={['#667eea', '#764ba2']}
                     style={styles.signUpGradient}
                      >

                    <Text style={styles.loginLink}>Sign in</Text>
                 </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Status Message */}
              {status !== "idle" && statusMessage && (
                <View
                  style={[
                    styles.statusMessage,
                    status === "error" 
                      ? styles.statusMessageError 
                      : styles.statusMessageSuccess,
                  ]}
                >
                  <Ionicons
                    name={status === "error" ? "alert-circle" : "checkmark-circle"}
                    size={18}
                    color={status === "error" ? '#EF4444' : '#10B981'}
                  />
                  <Text style={[
                    styles.statusMessageText,
                    status === "error" 
                      ? styles.statusMessageTextError 
                      : styles.statusMessageTextSuccess,
                  ]}>
                    {statusMessage}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;