import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet,Platform } from 'react-native';
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

  const getStepTitle = (step) => {
    const titles = {
      1: 'Basic Info',
      2: 'Location',
      3: 'Skills',
      4: 'Profile Photo',
      5: 'Review'
    };
    return titles[step] || `Step ${step}`;
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
        <Text style={styles.stepTitle}>{getStepTitle(currentStep)}</Text>
        
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
            {currentStep} of {totalSteps}
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
    marginTop:20,
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
  stepTitle: {
    ...typography.h3,
    marginBottom: 8,
    color: colors.textPrimary,
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
    minWidth: 40,
  },
});

export default OnboardingHeader;
