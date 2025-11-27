import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const NegotiationModal = ({
  visible,
  onClose,
  negotiationData,
  setNegotiationData,
  onSubmit,
  isProcessing,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Start Negotiation</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.description}>
              Provide your preferred pricing structure. The client will see these options and can choose to accept or counter.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred Price (₵)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your ideal price"
                keyboardType="numeric"
                value={negotiationData.preferred}
                onChangeText={(text) => setNegotiationData({ ...negotiationData, preferred: text })}
              />
              <Text style={styles.helperText}>Your ideal rate for this task</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Middle Price (₵)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your middle price"
                keyboardType="numeric"
                value={negotiationData.mid}
                onChangeText={(text) => setNegotiationData({ ...negotiationData, mid: text })}
              />
              <Text style={styles.helperText}>A reasonable compromise price</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lowest Price (₵)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your lowest acceptable price"
                keyboardType="numeric"
                value={negotiationData.lowest}
                onChangeText={(text) => setNegotiationData({ ...negotiationData, lowest: text })}
              />
              <Text style={styles.helperText}>The minimum you're willing to accept</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Message (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a message to the client..."
                multiline
                numberOfLines={3}
                value={negotiationData.message}
                onChangeText={(text) => setNegotiationData({ ...negotiationData, message: text })}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
              onPress={onSubmit}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Text style={styles.submitButtonText}>Submitting...</Text>
              ) : (
                <Text style={styles.submitButtonText}>Submit Negotiation Offer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

