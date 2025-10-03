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
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
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
      
      const response = await  getMiniTaskInfo(taskId);
      
      if (response.status ===200) {
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
    // Replace with your actual API call
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
            if(res.status ===200){
            Alert.alert("Success", "Task accepted successfully!");
            loadTaskDetails(); // Reload to update the UI
            }
           
          }
        }
      ]
    );
  } catch (error) {
    const errorMessage = error.response?.data?.message ||
        error.response?.data?.error || 'Error", "Failed to accept task assignment'
        console.error(errorMessage);
        Alert.alert(errorMessage );
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
            if(res.status ===200){
            Alert.alert("Task Declined", "You have declined this task assignment.");
            navigation.goBack(); 
            }
               
          }
        }
      ]
    );
  } catch (error) {
    const errorMessage = error.response?.data?.message ||
        error.response?.data?.error || 'Error declining assignment. Failed to decline task assignment'
        console.error(errorMessage);
        Alert.alert(errorMessage );
  };
};

// Add this function to handle marking task as done
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
            if (res.status ===200){
            Alert.alert("Success", "Task marked as completed! ");
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
  
  // Updated logic for marking as done
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
          <Text style={styles.errorText}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const TabButton = ({ title, icon, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={isActive ? '#FFFFFF' : '#6B7280'} 
      />
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const InfoCard = ({ icon, title, value, color = '#6366F1' }) => (
    <View style={styles.infoCard}>
      <View style={[styles.infoIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  const ActionButton = ({ title, icon, color, onPress, disabled = false }) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: color }, disabled && styles.actionButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={20} color="#FFFFFF" />
      <Text style={styles.actionButtonText}>{title}</Text>
    </TouchableOpacity>
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
        onPress={() => handleAcceptAssignment()}
      >
        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
        <Text style={styles.acceptButtonText}>Accept Task</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.assignmentButton, styles.declineButton]}
        onPress={() => handleDeclineAssignment()}
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
        {/* Header Section */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.titleContainer}>
              <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                  {task.status?.replace('-', ' ')}
                </Text>
              </View>
            </View>
            
           {isAssignedToUser ? (
               task?.assignmentAccepted ? (
              <View style={styles.assignmentBadge}>
               <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.assignmentText}>Assigned & Accepted</Text>
                 </View>
                 ) : (
                <View style={styles.assignmentBadge}>
                <Ionicons name="time" size={20} color="#F59E0B" />
                <Text style={styles.assignmentText}>Pending Acceptance</Text>
             </View>
            )
          ) : (
          <View style={styles.assignmentBadge}>
          <Ionicons name="person-outline" size={20} color="#6B7280" />
         <Text style={styles.assignmentText}>Available Task</Text>
         </View>
          )}
          </View>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>Created: {formatDate(task.createdAt)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>Deadline: {formatDate(task.deadline)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>Budget: ₵{task.budget}</Text>
            </View>
          </View>

          {/* Completion Status Section */}
          {isAssignedToUser && task?.assignmentAccepted && (
            <View style={styles.completionStatusSection}>
              <View style={styles.completionStatusRow}>
                <View style={styles.completionStatusItem}>
                  <Ionicons 
                    name={task.markedDoneByTasker ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={task.markedDoneByTasker ? "#10B981" : "#6B7280"} 
                  />
                  <Text style={[
                    styles.completionStatusText,
                    task.markedDoneByTasker && styles.completionStatusTextDone
                  ]}>
                    You marked as done
                  </Text>
                  {task.taskerDoneAt && (
                    <Text style={styles.completionTimeText}>
                      {formatDateTime(task.taskerDoneAt)}
                    </Text>
                  )}
                </View>
                
                <View style={styles.completionStatusItem}>
                  <Ionicons 
                    name={task.markedDoneByEmployer ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={task.markedDoneByEmployer ? "#10B981" : "#6B7280"} 
                  />
                  <Text style={[
                    styles.completionStatusText,
                    task.markedDoneByEmployer && styles.completionStatusTextDone
                  ]}>
                    Client marked as done
                  </Text>
                  {task.employerDoneAt && (
                    <Text style={styles.completionTimeText}>
                      {formatDateTime(task.employerDoneAt)}
                    </Text>
                  )}
                </View>
              </View>
              
              {/* Mutual Completion Status */}
              {task.markedDoneByTasker && task.markedDoneByEmployer && (
                <View style={styles.mutualCompletionBadge}>
                  <Ionicons name="checkmark-done" size={16} color="#10B981" />
                  <Text style={styles.mutualCompletionText}>
                    Task mutually completed!
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TabButton
            title="Task Details"
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
          />
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'task' && (
            <>
              {/* Task Overview */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="information-circle-outline" size={20} color="#6366F1" />
                  <Text style={styles.sectionTitle}>Task Overview</Text>
                </View>
                <Text style={styles.taskDescription}>{task.description}</Text>

                {/* Key Information */}
                <View style={styles.infoGrid}>
                  <InfoCard
                    icon="cash-outline"
                    title="Budget"
                    value={`₵${task.budget}`}
                    color="#10B981"
                  />
                  <InfoCard
                    icon="calendar-outline"
                    title="Deadline"
                    value={formatDate(task.deadline)}
                    color="#F59E0B"
                  />
                  <InfoCard
                    icon="location-outline"
                    title="Location"
                    value={task.locationType}
                    color="#6366F1"
                  />
                  <InfoCard
                    icon="briefcase-outline"
                    title="Category"
                    value={task.category}
                    color="#8B5CF6"
                  />
                </View>

                {/* Location Details */}
                {task.address && (
                  <View style={styles.locationSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="map-outline" size={20} color="#6366F1" />
                      <Text style={styles.sectionTitle}>Location Details</Text>
                    </View>
                    <View style={styles.locationGrid}>
                      <View style={styles.locationItem}>
                        <Text style={styles.locationLabel}>Region</Text>
                        <Text style={styles.locationValue}>{task.address.region || "Not specified"}</Text>
                      </View>
                      <View style={styles.locationItem}>
                        <Text style={styles.locationLabel}>City</Text>
                        <Text style={styles.locationValue}>{task.address.city || "Not specified"}</Text>
                      </View>
                      <View style={styles.locationItem}>
                        <Text style={styles.locationLabel}>Suburb</Text>
                        <Text style={styles.locationValue}>{task.address.suburb || "Not specified"}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Task Timeline */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Task Timeline</Text>
                <View style={styles.timeline}>
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineLabel}>Task Created</Text>
                    <Text style={styles.timelineDate}>{formatDate(task.createdAt)}</Text>
                  </View>
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineLabel}>Deadline</Text>
                    <Text style={styles.timelineDate}>{formatDate(task.deadline)}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {activeTab === 'employer' && isAssignedToUser && task.employer && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={20} color="#6366F1" />
                <Text style={styles.sectionTitle}>Employer Profile</Text>
              </View>

              {/* Employer Header */}
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
                  <Ionicons name="mail-outline" size={20} color="#6366F1" />
                  <View>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue}>{task.employer.email}</Text>
                  </View>
                </View>
                {task.employer.phone && (
                  <View style={styles.contactItem}>
                    <Ionicons name="call-outline" size={20} color="#6366F1" />
                    <View>
                      <Text style={styles.contactLabel}>Phone</Text>
                      <Text style={styles.contactValue}>{task.employer.phone}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Employer Stats */}
              <View style={styles.statsGrid}>
                <View style={styles.ratingStatsCard}>
                  <View style={styles.ratingMain}>
                     <View style={styles.ratingStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                       <Ionicons
                        key={star}
                        name={star <= Math.floor(task.employer.rating || 0) ? "star" : "star-outline"}
                        size={12}
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
          )}

          {activeTab === 'requirements' && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkmark-done-outline" size={20} color="#6366F1" />
                <Text style={styles.sectionTitle}>Task Requirements</Text>
              </View>

              {/* Skills Required */}
              {task.skillsRequired && task.skillsRequired.length > 0 && (
                <View style={styles.skillsSection}>
                  <Text style={styles.subsectionTitle}>Required Skills</Text>
                  <View style={styles.skillsContainer}>
                    {task.skillsRequired.map((skill, index) => (
                      <View key={index} style={styles.skillTag}>
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Verification Requirements */}
              {task.verificationRequired && (
                <View style={styles.verificationNotice}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#F59E0B" />
                  <Text style={styles.verificationText}>
                    Verification required upon completion
                  </Text>
                </View>
              )}

              {/* Special Instructions */}
              <View style={styles.instructionsSection}>
                <Text style={styles.subsectionTitle}>Special Instructions</Text>
                <Text style={styles.instructionsText}>
                  {task.specialInstructions || "No special instructions provided."}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions Sidebar */}
        <View style={styles.sidebar}>

          {/* Safety Guidelines */}
          <View style={styles.safetyCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#6366F1" />
              <Text style={styles.sectionTitle}>Safety Guidelines</Text>
            </View>
            
            <View style={styles.safetyList}>
              <SafetyGuideline
                icon="warning-outline"
                text="Never share personal financial information"
                color="#EF4444"
              />
              <SafetyGuideline
                icon="location-outline"
                text="Meet in public places for onsite work"
                color="#3B82F6"
              />
              <SafetyGuideline
                icon="chatbubble-outline"
                text="Keep all communication on the platform"
                color="#10B981"
              />
            </View>
          </View>
        </View>
      </ScrollView>

       {/* FAB System */}
<View style={styles.fabContainer}>
  {/* Backdrop */}
  {fabExpanded && (
    <TouchableWithoutFeedback onPress={toggleFAB}>
      <View style={styles.fabBackdrop} />
    </TouchableWithoutFeedback>
  )}

  {/* Action Buttons */}
  <Animated.View 
    style={[
      styles.fabActionButtons,
      {
        opacity: fabAnimation,
        transform: [{
          translateY: fabAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })
        }]
      }
    ]}
  >
    {isAssignedToUser && task?.assignmentAccepted && (
      <>
        {canSubmitWork && (
          <TouchableOpacity 
            style={[styles.fabActionButton, { backgroundColor: '#8B5CF6' }]}
            onPress={() => {
              toggleFAB();
              setShowWorkModal(true);
            }}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
            <Text style={styles.fabActionText}>Submit Work</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.fabActionButton, { backgroundColor: '#6366F1' }]}
          onPress={() => {
            toggleFAB();
            navigate('Submissions', { taskId: task._id, taskTitle: task.title });
          }}
        >
          <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
          <Text style={styles.fabActionText}>View Submissions</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.fabActionButton, { backgroundColor: '#EF4444' }]}
          onPress={() => {
            toggleFAB();
            handleReportPress();
          }}
        >
          <Ionicons name="flag-outline" size={20} color="#FFFFFF" />
          <Text style={styles.fabActionText}>Report Issue</Text>
        </TouchableOpacity>

        {/* Mark as Done Button */}
        {hasTaskerMarkedDone ? (
       <View style={[styles.fabActionButtonDisabled, styles.markedDoneEmerald]}>
         <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
           <Text style={styles.fabActionText}>Already Marked Done</Text>
        </View>
         ) : canMarkAsDone ? (
          <TouchableOpacity 
            style={[styles.fabActionButton, { backgroundColor: '#10B981' }]}
            onPress={() => {
              toggleFAB();
              handleMarkAsDone();
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.fabActionText}>Mark as Done</Text>
          </TouchableOpacity>
        ) : null}
      </>
    )}

    {/* Assignment Acceptance Buttons */}
    {isAssignmentPending && (
      <>
        <TouchableOpacity 
          style={[styles.fabActionButton, { backgroundColor: '#10B981' }]}
          onPress={() => {
            toggleFAB();
            handleAcceptAssignment();
          }}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.fabActionText}>Accept Task</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.fabActionButton, { backgroundColor: '#EF4444' }]}
          onPress={() => {
            toggleFAB();
            handleDeclineAssignment();
          }}
        >
          <Ionicons name="close-circle" size={20} color="#FFFFFF" />
          <Text style={styles.fabActionText}>Decline Task</Text>
        </TouchableOpacity>
      </>
    )}

    {/* Hint for Open Tasks - Show when task is open and not assigned to user */}
    {!isAssignedToUser && task?.status?.toLowerCase() === 'open' && (
      <View style={styles.fabHintCard}>
        <Ionicons name="information-circle-outline" size={20} color="#6366F1" />
        <View style={styles.hintTextContainer}>
          <Text style={styles.hintTitle}>Task Actions</Text>
          <Text style={styles.hintDescription}>
            Task actions will appear here once you're assigned to this task
          </Text>
        </View>
      </View>
    )}

    {/* Hint for Other Non-Assigned Statuses */}
    {!isAssignedToUser && task?.status?.toLowerCase() !== 'open' && task?.status?.toLowerCase() !== 'assigned' && (
      <View style={styles.fabHintCard}>
        <Ionicons name="time-outline" size={20} color="#F59E0B" />
        <View style={styles.hintTextContainer}>
          <Text style={styles.hintTitle}>No Actions Available</Text>
          <Text style={styles.hintDescription}>
            Task actions are only available for assigned tasks
          </Text>
        </View>
      </View>
    )}
  </Animated.View>

  {/* Main FAB - Show different icon/color based on state */}
  <TouchableOpacity 
    style={[
      styles.mainFAB,
      !isAssignedToUser && styles.mainFABDisabled
    ]}
    onPress={toggleFAB}
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
          !isAssignedToUser ? "information-circle-outline" : "ellipsis-horizontal"
        } 
        size={24} 
        color="#FFFFFF" 
      />
    </Animated.View>
  </TouchableOpacity>

  {/* Tooltip for non-assigned state */}
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