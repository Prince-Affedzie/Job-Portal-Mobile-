import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const colors = {
  primary: '#6366F1',
  primaryLight: '#8B5CF6',
  secondary: '#06B6D4',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
};

export const gradients = {
  primary: ['#6366F1', '#8B5CF6'],
  secondary: ['#06B6D4', '#0EA5E9'],
  success: ['#10B981', '#34D399'],
  background: ['#FFFFFF', '#F8FAFC'],
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textTertiary,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const styles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientContainer: {
    flex: 1,
    backgroundGradient: gradients.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 120,
  },

  // Header Styles
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...shadows.medium,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
    color: colors.textSecondary,
  },

  // Input Styles
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    ...typography.label,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    ...shadows.small,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
    ...shadows.medium,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    ...typography.body,
    color: colors.textPrimary,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },

  // Button Styles
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  primaryButtonDisabled: {
    backgroundColor: '#C7D2FE',
  },
  primaryButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  secondaryButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Card Styles
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F4FF',
    ...shadows.medium,
  },

  // Footer Styles
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadows.medium,
  },

  // Utility Styles
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  },
  successText: {
    ...typography.caption,
    color: colors.success,
    marginTop: 4,
  },
  hintContainer: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  hintText: {
    ...typography.caption,
    color: '#0369A1',
    lineHeight: 20,
  },
  charCounter: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  charCounterText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});

// Enhanced component-specific styles
export const onboardingStyles = {
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    ...shadows.small,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLine: {
    position: 'absolute',
    top: 18,
    left: '10%',
    right: '10%',
    height: 3,
    backgroundColor: colors.border,
    zIndex: -1,
  },
  progressLineActive: {
    backgroundColor: colors.primary,
  },

  // Skill tags
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    ...shadows.small,
  },
  skillTagSelected: {
    backgroundColor: colors.primary,
  },
  skillText: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.primary,
  },
  skillTextSelected: {
    color: colors.background,
  },

  // Image upload
  imageUpload: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: 24,
  },
  imageUploadActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0F4FF',
  },
};

