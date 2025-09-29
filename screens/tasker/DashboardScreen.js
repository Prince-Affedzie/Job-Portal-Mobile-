import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TaskerContext } from '../../context/TaskerContext';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';
import Header from "../../component/tasker/Header";


const { width } = Dimensions.get('window');

const TaskerDashboard = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activeMetric, setActiveMetric] = useState('week');
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));
  const { user, logout } = useContext(AuthContext);
  const { loadMyTasks } = useContext(TaskerContext);
  const [myTasks, setMyTasks] = useState([]);
  const [myBids, setMyBids] = useState([]);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (loadMyTasks) {
        const res = await loadMyTasks();
       
        // Extract applications and bids from the response
        const applications = res.data?.applications || [];
        const bids = res.data?.bids || [];
        
        setMyTasks(applications);
        setMyBids(bids);
        

        // Calculate stats based on actual data
        const calculatedStats = calculateStats(applications, bids);
        setStats(calculatedStats);
        setRecentActivities(sampleActivities);
        
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Calculate stats based on actual tasks data
  const calculateStats = (applications = [], bids = []) => {
    if (!applications || !Array.isArray(applications)) {
      return getDefaultStats();
    }

   

    // Calculate task statistics
    const completedTasks = applications.filter(task => task.status === "Completed").length;
    const inProgressTasks = applications.filter(task => 
      ["Assigned", "In-progress", "Review"].includes(task.status)
    ).length;
    const pendingTasks = applications.filter(task => 
      ["Pending", "Open"].includes(task.status)
    ).length;

    // Calculate application statistics
    const submittedApplications = applications.length;
    const acceptedApplications = applications.filter(task => 
      task.status !== "Open" && task.status !== "Rejected" && task.status !== "Pending"
    ).length;
    const pendingApplications = applications.filter(task => 
      task.status === "Open" || task.status === "Pending"
    ).length;

    // Calculate acceptance rate
    const acceptanceRate = submittedApplications > 0 
      ? Math.round((acceptedApplications / submittedApplications) * 100) 
      : 0;

    // Calculate success rate (completed vs total accepted)
    const successRate = acceptedApplications > 0 
      ? Math.round((completedTasks / acceptedApplications) * 100)
      : 0;

    // Calculate earnings from completed tasks
    const totalEarnings = applications
      .filter(task => task.status === "Completed")
      .reduce((sum, task) => sum + (task.budget || 0), 0);

    // Calculate bids statistics
    const submittedBids = bids.length;
    const acceptedBids = bids.filter(bid => 
      bid.bid?.status === "Accepted"
    ).length;
    const pendingBids = bids.filter(bid => 
      bid.bid?.status === "Pending"
    ).length;
    return {
      earnings: {
        week: Math.round(totalEarnings * 0.2), // Placeholder - adjust based on your logic
        month: Math.round(totalEarnings * 0.7), // Placeholder - adjust based on your logic
        total: totalEarnings,
        trend: totalEarnings > 0 ? '+12%' : '+0%',
      },
      tasks: {
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks,
        successRate: `${successRate}%`,
      },
      applications: {
        submitted: submittedApplications,
        accepted: acceptedApplications,
        pending: pendingApplications,
        acceptanceRate: `${acceptanceRate}%`,
      },
      bids: {
        submitted: submittedBids,
        accepted: acceptedBids,
        pending: pendingBids,
        acceptanceRate: submittedBids > 0 ? `${Math.round((acceptedBids / submittedBids) * 100)}%` : '0%',
      },
      ratings: {
        average: user?.rating || 0,
        total: user?.numberOfRatings || 0,
        trend: user?.rating ? '+0.2' : '+0.0',
      },
    };
  };

  const getDefaultStats = () => {
    return {
      earnings: {
        week: 0,
        month: 0,
        total: 0,
        trend: '+0%',
      },
      tasks: {
        completed: 0,
        inProgress: 0,
        pending: 0,
        successRate: '0%',
      },
      applications: {
        submitted: 0,
        accepted: 0,
        pending: 0,
        acceptanceRate: '0%',
      },
      bids: {
        submitted: 0,
        accepted: 0,
        pending: 0,
        acceptanceRate: '0%',
      },
      ratings: {
        average: user?.rating || 0,
        total: user?.numberOfRatings || 0,
        trend: '+0.0',
      },
    };
  };

  const sampleActivities = [
    {
      id: '1',
      type: 'earning',
      title: 'Payment Received',
      description: '₵1,200 for Website Redesign',
      time: '2 hours ago',
      icon: 'cash',
      color: '#10B981',
    },
    {
      id: '2',
      type: 'task',
      title: 'Task Completed',
      description: 'Mobile App Development delivered',
      time: '1 day ago',
      icon: 'checkmark-circle',
      color: '#6366F1',
    },
    {
      id: '3',
      type: 'application',
      title: 'New Application',
      description: 'Applied for Social Media Campaign',
      time: '2 days ago',
      icon: 'document-text',
      color: '#F59E0B',
    },
    {
      id: '4',
      type: 'rating',
      title: 'New Rating',
      description: 'Received 5 stars from Tech Solutions Inc.',
      time: '3 days ago',
      icon: 'star',
      color: '#F59E0B',
    },
  ];

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      return () => {};
    }, [])
  );

  const MetricCard = ({ title, value, subtitle, icon, color, trend }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {trend && (
          <View style={styles.trendBadge}>
            <Text style={styles.trendText}>{trend}</Text>
          </View>
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const QuickAction = ({ title, description, icon, color, onPress }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748B" />
    </TouchableOpacity>
  );

  const ActivityItem = ({ item }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={16} color={item.color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityDescription}>{item.description}</Text>
        <Text style={styles.activityTime}>{item.time}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Header 
        title="Dashboard"  
      />
        <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.greetingContainer}>
                <Text style={styles.welcomeText}>Good {getTimeOfDay()},</Text>
                <Text style={styles.userName}>{user?.name || 'Tasker'}!</Text>
              </View>
              <Text style={styles.subtitle}>Your performance at a glance</Text>
            </View>
            <TouchableOpacity style={styles.profileButton} onPress={() => navigate('Profile')}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  {user?.profileImage ? (
                    <Image
                      source={{ uri: user.profileImage }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user?.name?.charAt(0) || 'T'}
                    </Text>
                  )}
                </View>
                <View style={styles.onlineIndicator} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Earnings Card 
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.earningsCard}
        >
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsTitle}>Total Earnings</Text>
            <View style={styles.timeSelector}>
              {['week', 'month', 'total'].map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.timeButton,
                    activeMetric === period && styles.timeButtonActive,
                  ]}
                  onPress={() => setActiveMetric(period)}
                >
                  <Text
                    style={[
                      styles.timeButtonText,
                      activeMetric === period && styles.timeButtonTextActive,
                    ]}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.earningsAmount}>
            ₵{stats?.earnings[activeMetric]?.toLocaleString() || 0}
          </Text>
        </LinearGradient>
        */}

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Tasks Completed"
            value={stats?.tasks.completed || 0}
            subtitle={`${stats?.tasks.inProgress || 0} in progress`}
            icon="checkmark-done"
            color="#10B981"
            trend={stats?.tasks.successRate || '0%'}
          />
          <MetricCard
            title="Applications"
            value={stats?.applications.submitted || 0}
            subtitle={`${stats?.applications.accepted || 0} accepted`}
            icon="document-text"
            color="#6366F1"
            trend={stats?.applications.acceptanceRate || '0%'}
          />
          <MetricCard
            title="Bids Submitted"
            value={stats?.bids.submitted || 0}
            subtitle={`${stats?.bids.accepted || 0} accepted`}
            icon="hammer"
            color="#F59E0B"
            trend={stats?.bids.acceptanceRate || '0%'}
          />
          <MetricCard
            title="Average Rating"
            value={stats?.ratings.average || 0}
            subtitle={`${stats?.ratings.total || 0} reviews`}
            icon="star"
            color="#F59E0B"
            trend={stats?.ratings.trend || '+0.0'}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickAction
              title="Find Tasks"
              description="Browse available opportunities"
              icon="search"
              color="#6366F1"
              onPress={() => navigate('AvailableTab')}
            />
            <QuickAction
              title="My Applications"
              description="View your submitted applications"
              icon="document-text"
              color="#10B981"
              onPress={() => navigate('MyTasksTab')}
            />
            <QuickAction
              title="Earnings"
              description="View your payment history"
              icon="cash"
              color="#F59E0B"
              onPress={() => navigate('Earnings')}
            />
            <QuickAction
              title="Profile"
              description="Update your account details"
              icon="person"
              color="#EF4444"
              onPress={() => navigate('ProfileTab')}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activitiesList}>
            {recentActivities.map((item) => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </View>
        </View>

        {/* Performance Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Performance Tip</Text>
          <Text style={styles.tipsText}>
            Complete your profile with skills and portfolio to get 3x more applications accepted!
          </Text>
          <TouchableOpacity style={styles.tipsButton}>
            <Text style={styles.tipsButtonText}>Complete Profile</Text>
          </TouchableOpacity>
        </View>
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
    color: '#64748B',
  },
  scrollContent: {
    paddingBottom: 40,
  },
 headerContainer: {
  backgroundColor: '#1A1F3B', // New dark background
  borderBottomLeftRadius: 24,
  borderBottomRightRadius: 24,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  paddingHorizontal: 10,
  paddingBottom: 16,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.2, // Slightly increased for visibility on dark background
  shadowRadius: 4,
  elevation: 4, // Slightly increased for better depth
  marginBottom: 8,
 
  marginHorizontal: 10,
},
header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 16,
},
headerContent: {
  flex: 1,
},
greetingContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  marginBottom: 4,
},
welcomeText: {
  fontSize: 16,
  color: '#A3BFFA', // Light blue for contrast against dark background
  marginRight: 6,
},
userName: {
  fontSize: 24,
  fontWeight: '800',
  color: '#E2E8F0', // Light gray for primary text
  marginBottom: 0,
},
subtitle: {
  fontSize: 14,
  color: '#94A3B8', // Kept subtle but readable
  fontWeight: '500',
},
profileButton: {
  padding: 4,
},
avatarContainer: {
  position: 'relative',
},
avatar: {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: '#4F46E5', // Indigo accent to complement dark theme
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#4F46E5', // Matching shadow for consistency
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.4, // Slightly stronger shadow for depth
  shadowRadius: 8,
  elevation: 4,
},
avatarImage: {
  width: 52,
  height: 52,
  borderRadius: 26,
},
avatarText: {
  color: '#E2E8F0', // Light gray for contrast
  fontWeight: '700',
  fontSize: 20,
},
onlineIndicator: {
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: '#22D3EE', // Cyan for a vibrant online indicator
  borderWidth: 2,
  borderColor: '#1A1F3B', // Matches header background for clean look
},
  earningsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  timeButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  timeButtonTextActive: {
    color: '#6366F1',
  },
  earningsAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  earningsTrend: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  metricCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  viewAllText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  activitiesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  tipsCard: {
    marginHorizontal: 20,
    backgroundColor: '#FEF3C7',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 16,
    lineHeight: 20,
  },
  tipsButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tipsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TaskerDashboard;