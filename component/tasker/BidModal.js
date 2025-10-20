import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Scaling function for responsiveness
const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const scale = (size) => (width / guidelineBaseWidth) * size;
const isTablet = width > scale(600);

export const BidModal = ({ visible, onClose, bidData, setBidData, onSubmit, isProcessing }) => {
  const [errors, setErrors] = useState({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const amountInputRef = useRef(null);
  const timelineInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardVisible(true);
      // Restore focus to the last focused field
      if (focusedField === 'amount') {
        setTimeout(() => amountInputRef.current?.focus(), 100);
      } else if (focusedField === 'timeline') {
        setTimeout(() => timelineInputRef.current?.focus(), 100);
      } else if (focusedField === 'message') {
        setTimeout(() => messageInputRef.current?.focus(), 100);
      }
      // Scroll to the focused field
      if (scrollViewRef.current && focusedField) {
        const yOffset = focusedField === 'amount' ? scale(0) : focusedField === 'timeline' ? scale(100) : scale(200);
        scrollViewRef.current.scrollTo({ y: yOffset, animated: true });
      }
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [focusedField]);

  // Focus Amount input when modal opens
  useEffect(() => {
    if (visible) {
      setErrors({});
      setFocusedField('amount');
      setTimeout(() => amountInputRef.current?.focus(), 300);
    }
  }, [visible]);

  const handleChange = useCallback(
    (name, value) => {
      setBidData(prev => ({ ...prev, [name]: value }));
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: undefined }));
      }
    },
    [errors, setBidData]
  );

  const validateForm = () => {
    const newErrors = {};
    if (!bidData.amount || isNaN(bidData.amount) || Number(bidData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (!bidData.timeline || bidData.timeline.trim().length < 3) {
      newErrors.timeline = 'Please enter a valid timeline (minimum 3 characters)';
    }
    if (bidData.message && bidData.message.length > 1000) {
      newErrors.message = 'Message cannot exceed 1000 characters';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => setErrors({}), 5000);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    onSubmit();
  };

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      if (bidData.amount || bidData.timeline || bidData.message) {
        Alert.alert(
          'Discard Bid?',
          'You have unsaved changes. Are you sure you want to discard this bid?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: onClose },
          ]
        );
      } else {
        onClose();
      }
    }
  }, [isProcessing, bidData, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" />
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            if (!keyboardVisible) {
              handleClose();
            }
          }}
        />
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.select({
            ios: 0,
            android: StatusBar.currentHeight ? StatusBar.currentHeight + scale(20) : scale(20),
          })}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Ionicons name="cash-outline" size={scale(24)} color="#FFFFFF" />
                <Text style={styles.headerTitle}>Place Your Bid</Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isProcessing}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={scale(24)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{
                ...styles.scrollContentContainer,
                paddingBottom: keyboardVisible ? scale(120) : scale(30),
              }}
            >
              {/* Amount Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Proposed Amount (₵) <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.sectionSubtitle}>Enter your bid amount</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={amountInputRef}
                    style={[styles.textInput, errors.amount && styles.inputError]}
                    placeholder="Enter amount (e.g., 100)"
                    placeholderTextColor="#9CA3AF"
                    value={bidData.amount}
                    onChangeText={(text) => handleChange('amount', text)}
                    keyboardType="numeric"
                    editable={!isProcessing}
                    returnKeyType="next"
                    maxLength={10}
                    allowFontScaling={true}
                    onFocus={() => setFocusedField('amount')}
                  />
                  {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
                </View>
              </View>

              {/* Timeline Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Proposed Timeline <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.sectionSubtitle}>Specify the time needed to complete the task</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={timelineInputRef}
                    style={[styles.textInput, errors.timeline && styles.inputError]}
                    placeholder="E.g., 3 days or 12 hours"
                    placeholderTextColor="#9CA3AF"
                    value={bidData.timeline}
                    onChangeText={(text) => handleChange('timeline', text)}
                    editable={!isProcessing}
                    returnKeyType="next"
                    maxLength={50}
                    allowFontScaling={true}
                    onFocus={() => setFocusedField('timeline')}
                  />
                  {errors.timeline && <Text style={styles.errorText}>{errors.timeline}</Text>}
                </View>
              </View>

              {/* Message Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Message to Client (Optional)</Text>
                <Text style={styles.sectionSubtitle}>
                  Introduce yourself and explain why you're the right fit
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={messageInputRef}
                    style={[styles.textArea, errors.message && styles.inputError]}
                    placeholder="Write your message..."
                    placeholderTextColor="#9CA3AF"
                    value={bidData.message}
                    onChangeText={(text) => handleChange('message', text)}
                    multiline={true}
                    numberOfLines={6}
                    textAlignVertical="top"
                    editable={!isProcessing}
                    maxLength={1000}
                    returnKeyType="default"
                    blurOnSubmit={false}
                    allowFontScaling={true}
                    onFocus={() => setFocusedField('message')}
                  />
                  <View style={styles.charCounter}>
                    {errors.message ? (
                      <Text style={styles.errorText}>{errors.message}</Text>
                    ) : (
                      <Text style={styles.hintText}>Optional</Text>
                    )}
                    <Text style={styles.charCount}>{bidData.message?.length || 0}/1000</Text>
                  </View>
                </View>
              </View>

              {/* Error Messages */}
              {Object.keys(errors).length > 0 && (
                <View style={styles.errorContainer}>
                  <View style={styles.errorHeader}>
                    <Ionicons name="warning" size={scale(20)} color="#EF4444" />
                    <Text style={styles.errorTitle}>Form Errors</Text>
                  </View>
                  {Object.entries(errors).map(([key, error]) => (
                    <Text key={key} style={styles.errorItem}>
                      <Text style={styles.errorFieldName}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}:
                      </Text>{' '}
                      {error}
                    </Text>
                  ))}
                </View>
              )}
            </ScrollView>
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, isProcessing && styles.buttonDisabled]}
                onPress={handleClose}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  (isProcessing ||
                    !bidData.amount ||
                    !bidData.timeline ||
                    isNaN(bidData.amount) ||
                    Number(bidData.amount) <= 0 ||
                    bidData.timeline.trim().length < 3) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={
                  isProcessing ||
                  !bidData.amount ||
                  !bidData.timeline ||
                  isNaN(bidData.amount) ||
                  Number(bidData.amount) <= 0 ||
                  bidData.timeline.trim().length < 3
                }
              >
                {isProcessing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="cash-outline" size={scale(16)} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Bid</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(16),
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    width: Math.min(width * 0.9, scale(500)),
    maxHeight: height * 0.95,
    minHeight: scale(550),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    backgroundColor: '#6366F1',
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    padding: scale(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: scale(4),
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: isTablet ? scale(30) : scale(20),
  },
  section: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: '#111827',
    marginBottom: scale(8),
  },
  sectionSubtitle: {
    fontSize: scale(14),
    color: '#6B7280',
    marginBottom: scale(16),
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    marginBottom: scale(16),
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: scale(12),
    padding: scale(16),
    fontSize: scale(16),
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: scale(12),
    padding: scale(16),
    fontSize: scale(16),
    backgroundColor: '#FFFFFF',
    minHeight: scale(140),
    textAlignVertical: 'top',
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  charCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scale(8),
  },
  errorText: {
    color: '#EF4444',
    fontSize: scale(14),
  },
  hintText: {
    color: '#6B7280',
    fontSize: scale(14),
  },
  charCount: {
    color: '#6B7280',
    fontSize: scale(14),
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: scale(8),
    padding: scale(16),
    marginBottom: scale(20),
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(8),
  },
  errorTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#991B1B',
  },
  errorItem: {
    fontSize: scale(12),
    color: '#991B1B',
    lineHeight: scale(16),
  },
  errorFieldName: {
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    paddingHorizontal: scale(20),
    borderRadius: scale(12),
    gap: scale(8),
    minHeight: scale(52),
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginRight: scale(8),
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: scale(16),
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#6366F1',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: scale(16),
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
});