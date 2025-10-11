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

const { width, height } = Dimensions.get('window');

const EarningScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { getAllEarnings } = useContext(TaskerContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('month'); // 'all', 'week', 'month', 'year'
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

  const getPreviousPeriod = (currentRange) => {
    switch (currentRange) {
      case 'week': return 'week';
      case 'month': return 'month';
      case 'year': return 'year';
      default: return 'all';
    }
  };

  // Separate payments by status
  const { releasedPayments, escrowPayments, allPayments } = useMemo(() => {
    const released = payments.filter(payment => payment.status === 'released');
    const escrow = payments.filter(payment => payment.status === 'in_escrow' || payment.status === 'pending');
    const all = [...released, ...escrow]; // Combine for total calculations
    
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
    const totalEarnings = totalReleased ;
    
    const completedTasks = filteredReleased.length;
    const pendingTasks = filteredEscrow.length;
    const averageEarning = completedTasks > 0 ? totalReleased / completedTasks : 0;
    
    // Calculate growth compared to previous period (only for released payments)
    const previousPeriodPayments = filterPaymentsByTimeRange(
      releasedPayments, 
      getPreviousPeriod(timeRange)
    );
    const previousEarnings = previousPeriodPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const monthlyGrowth = previousEarnings > 0 ? 
      ((totalReleased - previousEarnings) / previousEarnings * 100).toFixed(1) : 0;
    
    return {
      totalReleased,
      totalEscrow,
      totalEarnings,
      completedTasks,
      pendingTasks,
      averageEarning,
      monthlyGrowth: Math.max(0, monthlyGrowth),
      releasedPayments: filteredReleased,
      escrowPayments: filteredEscrow,
      allPayments: filteredAll,
      isPositiveGrowth: monthlyGrowth >= 0
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
            </View>
          </View>
        </View>
        
        <View style={styles.paymentAmount}>
          <Text style={styles.amountText}>₵{payment.amount.toLocaleString()}</Text>
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
  );

  const WithdrawalButton = () => (
    <TouchableOpacity 
      style={styles.withdrawButton}
      onPress={() => Alert.alert('Withdrawal', 'Withdrawal feature coming soon!')}
    >
      <Ionicons name="arrow-down-circle" size={20} color="#FFFFFF" />
      <Text style={styles.withdrawText}>Withdraw</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="My Earnings" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading your earnings...</Text>
        </View>
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
            <Text style={styles.earningsLabel}>Total Earnings (Released Payments)</Text>
            <Text style={styles.earningsAmount}>
              ₵{earningsStats.totalEarnings.toLocaleString()}
            </Text>
            
            <View style={styles.balanceBreakdown}>
              <View style={styles.balanceItem}>
                <View style={[styles.balanceDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.balanceText}>
                  Released: ₵{earningsStats.totalReleased.toLocaleString()}
                </Text>
              </View>
              <View style={styles.balanceItem}>
                <View style={[styles.balanceDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.balanceText}>
                  In Escrow: ₵{earningsStats.totalEscrow.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.earningsVisual}>
            <Ionicons name="wallet" size={48} color="#FFFFFF" opacity={0.8} />
          </View>
        </LinearGradient>

        {/* Time Range Filter 
        <TimeRangeFilter />*/}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
  <View style={styles.statsRow}>
    <StatCard
      title="Completed Tasks"
      value={earningsStats.completedTasks}
      subtitle="Successfully delivered"
      icon="checkmark-done"
      color="#10B981"
      gradient={['#ECFDF5', '#F0FDF9']}
    />
    
    <StatCard
      title="Pending Tasks"
      value={earningsStats.pendingTasks}
      subtitle="In progress / escrow"
      icon="time"
      color="#F59E0B"
      gradient={['#FFFBEB', '#FEFCE8']}
    />
  </View>
  
  <View style={styles.statsRow}>
    <StatCard
      title="Average per Task"
      value={earningsStats.averageEarning.toFixed(2)}
      subtitle="Completed tasks"
      icon="trending-up"
      color="#6366F1"
      gradient={['#EEF2FF', '#F0F4FF']}
      isCurrency={true}
    />
    
    {/* Optional: Add a 4th stat card if you have more data */}
    <StatCard
      title="Total Tasks"
      value={earningsStats.completedTasks + earningsStats.pendingTasks}
      subtitle="All assigned tasks"
      icon="briefcase"
      color="#8B5CF6"
      gradient={['#FAF5FF', '#F3E8FF']}
    />
  </View>
</View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="document-text" size={20} color="#6366F1" />
            </View>
            <Text style={styles.quickActionText}>Tax Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="download" size={20} color="#10B981" />
            </View>
            <Text style={styles.quickActionText}>Export</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="help-circle" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>Help</Text>
          </TouchableOpacity>
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
              <Text style={styles.emptyStateTitle}>No Earnings Yet</Text>
              <Text style={styles.emptyStateText}>
                {timeRange !== 'all' 
                  ? `No payments in the selected time period`
                  : 'Complete tasks to see your earnings here'
                }
              </Text>
              <TouchableOpacity 
                style={styles.exploreTasksButton}
                onPress={() => navigation.navigate('MainTabs',{ screen: 'AvailableTasks'})}
              >
                <Text style={styles.exploreTasksText}>Explore Available Tasks</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Escrow Explanation */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#6366F1" />
            <Text style={styles.infoTitle}>Payment Protection</Text>
          </View>
          <Text style={styles.infoText}>
            Your payments are held securely in escrow until tasks are completed and approved by clients. 
            This ensures you get paid for your work and clients get quality service.
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
              <Text style={styles.stepText}>Payment released to you</Text>
            </View>
          </View>
        </View>

        {/* Earnings Tips */}
        <View style={styles.tipsSection}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
            <Text style={styles.tipsTitle}>Boost Your Earnings</Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <View style={[styles.tipIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="flash" size={16} color="#10B981" />
              </View>
              <Text style={styles.tipText}>Complete tasks promptly to get higher ratings</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="star" size={16} color="#3B82F6" />
              </View>
              <Text style={styles.tipText}>Maintain high ratings for better task opportunities</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipIcon, { backgroundColor: '#FEFCE8' }]}>
                <Ionicons name="time" size={16} color="#EAB308" />
              </View>
              <Text style={styles.tipText}>Update your availability regularly</Text>
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
  earningsHeader: {
    padding: 24,
    marginHorizontal:12,
    paddingTop: 32,
   borderRadius:22,
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
  earningsVisual: {
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
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
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
  taskCategory: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 6,
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
  tipsSection: {
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
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
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