import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/tasker/PaymentMethodScreen.Styles';

// Payment method providers and types (move these to a separate constants file if needed)
const PAYMENT_PROVIDERS = [
  { id: 'mtn_momo', name: 'MTN Mobile Money', icon: 'phone-portrait', color: '#FFC107' },
  { id: 'vodafone_cash', name: 'Vodafone Cash', icon: 'card', color: '#E60000' },
  { id: 'airtel_tigo', name: 'AirtelTigo Money', icon: 'cellular', color: '#FF0000' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: 'business', color: '#2196F3' },
];

const PAYMENT_TYPES = [
  { id: 'mobile_money', name: 'Mobile Money' },
  { id: 'bank_account', name: 'Bank Account' },
];

const PaymentMethodForm = ({ 
  visible, 
  onClose, 
  onSubmit, 
  loading, 
  initialData = null,
  isEdit = false 
}) => {
  const accountNumberRef = useRef(null);
  
  const [formData, setFormData] = useState({
    type: 'mobile_money',
    provider: '',
    accountName: '',
    accountNumber: '',
    countryCode: 'GH',
    isDefault: false,
  });

  // Initialize form when modal opens or initialData changes
  React.useEffect(() => {
    if (visible) {
      if (isEdit && initialData) {
        setFormData({
          type: initialData.type || 'mobile_money',
          provider: initialData.provider || '',
          accountName: initialData.accountName || '',
          accountNumber: initialData.accountNumber || '',
          countryCode: initialData.countryCode || 'GH',
          isDefault: initialData.isDefault || false,
        });
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
    }
  }, [visible, isEdit, initialData]);

  const handleProviderSelect = (providerId) => {
    setFormData(prev => ({ ...prev, provider: providerId }));
  };

  const handleTypeSelect = (typeId) => {
    setFormData(prev => ({ ...prev, type: typeId }));
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.provider) {
      alert('Error', 'Please select a payment provider');
      return;
    }
    if (!formData.accountName.trim()) {
      alert('Error', 'Please enter account name');
      return;
    }
    if (!formData.accountNumber.trim()) {
      alert('Error', 'Please enter account number');
      return;
    }

    onSubmit(formData);
  };

  const getFilteredProviders = () => {
    return PAYMENT_PROVIDERS.filter(provider => 
      formData.type === 'mobile_money' 
        ? provider.id !== 'bank_transfer'
        : provider.id === 'bank_transfer'
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEdit ? 'Edit Payment Method' : 'Add Payment Method'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={[1]} // Single item to render the form
            renderItem={() => (
              <View style={styles.formContainer}>
                {/* Payment Type Selection */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Payment Type</Text>
                  <View style={styles.typeOptions}>
                    {PAYMENT_TYPES.map(type => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.typeOption,
                          formData.type === type.id && styles.typeOptionSelected
                        ]}
                        onPress={() => handleTypeSelect(type.id)}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          formData.type === type.id && styles.typeOptionTextSelected
                        ]}>
                          {type.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Provider Selection */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Provider *</Text>
                  <View style={styles.providerOptions}>
                    {getFilteredProviders().map(provider => (
                      <TouchableOpacity
                        key={provider.id}
                        style={[
                          styles.providerOption,
                          formData.provider === provider.id && styles.providerOptionSelected
                        ]}
                        onPress={() => handleProviderSelect(provider.id)}
                      >
                        <View style={[styles.providerIcon, { backgroundColor: provider.color }]}>
                          <Ionicons name={provider.icon} size={20} color="#FFFFFF" />
                        </View>
                        <Text style={styles.providerOptionText}>{provider.name}</Text>
                        {formData.provider === provider.id && (
                          <Ionicons name="checkmark" size={20} color="#10B981" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Account Details */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Account Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.accountName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, accountName: text }))}
                    placeholder="Enter account holder name"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="next"
                    onSubmitEditing={() => accountNumberRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Account Number *</Text>
                  <TextInput
                    ref={accountNumberRef}
                    style={styles.formInput}
                    value={formData.accountNumber}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, accountNumber: text }))}
                    placeholder="Enter account number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                </View>

                {/* Default Payment Method Toggle */}
                <View style={styles.formSection}>
                  <View style={styles.toggleContainer}>
                    <View style={styles.toggleText}>
                      <Text style={styles.toggleLabel}>Set as default payment method</Text>
                      <Text style={styles.toggleDescription}>
                        This payment method will be used for all transactions by default
                      </Text>
                    </View>
                    <Switch
                      value={formData.isDefault}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, isDefault: value }))}
                      trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                      thumbColor={formData.isDefault ? '#4F46E5' : '#9CA3AF'}
                    />
                  </View>
                </View>
              </View>
            )}
            keyExtractor={() => 'payment-form'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.modalForm}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEdit ? 'Update' : 'Add'} Method
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PaymentMethodForm;