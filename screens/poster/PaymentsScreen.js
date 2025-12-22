// screens/poster/PaymentsScreen.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import { AuthContext } from '../../context/AuthContext';
import { getClientPayments } from '../../api/paymentApi';
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { width, height } = Dimensions.get('window');

// Simple status config
const getStatusConfig = (status) => {
  const configs = {
    'released': { color: '#10B981', icon: 'checkmark-circle', label: 'Paid', bgColor: '#F0FDF4' },
    'in_escrow': { color: '#F59E0B', icon: 'lock-closed', label: 'In Escrow', bgColor: '#FFFBEB' },
    'pending': { color: '#6366F1', icon: 'time', label: 'Processing', bgColor: '#EEF2FF' },
    'refunded': { color: '#8B5CF6', icon: 'arrow-back', label: 'Refunded', bgColor: '#FAF5FF' },
    'failed': { color: '#EF4444', icon: 'close-circle', label: 'Failed', bgColor: '#FEF2F2' }
  };
  return configs[status] || configs.pending;
};

const PaymentsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('all'); // Changed from 'month' to 'all'
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [referenceModalVisible, setReferenceModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Simple task title resolver
  const getTaskTitle = (payment) => {
    // Handle null taskId
    if (!payment.taskId) {
      return payment.reference ? `Payment ${payment.reference.substring(0, 8)}...` : 'Direct Payment';
    }

    const task = payment.taskId;
    
    if (task.title) {
      return task.title;
    }
    
    if (task.description) {
      const words = task.description.split(' ').slice(0, 5).join(' ');
      return words + (task.description.split(' ').length > 5 ? '...' : '');
    }
    
    return payment.reference ? `Payment ${payment.reference.substring(0, 8)}...` : 'Task Payment';
  };

  // Simple reference display
  const getPaymentReference = (payment) => {
    return payment.reference || payment.transactionRef || payment._id || 'N/A';
  };

  const showReferenceModal = (payment) => {
    setSelectedPayment(payment);
    setReferenceModalVisible(true);
  };

  // Simple filtering
  const filterPaymentsByTimeRange = (payments, range) => {
    const now = moment();
    switch (range) {
      case 'week':
        return payments.filter(payment => 
          moment(payment.createdAt).isAfter(moment().subtract(1, 'week'))
        );
      case 'month':
        return payments.filter(payment => 
          moment(payment.createdAt).isAfter(moment().subtract(1, 'month'))
        );
      case 'year':
        return payments.filter(payment => 
          moment(payment.createdAt).isAfter(moment().subtract(1, 'year'))
        );
      default:
        return payments;
    }
  };

  const filterPaymentsByStatus = (payments, status) => {
    if (status === 'all') return payments;
    return payments.filter(payment => payment.status === status);
  };

  // Simple payment statistics
  const paymentStats = useMemo(() => {
    const timeFiltered = filterPaymentsByTimeRange(payments, timeRange);
    const statusFiltered = filterPaymentsByStatus(timeFiltered, statusFilter);
    
    const totalSpent = timeFiltered.reduce((sum, payment) => sum + payment.amount, 0);
    const releasedAmount = timeFiltered
      .filter(p => p.status === 'released')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const escrowAmount = timeFiltered
      .filter(p => p.status === 'in_escrow')
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    const totalTasks = timeFiltered.length;
    const completedTasks = timeFiltered.filter(p => p.status === 'released').length;

    return {
      totalSpent,
      releasedAmount,
      escrowAmount,
      totalTasks,
      completedTasks,
      filteredPayments: statusFiltered,
      allPayments: timeFiltered
    };
  }, [payments, timeRange, statusFilter]);

  const fetchPayments = async () => {
    try {
      const response = await getClientPayments(); 
      if(response.status === 200){
        
        setPayments(response.data || []);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      Alert.alert('Error', 'Failed to load payment data');
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const PaymentItem = ({ payment, index }) => {
    const statusConfig = getStatusConfig(payment.status);
    const taskTitle = getTaskTitle(payment);
    const paymentReference = getPaymentReference(payment);

    return (
      <View style={styles.paymentItem}>
        <TouchableOpacity onPress={() => showReferenceModal(payment)} style={styles.paymentLeft}>
          <View style={[styles.paymentIcon, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons name={statusConfig.icon} size={20} color={statusConfig.color} />
          </View>
          
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTask} numberOfLines={2}>
              {taskTitle}
            </Text>
            
            <View style={styles.paymentMeta}>
              <Text style={styles.paymentDate}>
                {moment(payment.createdAt).format('MMM D, YYYY • h:mm A')}
              </Text>
            </View>
            
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentMethod}>
                {payment.paymentMethod === 'momo' ? 'Mobile Money' : 
                 payment.paymentMethod === 'mobile_money' ? 'Mobile Money' : 
                 payment.paymentMethod || 'N/A'}
              </Text>
              
              <TouchableOpacity 
                style={styles.referenceContainer}
                onPress={() => showReferenceModal(payment)}
              >
                <Ionicons name="document-text" size={12} color="#6B7280" />
                <Text style={styles.transactionRef}>
                  Ref: {paymentReference.substring(0, 12)}...
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.paymentRight}>
          <Text style={[
            styles.amountText,
            payment.status === 'refunded' && styles.amountRefunded,
            payment.status === 'failed' && styles.amountFailed
          ]}>
            {payment.status === 'refunded' ? '+' : '-'}₵{payment.amount.toLocaleString()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const ReferenceModal = () => {
    if (!selectedPayment) return null;

    const statusConfig = getStatusConfig(selectedPayment.status);

    return (
      <Modal
        visible={referenceModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReferenceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setReferenceModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.referenceLabel}>Reference ID:</Text>
                <Text style={styles.referenceValue}>
                  {getPaymentReference(selectedPayment)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.referenceLabel}>Task:</Text>
                <Text style={styles.referenceValue}>
                  {getTaskTitle(selectedPayment)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.referenceLabel}>Amount:</Text>
                <Text style={[styles.referenceValue, styles.amountHighlight]}>
                  ₵{selectedPayment.amount.toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.referenceLabel}>Date:</Text>
                <Text style={styles.referenceValue}>
                  {moment(selectedPayment.createdAt).format('MMMM D, YYYY [at] h:mm A')}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.referenceLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                  <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>

              {selectedPayment.paymentMethod && (
                <View style={styles.detailRow}>
                  <Text style={styles.referenceLabel}>Payment Method:</Text>
                  <Text style={styles.referenceValue}>
                    {selectedPayment.paymentMethod === 'momo' ? 'Mobile Money' : 
                     selectedPayment.paymentMethod === 'mobile_money' ? 'Mobile Money' : 
                     selectedPayment.paymentMethod}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setReferenceModalVisible(false)}
              >
                <Text style={styles.closeModalText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const TimeRangeFilter = () => (
    <View style={styles.timeFilter}>
      {[
        { key: 'week', label: 'Week', icon: 'calendar-outline' },
        { key: 'month', label: 'Month', icon: 'calendar' },
        { key: 'year', label: 'Year', icon: 'business-outline' },
        { key: 'all', label: 'All Time', icon: 'time-outline' }
      ].map((range) => (
        <TouchableOpacity
          key={range.key}
          style={[
            styles.timeFilterButton,
            timeRange === range.key && styles.timeFilterButtonActive
          ]}
          onPress={() => setTimeRange(range.key)}
        >
          <Ionicons 
            name={range.icon} 
            size={14} 
            color={timeRange === range.key ? '#FFFFFF' : '#6366F1'} 
          />
          <Text style={[
            styles.timeFilterText,
            timeRange === range.key && styles.timeFilterTextActive
          ]}>
            {range.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const StatusFilter = () => {
    // Calculate counts for each status
    const statusCounts = {
      all: paymentStats.allPayments.length,
      released: paymentStats.allPayments.filter(p => p.status === 'released').length,
      in_escrow: paymentStats.allPayments.filter(p => p.status === 'in_escrow').length,
      pending: paymentStats.allPayments.filter(p => p.status === 'pending').length,
      refunded: paymentStats.allPayments.filter(p => p.status === 'refunded').length,
      failed: paymentStats.allPayments.filter(p => p.status === 'failed').length,
    };

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statusFilter}
      >
        {[
          { key: 'all', label: 'All Payments' },
          { key: 'released', label: 'Paid' },
          { key: 'in_escrow', label: 'Escrow' },
          { key: 'pending', label: 'Processing' },
          { key: 'refunded', label: 'Refunded' },
          { key: 'failed', label: 'Failed' },
        ].map((status) => (
          <TouchableOpacity
            key={status.key}
            style={[
              styles.statusFilterButton,
              statusFilter === status.key && styles.statusFilterButtonActive
            ]}
            onPress={() => setStatusFilter(status.key)}
          >
            <Text style={[
              styles.statusFilterText,
              statusFilter === status.key && styles.statusFilterTextActive
            ]}>
              {status.label}
            </Text>
            <View style={[
              styles.statusCountBadge,
              statusFilter === status.key && styles.statusCountBadgeActive
            ]}>
              <Text style={[
                styles.statusCountText,
                statusFilter === status.key && styles.statusCountTextActive
              ]}>
                {statusCounts[status.key] || 0}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="My Payments" showBackButton={true} />
        <LoadingIndicator text='Loading your payments...' />
      </SafeAreaView>
    );
  }

  const displayedPayments = showAllPayments ? 
    paymentStats.filteredPayments : 
    paymentStats.filteredPayments.slice(0, 10);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      <Header 
        title="My Payments" 
        showBackButton={true}
      />
      
      <ScrollView 
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
        {/* Spending Overview */}
        <View style={styles.spendingHeader}>
          <View style={styles.spendingOverview}>
            <Text style={styles.spendingLabel}>Total Spent</Text>
            <Text style={styles.spendingAmount}>
              ₵{paymentStats.totalSpent.toLocaleString()}
            </Text>
            
            <View style={styles.spendingBreakdown}>
              <View style={styles.spendingItem}>
                <View style={[styles.spendingDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.spendingText}>
                  Paid Out: ₵{paymentStats.releasedAmount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.spendingItem}>
                <View style={[styles.spendingDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.spendingText}>
                  In Escrow: ₵{paymentStats.escrowAmount.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.spendingVisual}>
            <Ionicons name="card" size={48} color="#FFFFFF" opacity={0.8} />
          </View>
        </View>

        {/* Time Filter */}
        <TimeRangeFilter />

        {/* Status Filter */}
        <StatusFilter />

        {/* Stats Summary */}
        <View style={styles.statsSummary}>
          <View style={styles.statItem}>
            <Ionicons name="briefcase" size={24} color="#6366F1" />
            <View style={styles.statItemContent}>
              <Text style={styles.statItemLabel}>Total Tasks</Text>
              <Text style={styles.statItemValue}>{paymentStats.totalTasks}</Text>
            </View>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="checkmark-done" size={24} color="#10B981" />
            <View style={styles.statItemContent}>
              <Text style={styles.statItemLabel}>Completed</Text>
              <Text style={styles.statItemValue}>{paymentStats.completedTasks}</Text>
            </View>
          </View>
        </View>

        {/* Payment History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="receipt" size={20} color="#6366F1" />
              <Text style={styles.sectionTitle}>
                Payment History ({paymentStats.filteredPayments.length})
              </Text>
            </View>
            {paymentStats.filteredPayments.length > 10 && (
              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={() => setShowAllPayments(!showAllPayments)}
              >
                <Text style={styles.toggleButtonText}>
                  {showAllPayments ? 'Show Less' : 'View All'}
                </Text>
                <Ionicons 
                  name={showAllPayments ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#6366F1" 
                />
              </TouchableOpacity>
            )}
          </View>

          {displayedPayments.length > 0 ? (
            <View style={styles.paymentsList}>
              {displayedPayments.map((payment, index) => (
                <PaymentItem key={payment._id || index} payment={payment} index={index} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No Payments Found</Text>
              <Text style={styles.emptyStateText}>
                {timeRange !== 'all' || statusFilter !== 'all'
                  ? 'No payments match your current filters'
                  : 'Your payment history will appear here when you make payments'
                }
              </Text>
              <TouchableOpacity 
                style={styles.createTaskButton}
                onPress={() => navigation.navigate('CreateTask')}
              >
                <Text style={styles.createTaskText}>Create Your First Task</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Reference Modal */}
      <ReferenceModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  spendingHeader: {
    padding: 24,
    paddingTop: 32,
    borderRadius: 22,
    marginHorizontal: 12,
    backgroundColor: '#6366F1',
    marginBottom: 8,
  },
  spendingOverview: {
    flex: 1,
  },
  spendingLabel: {
    fontSize: 14,
    color: '#E5E7EB',
    fontWeight: '500',
    marginBottom: 8,
  },
  spendingAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  spendingBreakdown: {
    gap: 8,
  },
  spendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spendingText: {
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  spendingVisual: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  timeFilter: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  timeFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  timeFilterButtonActive: {
    backgroundColor: '#6366F1',
  },
  timeFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeFilterTextActive: {
    color: '#FFFFFF',
  },
  statusFilter: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  statusFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
    gap: 8,
  },
  statusFilterButtonActive: {
    backgroundColor: '#6366F1',
  },
  statusFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusFilterTextActive: {
    color: '#FFFFFF',
  },
  statusCountBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
  },
  statusCountBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  statusCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  statusCountTextActive: {
    color: '#6366F1',
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    flex: 1,
    marginHorizontal: 8,
    gap: 12,
  },
  statItemContent: {
    flex: 1,
  },
  statItemLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  statItemValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    gap: 4,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  paymentsList: {
    padding: 4,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTask: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  paymentMeta: {
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  paymentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  paymentMethod: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transactionRef: {
    fontSize: 10,
    color: '#6B7280',
  },
  paymentRight: {
    alignItems: 'flex-end',
    minWidth: 90,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 6,
    textAlign: 'right',
  },
  amountRefunded: {
    color: '#10B981',
  },
  amountFailed: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createTaskButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createTaskText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: height * 0.5,
    padding: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  referenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  referenceValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  amountHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#EF4444',
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  closeModalButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default PaymentsScreen;