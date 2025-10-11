import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import ReportForm from '../../component/common/reportForm';
import { AuthContext } from '../../context/AuthContext';
import { PosterContext } from '../../context/PosterContext';
import { clientGetTaskInfo, markTaskAsDoneClient } from '../../api/miniTaskApi'
import { navigate } from '../../services/navigationService'
import LoadingIndicator from '../../component/common/LoadingIndicator';
import RatingModal from '../../component/common/RatingModal';

const { width, height } = Dimensions.get('window');

const ClientTaskDetailScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('task');
  const { user } = useContext(AuthContext);
  const { getTaskDetails } = useContext(PosterContext);
  const [showReportModal, setShowReportModal] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);
  const [fabAnimation] = useState(new Animated.Value(0));
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [headerScroll] = useState(new Animated.Value(0));

  // Enhanced FAB animation
  const toggleFAB = () => {
    const toValue = fabExpanded ? 0 : 1;
    setFabExpanded(!fabExpanded);
    Animated.spring(fabAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const response = await clientGetTaskInfo(taskId);
      if (response.status === 200) {
        setTask(response.data);
      } else {
        Alert.alert('Error', 'Task not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      Alert.alert('Error', 'Failed to load task details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTaskDetails();
  };

  const handleEditTask = () => {
    navigate('EditTask', { taskId: taskId, task: task });
  };

  const handleViewApplicants = () => {
    navigation.navigate('TaskApplicants', {
      taskId: task._id,
      task: task,
      assignedTo: task.assignedTo || null
    });
  };

  const handleViewSubmissions = () => {
    navigation.navigate('TaskSubmissions', { taskId: task._id, taskTitle: task.title });
  };

  const handleMarkAsDone = async () => {
    try {
      Alert.alert(
        "Mark as Done",
        "Are you sure you want to mark this task as completed? This will release payment to the tasker.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark as Done",
            style: "default",
            onPress: async () => {
              const res = await markTaskAsDoneClient(taskId)
              if (res.status === 200) {
                Alert.alert("Success", "Task marked as completed!");
                setTimeout(() => {
                  setRatingModalVisible(true);
                }, 750);
                loadTaskDetails();
              }
            }
          }
        ]
      );
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error || 'Error marking task as done'
      console.error(errorMessage);
      Alert.alert(errorMessage);
    }
  };

  const handleReportPress = () => {
    setShowReportModal(true);
  };

  const handleReportSubmitted = () => {
    Alert.alert('Success', 'Your report has been submitted successfully!');
  };

  const getStatusColor = (status) => {
    const colors = {
      'assigned': '#3B82F6',
      'in-progress': '#F59E0B',
      'review': '#8B5CF6',
      'completed': '#10B981',
      'closed': '#6B7280',
      'open': '#10B981',
      'pending': '#F97316'
    };
    return colors[status?.toLowerCase()] || '#6B7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'assigned': 'person-check',
      'in-progress': 'timer',
      'review': 'eye',
      'completed': 'checkmark-circle',
      'closed': 'lock-closed',
      'open': 'lock-open',
      'pending': 'time'
    };
    return icons[status?.toLowerCase()] || 'help-circle';
  };

  const formatDate = (date) => {
    return moment(date).format("MMM DD, YYYY");
  };

  const formatDateTime = (date) => {
    return moment(date).format("MMM DD, YYYY [at] h:mm A");
  };

  const hasApplicants = task?.applicants && task.applicants.length > 0;
  const isAssigned = task?.assignedTo && task.status !== 'Open' && task.status !== 'Pending';
  const isTaskCompleted = task?.status?.toLowerCase() === 'completed';
  const canMarkAsDone = isAssigned && !isTaskCompleted && task?.markedDoneByEmployer === false;

  // Header animation values
  const headerOpacity = headerScroll.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Task Details" showBackButton={true} />
        <LoadingIndicator text='Loading Task Details...' />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Task Details" showBackButton={true} />
        <View style={styles.errorContainer}>
          <Ionicons name="sad-outline" size={64} color="#94A3B8" />
          <Text style={styles.errorTitle}>Task Not Found</Text>
          <Text style={styles.errorSubtitle}>The task you're looking for doesn't exist or has been removed.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Enhanced Components
  const TabButton = ({ title, icon, isActive, onPress, badge }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <View style={styles.tabIconContainer}>
        <Ionicons
          name={icon}
          size={20}
          color={isActive ? '#FFFFFF' : '#6B7280'}
        />
        {badge && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const InfoCard = ({ icon, title, value, color = '#6366F1', subtitle }) => (
    <View style={styles.infoCard}>
      <LinearGradient
        colors={[color + '20', color + '10']}
        style={[styles.infoIcon, { borderColor: color + '40' }]}
      >
        <Ionicons name={icon} size={20} color={color} />
      </LinearGradient>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
        {subtitle && <Text style={styles.infoSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const ProgressStep = ({ completed, current, label, date }) => (
    <View style={styles.progressStep}>
      <View style={[
        styles.progressDot,
        completed && styles.progressDotCompleted,
        current && styles.progressDotCurrent
      ]}>
        {completed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
      </View>
      <View style={styles.progressContent}>
        <Text style={[
          styles.progressLabel,
          completed && styles.progressLabelCompleted,
          current && styles.progressLabelCurrent
        ]}>
          {label}
        </Text>
        {date && (
          <Text style={styles.progressDate}>
            {formatDateTime(date)}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1F3B" translucent={true} />
      <Header title="Task Details" showBackButton={true} transparent />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: headerScroll } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Main Content */}
        <View style={styles.content}>

          {/* Enhanced Task Header Card */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={styles.heroGradient}
            >
              <View style={styles.heroHeader}>
                <View style={styles.heroTitleContainer}>
                  <Text style={styles.heroTitle} numberOfLines={2}>{task.title}</Text>
                  <View style={styles.heroMeta}>
                   <View style={styles.heroMetaItem}>
                     <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(task.status) }]} />
                      <Text style={styles.heroMetaText}>Status: {task.status}</Text>
                      </View>
                    <View style={styles.heroMetaItem}>
                      <Ionicons name="calendar-outline" size={14} color="#E0E7FF" />
                      <Text style={styles.heroMetaText}>Posted {formatDate(task.createdAt)}</Text>
                    </View>
                    <View style={styles.heroMetaItem}>
                      <Ionicons name="time-outline" size={14} color="#E0E7FF" />
                      <Text style={styles.heroMetaText}>Due {formatDate(task.deadline)}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.heroEditButton}
                  onPress={handleEditTask}
                >
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{task.applicants?.length || 0}</Text>
                  <Text style={styles.quickStatLabel}>Applicants</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{task.metrics?.views || '0'}</Text>
                  <Text style={styles.quickStatLabel}>Views</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{task.metrics?.saves || '0'}</Text>
                  <Text style={styles.quickStatLabel}>Saves</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Enhanced Completion Status */}
          {isAssigned && (
            <View style={styles.completionCard}>
              <Text style={styles.completionTitle}>Completion Progress</Text>
              <View style={styles.progressContainer}>
                <ProgressStep
                  completed={task.markedDoneByEmployer}
                  current={!task.markedDoneByEmployer && !task.markedDoneByTasker}
                  label="You marked as done"
                  date={task.employerDoneAt}
                />
                <View style={styles.progressLine} />
                <ProgressStep
                  completed={task.markedDoneByTasker}
                  current={task.markedDoneByEmployer && !task.markedDoneByTasker}
                  label="Tasker marked as done"
                  date={task.taskerDoneAt}
                />
              </View>

              {task.markedDoneByEmployer && task.markedDoneByTasker && (
                <View style={styles.mutualCompletion}>
                  <Ionicons name="checkmark-done" size={20} color="#10B981" />
                  <Text style={styles.mutualCompletionText}>
                    Task completed successfully!
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Enhanced Tab Navigation */}
          <View style={styles.tabContainer}>
            <TabButton
              title="Overview"
              icon="document-text-outline"
              isActive={activeTab === 'task'}
              onPress={() => setActiveTab('task')}
            />
            {isAssigned && (
              <TabButton
                title="Tasker"
                icon="person-outline"
                isActive={activeTab === 'tasker'}
                onPress={() => setActiveTab('tasker')}
                badge={task.assignedTo ? "1" : null}
              />
            )}
            <TabButton
              title="Requirements"
              icon="checkmark-done-outline"
              isActive={activeTab === 'requirements'}
              onPress={() => setActiveTab('requirements')}
              badge={task.skillsRequired?.length || null}
            />
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'task' && (
              <>
                {/* Enhanced Task Overview */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="information-circle" size={22} color="#6366F1" />
                    <Text style={styles.sectionTitle}>Task Description</Text>
                  </View>
                  <Text style={styles.taskDescription}>{task.description}</Text>

                  {/* Key Information Grid */}
                  <View style={styles.infoGrid}>
                    <InfoCard
                      icon="cash-outline"
                      title="Budget"
                      value={`₵${task.budget}`}
                      color="#10B981"
                      subtitle="Fixed price"
                    />
                    <InfoCard
                      icon="calendar-outline"
                      title="Deadline"
                      value={formatDate(task.deadline)}
                      color="#F59E0B"
                      subtitle={moment(task.deadline).fromNow()}
                    />
                    <InfoCard
                      icon="location-outline"
                      title="Location"
                      value={task.locationType === 'on-site' ? 'On-site' : 'Remote'}
                      color="#6366F1"
                      subtitle={task.address?.city || 'Not specified'}
                    />
                    <InfoCard
                      icon="briefcase-outline"
                      title="Category"
                      value={task.category}
                      color="#8B5CF6"
                      subtitle={task.subcategory || 'General'}
                    />
                  </View>
                </View>

                {/* Enhanced Timeline */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time-outline" size={22} color="#6366F1" />
                    <Text style={styles.sectionTitle}>Timeline</Text>
                  </View>
                  <View style={styles.timeline}>
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Task Created</Text>
                        <Text style={styles.timelineDate}>{formatDateTime(task.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={styles.timelineConnector} />
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Deadline</Text>
                        <Text style={styles.timelineDate}>{formatDateTime(task.deadline)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            {activeTab === 'tasker' && isAssigned && task.assignedTo && (
              <TouchableOpacity
                onPress={() => navigate('ApplicantProfile', { applicant: task.assignedTo, taskId })}
                style={styles.sectionCard}
              >
                <View style={styles.sectionHeader}>
                  <Ionicons name="person" size={22} color="#6366F1" />
                  <Text style={styles.sectionTitle}>Assigned Tasker</Text>
                </View>

                <View style={styles.taskerCard}>
                  <View style={styles.taskerHeader}>
                    <View style={styles.taskerAvatar}>
                      {task.assignedTo.profileImage ? (
                        <Image
                          source={{ uri: task.assignedTo.profileImage }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {task.assignedTo.name?.charAt(0)?.toUpperCase() || 'T'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.taskerInfo}>
                      <Text style={styles.taskerName}>{task.assignedTo.name || 'Tasker'}</Text>
                      <Text style={styles.taskerEmail}>{task.assignedTo.email}</Text>
                      {task.assignedTo.phone && (
                        <Text style={styles.taskerPhone}>{task.assignedTo.phone}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                  </View>

                  <View style={styles.taskerStats}>
                    <View style={styles.taskerStat}>
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Text style={styles.taskerStatValue}>
                        {task.assignedTo.rating?.toFixed(1) || 'N/A'}
                      </Text>
                      <Text style={styles.taskerStatLabel}>Rating</Text>
                    </View>
                    <View style={styles.taskerStat}>
                      <Ionicons name="checkmark-done" size={16} color="#10B981" />
                      <Text style={styles.taskerStatValue}>
                        {task.assignedTo.completedTasks || '0'}
                      </Text>
                      <Text style={styles.taskerStatLabel}>Completed</Text>
                    </View>
                    <View style={styles.taskerStat}>
                      <Ionicons name="trending-up" size={16} color="#6366F1" />
                      <Text style={styles.taskerStatValue}>
                        {task.assignedTo.completionRate ? `${task.assignedTo.completionRate}%` : 'N/A'}
                      </Text>
                      <Text style={styles.taskerStatLabel}>Success Rate</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {activeTab === 'requirements' && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-done" size={22} color="#6366F1" />
                  <Text style={styles.sectionTitle}>Task Requirements</Text>
                </View>

                {task.skillsRequired && task.skillsRequired.length > 0 && (
                  <View style={styles.skillsSection}>
                    <Text style={styles.subsectionTitle}>Required Skills</Text>
                    <View style={styles.skillsContainer}>
                      {task.skillsRequired.map((skill, index) => (
                        <View key={index} style={styles.skillTag}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          <Text style={styles.skillText}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {task.verificationRequired && (
                  <View style={styles.verificationSection}>
                    <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
                    <View style={styles.verificationContent}>
                      <Text style={styles.verificationTitle}>Verification Required</Text>
                      <Text style={styles.verificationText}>
                        Task completion requires verification before payment release
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Enhanced Applicants Preview */}
          {hasApplicants && task.status !== "Completed" && (
            <View style={styles.applicantsPreview}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={22} color="#6366F1" />
                <Text style={styles.sectionTitle}>Recent Applicants</Text>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={handleViewApplicants}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#6366F1" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.applicantsScroll}
              >
                {task.applicants.slice(0, 5).map((applicant, index) => (
                  <View key={index} style={styles.applicantCard}>
                    <View style={styles.applicantAvatar}>
                      <Text style={styles.applicantAvatarText}>
                        {applicant.name?.charAt(0)?.toUpperCase() || 'A'}
                      </Text>
                    </View>
                    <Text style={styles.applicantName} numberOfLines={1}>
                      {applicant.name || 'Applicant'}
                    </Text>
                    <Text style={styles.applicantDate}>
                      {applicant.appliedDate ? moment(applicant.appliedDate).fromNow() : 'Recently'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Enhanced FAB with Better UX */}
      <View style={styles.fabContainer}>
        {/* Backdrop */}
        {fabExpanded && (
          <TouchableWithoutFeedback onPress={toggleFAB}>
            <View style={styles.fabBackdrop} />
          </TouchableWithoutFeedback>
        )}

        {/* Action Buttons with Improved Staggering */}
        <Animated.View
          style={[
            styles.fabActionButtons,
            {
              opacity: fabAnimation,
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [80, 0]
                })
              }]
            }
          ]}
        >
          {hasApplicants && task.status !== "Completed" && (
            <Animated.View style={{
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }],
              opacity: fabAnimation
            }}>
              <TouchableOpacity
                style={[styles.fabActionButton, styles.fabApplicants]}
                onPress={() => {
                  toggleFAB();
                  handleViewApplicants();
                }}
              >
                <Ionicons name="people" size={20} color="#FFFFFF" />
                <Text style={styles.fabActionText}>
                  Applicants ({task.applicants?.length || 0})
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <Animated.View style={{
            transform: [{
              translateY: fabAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [15, 0]
              })
            }],
            opacity: fabAnimation
          }}>
            <TouchableOpacity
              style={[styles.fabActionButton, styles.fabEdit]}
              onPress={() => {
                toggleFAB();
                handleEditTask();
              }}
            >
              <Ionicons name="create" size={20} color="#FFFFFF" />
              <Text style={styles.fabActionText}>Edit Task</Text>
            </TouchableOpacity>
          </Animated.View>

          {task.status !== "Open" && (
            <Animated.View style={{
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0]
                })
              }],
              opacity: fabAnimation
            }}>
              <TouchableOpacity
                style={[styles.fabActionButton, styles.fabSubmissions]}
                onPress={() => {
                  toggleFAB();
                  handleViewSubmissions();
                }}
              >
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
                <Text style={styles.fabActionText}>Submissions</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {(task.status === "Assigned" || task.status === "In-progress") && (
            <Animated.View style={{
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [5, 0]
                })
              }],
              opacity: fabAnimation
            }}>
              <TouchableOpacity
                style={[styles.fabActionButton, styles.fabReport]}
                onPress={() => {
                  toggleFAB();
                  handleReportPress();
                }}
              >
                <Ionicons name="flag" size={20} color="#FFFFFF" />
                <Text style={styles.fabActionText}>Report Issue</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {canMarkAsDone && (
            <Animated.View style={{
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0]
                })
              }],
              opacity: fabAnimation
            }}>
              <TouchableOpacity
                style={[styles.fabActionButton, styles.fabComplete]}
                onPress={() => {
                  toggleFAB();
                  handleMarkAsDone();
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.fabActionText}>Mark Complete</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* Main FAB */}
        <TouchableOpacity
          style={[styles.mainFAB, fabExpanded && styles.mainFABExpanded]}
          onPress={toggleFAB}
          activeOpacity={0.8}
        >
          <Animated.View style={{
            transform: [{
              rotate: fabAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '45deg']
              })
            }]
          }}>
            <Ionicons
              name={fabExpanded ? "close" : "ellipsis-horizontal"}
              size={24}
              color="#FFFFFF"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ReportForm
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        task={task}
        onReportSubmitted={handleReportSubmitted}
      />

      <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        userId={task.assignedTo?._id}
        userName={task.assignedTo?.name}
        userRole='tasker'
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  heroCard: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroGradient: {
    padding: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 28,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: 12,
    color: '#E0E7FF',
    fontWeight: '500',
  },
  heroEditButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 10,
    color: '#E0E7FF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  quickStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Enhanced Completion Card
  completionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  progressContainer: {
    gap: 8,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginRight: 6,
},
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotCompleted: {
    backgroundColor: '#10B981',
  },
  progressDotCurrent: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  progressContent: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  progressLabelCompleted: {
    color: '#10B981',
  },
  progressLabelCurrent: {
    color: '#1E293B',
  },
  progressDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  progressLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginLeft: 11,
  },
  mutualCompletion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  mutualCompletionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },

  // Enhanced Tab Styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#6366F1',
  },
  tabIconContainer: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // Enhanced Section Cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Enhanced Info Grid
  infoGrid: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // Enhanced Timeline
  timeline: {
    gap: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  timelineConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginLeft: 5,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#64748B',
  },

  // Enhanced Tasker Card
  taskerCard: {
    gap: 16,
  },
  taskerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  taskerInfo: {
    flex: 1,
  },
  taskerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  taskerEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  taskerPhone: {
    fontSize: 14,
    color: '#64748B',
  },
  taskerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  taskerStat: {
    alignItems: 'center',
    gap: 4,
  },
  taskerStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  taskerStatLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Enhanced Skills Section
  skillsSection: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Enhanced Verification Section
  verificationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  verificationText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },

  // Enhanced Applicants Preview
  applicantsPreview: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  applicantsScroll: {
    marginTop: 12,
  },
  applicantCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  applicantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  applicantAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  applicantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  applicantDate: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },

  // Enhanced FAB Styles
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 1000,
    alignItems: 'flex-end',
  },
  fabBackdrop: {
    ...StyleSheet.absoluteFillObject,
   
  },
  fabActionButtons: {
    position: 'absolute',
    bottom: 112,
    right: 0,
    gap: 8,
    alignItems: 'flex-end',
  },
  fabActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
    minWidth: 160,
  },
  fabApplicants: {
    backgroundColor: '#10B981',
  },
  fabEdit: {
    backgroundColor: '#6366F1',
  },
  fabSubmissions: {
    backgroundColor: '#8B5CF6',
  },
  fabReport: {
    backgroundColor: '#EF4444',
  },
  fabComplete: {
    backgroundColor: '#F59E0B',
  },
  fabActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  mainFAB: {
    width: 60,
    height: 60,
    bottom:55,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  mainFABExpanded: {
    backgroundColor: '#4F46E5',
  },

  // Enhanced Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  content: {
    paddingTop: 10, // Space for animated header
  },
  scrollView: {
    flex: 1,
  },
});

export default ClientTaskDetailScreen;