import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import {sendOtp} from '../../api/authApi'

const ForgotPasswordScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    try {
      setLoading(true);
      const res = await sendOtp({phoneNumber:phoneNumber});
      setLoading(false);

      if (res.data.success) {
        Alert.alert("Success", "OTP sent to your phone");
        navigation.navigate("VerifyReset", { phoneNumber });
      } else {
        Alert.alert("Error", res.data.message || "Failed to send OTP");
      }
    } catch (err) {
      setLoading(false);
      console.log(err)
      Alert.alert("Error", err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your registered phone number to reset your password</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter phone number (e.g. +233...)"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />

      <TouchableOpacity style={styles.button} onPress={handleSendOTP} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
      </TouchableOpacity>
    </View>
  );
};

export default ForgotPasswordScreen;

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
