
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
} from 'react-native';
import { styles } from '../../screens/tasker/TaskDetails';
import { Ionicons } from '@expo/vector-icons';


export const BidModal = ({ 
  visible, 
  onClose, 
  bidData, 
  setBidData, 
  onSubmit, 
  isProcessing 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Place Your Bid</Text>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody}>
              {/* Amount Input */}
              <View style={styles.formGroup}>
                <View style={styles.formLabel}>
                  <Ionicons name="cash-outline" size={16} color="#6366F1" />
                  <Text style={styles.labelText}>Your Proposed Amount (₵)</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={bidData.amount}
                  onChangeText={(text) => setBidData({...bidData, amount: text})}
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
                  onChangeText={(text) => setBidData({...bidData, timeline: text})}
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
                  onChangeText={(text) => setBidData({...bidData, message: text})}
                  placeholder="Introduce yourself and explain why you're the right fit..."
                  multiline={true}
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
                onPress={onSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit Bid</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};