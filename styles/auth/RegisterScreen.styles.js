import { StyleSheet, Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 22,
    marginTop: 24,
  },
  backButton: {
    padding: 8,
    marginBottom: 16,
    marginLeft: -8,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 14,
     color: '#6B7280',
     lineHeight: 20,
     textAlign:"center"
  },
  formContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333333",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperFocused: {
    borderColor: "#007AFF",
    backgroundColor: "#FFFFFF",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#000000",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 4,
  },
  passwordRequirements: {
    backgroundColor: "#F8F9FA",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    marginTop: 4,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666666",
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  requirementText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#666666",
  },
  requirementMet: {
    color: "#34C759",
  },
  roleSection: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333333",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  roleContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 2,
  },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  roleOptionSelected: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666666",
    marginLeft: 6,
  },
  roleOptionTextSelected: {
    color: "#007AFF",
    fontWeight: "600",
  },
  signupButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  signupButtonDisabled: {
    backgroundColor: "#B2D7FF",
    shadowOpacity: 0,
  },
  signupButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    color: "#666666",
  },
  loginLink: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 4,
  },
  statusMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  statusMessageError: {
    backgroundColor: "#FFE6E6",
  },
  statusMessageSuccess: {
    backgroundColor: "#E6F4EA",
  },
  statusMessageText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  statusMessageTextError: {
    color: "#D70000",
  },
  statusMessageTextSuccess: {
    color: "#1E7E34",
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});

export const colors = {
  primary: "#007AFF",
  success: "#34C759",
  error: "#FF3B30",
  background: "#FFFFFF",
  textPrimary: "#000000",
  textSecondary: "#666666",
  border: "#E5E5E5",
};