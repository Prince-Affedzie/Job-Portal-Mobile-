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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../context/AuthContext';
import Header from "../../component/tasker/Header";
import { addPaymentMethod, updatePaymentMethod, removePaymentMethod, fetchUser } from '../../api/authApi';
import PaymentMethodForm from '../../component/tasker/PaymentMethodForm'; 

const { width } = Dimensions.get('window');

const PAYMENT_PROVIDERS = [
  { id: 'mtn_momo', name: 'MTN Mobile Money', icon: 'phone-portrait', color: '#FFC107', gradient: ['#FFC107', '#FF8C00'] },
  { id: 'vodafone_cash', name: 'Vodafone Cash', icon: 'card', color: '#E60000', gradient: ['#E60000', '#CC0000'] },
  { id: 'airtel_tigo', name: 'AirtelTigo Money', icon: 'cellular', color: '#FF0000', gradient: ['#FF0000', '#CC0000'] },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: 'business', color: '#2196F3', gradient: ['#2196F3', '#1976D2'] },
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

  useEffect(() => {
    if (user && user.paymentMethods) {
      setPaymentMethods(user.paymentMethods);
    }
  }, [user]);

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
        await refreshUserData();
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
      const res = await updatePaymentMethod(editingMethod._id, formData);
      
      if (res.status === 200) {
        Alert.alert('Success', 'Payment method updated successfully');
        setShowEditModal(false);
        setEditingMethod(null);
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

  const onRefresh = React.useCallback(() => {
    refreshUserData();
  }, []);

  const PaymentMethodCard = ({ method }) => {
    const providerInfo = getProviderInfo(method.provider);
    const isSmallScreen = width < 375; // For smaller devices

    return (
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.paymentMethodCard}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.paymentMethodInfo}>
            <LinearGradient
              colors={providerInfo.gradient}
              style={styles.providerIcon}
            >
              <Ionicons name={providerInfo.icon} size={20} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.paymentMethodDetails}>
              <View style={styles.titleRow}>
                <Text style={styles.providerName}>{providerInfo.name}</Text>
                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.accountNumber}>{method.accountNumber}</Text>
              <Text style={styles.accountName}>{method.accountName}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons - Improved Layout */}
        <View style={styles.paymentMethodActions}>
          <View style={styles.actionButtonsRow}>
            {!method.isDefault && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => handleSetDefault(method._id)}
                disabled={loading}
              >
                <Ionicons name="star-outline" size={16} color="#6366F1" />
                <Text style={styles.secondaryButtonText}>
                  {isSmallScreen ? 'Default' : 'Set Default'}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => openEditModal(method)}
            >
              <Ionicons name="create-outline" size={16} color="#6366F1" />
              <Text style={styles.secondaryButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton, styles.fullWidthButton]}
            onPress={() => handleRemovePaymentMethod(method._id)}
            disabled={removingMethodId === method._id}
          >
            {removingMethodId === method._id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                <Text style={styles.dangerButtonText}>Remove Payment Method</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
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
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={styles.addButtonGradient}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add New</Text>
            </LinearGradient>
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
        {/* Hero Section */}
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIcon}>
              <Ionicons name="wallet-outline" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Payment Methods</Text>
              <Text style={styles.heroDescription}>
                Manage your payment methods for seamless transactions
              </Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{paymentMethods.length}</Text>
              <Text style={styles.statLabel}>Methods</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {paymentMethods.filter(m => m.isDefault).length}
              </Text>
              <Text style={styles.statLabel}>Default</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Payment Methods</Text>
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
              <LinearGradient
                colors={['#F8FAFC', '#F1F5F9']}
                style={styles.emptyIllustration}
              >
                <Ionicons name="card-outline" size={48} color="#9CA3AF" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Payment Methods</Text>
              <Text style={styles.emptyDescription}>
                You haven't added any payment methods yet. Add one to get started with secure payments.
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => setShowAddModal(true)}
              >
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={styles.emptyStateButtonGradient}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyStateButtonText}>Add Payment Method</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Security Notice */}
        <LinearGradient
          colors={['#F0FDF4', '#DCFCE7']}
          style={styles.securitySection}
        >
          <View style={styles.securityIcon}>
            <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          </View>
          <View style={styles.securityText}>
            <Text style={styles.securityTitle}>Secure & Encrypted</Text>
            <Text style={styles.securityDescription}>
              Your payment information is securely encrypted and never shared with third parties. All transactions are protected.
            </Text>
          </View>
        </LinearGradient>

        {/* Quick Actions 
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Need Help?</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="help-circle-outline" size={24} color="#6366F1" />
              <Text style={styles.quickActionText}>FAQ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="chatbubble-outline" size={24} color="#6366F1" />
              <Text style={styles.quickActionText}>Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="document-outline" size={24} color="#6366F1" />
              <Text style={styles.quickActionText}>Guide</Text>
            </TouchableOpacity>
          </View>
        </View>*/}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Header Add Button
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Hero Section
  heroSection: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroDescription: {
    fontSize: 16,
    color: '#E0E7FF',
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Section Styles
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Payment Method Card - Improved Layout
  paymentMethodCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    marginBottom: 16,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  providerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  accountNumber: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 2,
    fontWeight: '500',
  },
  accountName: {
    fontSize: 14,
    color: '#64748B',
  },

  // Improved Action Buttons Layout
  paymentMethodActions: {
    gap: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  fullWidthButton: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  dangerButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyStateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Security Section
  securitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom:18,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },

  // Quick Actions
  quickActions: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickActionText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 8,
  },

  // Refresh Button
  refreshButton: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
});

export default PaymentMethodScreen;