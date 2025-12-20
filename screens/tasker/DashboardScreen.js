import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
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
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { width } = Dimensions.get('window');

// Theme Colors
const THEME = {
  primary: '#1A1F3B',
  secondary: '#2D1B69',
  white: '#FFFFFF',
  lightBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  accent: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6'
};

const TaskerDashboard = () => {
  // States
  const [refreshing, setRefreshing] = useState(false);
  const { getAllEarnings } = useContext(TaskerContext);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));
  const { user } = useContext(AuthContext);
  const { loadMyTasks } = useContext(TaskerContext);
  const [myTasks, setMyTasks] = useState([]);
  const [myBids, setMyBids] = useState([]);

  // Animation values
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const CACHE_DURATION = 60000;

  useEffect(() => {
    if (initialLoad) {
      loadAllData();
    }
  }, []);

  const loadAllData = async () => {
    const now = Date.now();
    if (!initialLoad && (now - lastLoadTime < CACHE_DURATION)) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setLoading(true);
    setRefreshing(true);
    
    try {
      const earningsData = await fetchEarnings();
      await loadData(earningsData);
      
      setLastLoadTime(Date.now());
      setInitialLoad(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      const response = await getAllEarnings();
      const earningsData = response.data || [];
      setEarnings(earningsData);
      return earningsData;
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  };

  const loadData = async (earningsData = earnings) => {
    try {
      if (loadMyTasks) {
        const res = await loadMyTasks();
        const applications = res.data?.applications || [];
        const bids = res.data?.bids || [];
        
        setMyTasks(applications);
        setMyBids(bids);

        const calculatedStats = calculateStats(applications, bids, earningsData);
        setStats(calculatedStats);
        setRecentActivities(generateRecentActivities(applications, bids));
        
        if (fadeAnim._value === 0) {
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            })
          ]).start();
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Calculate stats
  const calculateStats = (applications = [], bids = [], currentEarnings = []) => {
    if (!applications || !Array.isArray(applications)) {
      return getDefaultStats();
    }

    const completedTasks = applications.filter(task => task.status === "Completed").length;
    const inProgressTasks = applications.filter(task => 
      ["Assigned", "In-progress", "Review"].includes(task.status)
    ).length;
    const pendingTasks = applications.filter(task => 
      ["Pending", "Open"].includes(task.status)
    ).length;

    const submittedApplications = applications.length;
    const acceptedApplications = applications.filter(task => 
      task.status !== "Open" && task.status !== "Rejected" && task.status !== "Pending"
    ).length;
    const pendingApplications = applications.filter(task => 
      task.status === "Open" || task.status === "Pending"
    ).length;

    const acceptanceRate = submittedApplications > 0 
      ? Math.round((acceptedApplications / submittedApplications) * 100) 
      : 0;

    const successRate = acceptedApplications > 0 
      ? Math.round((completedTasks / acceptedApplications) * 100)
      : 0;

    const totalEarnings = currentEarnings
      .filter(earning => earning.status === "released")
      .reduce((sum, earning) => sum + (earning.amount || 0), 0);

    const submittedBids = bids.length;
    const acceptedBids = bids.filter(bid => 
      bid.bid?.status === "Accepted"
    ).length;
    const pendingBids = bids.filter(bid => 
      bid.bid?.status === "Pending"
    ).length;

    const responseRate = calculateResponseRate(applications);

    return {
      earnings: {
        week: Math.round(totalEarnings * 0.2),
        month: Math.round(totalEarnings * 0.7),
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
      performance: {
        responseRate: `${responseRate}%`,
        profileCompletion: calculateProfileCompletion(user),
        recommendationScore: calculateRecommendationScore(user, applications),
      },
    };
  };

  const calculateResponseRate = (applications) => {
    const recentApplications = applications.filter(app => {
      const appDate = new Date(app.createdAt || app.appliedDate);
      const daysAgo = (new Date() - appDate) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    });
    
    return recentApplications.length > 0 ? Math.min(95, 70 + Math.random() * 25) : 0;
  };

  const calculateProfileCompletion = (user) => {
    let completion = 0;
    if (user?.name) completion += 20;
    if (user?.profileImage) completion += 15;
    if (user?.Bio) completion += 15;
    if (user?.skills?.length > 0) completion += 20;
    if (user?.workExperience?.length > 0) completion += 15;
    if (user?.workPortfolio?.length > 0) completion += 15;
    return completion;
  };

  const calculateRecommendationScore = (user, applications) => {
    const baseScore = 80;
    const ratingBonus = (user?.rating || 0) * 4;
    const completionBonus = calculateProfileCompletion(user) * 0.2;
    const successBonus = applications.filter(app => app.status === "Completed").length * 2;
    
    return Math.min(100, baseScore + ratingBonus + completionBonus + successBonus);
  };

  const generateRecentActivities = (applications, bids) => {
    const activities = [];
    
    const recentCompleted = applications
      .filter(app => app.status === "Completed")
      .slice(0, 2);
    
    recentCompleted.forEach(task => {
      activities.push({
        id: `completed-${task._id}`,
        type: 'task',
        title: 'Task Completed',
        description: `${task.title} - ₵${task.budget}`,
        time: '2 hours ago',
        icon: 'checkmark-circle',
        color: THEME.success,
        bgColor: '#F0FDF4',
      });
    });

    const recentApplications = applications.slice(0, 2);
    recentApplications.forEach(app => {
      activities.push({
        id: `app-${app._id}`,
        type: 'application',
        title: 'Application Sent',
        description: `Applied for ${app.title}`,
        time: '1 day ago',
        icon: 'document-text',
        color: THEME.accent,
        bgColor: '#EEF2FF',
      });
    });

    if (activities.length < 4) {
      activities.push(
        {
          id: 'tip-1',
          type: 'tip',
          title: 'Profile Tip',
          description: 'Add more skills to increase your visibility',
          time: '1 day ago',
          icon: 'bulb',
          color: THEME.warning,
          bgColor: '#FFFBEB',
        }
      );
    }

    return activities.slice(0, 4);
  };

  const getDefaultStats = () => {
    return {
      earnings: { week: 0, month: 0, total: 0, trend: '+0%' },
      tasks: { completed: 0, inProgress: 0, pending: 0, successRate: '0%' },
      applications: { submitted: 0, accepted: 0, pending: 0, acceptanceRate: '0%' },
      bids: { submitted: 0, accepted: 0, pending: 0, acceptanceRate: '0%' },
      ratings: { average: user?.rating || 0, total: user?.numberOfRatings || 0, trend: '+0.0' },
      performance: { responseRate: '0%', profileCompletion: 0, recommendationScore: 0 },
    };
  };

  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      if (now - lastLoadTime > CACHE_DURATION) {
        loadAllData();
      }
      return () => {};
    }, [lastLoadTime])
  );

  // Component: Stats Card
  const StatCard = ({ title, value, subtitle, icon, color, onPress }) => (
    <TouchableOpacity 
      style={styles.statCard} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.statCardContent}>
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );

  // Component: Quick Action Card
  const QuickActionCard = ({ title, description, icon, color, onPress }) => (
    <TouchableOpacity 
      style={styles.quickActionCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[`${color}10`, `${color}05`]}
        style={styles.quickActionGradient}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.quickActionContent}>
          <Text style={styles.quickActionTitle}>{title}</Text>
          <Text style={styles.quickActionDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={THEME.textSecondary} />
      </LinearGradient>
    </TouchableOpacity>
  );

  // Component: Activity Item
  const ActivityItem = ({ item }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: item.bgColor }]}>
        <Ionicons name={item.icon} size={18} color={item.color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityDescription}>{item.description}</Text>
        <Text style={styles.activityTime}>{item.time}</Text>
      </View>
    </View>
  );

  // Component: Profile Progress
  const ProfileProgress = ({ completion }) => (
    <View style={styles.profileProgress}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Profile Strength</Text>
        <Text style={styles.progressPercent}>{completion}%</Text>
      </View>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${completion}%`, backgroundColor: completion >= 80 ? THEME.success : THEME.warning }
          ]} 
        />
      </View>
      <Text style={styles.progressHint}>
        {completion < 80 
          ? `Complete your profile to get more job invitations` 
          : 'Great job! Keep your profile updated'
        }
      </Text>
    </View>
  );

  // Component: Stats Overview Card
  const StatsOverview = () => (
    <View style={styles.statsOverview}>
      <View style={styles.statsOverviewHeader}>
        <Text style={styles.statsOverviewTitle}>Work Summary</Text>
        <TouchableOpacity onPress={() => navigate('MyTasks')}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statItemValue}>{stats?.tasks.inProgress || 0}</Text>
          <Text style={styles.statItemLabel}>In Progress</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statItemValue}>{stats?.tasks.completed || 0}</Text>
          <Text style={styles.statItemLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statItemValue}>{stats?.applications.pending || 0}</Text>
          <Text style={styles.statItemLabel}>Pending Review</Text>
        </View>
      </View>
    </View>
  );

  // Component: Earnings Card
  const EarningsCard = () => (
    <LinearGradient
      colors={[THEME.primary, THEME.secondary]}
      style={styles.earningsCard}
    >
      <View style={styles.earningsContent}>
        <View>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <Text style={styles.earningsAmount}>₵{stats?.earnings.total?.toLocaleString() || '0'}</Text>
          <View style={styles.earningsTrend}>
            <Ionicons name="trending-up" size={14} color={THEME.success} />
            <Text style={styles.earningsTrendText}>{stats?.earnings.trend || '+0%'}</Text>
          </View>
        </View>
        <View style={styles.earningsIcon}>
          <Ionicons name="wallet" size={36} color="rgba(255, 255, 255, 0.8)" />
        </View>
      </View>
      <TouchableOpacity 
        style={styles.viewEarningsButton}
        onPress={() => navigate('EarningScreen')}
      >
        <Text style={styles.viewEarningsText}>View Earnings</Text>
        <Ionicons name="arrow-forward" size={16} color={THEME.white} />
      </TouchableOpacity>
    </LinearGradient>
  );

  if (loading && initialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Dashboard" showBack={false} />
        <LoadingIndicator text='Loading your Dashboard...'/>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Dashboard" 
        showBack={false}
        onRightPress={() => navigate('Notifications')}
      />
      
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.accent]}
            tintColor={THEME.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.welcomeTitle}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{user?.name || 'Tasker'} 👋</Text>
            <Text style={styles.welcomeSubtitle}>Here's your performance overview</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigate('Profile')}
          >
            <Ionicons name="person-circle" size={24} color={THEME.accent} />
          </TouchableOpacity>
        </View>

        {/* Earnings Card */}
        <EarningsCard />

        {/* Performance Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.performanceGrid}>
            <StatCard
              title="Success Rate"
              value={stats?.tasks.successRate || '0%'}
              subtitle="Task completion"
              icon="checkmark-circle"
              color={THEME.success}
              onPress={() => navigate('MyTasks')}
            />
            <StatCard
              title="Acceptance"
              value={stats?.applications.acceptanceRate || '0%'}
              subtitle="Applications"
              icon="trending-up"
              color={THEME.accent}
              onPress={() => navigate('MyTasks')}
            />
            <StatCard
              title="Response Rate"
              value={stats?.performance.responseRate || '0%'}
              subtitle="Client responses"
              icon="time"
              color={THEME.info}
              onPress={() => navigate('AvailableTasks')}
            />
            <StatCard
              title="Rating"
              value={stats?.ratings.average?.toFixed(1) || '0.0'}
              subtitle={`${stats?.ratings.total || 0} reviews`}
              icon="star"
              color={THEME.warning}
              onPress={() => navigate('Profile')}
            />
          </View>
        </View>

        {/* Profile Progress */}
        {stats?.performance.profileCompletion < 100 && (
          <View style={styles.section}>
            <ProfileProgress completion={stats?.performance.profileCompletion || 0} />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              title="Find Tasks"
              description="Browse available tasks"
              icon="search"
              color={THEME.accent}
              onPress={() => navigate('AvailableTasks')}
            />
            <QuickActionCard
              title="My Tasks"
              description="Manage your applications"
              icon="list"
              color={THEME.success}
              onPress={() => navigate('MyTasks')}
            />
            <QuickActionCard
              title="Messages"
              description="Chat with clients"
              icon="chatbubbles"
              color="#8B5CF6"
              onPress={() => navigate('Chat')}
            />
            <QuickActionCard
              title="Update Profile"
              description="Improve visibility"
              icon="person"
              color={THEME.warning}
              onPress={() => navigate('Profile')}
            />
          </View>
        </View>

        {/* Work Summary */}
        <View style={styles.section}>
          <StatsOverview />
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigate('MyTasks')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activitiesContainer}>
            {recentActivities.map((item) => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </View>
        </View>

        {/* Pro Tip */}
        <View style={styles.section}>
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="sparkles" size={20} color={THEME.accent} />
              <Text style={styles.tipTitle}>Pro Tip</Text>
            </View>
            <Text style={styles.tipText}>
              {stats?.performance.profileCompletion >= 80 
                ? "Respond quickly to new task notifications - fast responses increase hiring chances!"
                : "Complete your profile with portfolio images to get more client invitations!"
              }
            </Text>
            <TouchableOpacity 
              style={styles.tipButton}
              onPress={() => 
                stats?.performance.profileCompletion >= 80 
                  ? navigate('AvailableTasks') 
                  : navigate('Profile')
              }
            >
              <Text style={styles.tipButtonText}>
                {stats?.performance.profileCompletion >= 80 ? "Find Tasks" : "Complete Profile"}
              </Text>
            </TouchableOpacity>
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
    backgroundColor: THEME.lightBg,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  welcomeTitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  welcomeName: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.textPrimary,
    marginTop: 2,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${THEME.accent}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 24,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  earningsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.white,
    marginBottom: 8,
  },
  earningsTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  earningsTrendText: {
    fontSize: 14,
    color: THEME.success,
    fontWeight: '600',
  },
  earningsIcon: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  viewEarningsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  viewEarningsText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
  },
  statCardContent: {
    backgroundColor: THEME.cardBg,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  profileProgress: {
    backgroundColor: THEME.cardBg,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  progressBar: {
    height: 8,
    backgroundColor: THEME.border,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  quickActionsGrid: {
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 2,
  },
  quickActionDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  statsOverview: {
    backgroundColor: THEME.cardBg,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsOverviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsOverviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  viewDetailsText: {
    fontSize: 14,
    color: THEME.accent,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemValue: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  statItemLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: THEME.border,
  },
  activitiesContainer: {
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  viewAllText: {
    fontSize: 14,
    color: THEME.accent,
    fontWeight: '600',
  },
  tipCard: {
    backgroundColor: '#EEF2FF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.accent,
  },
  tipText: {
    fontSize: 15,
    color: '#4F46E5',
    lineHeight: 22,
    marginBottom: 16,
  },
  tipButton: {
    backgroundColor: THEME.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tipButtonText: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});

export default TaskerDashboard;