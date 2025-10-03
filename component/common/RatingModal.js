// components/RatingModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { addRating } from '../../api/ratingApi'; 

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const RatingModal = ({
  visible,
  onClose,
  userId,
  userName,
  userRole, // 'client' or 'tasker'
  onRatingSuccess,
}) => {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const starLabels = [
    'Poor',
    'Fair',
    'Good',
    'Very Good',
    'Excellent'
  ];

  const roleSpecificTitles = {
    tasker: `Rate ${userName}`,
    client: `Rate ${userName}`,
    default: `Rate ${userName}`
  };

  const roleSpecificPlaceholders = {
    tasker: 'Share your experience...',
    client: 'Share your experience...',
    default: 'Share your experience...'
  };

  const handleStarPress = (rating) => {
    setSelectedRating(rating);
    Animated.spring(animation, {
      toValue: 1,
      tension: 100,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handleSubmit = async () => {
    if (selectedRating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await addRating(
        { rating: selectedRating, feedback: feedback.trim() },
        userId
      );

      if (response.status === 201) {
        Alert.alert(
          'Thanks!',
          'Your rating has been submitted.',
          [{ text: 'OK' }]
        );
        resetForm();
        onClose();
        if (onRatingSuccess) onRatingSuccess();
      }
    } catch (error) {
      console.error('Rating submission error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit rating. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedRating(0);
    setHoverRating(0);
    setFeedback('');
    animation.setValue(0);
  };

  const handleClose = () => {
    if (selectedRating > 0 || feedback.trim()) {
      Alert.alert(
        'Discard Rating?',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            }
          }
        ]
      );
    } else {
      onClose();
    }
  };

  const scaleAnimation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        {/* Header - Always visible */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {roleSpecificTitles[userRole] || roleSpecificTitles.default}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Rating Section */}
          <View style={styles.ratingSection}>
            <Animated.View style={[styles.starsContainer, { transform: [{ scale: scaleAnimation }] }]}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(star)}
                  onPressIn={() => setHoverRating(star)}
                  onPressOut={() => setHoverRating(0)}
                  disabled={isSubmitting}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={
                      star <= (hoverRating || selectedRating)
                        ? 'star'
                        : 'star-outline'
                    }
                    size={36}
                    color={
                      star <= (hoverRating || selectedRating)
                        ? '#F59E0B'
                        : '#D1D5DB'
                    }
                  />
                </TouchableOpacity>
              ))}
            </Animated.View>

            {/* Rating Label */}
            {selectedRating > 0 && (
              <Text style={styles.ratingLabel}>
                {starLabels[selectedRating - 1]}
              </Text>
            )}
          </View>

          {/* Feedback Section */}
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>
              Your feedback {selectedRating > 0 && `(${selectedRating}/5)`}
            </Text>
            <TextInput
              style={[
                styles.feedbackInput,
                feedback.length > 0 && styles.feedbackInputFocused
              ]}
              value={feedback}
              onChangeText={setFeedback}
              placeholder={roleSpecificPlaceholders[userRole] || roleSpecificPlaceholders.default}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={300}
              editable={!isSubmitting}
              returnKeyType="done"
            />
            <Text style={styles.charCount}>
              {feedback.length}/300
            </Text>
          </View>

          {/* Quick Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Quick Tips</Text>
            <Text style={styles.tipsText}>
              • Be specific and constructive{'\n'}
              • Focus on the work quality{'\n'}
              • Help improve our community
            </Text>
          </View>
        </ScrollView>

        {/* Submit Button - Always visible and accessible */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (selectedRating === 0 || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={selectedRating === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>Submitting...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="star" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>
                  Submit {selectedRating > 0 && `${selectedRating}/5`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    maxHeight: SCREEN_HEIGHT * 0.85, // Limit maximum height
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
    borderRadius: 6,
  },
  headerSpacer: {
    width: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 10,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 6,
    marginHorizontal: 2,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  feedbackSection: {
    marginBottom: 20,
  },
  feedbackLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  feedbackInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    minHeight: 100,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  feedbackInputFocused: {
    borderColor: '#6366F1',
    backgroundColor: '#FFFFFF',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 6,
  },
  tipsSection: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#E2E8F0',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default RatingModal;