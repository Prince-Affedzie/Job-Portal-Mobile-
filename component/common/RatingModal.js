// components/RatingModal.js
import React, { useState, useRef, useEffect } from 'react';
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

// ─── Theme (Pacific Indigo & Warm Gold) ──────────────────────────────────────
const C = {
  bg:           '#F8FAFF',
  surface:      '#FFFFFF',
  border:       '#E4E8EE',
  primary:      '#1E3A6E',
  primaryDark:  '#152C4F',
  primaryGlow:  '#EBF5FF',
  gold:         '#D49B3F',
  goldLight:    '#FCF3E1',
  green:        '#0F766E',
  greenLight:   '#D1FAE5',
  red:          '#DC2626',
  redLight:     '#FEE2E2',
  amber:        '#F59E0B',
  textPrimary:  '#0F172A',
  textSecondary:'#475569',
  textMuted:    '#94A3B8',
  white:        '#FFFFFF',
};

const RatingModal = ({
  visible,
  onClose,
  userId,
  userName,
  userRole,
  onRatingSuccess,
}) => {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [starAnim] = useState(new Animated.Value(1));
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scrollViewRef = useRef(null);

  const starLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 55,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible]);

  const handleStarPress = (rating) => {
    setSelectedRating(rating);
    Animated.spring(starAnim, {
      toValue: 1.1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(starAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSubmit = async () => {
    if (selectedRating === 0) {
      Alert.alert('Rating Required', 'Please tap a star before submitting.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await addRating(
        { rating: selectedRating, feedback: feedback.trim() },
        userId
      );
      if (response.status === 201) {
        Alert.alert('Thanks! 💛', 'Your rating has been submitted.');
        resetForm();
        onClose();
        if (onRatingSuccess) onRatingSuccess();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit rating.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedRating(0);
    setHoverRating(0);
    setFeedback('');
  };

  const handleClose = () => {
    if (selectedRating > 0 || feedback.trim()) {
      Alert.alert('Discard Rating?', 'You have unsaved changes. Are you sure?', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { resetForm(); onClose(); } },
      ]);
    } else {
      onClose();
    }
  };

  // Loading spinner
  const spinValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: require('react-native').Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {/* Backdrop to close modal */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={styles.keyboardView}
        >
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose} disabled={isSubmitting}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.title}>Rate {userName}</Text>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Star Rating */}
              <View style={styles.ratingSection}>
                <Text style={styles.promptText}>How was your experience?</Text>
                <Animated.View style={[styles.starsRow, { transform: [{ scale: starAnim }] }]}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleStarPress(star)}
                      onPressIn={() => setHoverRating(star)}
                      onPressOut={() => setHoverRating(0)}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={star <= (hoverRating || selectedRating) ? 'star' : 'star-outline'}
                        size={44}
                        color={star <= (hoverRating || selectedRating) ? C.gold : C.border}
                        style={{ marginHorizontal: 6 }}
                      />
                    </TouchableOpacity>
                  ))}
                </Animated.View>
                {selectedRating > 0 && (
                  <Text style={styles.ratingLabel}>{starLabels[selectedRating - 1]}</Text>
                )}
              </View>

              {/* Feedback Input */}
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackLabel}>Share your thoughts (optional)</Text>
                <TextInput
                  style={styles.feedbackInput}
                  value={feedback}
                  onChangeText={setFeedback}
                  placeholder="Tell us what went well, or what could be better…"
                  placeholderTextColor={C.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={300}
                  editable={!isSubmitting}
                  returnKeyType="done"
                />
                <Text style={styles.charCount}>{feedback.length}/300</Text>
              </View>

              {/* Tips */}
              <View style={styles.tipsCard}>
                <View style={styles.tipsRow}>
                  <Ionicons name="bulb-outline" size={16} color={C.gold} />
                  <Text style={styles.tipsTitle}>Quick Tips</Text>
                </View>
                <Text style={styles.tipText}>
                  • Be honest and constructive{'\n'}
                  • Focus on the quality of work{'\n'}
                  • Help build a trusted community
                </Text>
              </View>

              {/* Submit Button - now inside the scroll view */}
              <TouchableOpacity
                style={[styles.submitBtn, (selectedRating === 0 || isSubmitting) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={selectedRating === 0 || isSubmitting}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={selectedRating > 0 && !isSubmitting ? [C.primary, C.primaryDark] : [C.border, C.border]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isSubmitting ? (
                    <View style={styles.submitContent}>
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="sync-outline" size={18} color={C.white} />
                      </Animated.View>
                      <Text style={styles.submitText}>Submitting…</Text>
                    </View>
                  ) : (
                    <View style={styles.submitContent}>
                      <Ionicons name="star" size={18} color={C.white} />
                      <Text style={styles.submitText}>
                        {selectedRating > 0 ? `Submit ${selectedRating}/5` : 'Submit Rating'}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.85,   // ensures it never overflows screen
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.75,   // leaves room for header
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 30,                 // extra space for the button
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  promptText: {
    fontSize: 16,
    color: C.textSecondary,
    marginBottom: 20,
    fontWeight: '500',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: C.gold,
    marginTop: 4,
  },
  feedbackSection: {
    marginBottom: 24,
  },
  feedbackLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 10,
  },
  feedbackInput: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: C.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'right',
    marginTop: 6,
  },
  tipsCard: {
    backgroundColor: C.goldLight,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: C.gold,
    marginBottom: 24,                  // space before button
  },
  tipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.primary,
  },
  tipText: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 20,
  },
  submitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    bottom:18,
  },
  submitBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default RatingModal;