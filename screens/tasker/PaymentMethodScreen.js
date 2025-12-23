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
  Platform,
  Dimensions,
  Animated,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../context/AuthContext';
import Header from "../../component/tasker/Header";
import { addPaymentMethod, updatePaymentMethod, removePaymentMethod, fetchUser } from '../../api/authApi';
import PaymentMethodForm from '../../component/tasker/PaymentMethodForm'; 

const { width, height } = Dimensions.get('window');

const PROVIDERS = {
  mtn_momo: {
    id: 'mtn_momo',
    name: 'MTN Mobile Money',
    icon: 'cellular',
    color: '#FFC107',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
    gradient: ['#FFD700', '#FFC107'],
    verified: true,
    processingTime: 'Instant',
  },
  vodafone_cash: {
    id: 'vodafone_cash',
    name: 'Vodafone Cash',
    icon: 'card-outline',
    color: '#E60000',
    backgroundColor: 'rgba(230, 0, 0, 0.1)',
    borderColor: 'rgba(230, 0, 0, 0.3)',
    gradient: ['#FF3333', '#CC0000'],
    verified: true,
    processingTime: 'Instant',
  },
  airtel_tigo: {
    id: 'airtel_tigo',
    name: 'AirtelTigo Money',
    icon: 'phone-portrait-outline',
    color: '#FF0000',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderColor: 'rgba(255, 0, 0, 0.3)',
    gradient: ['#FF6666', '#FF0000'],
    verified: true,
    processingTime: '1-2 hours',
  },
  bank_transfer: {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    icon: 'business-outline',
    color: '#2196F3',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderColor: 'rgba(33, 150, 243, 0.3)',
    gradient: ['#42A5F5', '#2196F3'],
    verified: true,
    processingTime: '1-3 days',
  },
};

