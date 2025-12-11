// screens/tasker/EarningScreen.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
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
import { TaskerContext } from '../../context/TaskerContext';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import {requestPayment} from '../../api/paymentApi'

const { width, height } = Dimensions.get('window');

// Commission constants
const COMMISSION_PERCENTAGE = 0.12; // 12%

const EarningScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { getAllEarnings } = useContext(TaskerContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'week', 'month', 'year'
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [statsAnim] = useState(new Animated.Value(0));
  const [requestingPayment, setRequestingPayment] = useState(false);

  // Calculate commission and net amount
  const calculateCommission = (amount) => {
    const commission = Math.round(amount * COMMISSION_PERCENTAGE);
    const netAmount = amount - commission;
    return {
      gross: amount,
      commission,
      net: netAmount,
      percentage: COMMISSION_PERCENTAGE
    };
  };

  // Smart time filtering that works with future dates
  const filterPaymentsByTimeRange = (payments, range) => {
    if (range === 'all' || payments.length === 0) {
      return payments;
    }

    const now = moment();
    let startDate;

    switch (range) {
      case 'week':
        startDate = moment().subtract(1, 'week');
        break;
      case 'month':
        startDate = moment().subtract(1, 'month');
        break;
      case 'year':
        startDate = moment().subtract(1, 'year');
        break;
      default:
        return payments;
    }

    return payments.filter(payment => {
      const paymentDate = moment(payment.createdAt);
      return paymentDate.isAfter(startDate) && paymentDate.isBefore(now);
    });
  };

  // Get available time ranges based on actual data
  const getSmartTimeRangeOptions = (payments) => {
    if (payments.length === 0) return ['all'];
    
    const paymentDates = payments.map(p => moment(p.createdAt));
    const earliestDate = moment.min(paymentDates);
    const latestDate = moment.max(paymentDates);
    const dateRangeInMonths = latestDate.diff(earliestDate, 'months');
    
    const options = ['all']; // Always include 'all'
    
    // Only show time ranges that make sense for your data
    if (dateRangeInMonths >= 12) options.push('year');
    if (dateRangeInMonths >= 1) options.push('month');
    if (dateRangeInMonths >= 0.25) options.push('week');
    
    return options;
  };

  // Adaptive labels for time ranges
  const getTimeRangeDisplay = (range, payments) => {
    const defaultLabels = {
      'week': 'This Week',
      'month': 'This Month', 
      'year': 'This Year',
      'all': 'All Time'
    };
    
    // For demo data in future, show relative labels
    if (payments.length > 0) {
      const sampleDate = moment(payments[0].createdAt);
      if (sampleDate.isAfter(moment())) {
        const relativeLabels = {
          'week': 'Last 7 Days',
          'month': 'Last 30 Days',
          'year': 'Last 12 Months',
          'all': 'All Time'
        };
        return relativeLabels[range] || range;
      }
    }
    
    return defaultLabels[range] || range;
  };

  // Separate payments by status
  const { releasedPayments, escrowPayments, allPayments } = useMemo(() => {
    const released = payments.filter(payment => payment.status === 'released');
    const escrow = payments.filter(payment => payment.status === 'in_escrow' || payment.status === 'pending');
    const all = [...released, ...escrow];
    
    return {
      releasedPayments: released,
      escrowPayments: escrow,
      allPayments: all
    };
  }, [payments]);

  // Calculate earnings statistics
  const earningsStats = useMemo(() => {
    const filteredReleased = filterPaymentsByTimeRange(releasedPayments, timeRange);
    const filteredEscrow = filterPaymentsByTimeRange(escrowPayments, timeRange);
    const filteredAll = filterPaymentsByTimeRange(allPayments, timeRange);
    
    const totalReleased = filteredReleased.reduce((sum, payment) => sum + payment.amount, 0);
    const totalEscrow = filteredEscrow.reduce((sum, payment) => sum + payment.amount, 0);
    const totalEarnings = totalReleased + totalEscrow;
    
    // Calculate net amounts after commission
    const netReleased = calculateCommission(totalReleased).net;
    const netEscrow = calculateCommission(totalEscrow).net;
    const netTotal = calculateCommission(totalEarnings).net;
    const totalCommission = calculateCommission(totalEarnings).commission;
    
    const completedTasks = filteredReleased.length;
    const pendingTasks = filteredEscrow.length;
    const totalTasks = completedTasks + pendingTasks;
    const averageEarning = completedTasks > 0 ? totalReleased / completedTasks : 0;
    
    // Calculate growth compared to previous period
    const getPreviousPeriodData = () => {
      if (timeRange === 'all') return { earnings: 0, growth: 0 };
      
      let previousStart, previousEnd;
      const now = moment();
      
      switch (timeRange) {
        case 'week':
          previousStart = moment().subtract(2, 'weeks');
          previousEnd = moment().subtract(1, 'week');
          break;
        case 'month':
          previousStart = moment().subtract(2, 'months');
          previousEnd = moment().subtract(1, 'month');
          break;
        case 'year':
          previousStart = moment().subtract(2, 'years');
          previousEnd = moment().subtract(1, 'year');
          break;
        default:
          return { earnings: 0, growth: 0 };
      }
      
      const previousPayments = releasedPayments.filter(payment => {
        const paymentDate = moment(payment.createdAt);
        return paymentDate.isAfter(previousStart) && paymentDate.isBefore(previousEnd);
      });
      
      const previousEarnings = previousPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const growth = previousEarnings > 0 ? 
        ((totalReleased - previousEarnings) / previousEarnings * 100) : 
        (totalReleased > 0 ? 100 : 0);
      
      return { earnings: previousEarnings, growth };
    };
    
    const previousData = getPreviousPeriodData();
    
    return {
      totalReleased,
      totalEscrow,
      totalEarnings,
      netReleased,
      netEscrow,
      netTotal,
      totalCommission,
      completedTasks,
      pendingTasks,
      totalTasks,
      averageEarning,
      monthlyGrowth: Math.round(previousData.growth),
      releasedPayments: filteredReleased,
      escrowPayments: filteredEscrow,
      allPayments: filteredAll,
      isPositiveGrowth: previousData.growth >= 0
    };
  }, [releasedPayments, escrowPayments, allPayments, timeRange]);

  const fetchPayments = async () => {
    try {
      const response = await getAllEarnings();
      setPayments(response.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      Alert.alert('Error', 'Failed to load earnings data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to handle payment request
  const handleRequestPayment = async (reference) => {
    if (requestingPayment) return;
    
    setRequestingPayment(true);
    try {
      const response = await requestPayment(reference);
      
      if (response.status ===200) {
        Alert.alert('Success', 'Payment request submitted successfully!');
        // Refresh payments to update status
        fetchPayments();
      } else {
        Alert.alert('Error', response.message || 'Failed to request payment');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error || 'Error, Failed to submit payment request';
      console.error('Error requesting payment:', error);
      Alert.alert('Error',errorMessage);
    } finally {
      setRequestingPayment(false);
    }
  };

  // Function to confirm payment request with commission breakdown
  const confirmPaymentRequest = (payment) => {
    const commissionBreakdown = calculateCommission(payment.amount);
    
    Alert.alert(
      'Request Payment',
      `Request payment for "${payment.taskId?.title || 'Task Completed'}" job?\n\n` +
      `Gross Amount: ₵${payment.amount.toLocaleString()}\n` +
      `Platform Fee (12%): -₵${commissionBreakdown.commission.toLocaleString()}\n` +
      `Net Amount: ₵${commissionBreakdown.net.toLocaleString()}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Request Payment',
          onPress: () => handleRequestPayment(payment.transactionRef),
        },
      ]
    );
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
          borderLeftColor: color,
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
        style={styles.statGradient}
      >
        <View style={styles.statHeader}>
          <View style={[styles.statIcon, { backgroundColor: color }]}>
            <Ionicons name={icon} size={20} color="#FFFFFF" />
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
        'released': { color: '#10B981', icon: 'checkmark-circle', label: 'Released', bgColor: '#F0FDF4' },
        'in_escrow': { color: '#F59E0B', icon: 'lock-closed', label: 'In Escrow', bgColor: '#FFFBEB' },
        'pending': { color: '#6366F1', icon: 'time', label: 'Pending', bgColor: '#EEF2FF' },
        'refunded': { color: '#EF4444', icon: 'arrow-back', label: 'Refunded', bgColor: '#FEF2F2' },
        'failed': { color: '#6B7280', icon: 'close-circle', label: 'Failed', bgColor: '#F3F4F6' }
      };
      return configs[status] || configs.pending;
    };

    const statusConfig = getStatusConfig(payment.status);
    const canRequestPayment = payment.status === 'in_escrow';
    const commissionBreakdown = calculateCommission(payment.amount);

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
            <Text style={styles.paymentTask}>{payment.taskId?.title || 'Task Completed'}</Text>
            <View style={styles.paymentMeta}>
              <Text style={styles.paymentDate}>
                {moment(payment.createdAt).format('MMM D, YYYY')}
              </Text>
              {payment.reference && (
                <Text style={styles.paymentReference}>Ref: {payment.reference}</Text>
              )}
            </View>
            {/* Commission breakdown */}
            <View style={styles.commissionBreakdown}>
              <Text style={styles.commissionLabel}>Platform Fee (12%):</Text>
              <Text style={styles.commissionAmount}>-₵{commissionBreakdown.commission.toLocaleString()}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.paymentRight}>
          {/* Show both gross and net amount */}
          <View style={styles.amountContainer}>
            <Text style={styles.grossAmount}>₵{payment.amount.toLocaleString()}</Text>
            <Ionicons name="arrow-down" size={12} color="#9CA3AF" />
            <Text style={styles.netAmount}>₵{commissionBreakdown.net.toLocaleString()}</Text>
          </View>
          <View style={styles.netLabelContainer}>
            <Text style={styles.netLabel}>You receive</Text>
          </View>
          <View style={styles.paymentActions}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
            {canRequestPayment && (
              <TouchableOpacity 
                style={[
                  styles.requestButton,
                  requestingPayment && styles.requestButtonDisabled
                ]}
                onPress={() => confirmPaymentRequest(payment)}
                disabled={requestingPayment}
              >
                {requestingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="arrow-down-circle" size={14} color="#FFFFFF" />
                    <Text style={styles.requestButtonText}>Withdraw</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const TimeRangeFilter = () => {
    const availableRanges = getSmartTimeRangeOptions(payments);
    
    const rangeConfigs = [
      { key: 'week', label: 'Week', icon: 'calendar-outline' },
      { key: 'month', label: 'Month', icon: 'calendar' },
      { key: 'year', label: 'Year', icon: 'business-outline' },
      { key: 'all', label: 'All Time', icon: 'time-outline' }
    ].filter(range => availableRanges.includes(range.key));

    return (
      <View style={styles.timeFilter}>
        {rangeConfigs.map((range) => (
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
              {getTimeRangeDisplay(range.key, payments)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const WithdrawalButton = () => {
    const netReleased = calculateCommission(earningsStats.totalReleased).net;
    
    return (
      <TouchableOpacity 
        style={styles.withdrawButton}
        onPress={() => {
          if (earningsStats.totalReleased > 0) {
            const commissionBreakdown = calculateCommission(earningsStats.totalReleased);
            
            Alert.alert(
              'Withdraw Funds',
              `Available for withdrawal:\n\n` +
              `Gross Balance: ₵${earningsStats.totalReleased.toLocaleString()}\n` +
              `Platform Fee (12%): -₵${commissionBreakdown.commission.toLocaleString()}\n` +
              `Net Amount: ₵${commissionBreakdown.net.toLocaleString()}`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Proceed to Withdraw', onPress: () => Alert.alert('Success', 'Withdrawal request submitted!') }
              ]
            );
          } else {
            Alert.alert('No Funds', 'You have no released funds available for withdrawal.');
          }
        }}
      >
        <Ionicons name="arrow-down-circle" size={20} color="#FFFFFF" />
        <Text style={styles.withdrawText}>Withdraw</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="My Earnings" showBackButton={true} />
        <LoadingIndicator text='Loading your Earnings...'/>
      </SafeAreaView>
    );
  }

  const displayedPayments = showAllPayments ? 
    earningsStats.allPayments : 
    earningsStats.allPayments.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="My Earnings" 
        showBackButton={true}
       // rightComponent={<WithdrawalButton />}
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
        {/* Earnings Overview */}
        <LinearGradient
          colors={['#4F46E5','#6366F1']}
          style={styles.earningsHeader}
        >
          <View style={styles.earningsOverview}>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
            <Text style={styles.earningsAmount}>
              ₵{earningsStats.totalEarnings.toLocaleString()}
            </Text>
            
            <View style={styles.balanceBreakdown}>
              <View style={styles.balanceItem}>
                <View style={[styles.balanceDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.balanceText}>
                  Total PaidOut: ₵{calculateCommission(earningsStats.totalReleased).net.toLocaleString()}
                </Text>
              </View>
              <View style={styles.balanceItem}>
                <View style={[styles.balanceDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.balanceText}>
                  Net in Escrow: ₵{calculateCommission(earningsStats.totalEscrow).net.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.earningsVisual}>
            <Ionicons name="wallet" size={48} color="#FFFFFF" opacity={0.8} />
          </View>
        </LinearGradient>

        {/* Commission Notice */}
        <View style={styles.commissionNotice}>
          <Ionicons name="information-circle" size={20} color="#6366F1" />
          <View style={styles.commissionTextContainer}>
            <Text style={styles.commissionTitle}>Platform Fee: 12%</Text>
            <Text style={styles.commissionText}>
              A 12% platform fee applies to all completed jobs. Amounts shown are gross earnings.
            </Text>
          </View>
        </View>

        {/* Time Range Filter */}
        <TimeRangeFilter />

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title="Total PaidOut Amount"
              value={calculateCommission(earningsStats.totalReleased).net}
              subtitle={`After 12% platform fee`}
              icon="wallet"
              color="#10B981"
              gradient={['#ECFDF5', '#F0FDF9']}
              isCurrency={true}
            />
            
            <StatCard
              title="In Escrow"
              value={calculateCommission(earningsStats.totalEscrow).net}
              subtitle={`After 12% platform fee`}
              icon="lock-closed"
              color="#F59E0B"
              gradient={['#FFFBEB', '#FEFCE8']}
              isCurrency={true}
            />
          </View>
          
          <View style={styles.statsRow}>
            <StatCard
              title="Completed Tasks"
              value={earningsStats.completedTasks}
              subtitle={`${earningsStats.totalTasks} total`}
              icon="checkmark-done"
              color="#6366F1"
              gradient={['#EEF2FF', '#F0F4FF']}
            />
            
            <StatCard
              title="Avg per Task"
              value={calculateCommission(earningsStats.averageEarning).net.toFixed(0)}
              subtitle="After 12% platform fee"
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
              <Ionicons name="cash" size={20} color="#6366F1" />
              <Text style={styles.sectionTitle}>
                Payment History ({earningsStats.allPayments.length})
              </Text>
            </View>
            {earningsStats.allPayments.length > 5 && (
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
              <Ionicons name="wallet-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No Payments Found</Text>
              <Text style={styles.emptyStateText}>
                {timeRange !== 'all' 
                  ? `No payments found for ${getTimeRangeDisplay(timeRange, payments)}`
                  : 'Complete tasks to see your earnings here'
                }
              </Text>
              {timeRange !== 'all' && (
                <TouchableOpacity 
                  style={styles.exploreTasksButton}
                  onPress={() => setTimeRange('all')}
                >
                  <Text style={styles.exploreTasksText}>View All Payments</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Commission Breakdown */}
        <View style={styles.commissionSection}>
          <View style={styles.commissionHeader}>
            <Ionicons name="pie-chart" size={20} color="#6366F1" />
            <Text style={styles.commissionSectionTitle}>Commission Breakdown</Text>
          </View>
          
          <View style={styles.commissionStats}>
            <View style={styles.commissionStat}>
              <Text style={styles.commissionStatLabel}>Total Gross Earnings</Text>
              <Text style={styles.commissionStatValue}>
                ₵{earningsStats.totalEarnings.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.commissionStat}>
              <Text style={styles.commissionStatLabel}>Total Platform Fees</Text>
              <Text style={[styles.commissionStatValue, styles.commissionFee]}>
                -₵{calculateCommission(earningsStats.totalEarnings).commission.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.commissionDivider} />
            
            <View style={styles.commissionStat}>
              <Text style={styles.commissionNetLabel}>Your Total Net Earnings</Text>
              <Text style={styles.commissionNetValue}>
                ₵{calculateCommission(earningsStats.totalEarnings).net.toLocaleString()}
              </Text>
            </View>
          </View>
          
          <Text style={styles.commissionNote}>
            *12% platform fee applies to all completed jobs. This fee helps us maintain and improve the platform.
          </Text>
        </View>

        {/* Escrow Explanation */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#6366F1" />
            <Text style={styles.infoTitle}>Payment Protection</Text>
          </View>
          <Text style={styles.infoText}>
            Your payments are held securely in escrow until tasks are completed and approved by clients. 
            You can request payment for earnings that are "In Escrow" once the task is completed and approved.
            A 12% platform fee will be deducted when payment is released.
          </Text>
          <View style={styles.infoSteps}>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Client pays into escrow</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>You complete the task</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Client approves work</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>Request payment (12% fee applied)</Text>
            </View>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
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
  earningsHeader: {
    padding: 24,
    marginHorizontal: 12,
    paddingTop: 32,
    borderRadius: 22,
    borderBottomRightRadius: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  earningsOverview: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#E5E7EB',
    fontWeight: '500',
    marginBottom: 8,
    opacity: 0.9,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  balanceBreakdown: {
    gap: 8,
    marginBottom: 16,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  balanceText: {
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  earningsVisual: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  // Commission Notice
  commissionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom:12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  commissionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  commissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3730A3',
    marginBottom: 4,
  },
  commissionText: {
    fontSize: 14,
    color: '#4F46E5',
    lineHeight: 20,
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  statGradient: {
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 0,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 11,
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
    elevation: 2,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  paymentReference: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Payment Item Commission Breakdown
  commissionBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  commissionLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginRight: 4,
  },
  commissionAmount: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  // Amount Container
  amountContainer: {
    alignItems: 'flex-end',
  },
  grossAmount: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    textDecorationColor: '#9CA3AF',
  },
  netAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  netLabelContainer: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  netLabel: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  paymentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
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
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  requestButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  requestButtonText: {
    color: '#FFFFFF',
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
  exploreTasksButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreTasksText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Commission Section
  commissionSection: {
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
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  commissionSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  commissionStats: {
    marginBottom: 16,
  },
  commissionStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commissionStatLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  commissionStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  commissionFee: {
    color: '#EF4444',
  },
  commissionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  commissionNetLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '700',
  },
  commissionNetValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  commissionNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 16,
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
  infoSteps: {
    gap: 12,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    flex: 1,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  withdrawText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 30,
  },
});

export default EarningScreen;