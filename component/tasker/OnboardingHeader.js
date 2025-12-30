import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { colors, typography, shadows } from '../../styles/auth/TaskerOnboarding.styles';

const OnboardingHeader = ({ navigation, route, back }) => {
  const { currentStep, totalSteps, goToPreviousStep } = useTaskerOnboarding();

  const canGoBack = route?.name !== 'Review';

  const handleBack = () => {
    if (canGoBack && back) {
      goToPreviousStep();
      navigation.goBack();
    }
  };

  // UPDATED: New step order titles
  const getStepTitle = (step) => {
    const titles = {
      1: 'Services & Skills',       // Changed from 'Basic Info'
      2: 'Bio & Phone',             // Changed from 'Location'
      3: 'Location',                // Changed from 'Skills'
      4: 'Profile Photo',           // Same
      5: 'ID Card',                 // NEW: Added ID Card as step 5
      6: 'Review'                   // Review is now step 6
    };
    return titles[step] || `Step ${step}`;
  };

  // UPDATED: Get step description/subtitle
  const getStepDescription = (step) => {
    const descriptions = {
      1: 'Select your services and skills',
      2: 'Tell clients about yourself',
      3: 'Set your service location',
      4: 'Upload a profile photo',
      5: 'Verify your identity',
      6: 'Review your information'
    };
    return descriptions[step] || '';
  };
  
  return (
    <View style={styles.header}>
      {/* Back Button */}
      {canGoBack && back && (
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* Progress and Title */}
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.stepTitle}>{getStepTitle(currentStep)}</Text>
          <Text style={styles.stepDescription}>{getStepDescription(currentStep)}</Text>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(currentStep / totalSteps) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep} of {totalSteps}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: colors.background,
    marginTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...shadows.small,
  },
  headerContent: {
    flex: 1,
  },
  titleContainer: {
    marginBottom: 16,
  },
  stepTitle: {
    ...typography.h3,
    marginBottom: 4,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  stepDescription: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBackground: {
    flex: 1,
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 60,
    textAlign: 'right',
  },
});

export default OnboardingHeader;