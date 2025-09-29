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
  Dimensions,
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


const { width } = Dimensions.get('window');

const AppliedTaskDetailsScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('task');
  const { user } = useContext(AuthContext);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
 

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading task details...</Text>
        </View>
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
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{task.employer.rating || 0}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{task.employer.numberOfRatings || 0}</Text>
                  <Text style={styles.statLabel}>Reviews</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{task.employer.tasksPosted || 'N/A'}</Text>
                  <Text style={styles.statLabel}>Tasks Posted</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {task.employer.completionRate ? `${task.employer.completionRate}%` : 'N/A'}
                  </Text>
                  <Text style={styles.statLabel}>Completion Rate</Text>
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
          {isAssignedToUser && task?.assignmentAccepted ? (
         <View style={styles.actionsCard}>
         <Text style={styles.actionsTitle}>Quick Actions</Text>
    
          {canSubmitWork && (
          <ActionButton
           title="Submit Work"
           icon="cloud-upload-outline"
           color="#8B5CF6"
           onPress={() => setShowWorkModal(true)}
         />
        )}
    
        <ActionButton
        title="View Submissions"
        icon="document-text-outline"
        color="#6366F1"
        onPress={() => navigate('Submissions', { taskId: task._id,taskTitle: task.title  })}
       />
    
       <ActionButton
       title="Report Issue"
        icon="flag-outline"
        color="#EF4444"
        onPress={handleReportPress}
       />
    
       {/* Updated Mark as Done Logic */}
       {hasTaskerMarkedDone ? (
         <View style={styles.alreadyDoneSection}>
           <Ionicons name="checkmark-circle" size={24} color="#10B981" />
           <Text style={styles.alreadyDoneText}>You marked this as done</Text>
           {task.taskerDoneAt && (
             <Text style={styles.doneTimeText}>
               on {formatDateTime(task.taskerDoneAt)}
             </Text>
           )}
         </View>
       ) : canMarkAsDone ? (
         <TouchableOpacity 
           style={styles.markDoneButton}
           onPress={handleMarkAsDone}
         >
           <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
           <Text style={styles.markDoneText}>Mark as Done</Text>
         </TouchableOpacity>
       ) : null}
    
         {isTaskCompleted && (
           <View style={styles.completionBadge}>
           <Ionicons name="checkmark-done" size={24} color="#10B981" />
          <Text style={styles.completionText}>Task Completed</Text>
          </View>
        )}
          </View>
        ) : isAssignedToUser && !task?.assignmentAccepted ? (
             <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Assignment Pending</Text>
             <View style={styles.pendingAssignment}>
              <Ionicons name="time-outline" size={40} color="#F59E0B" />
              <Text style={styles.pendingText}>
               Please accept or decline the task assignment to unlock task actions.
              </Text>
              </View>
            </View>
          ) : (
           <View style={styles.actionsCard}>
           <Text style={styles.actionsTitle}>Task Actions</Text>
            <View style={styles.lockedSection}>
            <Ionicons name="lock-closed" size={40} color="#6B7280" />
              <Text style={styles.lockedText}>
              Task actions available after assignment
              </Text>
              </View>
             </View>
            )}
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

          {/* Task Progress
          {isAssignedToUser && !isTaskCompleted && (
            <View style={styles.progressCard}>
              <Text style={styles.sectionTitle}>Task Progress</Text>
              
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Completion</Text>
                  <Text style={styles.progressPercent}>0%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '0%' }]} />
                </View>
              </View>
              
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>0</Text>
                  <Text style={styles.progressStatLabel}>Days Worked</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>
                    {moment(task.deadline).diff(moment(), 'days')}
                  </Text>
                  <Text style={styles.progressStatLabel}>Days Left</Text>
                </View>
              </View>
            </View>
          )}  */}
        </View>
      </ScrollView>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  assignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  assignmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 4,
  },
  metaInfo: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  taskDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  locationSection: {
    marginTop: 16,
  },
  locationGrid: {
    gap: 8,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  locationLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  timeline: {
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  timelineDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  employerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  employerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  employerInfo: {
    flex: 1,
  },
  employerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
    marginBottom: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  employerBio: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 18,
  },
  contactSection: {
    gap: 12,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  skillsSection: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  verificationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  verificationText: {
    fontSize: 14,
    color: '#92400E',
    flex: 1,
  },
  instructionsSection: {
    marginTop: 16,
  },
  instructionsText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  sidebar: {
    padding: 16,
    gap: 16,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  markDoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  markDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  completionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  lockedSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  lockedText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  safetyCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  safetyList: {
    gap: 8,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  safetyText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  progressStats: {
    flexDirection: 'row',
    gap: 12,
  },
  progressStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  assignmentAcceptanceCard: {
  backgroundColor: '#FFFBEB',
  margin: 16,
  marginTop: 8,
  padding: 16,
  borderRadius: 12,
  borderLeftWidth: 4,
  borderLeftColor: '#F59E0B',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
assignmentHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
  gap: 8,
},
assignmentTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#92400E',
},
assignmentMessage: {
  fontSize: 14,
  color: '#92400E',
  lineHeight: 20,
  marginBottom: 16,
},
assignmentButtons: {
  flexDirection: 'row',
  gap: 12,
},
assignmentButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
  gap: 8,
},
acceptButton: {
  backgroundColor: '#10B981',
},
declineButton: {
  backgroundColor: '#EF4444',
},
acceptButtonText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#FFFFFF',
},
declineButtonText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#FFFFFF',
},
pendingAssignment: {
  alignItems: 'center',
  padding: 20,
  backgroundColor: '#FFFBEB',
  borderRadius: 8,
},
pendingText: {
  fontSize: 14,
  color: '#92400E',
  textAlign: 'center',
  marginTop: 8,
  lineHeight: 20,
},completionStatusSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  completionStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  completionStatusItem: {
    flex: 1,
    alignItems: 'center',
  },
  completionStatusText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  completionStatusTextDone: {
    color: '#10B981',
    fontWeight: '600',
  },
  completionTimeText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  mutualCompletionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
  },
  mutualCompletionText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
    marginLeft: 4,
  },
  alreadyDoneSection: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  alreadyDoneText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  doneTimeText: {
    fontSize: 12,
    color: '#047857',
    marginTop: 4,
    textAlign: 'center',
  },
  markDoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  markDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AppliedTaskDetailsScreen;