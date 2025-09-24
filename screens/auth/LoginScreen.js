import React, { useState, useContext, useRef } from "react";
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
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { navigate } from '../../services/navigationService';


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
  
  // Refs to track focus state without causing re-renders
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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

  setStatus("loading");
  setStatusMessage("Logging you in...");

  try {
    console.log("Sending:", trimmedData); // Check trimmed version
    const response = await login(trimmedData);
    if (response?.status === 200) {
      setStatus("success");
      setStatusMessage("Login successful!");
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
    Alert.alert("Error", errorMessage);
    console.log(errorMessage);
  }
};

  return (
    <SafeAreaView style={styles.safeArea}>
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
          {/* Header with Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="lock-closed" size={40} color="#007AFF" />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputLabelContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#8E8E93"
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#8E8E93"
                  value={formData.email}
                  onChangeText={(text) => handleChange("email", text)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={status !== "loading"}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputLabelContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#8E8E93"
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
                    color="#8E8E93"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMe}
                onPress={() => handleChange("rememberMe", !formData.rememberMe)}
                disabled={status === "loading"}
              >
                <View style={styles.checkboxContainer}>
                  <View
                    style={[
                      styles.checkbox,
                      formData.rememberMe && styles.checkboxChecked,
                    ]}
                  >
                    {formData.rememberMe && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>navigate ("ForgotPassword")}
                disabled={status === "loading"}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                status === "loading" && styles.loginButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

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
                  color={status === "error" ? "#FF3B30" : "#34C759"}
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

          {/* Sign Up Section */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() =>navigate("Register")}>
              <Text style={styles.signUpLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F5FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
  },
  formContainer: {
    marginBottom: 30,
  },
  inputLabelContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1C1C1E",
  },
  eyeIcon: {
    padding: 4,
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
    borderWidth: 1,
    borderColor: "#C7C7CC",
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  rememberMeText: {
    fontSize: 14,
    color: "#1C1C1E",
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: "#66AFFF",
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  statusMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  statusMessageError: {
    backgroundColor: "#FFEEED",
  },
  statusMessageSuccess: {
    backgroundColor: "#E8F5E9",
  },
  statusMessageText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  statusMessageTextError: {
    color: "#FF3B30",
  },
  statusMessageTextSuccess: {
    color: "#34C759",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  signUpLink: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
});

export default Login;