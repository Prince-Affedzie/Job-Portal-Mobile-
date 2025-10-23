import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import Header from "../../component/tasker/Header";
import { styles } from '../../styles/tasker/PaymentMethodScreen.Styles';
import { addPaymentMethod, updatePaymentMethod, removePaymentMethod, fetchUser } from '../../api/authApi';
import PaymentMethodForm from '../../component/tasker/PaymentMethodForm'; 

// Move PAYMENT_PROVIDERS and PAYMENT_TYPES to a separate constants file or keep here
const PAYMENT_PROVIDERS = [
  { id: 'mtn_momo', name: 'MTN Mobile Money', icon: 'phone-portrait', color: '#FFC107' },
  { id: 'vodafone_cash', name: 'Vodafone Cash', icon: 'card', color: '#E60000' },
  { id: 'airtel_tigo', name: 'AirtelTigo Money', icon: 'cellular', color: '#FF0000' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: 'business', color: '#2196F3' },
];

const PaymentMethodScreen = ({ navigation }) => {
  const { user, updateProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [removingMethodId, setRemovingMethodId] = useState(null);

  // Function to refresh user data from server
  const refreshUserData = async () => {
    try {
      setRefreshing(true);
      const res = await fetchUser();
      if (res.status === 200) {
        updateProfile(res.data);
        if (res.data.paymentMethods) {
          setPaymentMethods(res.data.paymentMethods);
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Initialize payment methods from user data
  useEffect(() => {
    if (user && user.paymentMethods) {
      setPaymentMethods(user.paymentMethods);
    }
  }, [user]);

  // Refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshUserData();
    });

    return unsubscribe;
  }, [navigation]);

  const getProviderInfo = (providerId) => {
    return PAYMENT_PROVIDERS.find(p => p.id === providerId) || PAYMENT_PROVIDERS[0];
  };

  const handleAddPaymentMethod = async (formData) => {
    try {
      setLoading(true);
      const res = await addPaymentMethod(formData);
      
      if (res.status === 200) {
        Alert.alert('Success', 'Payment method added successfully');
        setShowAddModal(false);
        await refreshUserData()
        
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', 'Failed to add payment method. Please try again.');
    } finally {
      setLoading(false);
      
    }
  };

  const handleUpdatePaymentMethod = async (formData) => {
    if (!editingMethod) return;

    try {
      setLoading(true);
      console.log(editingMethod)
      const res = await updatePaymentMethod(editingMethod._id, formData);
      
      if (res.status === 200) {
        Alert.alert('Success', 'Payment method updated successfully');
        setShowEditModal(false);
        setEditingMethod(null);
        
        // Refresh data from server to ensure consistency
        await refreshUserData();
      }
    } catch (error) {
      console.error('Error updating payment method:', error);
      Alert.alert('Error', 'Failed to update payment method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePaymentMethod = async (methodId) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingMethodId(methodId);
              const res = await removePaymentMethod(methodId);
              
              if (res.status === 200) {
                Alert.alert('Success', 'Payment method removed successfully');
                
                // Refresh data from server
                await refreshUserData();
              }
            } catch (error) {
              console.error('Error removing payment method:', error);
              Alert.alert('Error', 'Failed to remove payment method. Please try again.');
            } finally {
              setRemovingMethodId(null);
            }
          }
        }
      ]
    );
  };

  const handleSetDefault = async (methodId) => {
    try {
      setLoading(true);
      const res = await updatePaymentMethod(methodId, { isDefault: true });
      
      if (res.status === 200) {
        Alert.alert('Success', 'Default payment method updated successfully');
        
        // Refresh data from server to ensure all methods are properly updated
        await refreshUserData();
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', 'Failed to set default payment method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (method) => {
    setEditingMethod(method);
    setShowEditModal(true);
  };

  // Pull to refresh handler
  const onRefresh = React.useCallback(() => {
    refreshUserData();
  }, []);

  const PaymentMethodCard = ({ method }) => {
    const providerInfo = getProviderInfo(method.provider);

    return (
      <View style={styles.paymentMethodCard}>
        <View style={styles.paymentMethodHeader}>
          <View style={styles.paymentMethodInfo}>
            <View style={[styles.providerIcon, { backgroundColor: providerInfo.color }]}>
              <Ionicons name={providerInfo.icon} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.paymentMethodDetails}>
              <Text style={styles.providerName}>{providerInfo.name}</Text>
              <Text style={styles.accountNumber}>{method.accountNumber}</Text>
              <Text style={styles.accountName}>{method.accountName}</Text>
            </View>
          </View>
          
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>

        <View style={styles.paymentMethodActions}>
          {!method.isDefault && (
            <TouchableOpacity 
              style={styles.setDefaultButton}
              onPress={() => handleSetDefault(method._id)}
              disabled={loading}
            >
              <Ionicons name="star-outline" size={16} color="#6366F1" />
              <Text style={styles.setDefaultText}>Set Default</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => openEditModal(method)}
          >
            <Ionicons name="create-outline" size={16} color="#6366F1" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => handleRemovePaymentMethod(method._id)}
            disabled={removingMethodId === method._id}
          >
            {removingMethodId === method._id ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            )}
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Payment Methods" 
        rightComponent={
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add New</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
      >
        {/* Introduction */}
        <View style={styles.introSection}>
          <Ionicons name="card-outline" size={48} color="#6366F1" />
          <Text style={styles.introTitle}>Manage Payment Methods</Text>
          <Text style={styles.introDescription}>
            Add and manage your payment methods for seamless transactions. 
            Set a default method for faster payments.
          </Text>
        </View>

        {/* Payment Methods List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Your Payment Methods ({paymentMethods.length})
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refreshUserData}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <Ionicons name="refresh" size={20} color="#6366F1" />
              )}
            </TouchableOpacity>
          </View>
          
          {paymentMethods.length > 0 ? (
            <View style={styles.paymentMethodsList}>
              {paymentMethods.map(method => (
                <PaymentMethodCard key={method._id} method={method} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No Payment Methods</Text>
              <Text style={styles.emptyStateDescription}>
                You haven't added any payment methods yet. Add one to get started.
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.emptyStateButtonText}>Add Payment Method</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Security Notice */}
        <View style={styles.securitySection}>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          <View style={styles.securityText}>
            <Text style={styles.securityTitle}>Secure & Encrypted</Text>
            <Text style={styles.securityDescription}>
              Your payment information is securely encrypted and never shared with third parties.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Payment Method Modal */}
      <PaymentMethodForm
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddPaymentMethod}
        loading={loading}
        isEdit={false}
      />

      {/* Edit Payment Method Modal */}
      <PaymentMethodForm
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingMethod(null);
        }}
        onSubmit={handleUpdatePaymentMethod}
        loading={loading}
        initialData={editingMethod}
        isEdit={true}
      />
    </SafeAreaView>
  );
};

export default PaymentMethodScreen;