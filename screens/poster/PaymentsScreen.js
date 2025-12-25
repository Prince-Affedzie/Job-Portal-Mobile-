// screens/poster/PaymentsScreen.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  StatusBar,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import { AuthContext } from '../../context/AuthContext';
import { getClientPayments } from '../../api/paymentApi';
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { width, height } = Dimensions.get('window');

// Enhanced status config
const getStatusConfig = (status) => {
  const configs = {
    'released': { 
      color: '#10B981', 
      icon: 'checkmark-circle', 
      label: 'Paid', 
      bgColor: '#F0FDF4',
      lightColor: '#D1FAE5',
      textColor: '#065F46'
    },
    'in_escrow': { 
      color: '#F59E0B', 
      icon: 'lock-closed', 
      label: 'In Escrow', 
      bgColor: '#FFFBEB',
      lightColor: '#FEF3C7',
      textColor: '#92400E'
    },
    'pending': { 
      color: '#6366F1', 
      icon: 'time', 
      label: 'Processing', 
      bgColor: '#EEF2FF',
      lightColor: '#E0E7FF',
      textColor: '#3730A3'
    },
    'refunded': { 
      color: '#8B5CF6', 
      icon: 'arrow-back', 
      label: 'Refunded', 
      bgColor: '#FAF5FF',
      lightColor: '#EDE9FE',
      textColor: '#5B21B6'
    },
    'failed': { 
      color: '#EF4444', 
      icon: 'close-circle', 
      label: 'Failed', 
      bgColor: '#FEF2F2',
      lightColor: '#FECACA',
      textColor: '#7F1D1D'
    }
  };
  return configs[status] || configs.pending;
};

const PaymentsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [referenceModalVisible, setReferenceModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Enhanced task title resolver
  const getTaskTitle = (payment) => {
    if (!payment.taskId) {
      return payment.reference ? `Payment ${payment.reference.substring(0, 8)}...` : 'Direct Payment';
    }

    const task = payment.taskId;
    
    if (task.title) {
      return task.title;
    }
    
    if (task.type) {
      return task.type;
    }
    
    if (task.description) {
      const words = task.description.split(' ').slice(0, 4).join(' ');
      return words + (task.description.split(' ').length > 4 ? '...' : '');
    }
    
    return payment.reference ? `Payment ${payment.reference.substring(0, 8)}...` : 'Task Payment';
  };

  // Get task type or category
  const getTaskType = (payment) => {
    if (!payment.taskId) return 'Payment';
    
    const task = payment.taskId;
    return task.type || task.category || 'Service';
  };

  // Get tasker name
  const getTaskerName = (payment) => {
    if (payment.taskId?.assignedTasker?.name) {
      return payment.taskId.assignedTasker.name;
    }
    if (payment.beneficiary?.name) {
      return payment.beneficiary.name;
    }
    return 'Tasker';
  };

  // Get tasker image
  const getTaskerImage = (payment) => {
    if (payment.taskId?.assignedTasker?.profileImage) {
      return payment.taskId.assignedTasker.profileImage;
    }
    if (payment.beneficiary?.profileImage) {
      return payment.beneficiary.profileImage;
    }
    return null;
  };

  const getPaymentReference = (payment) => {
    return payment.reference || payment.transactionRef || payment._id || 'N/A';
  };

  const showReferenceModal = (payment) => {
    setSelectedPayment(payment);
    setReferenceModalVisible(true);
  };

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
    const refundedAmount = timeFiltered
      .filter(p => p.status === 'refunded')
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    const totalTasks = timeFiltered.length;
    const completedTasks = timeFiltered.filter(p => p.status === 'released').length;

    return {
      totalSpent,
      releasedAmount,
      escrowAmount,
      refundedAmount,
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

  // Card Component for Payment
  const PaymentCard = ({ payment, index }) => {
    const statusConfig = getStatusConfig(payment.status);
    const taskTitle = getTaskTitle(payment);
    const taskType = getTaskType(payment);
    const taskerName = getTaskerName(payment);
    const taskerImage = getTaskerImage(payment);
    const paymentReference = getPaymentReference(payment);
    const isRefund = payment.status === 'refunded';
    const isFailed = payment.status === 'failed';

    return (
      <View style={styles.paymentCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.statusIndicator, { backgroundColor: statusConfig.lightColor }]}>
              <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
            </View>
            <View>
              <Text style={styles.taskType}>{taskType}</Text>
              <Text style={[styles.statusLabel, { color: statusConfig.textColor }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <View style={styles.cardHeaderRight}>
            <Text style={[
              styles.amount,
              isRefund && styles.amountRefund,
              isFailed && styles.amountFailed
            ]}>
              {isRefund ? '+' : isFailed ? '-' : '-'}₵{payment.amount.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {taskTitle}
          </Text>
          
          {/* Tasker Info */}
          <View style={styles.taskerContainer}>
            {taskerImage ? (
              <Image source={{ uri: taskerImage }} style={styles.taskerAvatar} />
            ) : (
              <View style={styles.taskerAvatarFallback}>
                <Text style={styles.taskerInitial}>{taskerName[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.taskerInfo}>
              <Text style={styles.taskerNameText}>{taskerName}</Text>
              <Text style={styles.taskerRole}>Tasker</Text>
            </View>
          </View>
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={12} color="#6B7280" />
              <Text style={styles.dateText}>
                {moment(payment.createdAt).format('MMM D, YYYY')}
              </Text>
            </View>
            <View style={styles.methodContainer}>
              <Ionicons 
                name={payment.paymentMethod === 'momo' ? 'phone-portrait' : 'card'} 
                size={12} 
                color="#6B7280" 
              />
              <Text style={styles.methodText}>
                {payment.paymentMethod === 'momo' ? 'Mobile Money' : 
                 payment.paymentMethod === 'card' ? 'Card' : 
                 payment.paymentMethod || 'Payment'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.referenceButton}
            onPress={() => showReferenceModal(payment)}
          >
            <Ionicons name="document-text" size={14} color="#6366F1" />
            <Text style={styles.referenceButtonText}>Details</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar for In Escrow */}
        {payment.status === 'in_escrow' && (
          <View style={styles.escrowProgress}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
            <Text style={styles.progressText}>Payment held securely in escrow</Text>
          </View>
        )}

        {/* Refund Badge */}
        {payment.status === 'refunded' && (
          <View style={styles.refundBadge}>
            <Ionicons name="refresh" size={12} color="#8B5CF6" />
            <Text style={styles.refundText}>Refunded to your account</Text>
          </View>
        )}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setReferenceModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailCard}>
                <View style={[styles.detailHeader, { backgroundColor: statusConfig.lightColor }]}>
                  <Ionicons name={statusConfig.icon} size={24} color={statusConfig.color} />
                  <Text style={[styles.detailStatus, { color: statusConfig.textColor }]}>
                    {statusConfig.label}
                  </Text>
                </View>
                
                <View style={styles.detailContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reference ID</Text>
                    <Text style={styles.detailValue}>
                      {getPaymentReference(selectedPayment)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Task Title</Text>
                    <Text style={styles.detailValue}>
                      {getTaskTitle(selectedPayment)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tasker</Text>
                    <Text style={styles.detailValue}>
                      {getTaskerName(selectedPayment)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={[styles.detailValue, styles.detailAmount]}>
                      ₵{selectedPayment.amount.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {moment(selectedPayment.createdAt).format('MMMM D, YYYY [at] h:mm A')}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment Method</Text>
                    <Text style={styles.detailValue}>
                      {selectedPayment.paymentMethod === 'momo' ? 'Mobile Money' : 
                       selectedPayment.paymentMethod === 'card' ? 'Credit/Debit Card' : 
                       selectedPayment.paymentMethod || 'Not specified'}
                    </Text>
                  </View>

                  {selectedPayment.updatedAt && selectedPayment.updatedAt !== selectedPayment.createdAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Last Updated</Text>
                      <Text style={styles.detailValue}>
                        {moment(selectedPayment.updatedAt).format('MMMM D, YYYY [at] h:mm A')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

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
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.timeFilterScroll}
    >
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
              size={16} 
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
    </ScrollView>
  );

  const StatusFilter = () => {
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
        style={styles.statusFilterScroll}
      >
        <View style={styles.statusFilter}>
          {[
            { key: 'all', label: 'All Payments', icon: 'layers' },
            { key: 'released', label: 'Paid', icon: 'checkmark-circle' },
            { key: 'in_escrow', label: 'Escrow', icon: 'lock-closed' },
            { key: 'pending', label: 'Processing', icon: 'time' },
            { key: 'refunded', label: 'Refunded', icon: 'refresh' },
            { key: 'failed', label: 'Failed', icon: 'close-circle' },
          ].map((status) => (
            <TouchableOpacity
              key={status.key}
              style={[
                styles.statusFilterButton,
                statusFilter === status.key && styles.statusFilterButtonActive
              ]}
              onPress={() => setStatusFilter(status.key)}
            >
              <Ionicons 
                name={status.icon} 
                size={14} 
                color={statusFilter === status.key ? '#FFFFFF' : '#6B7280'} 
              />
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
        </View>
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
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats Overview Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="cash" size={24} color="#6366F1" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>
                ₵{paymentStats.totalSpent.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="checkmark-done" size={24} color="#10B981" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Paid Out</Text>
              <Text style={styles.statValue}>
                ₵{paymentStats.releasedAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="lock-closed" size={24} color="#F59E0B" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>In Escrow</Text>
              <Text style={styles.statValue}>
                ₵{paymentStats.escrowAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FAF5FF' }]}>
              <Ionicons name="refresh" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Refunded</Text>
              <Text style={styles.statValue}>
                ₵{paymentStats.refundedAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Time Range</Text>
          <TimeRangeFilter />
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Payment Status</Text>
          <StatusFilter />
        </View>

        {/* Payment History */}
        <View style={styles.paymentsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="receipt" size={22} color="#6366F1" />
              <View>
                <Text style={styles.sectionTitle}>Payment History</Text>
                <Text style={styles.sectionSubtitle}>
                  {paymentStats.filteredPayments.length} payments found
                </Text>
              </View>
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
            <View style={styles.paymentsGrid}>
              {displayedPayments.map((payment, index) => (
                <PaymentCard key={payment._id || index} payment={payment} index={index} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="card-outline" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyStateTitle}>No Payments Found</Text>
              <Text style={styles.emptyStateText}>
                {timeRange !== 'all' || statusFilter !== 'all'
                  ? 'No payments match your current filters'
                  : 'Your payment history will appear here'
                }
              </Text>
              <TouchableOpacity 
                style={styles.createTaskButton}
                onPress={() => navigation.navigate('CreateTask')}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.createTaskText}>Create a Task</Text>
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
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    flex: 1,
    minWidth: width / 2 - 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Filter Section
  filterSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  timeFilterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  timeFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  timeFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 6,
    minWidth: 90,
  },
  timeFilterButtonActive: {
    backgroundColor: '#6366F1',
  },
  timeFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeFilterTextActive: {
    color: '#FFFFFF',
  },

  statusFilterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  statusFilter: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  statusFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  statusFilterButtonActive: {
    backgroundColor: '#6366F1',
  },
  statusFilterText: {
    fontSize: 13,
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
    borderRadius: 8,
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

  // Payments Section
  paymentsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    gap: 4,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },

  // Payment Cards Grid
  paymentsGrid: {
    gap: 16,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskType: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  cardHeaderRight: {},
  amount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#EF4444',
  },
  amountRefund: {
    color: '#10B981',
  },
  amountFailed: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },

  cardBody: {
    marginBottom: 16,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    lineHeight: 22,
  },
  taskerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  taskerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskerInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  taskerInfo: {
    flex: 1,
  },
  taskerNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  taskerRole: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  methodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  methodText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  referenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    gap: 6,
  },
  referenceButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },

  // Special Elements
  escrowProgress: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    textAlign: 'center',
  },
  refundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  refundText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 8,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 300,
  },
  createTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createTaskText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  bottomPadding: {
    height: 30,
  },

  // Modal Styles
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
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  detailStatus: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailContent: {
    padding: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailAmount: {
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