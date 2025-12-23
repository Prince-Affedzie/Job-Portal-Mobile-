import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../../styles/tasker/PaymentMethodScreen.Styles';

const { height } = Dimensions.get('window');

const PAYMENT_PROVIDERS = [
  {
    id: 'mtn_momo',
    name: 'MTN Mobile Money',
    icon: 'phone-portrait',
    gradient: ['#FFD700', '#FFC107'],
    description: 'GH +233',
  },
  {
    id: 'vodafone_cash',
    name: 'Vodafone Cash',
    icon: 'card',
    gradient: ['#FF3333', '#CC0000'],
    description: 'GH +233',
  },
  {
    id: 'airtel_tigo',
    name: 'AirtelTigo Money',
    icon: 'cellular',
    gradient: ['#FF6666', '#FF0000'],
    description: 'GH +233',
  },
];

const PaymentMethodForm = ({
  visible,
  onClose,
  onSubmit,
  loading,
  initialData = null,
  isEdit = false,
  selectedProvider = null,
}) => {
  const accountNameRef = useRef(null);
  const accountNumberRef = useRef(null);

  const [formData, setFormData] = useState({
    type: 'mobile_money',
    provider: '',
    accountName: '',
    accountNumber: '',
    countryCode: 'GH',
    isDefault: false,
  });

  const [showProviderPicker, setShowProviderPicker] = useState(false);

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Reset and animate when modal visibility changes
  useEffect(() => {
    if (visible) {
      if (isEdit && initialData) {
        setFormData({
          type: 'mobile_money',
          provider: initialData.provider || '',
          accountName: initialData.accountName || '',
          accountNumber: initialData.accountNumber || '',
          countryCode: initialData.countryCode || 'GH',
          isDefault: initialData.isDefault || false,
        });
      } else if (selectedProvider) {
        setFormData(prev => ({ ...prev, provider: selectedProvider.id }));
      } else {
        setFormData({
          type: 'mobile_money',
          provider: '',
          accountName: '',
          accountNumber: '',
          countryCode: 'GH',
          isDefault: false,
        });
      }

      setShowProviderPicker(false);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 100, friction: 20, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, isEdit, initialData, selectedProvider]);

  const selectedProviderData = PAYMENT_PROVIDERS.find(p => p.id === formData.provider);

  const handleProviderSelect = (providerId) => {
    setFormData(prev => ({ ...prev, provider: providerId }));
    setShowProviderPicker(false);
  };

  const validateForm = () => {
    if (!formData.provider) {
      Alert.alert('Error', 'Please select a payment provider');
      return false;
    }
    if (!formData.accountName.trim()) {
      Alert.alert('Error', 'Please enter account name');
      accountNameRef.current?.focus();
      return false;
    }
    if (!formData.accountNumber.trim()) {
      Alert.alert('Error', 'Please enter account number');
      accountNumberRef.current?.focus();
      return false;
    }
    if (!/^0\d{9}$/.test(formData.accountNumber.trim())) {
      Alert.alert('Error', 'Please enter a valid mobile money number (10 digits starting with 0)');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    onSubmit(formData);
  };

 // Only the changed parts — replace your return() block with this updated version

return (
  <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
    <KeyboardAvoidingView
      style={styles.modalOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Main Form Sheet */}
      <Animated.View
        style={[
          styles.modalContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <TouchableOpacity onPress={onClose} disabled={loading} style={styles.modalBackButton}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEdit ? 'Edit Payment Method' : 'Add Payment Method'}
            </Text>
          </View>
          {!loading && (
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Scrollable Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* All your form sections remain exactly the same */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Payment Type</Text>
            <View style={styles.paymentTypeInfo}>
              <View style={styles.paymentTypeIcon}>
                <Ionicons name="phone-portrait" size={20} color="#6366F1" />
              </View>
              <Text style={styles.paymentTypeText}>Mobile Money</Text>
              <View style={styles.onlyOptionBadge}>
                <Text style={styles.onlyOptionText}>Only Option</Text>
              </View>
            </View>
            <Text style={styles.paymentTypeDescription}>
              We currently only accept mobile money payments for faster transactions
            </Text>
          </View>

          {/* Provider Selector */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Provider *</Text>
            <TouchableOpacity
              style={[
                selectedProviderData ? styles.providerSelector : styles.providerSelectorEmpty,
              ]}
              onPress={() => setShowProviderPicker(true)}
              activeOpacity={0.7}
            >
              {selectedProviderData ? (
                <>
                  <LinearGradient colors={selectedProviderData.gradient} style={styles.providerPreviewIcon}>
                    <Ionicons name={selectedProviderData.icon} size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.providerPreviewInfo}>
                    <Text style={styles.providerPreviewName}>{selectedProviderData.name}</Text>
                    <Text style={styles.providerPreviewDescription}>{selectedProviderData.description}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </>
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#9CA3AF" />
                  <Text style={styles.providerSelectorEmptyText}>Select mobile money provider</Text>
                  <View />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Account Name */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Account Name *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                ref={accountNameRef}
                style={styles.formInput}
                value={formData.accountName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, accountName: text }))}
                placeholder="Enter account holder's name"
                placeholderTextColor="#94A3B8"
                returnKeyType="next"
                onSubmitEditing={() => accountNumberRef.current?.focus()}
                editable={!loading}
              />
            </View>
          </View>

          {/* Mobile Number */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Mobile Money Number *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="keypad-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                ref={accountNumberRef}
                style={styles.formInput}
                value={formData.accountNumber}
                onChangeText={(text) => setFormData(prev => ({ ...prev, accountNumber: text }))}
                placeholder="e.g., 0551234567"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                returnKeyType="done"
                editable={!loading}
                maxLength={10}
              />
            </View>
            <Text style={styles.inputHelper}>
              Enter your mobile money number (10 digits starting with 0)
            </Text>
          </View>

          {/* Default Toggle */}
          <View style={styles.formSection}>
            <View style={styles.toggleContainer}>
              <View style={styles.toggleLeft}>
                <View style={styles.toggleIcon}>
                  <Ionicons name="star-outline" size={20} color="#F59E0B" />
                </View>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleLabel}>Set as default payment method</Text>
                  <Text style={styles.toggleDescription}>
                    This payment method will be used for all future transactions
                  </Text>
                </View>
              </View>
              <Switch
                value={formData.isDefault}
                onValueChange={(value) => setFormData(prev => ({ ...prev, isDefault: value }))}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={formData.isDefault ? '#4F46E5' : '#FFFFFF'}
                ios_backgroundColor="#E5E7EB"
                disabled={loading}
              />
            </View>
          </View>

          {/* Security Note */}
          <View style={[styles.securityNote, { marginBottom: 20 }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
            <Text style={styles.securityNoteText}>
              Your payment information is encrypted and secure. We use bank-level security to protect your data.
            </Text>
          </View>
        </ScrollView>

        {/* FIXED: Action Buttons - Always visible at bottom */}
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.cancelButton, loading && styles.buttonDisabled]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, (loading || !formData.provider) && styles.saveButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !formData.provider}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEdit ? 'Save Changes' : 'Add Method'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Provider Picker Modal remains unchanged */}
      <Modal
        visible={showProviderPicker}
        transparent
        animationType="none"
        onRequestClose={() => setShowProviderPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowProviderPicker(false)}
          />
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Mobile Money Provider</Text>
              <TouchableOpacity onPress={() => setShowProviderPicker(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownList}>
              {PAYMENT_PROVIDERS.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={styles.dropdownItem}
                  onPress={() => handleProviderSelect(provider.id)}
                >
                  <View style={styles.dropdownItemLeft}>
                    <LinearGradient colors={provider.gradient} style={styles.dropdownProviderIcon}>
                      <Ionicons name={provider.icon} size={18} color="#FFFFFF" />
                    </LinearGradient>
                    <View>
                      <Text style={styles.dropdownItemText}>{provider.name}</Text>
                      <Text style={styles.dropdownItemDescription}>{provider.description}</Text>
                    </View>
                  </View>
                  {formData.provider === provider.id && (
                    <Ionicons name="checkmark" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  </Modal>
);
};

export default PaymentMethodForm;