const PaymentMethodScreen = ({ navigation }) => {
  const { user, updateProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [removingMethodId, setRemovingMethodId] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
      Alert.alert('Error', error.response?.data?.message || 'Failed to add payment method');
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
      Alert.alert('Error', error.response?.data?.message || 'Failed to update payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePaymentMethod = async (methodId) => {
    Alert.alert(
      'Remove Payment Method',
      'This action cannot be undone. Are you sure you want to remove this payment method?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('Cancel Pressed')
        },
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
              Alert.alert('Error', error.response?.data?.message || 'Failed to remove payment method');
            } finally {
              setRemovingMethodId(null);
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  const handleSetDefault = async (methodId) => {
    try {
      setLoading(true);
      const res = await updatePaymentMethod(methodId, { isDefault: true });
      
      if (res.status === 200) {
        Alert.alert('Success', 'Default payment method updated');
        await refreshUserData();
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to set default payment method');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (provider) => {
    setSelectedProvider(provider);
    setShowAddModal(true);
  };

  const openEditModal = (method) => {
    setEditingMethod(method);
    setSelectedProvider(PROVIDERS[method.provider]);
    setShowEditModal(true);
  };

  const onRefresh = React.useCallback(() => {
    refreshUserData();
  }, []);

  const PaymentMethodCard = ({ method, index }) => {
    const provider = PROVIDERS[method.provider] || PROVIDERS.mtn_momo;
    const isDefault = method.isDefault;

    return (
      <Animated.View 
        style={[
          styles.paymentMethodCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardLeftSection}>
            <View style={[styles.providerIconContainer, { backgroundColor: provider.backgroundColor }]}>
              <Ionicons name={provider.icon} size={20} color={provider.color} />
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{provider.name}</Text>
                {isDefault && (
                  <View style={styles.defaultBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardSubtitle}>{method.accountNumber}</Text>
              <Text style={styles.cardDescription}>{method.accountName}</Text>
            </View>
          </View>
          
          <View style={styles.cardRightSection}>
            {isDefault ? (
              <View style={styles.defaultIndicator}>
                <Ionicons name="star" size={16} color="#FFD700" />
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.setDefaultButton}
                onPress={() => handleSetDefault(method._id)}
                disabled={loading}
              >
                <Text style={styles.setDefaultText}>Set as Default</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Card Footer - Actions */}
        <View style={styles.cardFooter}>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => openEditModal(method)}
            >
              <Ionicons name="create-outline" size={16} color="#6366F1" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            
            <View style={styles.buttonDivider} />
            
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => handleRemovePaymentMethod(method._id)}
              disabled={removingMethodId === method._id}
            >
              {removingMethodId === method._id ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.removeButtonText}>Remove</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#10B981" />
            <Text style={styles.verifiedText}>Verified • {provider.processingTime}</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const ProviderCard = ({ provider, isAvailable = true }) => {
    const userHasProvider = paymentMethods.some(method => method.provider === provider.id);

    return (
      <TouchableOpacity 
        style={[
          styles.providerCard,
          !isAvailable && styles.providerCardDisabled,
          userHasProvider && styles.providerCardAdded,
        ]}
        onPress={() => isAvailable && !userHasProvider && openAddModal(provider)}
        disabled={!isAvailable || userHasProvider}
        activeOpacity={0.7}
      >
        <View style={styles.providerCardContent}>
          <View style={[styles.providerIcon, { backgroundColor: provider.backgroundColor }]}>
            <Ionicons name={provider.icon} size={24} color={provider.color} />
          </View>
          
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{provider.name}</Text>
            <Text style={styles.providerStatus}>
              {userHasProvider ? '✓ Added' : isAvailable ? 'Available' : 'Coming Soon'}
            </Text>
            <Text style={styles.providerProcessing}>{provider.processingTime}</Text>
          </View>
          
          {userHasProvider ? (
            <View style={styles.addedIndicator}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
          ) : (
            <View style={styles.addIcon}>
              <Ionicons name="add-circle" size={20} color={isAvailable ? "#6366F1" : "#9CA3AF"} />
            </View>
          )}
        </View>
        
        {!isAvailable && (
          <View style={styles.comingSoonOverlay}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Payment Methods" 
        showBackButton={true}
        rightComponent={
          paymentMethods.length > 0 && (
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={() => openAddModal(null)}
            >
              <Ionicons name="add" size={20} color="#6366F1" />
              <Text style={styles.headerActionText}>Add</Text>
            </TouchableOpacity>
          )
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
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >
        {/* Welcome Section */}
        <Animated.View 
          style={[
            styles.welcomeSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
         
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeTitle}>Payment Methods</Text>
            <Text style={styles.welcomeSubtitle}>
              Securely Add Payment Methods to receive your Earnings
            </Text>
          </View>
        </Animated.View>

        {/* Default Method Section */}
        {paymentMethods.length > 0 && (
          <View style={styles.defaultSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Default Payment Method</Text>
              <View style={styles.defaultIndicatorLarge}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.defaultIndicatorText}>Default</Text>
              </View>
            </View>
            
            {paymentMethods
              .filter(method => method.isDefault)
              .map(method => (
                <PaymentMethodCard key={method._id} method={method} index={0} />
              ))
            }
            
            {paymentMethods.filter(method => method.isDefault).length === 0 && (
              <View style={styles.noDefault}>
                <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                <Text style={styles.noDefaultText}>No default payment method set</Text>
                <TouchableOpacity style={styles.setDefaultPrompt}>
                  <Text style={styles.setDefaultPromptText}>Set one as default</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Payment Methods List */}
        {paymentMethods.length > 0 && (
          <View style={styles.methodsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Payment Methods</Text>
              <Text style={styles.methodCount}>{paymentMethods.length} methods</Text>
            </View>
            
            {paymentMethods
              .map((method, index) => (
                <PaymentMethodCard key={method._id} method={method} index={index + 1} />
              ))
            }
          </View>
        )}

        {/* Available Providers
        <View style={styles.providersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Add Payment Method</Text>
            <Text style={styles.sectionSubtitle}>Choose from available options</Text>
          </View>
          
          <View style={styles.providersGrid}>
            {Object.values(PROVIDERS).map(provider => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </View>
        </View> */}

        {/* Security & Information 
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Secure Payments</Text>
              <Text style={styles.infoText}>
                Your payment information is encrypted and secure. We use bank-level security to protect your data.
              </Text>
            </View>
          </View>
          
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#6366F1" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Processing Times</Text>
              <Text style={styles.infoText}>
                Mobile money transfers are instant. Bank transfers may take 1-3 business days to process.
              </Text>
            </View>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoRow}>
            <Ionicons name="help-circle-outline" size={20} color="#8B5CF6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Need Help?</Text>
              <Text style={styles.infoText}>
                Visit our Help Center or contact support for assistance with payment methods.
              </Text>
            </View>
          </View>
        </View>
        */}

        {/* Empty State */}
        {paymentMethods.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIllustration}>
              <Ionicons name="wallet-outline" size={64} color="#E5E7EB" />
            </View>
            <Text style={styles.emptyTitle}>No payment methods yet</Text>
            <Text style={styles.emptyDescription}>
              Add a payment method to start  receiving your Earnings securely.
            </Text>
            <TouchableOpacity 
              style={styles.emptyActionButton}
              onPress={() => openAddModal(null)}
            >
              <Text style={styles.emptyActionText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <PaymentMethodForm
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedProvider(null);
        }}
        onSubmit={handleAddPaymentMethod}
        loading={loading}
        isEdit={false}
        selectedProvider={selectedProvider}
      />

      <PaymentMethodForm
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingMethod(null);
          setSelectedProvider(null);
        }}
        onSubmit={handleUpdatePaymentMethod}
        loading={loading}
        initialData={editingMethod}
        isEdit={true}
        selectedProvider={selectedProvider}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },

  // Header Action
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    gap: 6,
  },
  headerActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },

  // Welcome Section
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },

  // Default Section
  defaultSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  defaultIndicatorLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  defaultIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  noDefault: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  noDefaultText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  setDefaultPrompt: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
  },
  setDefaultPromptText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },

  // Methods Section
  methodsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  methodCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Payment Method Card
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  cardLeftSection: {
    flexDirection: 'row',
    flex: 1,
  },
  providerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardRightSection: {
    marginLeft: 12,
  },
  defaultIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setDefaultButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  cardFooter: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  buttonDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },

  // Providers Section
  providersSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  providersGrid: {
    gap: 12,
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    position: 'relative',
  },
  providerCardDisabled: {
    opacity: 0.6,
  },
  providerCardAdded: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  providerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  providerStatus: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  providerProcessing: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  addedIndicator: {
    marginLeft: 12,
  },
  addIcon: {
    marginLeft: 12,
  },
  comingSoonOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Info Section
  infoSection: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    margin: 20,
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
    marginLeft: 32,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    paddingHorizontal: 20,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyActionButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentMethodScreen;