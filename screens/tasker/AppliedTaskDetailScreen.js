import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  
  Image,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from '../../component/tasker/Header';
import ReportForm from '../../component/common/reportForm';
import WorkSubmissionModal from '../../component/tasker/WorkSubmissionModal'
import { AuthContext } from '../../context/AuthContext';
import {getMiniTaskInfo,acceptMiniTaskAssignment,rejectMiniTaskAssignment,markTaskAsDoneTasker} from '../../api/miniTaskApi'
import { navigate } from '../../services/navigationService';
import { styles } from '../../styles/tasker/AppliedTaskDetailScreen.Styles';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import RatingModal from '../../component/common/RatingModal';

const { width } = Dimensions.get('window');

const AppliedTaskDetailsScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('task');
  const { user } = useContext(AuthContext);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  
  const [fabExpanded, setFabExpanded] = useState(false);
  const [fabAnimation] = useState(new Animated.Value(0));

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
      const response = await getMiniTaskInfo(taskId);
      
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
    }
  };

  const handleAcceptAssignment = async () => {
    try {
      Alert.alert(
        "Accept Assignment",
        "Are you sure you want to accept this task?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Accept", 
            style: "default",
            onPress: async () => {
              const res = await acceptMiniTaskAssignment(taskId)
              if(res.status === 200){
                Alert.alert("Success", "Task accepted successfully!");
                loadTaskDetails();
              }
            }
          }
        ]
      );
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
          error.response?.data?.error || 'Error accepting task assignment'
      console.error(errorMessage);
      Alert.alert(errorMessage);
    }
  };

  const handleDeclineAssignment = async () => {
    try {
      Alert.alert(
        "Decline Assignment",
        "Are you sure you want to decline this task? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Decline", 
            style: "destructive",
            onPress: async () => {
              const res = await rejectMiniTaskAssignment(taskId)
              if(res.status === 200){
                Alert.alert("Task Declined", "You have declined this task assignment.");
                navigation.goBack(); 
              }
            }
          }
        ]
      );
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
          error.response?.data?.error || 'Error declining assignment'
      console.error(errorMessage);
      Alert.alert(errorMessage);
    }
  };

  const handleMarkAsDone = async () => {
    try {
      Alert.alert(
        "Mark as Done",
        "Are you sure you want to mark this task as completed?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Mark as Done", 
            style: "default",
            onPress: async () => {
              const res = await markTaskAsDoneTasker(taskId)
              if (res.status === 200){
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
    if (!isAssignedToUser) {
      Alert.alert(
        'Not Assigned',
        'You can only report issues for tasks assigned to you.'
      );
      return;
    }
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

  const isAssignedToUser = task?.assignedTo && String(task.assignedTo) === String(user?._id);
  const isAssignmentPending = isAssignedToUser && task?.assignmentAccepted === false;
  const isTaskCompleted = task?.status?.toLowerCase() === 'completed';
  const canSubmitWork = isAssignedToUser && !isTaskCompleted;
  const hasTaskerMarkedDone = task?.markedDoneByTasker === true;
  const canMarkAsDone = isAssignedToUser && !isTaskCompleted && !hasTaskerMarkedDone;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Task Details" showBackButton={true} />
        <LoadingIndicator text='Loading Task Details...'/>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Task Details" showBackButton={true} />
        <View style={styles.errorContainer}>
          <Ionicons name="sad-outline" size={48} color="#94A3B8" />
          <Text style={styles.errorText}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

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

  const SafetyGuideline = ({ icon, text, color }) => (
    <View style={[styles.safetyItem, { backgroundColor: color + '20', borderColor: color + '40' }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.safetyText, { color }]}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1F3B" />
      <Header title="Task Details" showBackButton={true} />
      
      {/* Assignment Acceptance Banner */}
      {isAssignmentPending && (
        <View style={styles.assignmentAcceptanceCard}>
          <View style={styles.assignmentHeader}>
            <Ionicons name="person-add" size={24} color="#F59E0B" />
            <Text style={styles.assignmentTitle}>Task Assignment</Text>
          </View>
          <Text style={styles.assignmentMessage}>
            You've been assigned to this task! Please accept or decline the assignment to proceed.
          </Text>
          <View style={styles.assignmentButtons}>
            <TouchableOpacity 
              style={[styles.assignmentButton, styles.acceptButton]}
              onPress={handleAcceptAssignment}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Accept Task</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.assignmentButton, styles.declineButton]}
              onPress={handleDeclineAssignment}
            >
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.declineButtonText}>Decline Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Header Section */}
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
                    <Ionicons name="flag-outline" size={14} color="#E0E7FF" />
                    <Text style={styles.heroMetaText}>Status: {task.status}</Text>
                  </View>
                  <View style={styles.heroMetaItem}>
                    <Ionicons name="cash-outline" size={14} color="#E0E7FF" />
                    <Text style={styles.heroMetaText}>₵{task.budget}</Text>
                  </View>
                </View>
              </View>
              
              {/* Assignment Status Badge */}
              {isAssignedToUser ? (
                task?.assignmentAccepted ? (
                  <View style={styles.assignmentStatusBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.assignmentStatusText}>Accepted</Text>
                  </View>
                ) : (
                  <View style={styles.assignmentStatusBadge}>
                    <Ionicons name="time" size={16} color="#F59E0B" />
                    <Text style={styles.assignmentStatusText}>Pending</Text>
                  </View>
                )
              ) : (
                <View style={styles.assignmentStatusBadge}>
                  <Ionicons name="person-outline" size={16} color="#E0E7FF" />
                  <Text style={styles.assignmentStatusText}>Available</Text>
                </View>
              )}
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <Ionicons name="calendar-outline" size={14} color="#E0E7FF" />
                <Text style={styles.quickStatText}>Posted {formatDate(task.createdAt)}</Text>
              </View>
              <View style={styles.quickStat}>
                <Ionicons name="time-outline" size={14} color="#E0E7FF" />
                <Text style={styles.quickStatText}>Due {formatDate(task.deadline)}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Enhanced Completion Status */}
        {isAssignedToUser && task?.assignmentAccepted && (
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>Completion Progress</Text>
            <View style={styles.progressContainer}>
              <ProgressStep
                completed={task.markedDoneByTasker}
                current={!task.markedDoneByTasker && !task.markedDoneByEmployer}
                label="You marked as done"
                date={task.taskerDoneAt}
              />
              <View style={styles.progressLine} />
              <ProgressStep
                completed={task.markedDoneByEmployer}
                current={task.markedDoneByTasker && !task.markedDoneByEmployer}
                label="Client marked as done"
                date={task.employerDoneAt}
              />
            </View>

            {task.markedDoneByTasker && task.markedDoneByEmployer && (
              <View style={styles.mutualCompletion}>
                <Ionicons name="checkmark-done" size={20} color="#10B981" />
                <Text style={styles.mutualCompletionText}>
                  Task mutually completed!
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
          {isAssignedToUser && (
            <TabButton
              title="Employer"
              icon="business-outline"
              isActive={activeTab === 'employer'}
              onPress={() => setActiveTab('employer')}
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
                    value={task.locationType}
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
              </View>
            </>
          )}

          {activeTab === 'employer' && isAssignedToUser && task.employer && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={22} color="#6366F1" />
                <Text style={styles.sectionTitle}>Employer Profile</Text>
              </View>

              <View style={styles.employerCard}>
                <View style={styles.employerHeader}>
                  <View style={styles.employerAvatar}>
                    {task.employer.profileImage ? (
                      <Image
                        source={{ uri: task.employer.profileImage }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {task.employer.name?.charAt(0)?.toUpperCase() || 'E'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.employerInfo}>
                    <Text style={styles.employerName}>{task.employer.name}</Text>
                    {task.employer.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                    <Text style={styles.employerBio}>
                      {task.employer.Bio || "No bio available"}
                    </Text>
                  </View>
                </View>

                {/* Contact Information */}
                <View style={styles.contactSection}>
                  <View style={styles.contactItem}>
                    <Ionicons name="mail" size={20} color="#6366F1" />
                    <View>
                      <Text style={styles.contactLabel}>Email</Text>
                      <Text style={styles.contactValue}>{task.employer.email}</Text>
                    </View>
                  </View>
                  {task.employer.phone && (
                    <View style={styles.contactItem}>
                      <Ionicons name="call" size={20} color="#6366F1" />
                      <View>
                        <Text style={styles.contactLabel}>Phone</Text>
                        <Text style={styles.contactValue}>{task.employer.phone}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Enhanced Employer Stats */}
                <View style={styles.employerStats}>
                  <View style={styles.ratingStatsCard}>
                    <View style={styles.ratingMain}>
                      <View style={styles.ratingStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= Math.floor(task.employer.rating || 0) ? "star" : "star-outline"}
                            size={16}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                      <Text style={styles.ratingValue}>
                        {task.employer.rating?.toFixed(1) || '0.0'}
                      </Text>
                    </View>
                    <Text style={styles.reviewsCount}>
                      {task.employer.numberOfRatings || 0} reviews
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'requirements' && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkmark-done" size={22} color="#6366F1" />
                <Text style={styles.sectionTitle}>Task Requirements</Text>
              </View>

              {/* Enhanced Skills Section */}
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

              {/* Enhanced Verification Requirements */}
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

              {/* Enhanced Special Instructions */}
              <View style={styles.instructionsSection}>
                <Text style={styles.subsectionTitle}>Special Instructions</Text>
                <Text style={styles.instructionsText}>
                  {task.specialInstructions || "No special instructions provided."}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Enhanced Safety Guidelines */}
        <View style={styles.safetyCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={22} color="#6366F1" />
            <Text style={styles.sectionTitle}>Safety Guidelines</Text>
          </View>
          
          <View style={styles.safetyList}>
            <SafetyGuideline
              icon="warning"
              text="Never share personal financial information"
              color="#EF4444"
            />
            <SafetyGuideline
              icon="location"
              text="Meet in public places for onsite work"
              color="#3B82F6"
            />
            <SafetyGuideline
              icon="chatbubble"
              text="Keep all communication on the platform"
              color="#10B981"
            />
          </View>
        </View>
      </ScrollView>

      {/* Enhanced FAB System */}
      <View style={styles.fabContainer}>
        {/* Backdrop */}
        {fabExpanded && (
          <TouchableWithoutFeedback onPress={toggleFAB}>
            <View style={styles.fabBackdrop} />
          </TouchableWithoutFeedback>
        )}

        {/* Action Buttons with Staggered Animation */}
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
          {isAssignedToUser && task?.assignmentAccepted && (
            <>
              {canSubmitWork && (
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
                    style={[styles.fabActionButton, styles.fabSubmit]}
                    onPress={() => {
                      toggleFAB();
                      setShowWorkModal(true);
                    }}
                  >
                    <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                    <Text style={styles.fabActionText}>Submit Work</Text>
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
                  style={[styles.fabActionButton, styles.fabSubmissions]}
                  onPress={() => {
                    toggleFAB();
                    navigate('Submissions', { taskId: task._id, taskTitle: task.title });
                  }}
                >
                  <Ionicons name="document-text" size={20} color="#FFFFFF" />
                  <Text style={styles.fabActionText}>View Submissions</Text>
                </TouchableOpacity>
              </Animated.View>

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

              {/* Mark as Done Button */}
              {hasTaskerMarkedDone ? (
                <Animated.View style={{
                  transform: [{
                    translateY: fabAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [5, 0]
                    })
                  }],
                  opacity: fabAnimation
                }}>
                  <View style={[styles.fabActionButton, styles.fabCompleteDisabled]}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.fabActionText}>Already Marked Done</Text>
                  </View>
                </Animated.View>
              ) : canMarkAsDone ? (
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
                    <Text style={styles.fabActionText}>Mark as Done</Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : null}
            </>
          )}

          {/* Assignment Acceptance Buttons */}
          {isAssignmentPending && (
            <>
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
                  style={[styles.fabActionButton, styles.fabAccept]}
                  onPress={() => {
                    toggleFAB();
                    handleAcceptAssignment();
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.fabActionText}>Accept Task</Text>
                </TouchableOpacity>
              </Animated.View>

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
                  style={[styles.fabActionButton, styles.fabDecline]}
                  onPress={() => {
                    toggleFAB();
                    handleDeclineAssignment();
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.fabActionText}>Decline Task</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}

          {/* Enhanced Hint Cards */}
          {!isAssignedToUser && task?.status?.toLowerCase() === 'open' && (
            <View style={styles.fabHintCard}>
              <Ionicons name="information-circle" size={20} color="#6366F1" />
              <View style={styles.hintTextContainer}>
                <Text style={styles.hintTitle}>Task Actions</Text>
                <Text style={styles.hintDescription}>
                  Task actions will appear here once you're assigned to this task
                </Text>
              </View>
            </View>
          )}

          {!isAssignedToUser && task?.status?.toLowerCase() !== 'open' && task?.status?.toLowerCase() !== 'assigned' && (
            <View style={styles.fabHintCard}>
              <Ionicons name="time" size={20} color="#F59E0B" />
              <View style={styles.hintTextContainer}>
                <Text style={styles.hintTitle}>No Actions Available</Text>
                <Text style={styles.hintDescription}>
                  Task actions are only available for assigned tasks
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Enhanced Main FAB */}
        <TouchableOpacity 
          style={[
            styles.mainFAB,
            !isAssignedToUser && styles.mainFABDisabled,
            fabExpanded && styles.mainFABExpanded
          ]}
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
              name={
                fabExpanded ? "close" : 
                !isAssignedToUser ? "information-circle" : "ellipsis-horizontal"
              } 
              size={24} 
              color="#FFFFFF" 
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Enhanced Tooltip */}
        {!isAssignedToUser && !fabExpanded && (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>Task Info</Text>
          </View>
        )}
      </View>

      <ReportForm
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        task={task}
        onReportSubmitted={handleReportSubmitted}
      />
      
      <WorkSubmissionModal
        isVisible={showWorkModal}
        onClose={() => setShowWorkModal(false)}
        taskId={task._id}
        task={task}
        onSubmissionSuccess={() => {
          loadTaskDetails();
        }}
      />

      <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        userId={task.employer?._id}
        userName={task.employer?.name}
        userRole='client'
      />
    </SafeAreaView>
  );
};

export default AppliedTaskDetailsScreen;
