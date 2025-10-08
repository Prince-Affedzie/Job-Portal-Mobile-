import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import {verifyOtp} from '../../api/authApi'

const VerifyResetScreen = ({ route, navigation }) => {
  const { phoneNumber } = route.params;
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp.trim() || !newPassword.trim()) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      const res = await verifyOtp({phoneNumber, code: otp,newPassword});
      setLoading(false);

      if (res.data.success) {
        Alert.alert("Success", "Password reset successfully");
        navigation.navigate("Login"); // Redirect to login screen
      } else {
        Alert.alert("Error", res.data.message || "Verification failed");
      }
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Enter the OTP sent to {phoneNumber}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter OTP"
        keyboardType="numeric"
        value={otp}
        onChangeText={setOtp}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter new password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
      </TouchableOpacity>
    </View>
  );
};

export default VerifyResetScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
