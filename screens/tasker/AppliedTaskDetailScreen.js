import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
//import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Header from '../../component/tasker/Header';
import ReportForm from '../../component/common/reportForm';
import WorkSubmissionModal from '../../component/tasker/WorkSubmissionModal';
import { AuthContext } from '../../context/AuthContext';
import { getMiniTaskInfo, acceptMiniTaskAssignment, rejectMiniTaskAssignment, markTaskAsDoneTasker } from '../../api/miniTaskApi';
import { startOrGetChatRoom } from '../../api/chatApi';
import { navigate } from '../../services/navigationService';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import RatingModal from '../../component/common/RatingModal';
import { MediaDisplay } from '../../component/tasker/TaskMediaDisplay';
import FullyFundedBadge from '../../component/tasker/FullyFundedBadge';

const { width } = Dimensions.get('window');

const formatFullAddress = (address) => {
  if (!address || (!address.region && !address.city && !address.suburb)) {
    return "Remote";
  }
  
  const parts = [
    address.region,
    address.city, 
    address.suburb
  ].filter(part => part && part.trim() !== '');
  
  return parts.join(', ');
};

   const AppliedTaskDetailsScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const {user} = useContext(AuthContext)

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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTaskDetails();
  };

  const handleMessageClient = async () => {
    if (!task?.employer?._id) return;
    try {
      const res = await startOrGetChatRoom({ 
        userId2: task.employer._id, 
        jobId: task._id 
      });
      
      if (res.status === 200) {
        navigate('ChatWindow', { roomId: res.data._id });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat with client');
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
              const res = await acceptMiniTaskAssignment(taskId);
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
          error.response?.data?.error || 'Error accepting task assignment';
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
              const res = await rejectMiniTaskAssignment(taskId);
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
          error.response?.data?.error || 'Error declining assignment';
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
              const res = await markTaskAsDoneTasker(taskId);
              if (res.status === 200){
                Alert.alert("Success", "Task marked as completed!");
                setTimeout(() => {
                  setRatingModalVisible(true);
                }, 800);
                loadTaskDetails();
              }
            }
          }
        ]
      );
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
          error.response?.data?.error || 'Error marking task as done';
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
    const map = {
      open: '#10B981',
      pending: '#F59E0B',
      assigned: '#3B82F6',
      'in-progress': '#F59E0B',
      review: '#8B5CF6',
      completed: '#10B981',
      closed: '#6B7280',
    };
    return map[status?.toLowerCase()] || '#6B7280';
  };

  const formatDate = (date) => moment(date).format("MMM D, YYYY");

  const isAssignedToUser = task?.assignedTo && String(task.assignedTo.userId) === String(user?._id);
  const isAssignmentPending = isAssignedToUser && task?.assignmentAccepted === false;
  const isTaskCompleted = task?.status?.toLowerCase() === 'completed';
  const canSubmitWork = isAssignedToUser && task?.assignmentAccepted && !isTaskCompleted;
  const hasTaskerMarkedDone = task?.markedDoneByTasker === true;
  const canMarkAsDone = isAssignedToUser && task?.assignmentAccepted && !isTaskCompleted && !hasTaskerMarkedDone;
  const canMessageClient = isAssignedToUser && task?.assignmentAccepted && !isTaskCompleted;
  const isInProgressPhase = ['Assigned', 'In-progress', 'Review'].includes(task?.status);
  const canViewSubmissions = isInProgressPhase && isAssignedToUser && task?.assignmentAccepted;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Task Details" showBackButton />
        <LoadingIndicator text="Loading task details..." />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Task Details" showBackButton />
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={80} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Task Not Found</Text>
          <Text style={styles.emptySubtitle}>This task may have been deleted or is no longer available.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={task.title} showBackButton />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <Text style={styles.title}>{task.title}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(task.status) }]} />
            <Text style={styles.statusText}>{task.status.replace('-', ' ')}</Text>
            {isAssignedToUser && task?.assignmentAccepted ? (
              <Text style={styles.assignmentStatusBadge}>• Assigned to You</Text>
            ) : isAssignmentPending ? (
              <Text style={styles.pendingBadge}>• Pending Acceptance</Text>
            ) : null}
            <Text style={styles.metaText}>• Posted {formatDate(task.createdAt)}</Text>
            <Text style={styles.metaText}>• Due {formatDate(task.deadline)}</Text>
          </View>
        </View>

        {/* Assignment Acceptance Banner */}
        {isAssignmentPending && (
          <View style={styles.assignmentBanner}>
            <Ionicons name="alert-circle" size={24} color="#F59E0B" />
            <View style={styles.assignmentTextContainer}>
              <Text style={styles.assignmentTitle}>Task Assignment</Text>
              <Text style={styles.assignmentMessage}>
                You've been assigned to this task! Please accept or decline.
              </Text>
            </View>
          </View>
        )}

        {/* Quick Info Grid */}
        <View style={styles.infoGridContainer}>
          <Text style={styles.sectionHeader}>Task Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="cash-outline" size={20} color="#10B981" />
                <Text style={styles.infoLabel}>Budget</Text>
              </View>
              <Text style={styles.infoValue}>₵{task.budget}</Text>
              <Text style={styles.infoSubtext}>Fixed price</Text>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
                <Text style={styles.infoLabel}>Deadline</Text>
              </View>
              <Text style={styles.infoValue}>{formatDate(task.deadline)}</Text>
              <Text style={styles.infoSubtext}>{moment(task.deadline).fromNow()}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="location-outline" size={20} color="#6366F1" />
                <Text style={styles.infoLabel}>Location</Text>
              </View>
              <Text style={styles.infoValue}>
                {task.locationType === 'on-site' ? 'On-site' : 'Remote'}
              </Text>
              {task.locationType === 'on-site' && task.address ? (
                <Text style={styles.infoSubtext} numberOfLines={2}>
                  {formatFullAddress(task.address)}
                </Text>
              ) : (
                <Text style={styles.infoSubtext}>Work from anywhere</Text>
              )}
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="briefcase-outline" size={20} color="#8B5CF6" />
                <Text style={styles.infoLabel}>Category</Text>
              </View>
              <Text style={styles.infoValue}>{task.category}</Text>
              <Text style={styles.infoSubtext}>{task.subcategory || 'General'}</Text>
            </View>
          </View>
        </View>

        {/* Fully Funded Badge */}
        <FullyFundedBadge task={task} isAssignedToUser={isAssignedToUser} />

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Overview
            </Text>
          </TouchableOpacity>
          
          {isAssignedToUser && task?.assignmentAccepted && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'client' && styles.activeTab]}
              onPress={() => setActiveTab('client')}
            >
              <Text style={[styles.tabText, activeTab === 'client' && styles.activeTabText]}>
                Client
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requirements' && styles.activeTab]}
            onPress={() => setActiveTab('requirements')}
          >
            <Text style={[styles.tabText, activeTab === 'requirements' && styles.activeTabText]}>
              Requirements
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <>
              {/* Description Card */}
              <View style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderIcon}>
                    <Ionicons name="document-text" size={20} color="#6366F1" />
                  </View>
                  <Text style={styles.cardTitle}>Description</Text>
                </View>
                <Text style={styles.description}>{task.description}</Text>
                <MediaDisplay media={task.media} />
              </View>

              {/* Timeline Card */}
              <View style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderIcon}>
                    <Ionicons name="time" size={20} color="#F59E0B" />
                  </View>
                  <Text style={styles.cardTitle}>Timeline</Text>
                </View>
                <View style={styles.timeline}>
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>Task Created</Text>
                      <Text style={styles.timelineDate}>
                        {moment(task.createdAt).format('MMM D, YYYY [at] h:mm A')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.timelineConnector} />
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>Deadline</Text>
                      <Text style={styles.timelineDate}>
                        {moment(task.deadline).format('MMM D, YYYY [at] h:mm A')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}

          {activeTab === 'client' && isAssignedToUser && task.employer && (
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Ionicons name="person" size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.cardTitle}>Client Information</Text>
              </View>
              
              <View style={styles.clientProfile}>
                <View style={styles.clientHeader}>
                  <View style={styles.clientAvatar}>
                    {task.employer.profileImage ? (
                      <Image source={{ uri: task.employer.profileImage }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>
                          {task.employer.name?.[0]?.toUpperCase() || 'C'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{task.employer.name}</Text>
                    {task.employer.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.verifiedText}>Verified Client</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.clientContact}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="mail" size={18} color="#6366F1" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Email</Text>
                      <Text style={styles.contactValue}>{task.employer.email}</Text>
                    </View>
                  </View>
                  
                  {task.employer.phone && (
                    <View style={styles.contactRow}>
                      <View style={styles.contactIcon}>
                        <Ionicons name="call" size={18} color="#6366F1" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Phone</Text>
                        <Text style={styles.contactValue}>{task.employer.phone}</Text>
                      </View>
                    </View>
                  )}
                  
                  {task.employer.Bio && (
                    <View style={styles.contactRow}>
                      <View style={styles.contactIcon}>
                        <Ionicons name="information-circle" size={18} color="#6366F1" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>About</Text>
                        <Text style={styles.contactValue}>{task.employer.Bio}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {task.employer.rating && (
                  <View style={styles.ratingCard}>
                    <View style={styles.ratingHeader}>
                      <Ionicons name="star" size={18} color="#F59E0B" />
                      <Text style={styles.ratingTitle}>Client Rating</Text>
                    </View>
                    <View style={styles.ratingContent}>
                      <View style={styles.ratingStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= Math.floor(task.employer.rating) ? "star" : "star-outline"}
                            size={20}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                      <Text style={styles.ratingValue}>
                        {task.employer.rating?.toFixed(1)}/5.0
                      </Text>
                    </View>
                    <Text style={styles.ratingReviews}>
                      Based on {task.employer.numberOfRatings || 0} reviews
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {activeTab === 'requirements' && (
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Ionicons name="checkmark-done" size={20} color="#10B981" />
                </View>
                <Text style={styles.cardTitle}>Requirements</Text>
              </View>

              {/* Requirements List */}
              <View style={styles.requirementsSection}>
                <Text style={styles.subsectionTitle}>Task Requirements</Text>
                {(task.requirements || []).length > 0 ? (
                  <View style={styles.requirementsList}>
                    {task.requirements.map((req, i) => (
                      <View key={i} style={styles.requirementItem}>
                        <View style={styles.requirementIcon}>
                          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        </View>
                        <Text style={styles.requirementText}>{req}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.placeholderCard}>
                    <Ionicons name="list" size={24} color="#CBD5E1" />
                    <Text style={styles.placeholderText}>No specific requirements listed</Text>
                  </View>
                )}
              </View>

              {/* Skills Section */}
              {task.skillsRequired?.length > 0 && (
                <View style={styles.skillsSection}>
                  <Text style={styles.subsectionTitle}>Required Skills</Text>
                  <View style={styles.skillsContainer}>
                    {task.skillsRequired.map((skill, i) => (
                      <View key={i} style={styles.skillPill}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Verification Required */}
              {task.verificationRequired && (
                <View style={styles.verificationCard}>
                  <View style={styles.verificationIcon}>
                    <Ionicons name="shield-checkmark" size={24} color="#F59E0B" />
                  </View>
                  <View style={styles.verificationContent}>
                    <Text style={styles.verificationTitle}>Verification Required</Text>
                    <Text style={styles.verificationText}>
                      Task completion requires verification before payment release
                    </Text>
                  </View>
                </View>
              )}

              {/* Special Instructions */}
              {task.specialInstructions && (
                <View style={styles.instructionsCard}>
                  <View style={styles.instructionsHeader}>
                    <Ionicons name="information-circle" size={20} color="#6366F1" />
                    <Text style={styles.instructionsTitle}>Special Instructions</Text>
                  </View>
                  <Text style={styles.instructionsText}>{task.specialInstructions}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Completion Progress Card */}
        {isAssignedToUser && task?.assignmentAccepted && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="trending-up" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.cardTitle}>Completion Progress</Text>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  task.markedDoneByTasker && styles.progressDotCompleted
                ]}>
                  {task.markedDoneByTasker && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.progressContent}>
                  <Text style={[
                    styles.progressLabel,
                    task.markedDoneByTasker && styles.progressLabelCompleted
                  ]}>
                    You marked as done
                  </Text>
                  {task.taskerDoneAt && (
                    <Text style={styles.progressDate}>
                      {moment(task.taskerDoneAt).format('MMM D, h:mm A')}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.progressLine} />
              
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  task.markedDoneByEmployer && styles.progressDotCompleted
                ]}>
                  {task.markedDoneByEmployer && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.progressContent}>
                  <Text style={[
                    styles.progressLabel,
                    task.markedDoneByEmployer && styles.progressLabelCompleted
                  ]}>
                    Client marked as done
                  </Text>
                  {task.employerDoneAt && (
                    <Text style={styles.progressDate}>
                      {moment(task.employerDoneAt).format('MMM D, h:mm A')}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            
            {task.markedDoneByTasker && task.markedDoneByEmployer && (
              <View style={styles.completionSuccess}>
                <Ionicons name="checkmark-done" size={24} color="#10B981" />
                <View style={styles.completionTextContainer}>
                  <Text style={styles.completionSuccessTitle}>Task Completed!</Text>
                  <Text style={styles.completionSuccessText}>
                    Both parties have confirmed task completion
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Safety Guidelines Card */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.cardTitle}>Safety Guidelines</Text>
          </View>
          
          <View style={styles.safetyGrid}>
            <View style={[styles.safetyCard, styles.safetyCardRed]}>
              <View style={styles.safetyIcon}>
                <Ionicons name="warning" size={24} color="#DC2626" />
              </View>
              <Text style={styles.safetyTitle}>Financial Safety</Text>
              <Text style={styles.safetyText}>
                Never share personal financial information or make payments outside the platform
              </Text>
            </View>
            
            <View style={[styles.safetyCard, styles.safetyCardBlue]}>
              <View style={styles.safetyIcon}>
                <Ionicons name="location" size={24} color="#2563EB" />
              </View>
              <Text style={styles.safetyTitle}>Physical Safety</Text>
              <Text style={styles.safetyText}>
                Meet in public places for onsite work and inform someone about your whereabouts
              </Text>
            </View>
            
            <View style={[styles.safetyCard, styles.safetyCardGreen]}>
              <View style={styles.safetyIcon}>
                <Ionicons name="chatbubble" size={24} color="#059669" />
              </View>
              <Text style={styles.safetyTitle}>Communication</Text>
              <Text style={styles.safetyText}>
                Keep all communication on the platform for dispute resolution and security
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        {/* Primary Actions */}
        <View style={styles.primaryActions}>
          {isAssignmentPending && (
            <>
              <TouchableOpacity style={[styles.primaryButton, styles.acceptButton]} onPress={handleAcceptAssignment}>
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.primaryButtonText}>Accept Task</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, styles.declineButton]} onPress={handleDeclineAssignment}>
                <Ionicons name="close-circle" size={22} color="#FFF" />
                <Text style={styles.primaryButtonText}>Decline Task</Text>
              </TouchableOpacity>
            </>
          )}

          {canMessageClient && (
            <TouchableOpacity style={[styles.primaryButton, styles.messageButton]} onPress={handleMessageClient}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>Message Client</Text>
            </TouchableOpacity>
          )}

          {canMarkAsDone && (
            <TouchableOpacity style={[styles.primaryButton, styles.completeButton]} onPress={handleMarkAsDone}>
              <Ionicons name="checkmark-done" size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>Mark as completed</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Secondary Actions */}
        <View style={styles.secondaryActions}>
          {canSubmitWork && (
            <TouchableOpacity style={styles.actionItem} onPress={() => setShowWorkModal(true)}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="cloud-upload" size={24} color="#6366F1" />
              </View>
              <Text style={styles.actionLabel}>Submit Work</Text>
            </TouchableOpacity>
          )}

          {canViewSubmissions && (
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => navigate('Submissions', { taskId: task._id, taskTitle: task.title })}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="document-attach-outline" size={24} color="#6366F1" />
              </View>
              <Text style={styles.actionLabel}>Submissions</Text>
            </TouchableOpacity>
          )}

          {isAssignedToUser && task?.assignmentAccepted && (
            <TouchableOpacity style={styles.actionItem} onPress={handleReportPress}>
              <View style={[styles.actionIconContainer, styles.reportIconContainer]}>
                <Ionicons name="flag-outline" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.actionLabel, styles.reportLabel]}>Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modals */}
      <ReportForm
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedUserId={task.employer?._id}
        taskId={task._id}
        taskTitle={task.title?.substring(0, 40)}
        onReportSubmitted={handleReportSubmitted}
      />
      
      <WorkSubmissionModal
        isVisible={showWorkModal}
        onClose={() => setShowWorkModal(false)}
        taskId={task._id}
        task={task}
        type='miniTask'
        onSubmissionSuccess={loadTaskDetails}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { paddingBottom: 200 },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  title: { 
    fontSize: 21, 
    fontWeight: '800', 
    color: '#1E293B', 
    marginBottom: 12,
    lineHeight: 32,
  },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap', 
    gap: 10 
  },
  statusDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6 
  },
  statusText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1E293B' 
  },
  assignmentStatusBadge: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaText: { 
    fontSize: 14, 
    color: '#64748B',
    fontWeight: '500',
  },

  // Assignment Banner
  assignmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 2,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 18,
    gap: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  assignmentTextContainer: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },
  assignmentMessage: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Info Grid
  infoGridContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
    marginLeft: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  infoLabel: { 
    fontSize: 12, 
    color: '#64748B', 
    fontWeight: '700', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  infoValue: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#1E293B', 
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 2,
    fontWeight: '500',
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop:12,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    paddingBottom: 16,
    marginRight: 32,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#6366F1',
    fontWeight: '700',
  },

  // Tab Content
  tabContent: {
    paddingHorizontal: 16,
  },

  // Section Card (Universal Card Style)
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },

  // Description Card
  description: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: '500',
  },

  // Timeline Card
  timeline: {
    gap: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366F1',
    borderWidth: 3,
    borderColor: '#EEF2FF',
  },
  timelineConnector: {
    width: 3,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginLeft: 4.5,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // Client Profile Card
  clientProfile: {
    gap: 20,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clientAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },

  // Contact Info
  clientContact: {
    gap: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
    lineHeight: 22,
  },

  // Rating Card
  ratingCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 2,
    padding: 20,
    borderRadius: 20,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92400E',
  },
  ratingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#92400E',
  },
  ratingReviews: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },

  // Requirements Section
  requirementsSection: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
  },
  requirementsList: {
    gap: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  requirementIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  requirementText: {
    flex: 1,
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '500',
  },
  placeholderCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Skills Section
  skillsSection: {
    marginBottom: 24,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  skillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Verification Card
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 2,
    padding: 20,
    borderRadius: 20,
    gap: 16,
    marginBottom: 24,
  },
  verificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 6,
  },
  verificationText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Instructions Card
  instructionsCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 2,
    padding: 20,
    borderRadius: 20,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  instructionsText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '500',
  },

  // Completion Progress
  progressContainer: {
    gap: 12,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressDotCompleted: {
    backgroundColor: '#10B981',
  },
  progressContent: {
    flex: 1,
    paddingTop: 4,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  progressLabelCompleted: {
    color: '#10B981',
  },
  progressDate: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  progressLine: {
    width: 3,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginLeft: 14.5,
  },
  completionSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 2,
    padding: 20,
    borderRadius: 20,
    marginTop: 20,
  },
  completionTextContainer: {
    flex: 1,
  },
  completionSuccessTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 4,
  },
  completionSuccessText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    lineHeight: 20,
  },

  // Safety Guidelines
  safetyGrid: {
    gap: 16,
  },
  safetyCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
  },
  safetyCardRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  safetyCardBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  safetyCardGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  safetyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  safetyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  safetyText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '500',
  },

  // Bottom Action Bar
  bottomActionBar: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 15,
  },
  primaryActions: { 
    gap: 12, 
    marginBottom: 24 
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#6366F1',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptButton: { 
    backgroundColor: '#10B981', 
    shadowColor: '#10B981' 
  },
  declineButton: { 
    backgroundColor: '#EF4444', 
    shadowColor: '#EF4444' 
  },
  messageButton: { 
    backgroundColor: '#3B82F6', 
    shadowColor: '#3B82F6' 
  },
  completeButton: { 
    backgroundColor: '#F59E0B', 
    shadowColor: '#F59E0B' 
  },
  primaryButtonText: { 
    color: '#FFFFFF', 
    fontSize: 17, 
    fontWeight: '800' 
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  actionItem: { 
    alignItems: 'center', 
    gap: 8 
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportIconContainer: {
    backgroundColor: '#FEF2F2',
  },
  actionLabel: { 
    fontSize: 12, 
    color: '#475569', 
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  reportLabel: { 
    color: '#EF4444' 
  },

  // Empty State
  emptyState: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40 
  },
  emptyTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#1E293B', 
    marginTop: 20 
  },
  emptySubtitle: { 
    fontSize: 16, 
    color: '#64748B', 
    textAlign: 'center', 
    marginVertical: 12,
    lineHeight: 24,
    fontWeight: '500',
  },
  backBtn: { 
    backgroundColor: '#6366F1', 
    paddingHorizontal: 32, 
    paddingVertical: 16, 
    borderRadius: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 16,
  },
  backBtnText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '700' 
  },
});

export default AppliedTaskDetailsScreen;