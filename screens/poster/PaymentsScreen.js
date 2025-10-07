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
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import { AuthContext } from '../../context/AuthContext';
import { getClientPayments } from '../../api/paymentApi'; // You'll need to create this API
import LoadingIndicator from '../../component/common/LoadingIndicator'


const { width, height } = Dimensions.get('window');

const PaymentsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('month'); // 'all', 'week', 'month', 'year'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'released', 'in_escrow', 'pending', 'refunded'
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [statsAnim] = useState(new Animated.Value(0));

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

   const getPreviousPeriod = (currentRange) => {
    switch (currentRange) {
      case 'week': return 'week';
      case 'month': return 'month';
      case 'year': return 'year';
      default: return 'all';
    }
  };

  // Calculate payment statistics
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
    const activeTasks = timeFiltered.filter(p => p.status === 'in_escrow' || p.status === 'pending').length;
    
    // Calculate growth compared to previous period
    const previousPeriodPayments = filterPaymentsByTimeRange(
      payments, 
      getPreviousPeriod(timeRange)
    );
    const previousSpent = previousPeriodPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const spendingGrowth = previousSpent > 0 ? 
      ((totalSpent - previousSpent) / previousSpent * 100).toFixed(1) : 0;
    
    // Status breakdown
    const statusCounts = {
      released: timeFiltered.filter(p => p.status === 'released').length,
      in_escrow: timeFiltered.filter(p => p.status === 'in_escrow').length,
      pending: timeFiltered.filter(p => p.status === 'pending').length,
      refunded: timeFiltered.filter(p => p.status === 'refunded').length,
      failed: timeFiltered.filter(p => p.status === 'failed').length,
    };

    return {
      totalSpent,
      releasedAmount,
      escrowAmount,
      refundedAmount,
      totalTasks,
      completedTasks,
      activeTasks,
      spendingGrowth: Math.max(0, spendingGrowth),
      isPositiveGrowth: spendingGrowth >= 0,
      filteredPayments: statusFiltered,
      statusCounts,
      allPayments: timeFiltered
    };
  }, [payments, timeRange, statusFilter]);

 

  const fetchPayments = async () => {
    try {
      const response = await getClientPayments(); // API to get payments where user is initiator
      setPayments(response.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      Alert.alert('Error', 'Failed to load payment data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const StatCard = ({ title, value, subtitle, icon, color, gradient, isCurrency = false }) => (
    <Animated.View 
      style={[
        styles.statCard, 
        { 
          transform: [{
            translateY: statsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        }
      ]}
    >
      <LinearGradient
        colors={gradient || ['#FFFFFF', '#F8FAFC']}
        style={[styles.statGradient, { borderLeftColor: color, borderLeftWidth: 4 }]}
      >
        <View style={styles.statHeader}>
          <View style={[styles.statIcon, { backgroundColor: color }]}>
            <Ionicons name={icon} size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
        <Text style={styles.statValue}>
          {isCurrency ? '₵' : ''}{typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        <Text style={styles.statSubtitle}>{subtitle}</Text>
      </LinearGradient>
    </Animated.View>
  );

  const PaymentItem = ({ payment, index }) => {
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

  const statusConfig = getStatusConfig(payment.status);

  return (
    <Animated.View 
      style={[
        styles.paymentItem,
        {
          opacity: fadeAnim,
          transform: [{
            translateX: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        }
      ]}
    >
      <View style={styles.paymentLeft}>
        <View style={[styles.paymentIcon, { backgroundColor: statusConfig.bgColor }]}>
          <Ionicons name={statusConfig.icon} size={20} color={statusConfig.color} />
        </View>
        
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTask} numberOfLines={1}>
            {payment.taskId?.title || `Task Payment`}
          </Text>
          
          {/* Date and Status in separate rows to prevent overlapping */}
          <View style={styles.paymentMeta}>
            <Text style={styles.paymentDate} numberOfLines={1}>
              {moment(payment.createdAt).format('MMM D, YYYY • h:mm A')}
            </Text>
          </View>
          
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentMethod} numberOfLines={1}>
              {getPaymentMethodLabel(payment.paymentMethod)}
            </Text>
            {payment.transactionRef && (
              <Text style={styles.transactionRef} numberOfLines={1}>
                Ref: {payment.transactionRef}
              </Text>
            )}
          </View>
        </View>
      </View>
      
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
    </Animated.View>
  );
};

  const getPaymentMethodLabel = (method) => {
    const labels = {
      'mobile_money': 'Mobile Money',
      'card': 'Credit/Debit Card',
      'bank': 'Bank Transfer',
      'wallet': 'Digital Wallet'
    };
    return labels[method] || method;
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

  const StatusFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.statusFilter}
      contentContainerStyle={styles.statusFilterContent}
    >
      {[
        { key: 'all', label: 'All Payments', count: paymentStats.allPayments.length },
        { key: 'released', label: 'Paid', count: paymentStats.statusCounts.released },
        { key: 'in_escrow', label: 'Escrow', count: paymentStats.statusCounts.in_escrow },
        { key: 'pending', label: 'Processing', count: paymentStats.statusCounts.pending },
        { key: 'refunded', label: 'Refunded', count: paymentStats.statusCounts.refunded },
        { key: 'failed', label: 'Failed', count: paymentStats.statusCounts.failed },
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
              {status.count}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="My Payments" showBackButton={true} />
          <LoadingIndicator text='Loading your payments...'/>
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
      
      <Animated.ScrollView 
        style={{ opacity: fadeAnim }}
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
        <LinearGradient
          colors={['#4F46E5','#6366F1']}
          style={styles.spendingHeader}
        >
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
              {paymentStats.refundedAmount > 0 && (
                <View style={styles.spendingItem}>
                  <View style={[styles.spendingDot, { backgroundColor: '#8B5CF6' }]} />
                  <Text style={styles.spendingText}>
                    Refunded: ₵{paymentStats.refundedAmount.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.spendingVisual}>
            <Ionicons name="card" size={48} color="#FFFFFF" opacity={0.8} />
          </View>
        </LinearGradient>

        {/* Time Range Filter 
        <TimeRangeFilter />*/}

        {/* Status Filter */}
        <StatusFilter />

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title="Total Tasks"
              value={paymentStats.totalTasks}
              subtitle="All paid tasks"
              icon="briefcase"
              color="#6366F1"
              gradient={['#EEF2FF', '#F0F4FF']}
            />
            
            <StatCard
              title="Completed"
              value={paymentStats.completedTasks}
              subtitle="Tasks delivered"
              icon="checkmark-done"
              color="#10B981"
              gradient={['#ECFDF5', '#F0FDF9']}
            />
          </View>
          
          <View style={styles.statsRow}>
            <StatCard
              title="Active Tasks"
              value={paymentStats.activeTasks}
              subtitle="In progress"
              icon="time"
              color="#F59E0B"
              gradient={['#FFFBEB', '#FEFCE8']}
            />
            
            <StatCard
              title="Avg. per Task"
              value={(paymentStats.totalSpent / paymentStats.totalTasks || 0).toFixed(2)}
              subtitle="Average spending"
              icon="trending-up"
              color="#8B5CF6"
              gradient={['#FAF5FF', '#F3E8FF']}
              isCurrency={true}
            />
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
                  ? `No payments match your current filters`
                  : 'Your payment history will appear here when you post tasks'
                }
              </Text>
              <TouchableOpacity 
                style={styles.createTaskButton}
                onPress={() => navigation.navigate('CreateTask')}
              >
                <Text style={styles.createTaskText}>Post Your First Task</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Payment Security Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.infoTitle}>Secure Payment System</Text>
          </View>
          <Text style={styles.infoText}>
            Your payments are protected through our escrow system. Funds are only released to taskers 
            when work is completed and approved, ensuring you get quality service for your money.
          </Text>
          <View style={styles.securityFeatures}>
            <View style={styles.securityFeature}>
              <Ionicons name="lock-closed" size={16} color="#10B981" />
              <Text style={styles.securityText}>Escrow Protection</Text>
            </View>
            <View style={styles.securityFeature}>
              <Ionicons name="refresh" size={16} color="#10B981" />
              <Text style={styles.securityText}>Money-Back Guarantee</Text>
            </View>
            <View style={styles.securityFeature}>
              <Ionicons name="shield" size={16} color="#10B981" />
              <Text style={styles.securityText}>Secure Transactions</Text>
            </View>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const getTimeRangeLabel = (range) => {
  const labels = {
    'week': 'This Week',
    'month': 'This Month',
    'year': 'This Year',
    'all': 'All Time'
  };
  return labels[range] || range;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  spendingHeader: {
    padding: 24,
    paddingTop: 32,
    borderRadius:22,
    marginHorizontal:12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    marginBottom:8,
  },
  spendingOverview: {
    flex: 1,
  },
  spendingLabel: {
    fontSize: 14,
    color: '#E5E7EB',
    fontWeight: '500',
    marginBottom: 8,
    opacity: 0.9,
  },
  spendingAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  spendingBreakdown: {
    gap: 8,
    marginBottom: 16,
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
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  growthBadgeNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  growthText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
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
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  timeFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 4,
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
  },
  statusFilterContent: {
    paddingHorizontal: 4,
    gap: 8,
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
  statsGrid: {
    padding: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 100,
  },
  statGradient: {
    borderRadius: 16,
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
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
  alignItems: 'flex-start', // Changed from 'center' to 'flex-start'
  justifyContent: 'space-between',
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#F8FAFC',
  minHeight: 80, // Ensure minimum height
},
paymentLeft: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  flex: 1,
  marginRight: 12, // Add some space between left and right sections
},
paymentIcon: {
  width: 40,
  height: 40,
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
  flexShrink: 0, // Prevent icon from shrinking
},
paymentInfo: {
  flex: 1,
  minWidth: 0, // Important for text truncation to work
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
  flexWrap: 'wrap', // Allow wrapping if needed
},
paymentMethod: {
  fontSize: 11,
  color: '#9CA3AF',
  fontWeight: '500',
  backgroundColor: '#F3F4F6',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
  flexShrink: 1,
},
transactionRef: {
  fontSize: 10,
  color: '#9CA3AF',
  fontFamily: 'monospace',
  flexShrink: 1,
},
paymentRight: {
  alignItems: 'flex-end',
  minWidth: 90, // Ensure enough width for amount and status
  flexShrink: 0, // Prevent right section from shrinking
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
  alignSelf: 'flex-start', // Ensure badge doesn't stretch
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
  infoSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  securityFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  bottomPadding: {
    height: 30,
  },
});

export default PaymentsScreen;