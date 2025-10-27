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
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { width } = Dimensions.get('window');

const TaskerDashboard = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { getAllEarnings, earnings } = useContext(TaskerContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));
  const { user, logout } = useContext(AuthContext);
  const { loadMyTasks } = useContext(TaskerContext);
  const [myTasks, setMyTasks] = useState([]);
  const [myBids, setMyBids] = useState([]);

  // Animation values
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  useEffect(() => {
    loadData();
    getAllEarnings();
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
        setRecentActivities(generateRecentActivities(applications, bids));
        
        // Start animations
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
    const totalEarnings = earnings
      .filter(earning => earning.status === "released")
      .reduce((sum, earning) => sum + (earning.amount || 0), 0);

    // Calculate bids statistics
    const submittedBids = bids.length;
    const acceptedBids = bids.filter(bid => 
      bid.bid?.status === "Accepted"
    ).length;
    const pendingBids = bids.filter(bid => 
      bid.bid?.status === "Pending"
    ).length;

    // Calculate response rate (based on recent activity)
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
    
    // Recent completed tasks
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
        color: '#10B981',
        gradient: ['#10B981', '#059669'],
      });
    });

    // Recent applications
    const recentApplications = applications.slice(0, 2);
    recentApplications.forEach(app => {
      activities.push({
        id: `app-${app._id}`,
        type: 'application',
        title: 'Application Sent',
        description: `Applied for ${app.title}`,
        time: '1 day ago',
        icon: 'document-text',
        color: '#6366F1',
        gradient: ['#6366F1', '#4F46E5'],
      });
    });

    // Add some sample activities if not enough real ones
    if (activities.length < 4) {
      activities.push(
        {
          id: 'tip-1',
          type: 'tip',
          title: 'Profile Tip',
          description: 'Add more skills to increase your visibility',
          time: '1 day ago',
          icon: 'bulb',
          color: '#F59E0B',
          gradient: ['#F59E0B', '#D97706'],
        },
       
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
      loadData();
      return () => {};
    }, [])
  );

  const StatCard = ({ title, value, subtitle, icon, color, gradient, onPress, delay = 0 }) => {
    const [cardAnim] = useState(new Animated.Value(0));
    
    useEffect(() => {
      setTimeout(() => {
        Animated.spring(cardAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, delay);
    }, []);

    return (
      <Animated.View
        style={{
          transform: [
            { scale: cardAnim },
            { translateY: cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0]
            })}
          ]
        }}
      >
        <TouchableOpacity 
          style={styles.statCard} 
          onPress={onPress}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={gradient || [color + '20', color + '10']}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: color + '30' }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <Ionicons name="chevron-forward" size={16} color={color} style={{ opacity: 0.7 }} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
            {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const QuickAction = ({ title, description, icon, color, onPress, delay = 0 }) => {
    const [actionAnim] = useState(new Animated.Value(0));
    
    useEffect(() => {
      setTimeout(() => {
        Animated.spring(actionAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, delay);
    }, []);

    return (
      <Animated.View
        style={{
          transform: [
            { translateX: actionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, 0]
            })}
          ],
          opacity: actionAnim
        }}
      >
        <TouchableOpacity 
          style={styles.quickAction} 
          onPress={onPress}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionDescription}>{description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const ActivityItem = ({ item, index }) => (
    <Animated.View
      style={[
        styles.activityItem,
        {
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim }
          ],
          opacity: fadeAnim
        }
      ]}
    >
      <LinearGradient
        colors={item.gradient || [item.color + '20', item.color + '10']}
        style={[styles.activityIcon, { backgroundColor: item.color + '20' }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={item.icon} size={18} color={item.color} />
      </LinearGradient>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityDescription}>{item.description}</Text>
        <Text style={styles.activityTime}>{item.time}</Text>
      </View>
      <View style={styles.activityArrow}>
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </View>
    </Animated.View>
  );

  const ProfileCompletion = ({ completion }) => (
    <Animated.View 
      style={[
        styles.profileCompletion,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
          opacity: fadeAnim
        }
      ]}
    >
      <View style={styles.completionHeader}>
        <View style={styles.completionTitleContainer}>
          <Ionicons name="person-circle" size={20} color="#6366F1" />
          <Text style={styles.completionTitle}>Profile Strength</Text>
        </View>
        <View style={styles.completionScore}>
          <Text style={styles.completionPercent}>{completion}%</Text>
          <View style={[
            styles.completionDot,
            { backgroundColor: completion >= 80 ? '#10B981' : '#F59E0B' }
          ]} />
        </View>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={completion >= 80 ? ['#10B981', '#059669'] : ['#F59E0B', '#D97706']}
            style={[styles.progressFill, { width: `${completion}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        <Text style={styles.completionHint}>
          {completion < 80 
            ? `${100 - completion}% to complete your profile` 
            : 'Profile complete! 🎉'
          }
        </Text>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
    <SafeAreaView style={styles.container}>
    <Header title="Dashboard" showProfile={false} />
    <LoadingIndicator text='Loading your Dashboard...'/>
    </SafeAreaView>
  );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Dashboard" showProfile={false} />
      
      <Animated.ScrollView
        style={{ 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}
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
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Animated.Text 
            style={[
              styles.welcomeText,
              {
                transform: [{ translateY: slideAnim }],
                opacity: fadeAnim
              }
            ]}
          >
            Hey, {user?.name || 'Tasker'}! 👋
          </Animated.Text>
          <Text style={styles.welcomeSubtitle}>
            Here's your performance overview
          </Text>
        </View>

        {/* Performance Overview */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.performanceGrid}>
            <StatCard
              title="Job Success"
              value={stats?.tasks.successRate || '0%'}
              subtitle="Completed tasks"
              icon="trending-up"
              color="#10B981"
              gradient={['#FAF5FF', '#F3E8FF']}
              onPress={() => navigate('MyTasks')}
              delay={100}
            />
            <StatCard
              title="Total Earnings"
              value={`₵${stats?.earnings.total || 0}`}
              subtitle="Lifetime earnings"
              icon="cash"
              color="#10B981"
              gradient={['#ECFDF5', '#F0FDF9']}
              onPress={() => navigate('EarningScreen')}
              delay={200}
            />
            <StatCard
              title="Acceptance Rate"
              value={stats?.applications.acceptanceRate || '0%'}
              subtitle="Applications accepted"
              icon="checkmark-circle"
              color="#6366F1"
              gradient={['#E0E7FF', '#C7D2FE']}
              onPress={() => navigate('MyTasks')}
              delay={300}
            />
            <StatCard
              title="Active Tasks"
              value={stats?.tasks.inProgress || 0}
              subtitle="In progress"
              icon="time"
              color="#F59E0B"
              gradient={['#FFFBEB', '#FEFCE8']}
              onPress={() => navigate('MyTasks')}
              delay={400}
            />
          </View>
        </View>

        {/* Profile Completion */}
        {stats?.performance.profileCompletion < 100 && (
          <View style={styles.section}>
            <ProfileCompletion completion={stats?.performance.profileCompletion || 0} />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickAction
              title="Find Available Tasks"
              description="Browse and apply for new opportunities"
              icon="search"
              color="#6366F1"
              onPress={() => navigate('AvailableTasks')}
              delay={100}
            />
            <QuickAction
              title="View Earnings"
              description="Check your payments and history"
              icon="wallet"
              color="#10B981"
              onPress={() => navigate('EarningScreen')}
              delay={200}
            />
            <QuickAction
              title="Manage Applications"
              description="Track your submitted applications"
              icon="document-text"
              color="#8B5CF6"
              onPress={() => navigate('MyTasks')}
              delay={300}
            />
            <QuickAction
              title="Boost Profile"
              description="Improve your visibility to clients"
              icon="rocket"
              color="#F59E0B"
              onPress={() => navigate('Profile')}
              delay={400}
            />
          </View>
        </View>

        {/* Active Work Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Work Summary</Text>
            <TouchableOpacity onPress={() => navigate('MyTasks')}>
              <Text style={styles.viewAllText}>View Details</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activeWorkGrid}>
            <View style={styles.workStat}>
              <Text style={styles.workStatValue}>{stats?.tasks.inProgress || 0}</Text>
              <Text style={styles.workStatLabel}>In Progress</Text>
            </View>
            <View style={styles.workStatDivider} />
            <View style={styles.workStat}>
              <Text style={styles.workStatValue}>{stats?.applications.pending || 0}</Text>
              <Text style={styles.workStatLabel}>Pending Review</Text>
            </View>
            <View style={styles.workStatDivider} />
            <View style={styles.workStat}>
              <Text style={styles.workStatValue}>{stats?.bids.pending || 0}</Text>
              <Text style={styles.workStatLabel}>Active Bids</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          <View style={styles.activitiesList}>
            {recentActivities.map((item, index) => (
              <ActivityItem key={item.id} item={item} index={index} />
            ))}
          </View>
        </View>

        {/* Pro Tips Card */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            style={styles.tipsCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.tipsHeader}>
              <Ionicons name="sparkles" size={24} color="#FFFFFF" />
              <Text style={styles.tipsTitle}>Pro Tip</Text>
            </View>
            <Text style={styles.tipsText}>
              {stats?.performance.profileCompletion >= 80 
                ? "Respond within 30 minutes to new task notifications - quick responses increase hiring chances by 60%!"
                : "Complete your profile with work portfolio images to get 3x more client invitations!"
              }
            </Text>
            <TouchableOpacity 
              style={styles.tipsButton} 
              onPress={() => 
                stats?.performance.profileCompletion >= 80 
                  ? navigate('AvailableTasks') 
                  : navigate('Profile')
              }
            >
              <Text style={styles.tipsButtonText}>
                {stats?.performance.profileCompletion >= 80 ? "Find Tasks Now" : "Complete Profile"}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
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
  scrollContent: {
    paddingBottom: 40,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  performanceSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
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
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  statGradient: {
    padding: 20,
    borderRadius: 20,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  profileCompletion: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  completionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  completionScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completionPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  completionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  completionHint: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  quickActions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  activeWorkGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  workStat: {
    flex: 1,
    alignItems: 'center',
  },
  workStatDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 8,
  },
  workStatValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  workStatLabel: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
  activitiesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  activityArrow: {
    paddingLeft: 8,
  },
  tipsCard: {
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  tipsText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
    lineHeight: 24,
    fontWeight: '500',
  },
  tipsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 8,
  },
  tipsButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  viewAllText: {
    color: '#6366F1',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TaskerDashboard;