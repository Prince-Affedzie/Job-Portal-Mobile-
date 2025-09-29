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
  SafeAreaView,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { navigate } from '../../services/navigationService';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const Login = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const { login } = useContext(AuthContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const [focusedField, setFocusedField] = useState(null);

  // Refs
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Animation on mount
  useEffect(() => {
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
    ]).start();
  }, []);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const trimmedData = {
      ...formData,
      email: formData.email.trim(),
      password: formData.password.trim(), 
    };

    if (!trimmedData.email || !trimmedData.password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }
    if (status === "loading") return;

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
    setStatusMessage("Logging you in...");

    try {
      const response = await login(trimmedData);
      if (response.status === 200) {
        setStatus("success");
        setStatusMessage("Login successful!");
        
        // Success animation before any navigation
        setTimeout(() => {
          // Navigation handled by AuthContext or success callback
        }, 1000);
      } else {
        throw new Error("Invalid email or password");
      }
    } catch (error) {
      setStatus("error");
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred. Please try again.";
      setStatusMessage(errorMessage);
      
      // Error shake animation
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  };

  const isFormValid = formData.email.trim() && formData.password.trim();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
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
          <Animated.View style={{ 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }}>
            {/* Enhanced Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.logoContainer}
              >
                <Ionicons name="briefcase" size={32} color="#FFFFFF" />
              </LinearGradient>
              
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your Workaflow account</Text>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                  status === 'error' && styles.inputWrapperError
                ]}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={focusedField === 'email' ? "#667eea" : "#8E8E93"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor="#8E8E93"
                    value={formData.email}
                    onChangeText={(text) => handleChange("email", text)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    editable={status !== "loading"}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                  status === 'error' && styles.inputWrapperError
                ]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={focusedField === 'password' ? "#667eea" : "#8E8E93"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#8E8E93"
                    value={formData.password}
                    onChangeText={(text) => handleChange("password", text)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={status !== "loading"}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={status === "loading"}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={focusedField === 'password' ? "#667eea" : "#8E8E93"}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Options Row */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberMe}
                  onPress={() => handleChange("rememberMe", !formData.rememberMe)}
                  disabled={status === "loading"}
                >
                  <View style={styles.checkboxContainer}>
                    <View style={[
                      styles.checkbox,
                      formData.rememberMe && styles.checkboxChecked
                    ]}>
                      {formData.rememberMe && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.rememberMeText}>Remember me</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigate("ForgotPassword")}
                  disabled={status === "loading"}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (!isFormValid || status === "loading") && styles.loginButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!isFormValid || status === "loading"}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={isFormValid ? ['#667eea', '#764ba2'] : ['#E5E5EA', '#D1D1D6']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {status === "loading" ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.loginButtonText}>Sign In</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Status Message */}
              {status !== "idle" && (
                <View style={[
                  styles.statusContainer,
                  status === "error" ? styles.statusError : styles.statusSuccess
                ]}>
                  <Ionicons
                    name={status === "error" ? "alert-circle" : "checkmark-circle"}
                    size={18}
                    color={status === "error" ? "#FF3B30" : "#34C759"}
                  />
                  <Text style={styles.statusText}>{statusMessage}</Text>
                </View>
              )}
            </View>

            {/* Divider
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View> */}

            {/* Social Login Options 
            <View style={styles.socialContainer}>
              <Text style={styles.socialTitle}>Continue with</Text>
              <View style={styles.socialButtons}>
                <TouchableOpacity style={styles.socialButton} disabled={status === "loading"}>
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} disabled={status === "loading"}>
                  <Ionicons name="logo-apple" size={20} color="#000000" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>*/}

            {/* Sign Up Section */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account?</Text>
              <TouchableOpacity 
                onPress={() => navigate("Register")}
                disabled={status === "loading"}
              >
                <Text style={styles.signUpLink}> Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F2F2F7",
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputWrapperFocused: {
    borderColor: "#667eea",
    backgroundColor: "#FFFFFF",
    shadowColor: '#667eea',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  inputWrapperError: {
    borderColor: "#FF3B30",
    shadowColor: '#FF3B30',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1C1C1E",
    fontWeight: "500",
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  rememberMe: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#C7C7CC",
    borderRadius: 6,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  rememberMeText: {
    fontSize: 14,
    color: "#1C1C1E",
    fontWeight: "500",
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#667eea",
    fontWeight: "600",
  },
  loginButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusError: {
    backgroundColor: "#FFF2F2",
    borderColor: "#FFE5E5",
  },
  statusSuccess: {
    backgroundColor: "#F0FFF4",
    borderColor: "#E6FFEE",
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5EA",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#8E8E93",
    fontWeight: "500",
    fontSize: 14,
  },
  socialContainer: {
    marginBottom: 30,
  },
  socialTitle: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 16,
  },
  socialButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 120,
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  socialButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  signUpText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  signUpLink: {
    fontSize: 16,
    color: "#667eea",
    fontWeight: "600",
  },
};

export default Login;