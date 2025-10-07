import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  Dimensions,
  Share,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import {useEffect} from 'react'
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export const BidModal = ({ 
  visible, 
  onClose, 
  bidData, 
  setBidData, 
  onSubmit, 
  isProcessing 
}) => {
  const slideAnim = new Animated.Value(visible ? 1 : 0);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handleSubmit = () => {
    if (!bidData.amount || !bidData.timeline) {
      Alert.alert('Error', 'Please fill in the amount and timeline fields.');
      return;
    }
    onSubmit();
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : null}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          >
            <Animated.View
              style={[
                styles.modalContainer,
                { transform: [{ translateY }] },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Place Your Bid</Text>
                <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Amount Input */}
                <View style={styles.formGroup}>
                  <View style={styles.formLabel}>
                    <Ionicons name="cash-outline" size={16} color="#6366F1" />
                    <Text style={styles.labelText}>Your Proposed Amount (₵)</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={bidData.amount}
                    onChangeText={(text) => setBidData({ ...bidData, amount: text })}
                    placeholder="Enter your proposed amount"
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Timeline Input */}
                <View style={styles.formGroup}>
                  <View style={styles.formLabel}>
                    <Ionicons name="calendar-outline" size={16} color="#6366F1" />
                    <Text style={styles.labelText}>Proposed Timeline (time)</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={bidData.timeline}
                    onChangeText={(text) => setBidData({ ...bidData, timeline: text })}
                    placeholder="How many hours or days will you need?"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Message Input */}
                <View style={styles.formGroup}>
                  <View style={styles.formLabel}>
                    <Ionicons name="chatbubble-outline" size={16} color="#6366F1" />
                    <Text style={styles.labelText}>Message to Client (Optional)</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={bidData.message}
                    onChangeText={(text) => setBidData({ ...bidData, message: text })}
                    placeholder="Introduce yourself and explain why you're the right fit..."
                    multiline={true}
                    scrollEnabled={true}
                    numberOfLines={4}
                    placeholderTextColor="#94A3B8"
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onClose}
                  disabled={isProcessing}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Submit Bid</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: height * 0.85, // Increased to 85% for more content space
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalBody: {
    flexGrow: 1,
  },
  modalBodyContent: {
    paddingBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    minHeight: 48,
  },
  textArea: {
    height: 120, // Increased height for better visibility
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
});