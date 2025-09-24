import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  Dimensions,
  Animated,
  Easing
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { signUp } from "../../api/authApi";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get("window");

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [status, setStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const { login } = useContext(AuthContext);
  const [scaleAnim] = useState(new Animated.Value(1));

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
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
    
    if (!formData.role) {
      Alert.alert("Error", "Please select a role");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (status === "loading") return;
    if (!validateForm()) return;

    animateButton();
    setStatus("loading");
    setStatusMessage("Creating your account...");
    
    try {
      const response = await signUp(formData);
      if (response.status === 200) {
        setStatus("success");
        setStatusMessage("Account created successfully!");
        const { role } = response.data;
        
        // Redirect based on role
        let redirectPath = "CompleteProfile";
        if (role === "employer") {
          redirectPath = "EmployerOnboarding";
        } else if (role === "client") {
          redirectPath = "TaskPosterOnboarding";
        }
        
        setTimeout(() => {
          navigation.navigate(redirectPath, { role });
        }, 1500);
      }
    } catch (error) {
      setStatus("error");
      const errorMessage = error.response?.data?.message || 
        "An account with this email already exists. Please login instead.";
      setStatusMessage(errorMessage);
      Alert.alert("Error", errorMessage);
    }
  };

  const RoleCard = ({ icon, title, description, value, selected }) => (
    <TouchableOpacity
      style={[
        styles.roleCard,
        selected && styles.roleCardSelected,
        { opacity: status === "loading" ? 0.7 : 1 }
      ]}
      onPress={() => handleChange("role", value)}
      disabled={status === "loading"}
    >
      <View style={[
        styles.roleIconContainer,
        selected && styles.roleIconContainerSelected
      ]}>
        <Ionicons name={icon} size={24} color={selected ? "#FFFFFF" : "#6366F1"} />
      </View>
      <Text style={[
        styles.roleTitle,
        selected && styles.roleTitleSelected
      ]}>
        {title}
      </Text>
      <Text style={styles.roleDescription}>
        {description}
      </Text>
      {selected && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#FFFF','#FFFF']}
        style={styles.background}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={styles.logo}
                >
                  <Ionicons name="person-add" size={32} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Join Our Community</Text>
              <Text style={styles.subtitle}>
                Create your account to get started
              </Text>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {/* Name Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94A3B8"
                    value={formData.name}
                    onChangeText={(text) => handleChange("name", text)}
                    autoCapitalize="words"
                    editable={status !== "loading"}
                  />
                </View>
              </View>

              {/* Email Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#94A3B8"
                    value={formData.email}
                    onChangeText={(text) => handleChange("email", text)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    editable={status !== "loading"}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Create a password"
                    placeholderTextColor="#94A3B8"
                    value={formData.password}
                    onChangeText={(text) => handleChange("password", text)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={status !== "loading"}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={status === "loading"}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              {passwordFocused && (
                <View style={styles.passwordRequirements}>
                  <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={formData.password.length >= 8 ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={formData.password.length >= 8 ? "#10B981" : "#94A3B8"}
                    />
                    <Text style={[
                      styles.requirementText,
                      formData.password.length >= 8 && styles.requirementMet
                    ]}>
                      Minimum 8 characters
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={/[A-Z]/.test(formData.password) ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={/[A-Z]/.test(formData.password) ? "#10B981" : "#94A3B8"}
                    />
                    <Text style={[
                      styles.requirementText,
                      /[A-Z]/.test(formData.password) && styles.requirementMet
                    ]}>
                      At least one uppercase letter
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={/[0-9]/.test(formData.password) ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={/[0-9]/.test(formData.password) ? "#10B981" : "#94A3B8"}
                    />
                    <Text style={[
                      styles.requirementText,
                      /[0-9]/.test(formData.password) && styles.requirementMet
                    ]}>
                      At least one number
                    </Text>
                  </View>
                </View>
              )}

              {/* Confirm Password Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor="#94A3B8"
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleChange("confirmPassword", text)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={status !== "loading"}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={status === "loading"}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Role Selection */}
              <View style={styles.roleSection}>
                <Text style={styles.roleLabel}>I am signing up as:</Text>
                <View style={styles.roleCards}>
                  <RoleCard
                    icon="search-outline"
                    title="Job Seeker"
                    description="Find opportunities"
                    value="job_seeker"
                    selected={formData.role === "job_seeker"}
                  />
                  {/*<RoleCard
                    icon="briefcase-outline"
                    title="Employer"
                    description="Hire talent"
                    value="employer"
                    selected={formData.role === "employer"}
                  />*/}
                  <RoleCard
                    icon="document-text-outline"
                    title="Task Poster"
                    description="Post micro tasks"
                    value="client"
                    selected={formData.role === "client"}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.signupButton,
                    status === "loading" && styles.signupButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={status === "loading"}
                >
                  <LinearGradient
                    colors={status === "loading" ? ['#A5B4FC', '#818CF8'] : ['#6366F1', '#007AFF']}
                    style={styles.buttonGradient}
                  >
                    {status === "loading" ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.signupButtonText}>Create Account</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.loginLink}>Sign in</Text>
                </TouchableOpacity>
              </View>

              {/* Status Message */}
              {status !== "idle" && statusMessage ? (
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
                    size={16}
                    color={status === "error" ? "#EF4444" : "#10B981"}
                  />
                  <Text
                    style={[
                      styles.statusMessageText,
                      status === "error"
                        ? styles.statusMessageTextError
                        : styles.statusMessageTextSuccess,
                    ]}
                  >
                    {statusMessage}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1E293B",
  },
  eyeIcon: {
    padding: 4,
  },
  passwordRequirements: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0369A1",
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#64748B",
  },
  requirementMet: {
    color: "#10B981",
    fontWeight: "500",
  },
  roleSection: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  roleCards: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
  },
  roleCard: {
    width:150,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  roleCardSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#F8FAFF",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  roleIconContainerSelected: {
    backgroundColor: "#6366F1",
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
    textAlign: "center",
  },
  roleTitleSelected: {
    color: "#6366F1",
  },
  roleDescription: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
  },
  selectedIndicator: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  signupButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  signupButtonDisabled: {
    opacity: 0.8,
  },
  signupButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loginText: {
    fontSize: 14,
    color: "#64748B",
  },
  loginLink: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  statusMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  statusMessageError: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  statusMessageSuccess: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  statusMessageText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  statusMessageTextError: {
    color: "#DC2626",
  },
  statusMessageTextSuccess: {
    color: "#059669",
  },
});

export default RegisterScreen;