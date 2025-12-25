import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import ReportForm from '../../component/common/reportForm';
import { AuthContext } from '../../context/AuthContext';
import { clientGetTaskInfo, markTaskAsDoneClient } from '../../api/miniTaskApi';
import { startOrGetChatRoom } from '../../api/chatApi';
import { navigate } from '../../services/navigationService';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import RatingModal from '../../component/common/RatingModal';
import { MediaDisplay } from '../../component/tasker/TaskMediaDisplay';
import ClientRefundNoticeCard from '../../component/client/ClientRefundNoticeCard';

const { width } = Dimensions.get('window');

const ClientTaskDetailScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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

  const handleMessageTasker = async () => {
    if (!task?.assignedTo?._id) return;
    try {
      const res = await startOrGetChatRoom({
        userId2: task.assignedTo._id,
        jobId: task._id,
      });
      if (res.status === 200) {
        navigate('ChatWindow', { roomId: res.data._id });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const handleMarkAsDone = async () => {
    Alert.alert(
      "Mark as Done",
      "Are you sure? This will release payment to the tasker.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Release Payment",
          onPress: async () => {
            const res = await markTaskAsDoneClient(taskId);
            if (res.status === 200) {
              Alert.alert("Success", "Task marked as completed!");
              setTimeout(() => setRatingModalVisible(true), 800);
              loadTaskDetails();
            }
          },
        },
      ]
    );
  };

  const handleEditTask = () => navigate('EditTask', { taskId, task });
  const handleViewApplicants = () => navigation.navigate('TaskApplicants', { taskId: task._id, task, assignedTo: task.assignedTo });
  const handleViewSubmissions = () => navigation.navigate('TaskSubmissions', { taskId: task._id, taskTitle: task.title });

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

  const isAssigned = task?.assignedTo && !['Open', 'Pending'].includes(task?.status);
  const isInProgressPhase = ['Assigned', 'In-progress', 'Review'].includes(task?.status);
  const isCompleted = task?.status?.toLowerCase() === 'completed';
  const canMarkAsDone = isInProgressPhase && !isCompleted && !task?.markedDoneByEmployer;
  const canMessage = isAssigned && !isCompleted;
  const canViewSubmissions = isAssigned;
  const canEditTask = ['Open', 'Pending'].includes(task?.status); // NEW: Check if task can be edited

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
            <Text style={styles.metaText}>• Posted {formatDate(task.createdAt)}</Text>
            <Text style={styles.metaText}>• Due {formatDate(task.deadline)}</Text>
          </View>
        </View>

        {/* Quick Info Grid - Fixed layout with proper spacing */}
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
                  {[task.address.city, task.address.region, task.address.country]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              ) : (
                <Text style={styles.infoSubtext}>Work from anywhere</Text>
              )}
            </View>

            {/* Applicants Count Card - NEW */}
            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="people-outline" size={20} color="#8B5CF6" />
                <Text style={styles.infoLabel}>Applicants</Text>
              </View>
              <Text style={styles.infoValue}>{task.applicants?.length || 0}</Text>
              <Text style={styles.infoSubtext}>
                {task.applicants?.length > 0 ? `${task.applicants.length} applied` : 'No applicants yet'}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{task.description}</Text>
          <MediaDisplay media={task.media} />
        </View>

        {/* Assigned Tasker */}
        {isAssigned && task.assignedTo && (
          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => navigate('ApplicantProfile', { applicant: task.assignedTo, taskId })}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Assigned Tasker</Text>
              <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
            </View>
            <View style={styles.taskerRow}>
              <View style={styles.avatar}>
                {task.assignedTo.profileImage ? (
                  <Image source={{ uri: task.assignedTo.profileImage }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarInitial}>{task.assignedTo.name?.[0]?.toUpperCase() || 'T'}</Text>
                )}
              </View>
              <View style={styles.taskerDetails}>
                <Text style={styles.taskerName}>{task.assignedTo.name}</Text>
                <Text style={styles.taskerName}>{task.assignedTo.phone}</Text>
                <View style={styles.taskerStats}>
                  <View style={styles.taskerStat}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.taskerStatText}>{task.assignedTo.rating?.toFixed(1) || 'New'}</Text>
                  </View>
                  <View style={styles.taskerStat}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.taskerStatText}>{task.assignedTo.completedTasks || '0'} completed</Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Requirements */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          {(task.requirements || []).length > 0 ? (
            task.requirements.map((req, i) => (
              <View key={i} style={styles.requirementItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.placeholderText}>No specific requirements listed.</Text>
          )}

          {task.skillsRequired?.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 12 }]}>Required Skills</Text>
              <View style={styles.skillsContainer}>
                {task.skillsRequired.map((skill, i) => (
                  <View key={i} style={styles.skillPill}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Applicants Preview - Enhanced with more info */}
        {task.applicants?.length > 0 && !isCompleted && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Applicants</Text>
                <Text style={styles.sectionSubtitle}>{task.applicants.length} people applied</Text>
              </View>
              <TouchableOpacity style={styles.viewAllButton} onPress={handleViewApplicants}>
                <Text style={styles.linkText}>View all</Text>
                <Ionicons name="chevron-forward" size={18} color="#6366F1" />
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={{ marginTop: 16 }}
              contentContainerStyle={styles.applicantsScrollContent}
            >
              {task.applicants.slice(0, 6).map((applicant, i) => (
                <View key={i} style={styles.applicantCard}>
                  <View style={styles.applicantAvatar}>
                    <Text style={styles.applicantInitial}>
                      {applicant.name?.[0]?.toUpperCase() || 'A'}
                    </Text>
                  </View>
                  <Text style={styles.applicantName} numberOfLines={1}>
                    {applicant.name || 'Applicant'}
                  </Text>
                  {applicant.appliedDate && (
                    <Text style={styles.applicantDate}>
                      {moment(applicant.appliedDate).fromNow()}
                    </Text>
                  )}
                </View>
              ))}
              {task.applicants.length > 6 && (
                <TouchableOpacity style={styles.moreApplicantsCard} onPress={handleViewApplicants}>
                  <Text style={styles.moreApplicantsText}>+{task.applicants.length - 6} more</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* Completion Progress (if assigned) */}
        {isInProgressPhase && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Completion Progress</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  task.markedDoneByEmployer && styles.progressDotCompleted
                ]}>
                  {task.markedDoneByEmployer && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.progressContent}>
                  <Text style={[
                    styles.progressLabel,
                    task.markedDoneByEmployer && styles.progressLabelCompleted
                  ]}>
                    You marked as done
                  </Text>
                  {task.employerDoneAt && (
                    <Text style={styles.progressDate}>
                      {moment(task.employerDoneAt).format('MMM D, h:mm A')}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.progressLine} />
              
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  task.markedDoneByTasker && styles.progressDotCompleted
                ]}>
                  {task.markedDoneByTasker && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.progressContent}>
                  <Text style={[
                    styles.progressLabel,
                    task.markedDoneByTasker && styles.progressLabelCompleted
                  ]}>
                    Tasker marked as done
                  </Text>
                  {task.taskerDoneAt && (
                    <Text style={styles.progressDate}>
                      {moment(task.taskerDoneAt).format('MMM D, h:mm A')}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            
            {task.markedDoneByEmployer && task.markedDoneByTasker && (
              <View style={styles.completionSuccess}>
                <Ionicons name="checkmark-done" size={20} color="#10B981" />
                <Text style={styles.completionSuccessText}>
                  Task completed successfully!
                </Text>
              </View>
            )}
          </View>
        )}

        
      </ScrollView>
      <ClientRefundNoticeCard task={task} isTaskOwner={true} />

      {/* Bottom Action Bar - Clean & Professional */}
      <View style={styles.bottomActionBar}>
        {/* Primary Actions - Full Width */}
        <View style={styles.primaryActions}>
          {canMessage && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleMessageTasker}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Message Tasker</Text>
            </TouchableOpacity>
          )}

          {canMarkAsDone && (
            <TouchableOpacity style={[styles.primaryButton, styles.completeButton]} onPress={handleMarkAsDone}>
              <Ionicons name="checkmark-done" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Secondary Actions - Compact Icons */}
        <View style={styles.secondaryActions}>
          {/* Edit Button - Only shows when task is Open or Pending */}
          {canEditTask && (
            <TouchableOpacity style={styles.actionItem} onPress={handleEditTask}>
              <Ionicons name="create-outline" size={24} color="#6366F1" />
              <Text style={styles.actionLabel}>Edit</Text>
            </TouchableOpacity>
          )}

          {task.applicants?.length > 0 && !isCompleted && (
            <TouchableOpacity style={styles.actionItem} onPress={handleViewApplicants}>
              <View style={styles.applicantBadge}>
                <Text style={styles.applicantBadgeText}>{task.applicants.length}</Text>
              </View>
              <Ionicons name="people-outline" size={24} color="#6366F1" />
              <Text style={styles.actionLabel}>Applicants</Text>
            </TouchableOpacity>
          )}

          {canViewSubmissions && (
            <TouchableOpacity style={styles.actionItem} onPress={handleViewSubmissions}>
              <Ionicons name="document-attach-outline" size={24} color="#6366F1" />
              <Text style={styles.actionLabel}>Submissions</Text>
            </TouchableOpacity>
          )}

          {isInProgressPhase && (
            <TouchableOpacity style={styles.actionItem} onPress={() => setShowReportModal(true)}>
              <Ionicons name="flag-outline" size={24} color="#EF4444" />
              <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ReportForm
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        task={task}
        onReportSubmitted={() => Alert.alert('Success', 'Your report has been submitted.')}
      />

      <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        userId={task.assignedTo?._id}
        userName={task.assignedTo?.name}
        userRole="tasker"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { paddingBottom: 160 },

  // Hero
  heroCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  metaText: { fontSize: 14, color: '#64748B' },

  // Info Grid - Fixed to prevent overlapping
  infoGridContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    marginLeft: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    width: (width - 44) / 2, // 16*2 padding + 12 gap = 44, divided by 2 columns
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  infoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: { 
    fontSize: 12, 
    color: '#64748B', 
    fontWeight: '600', 
    textTransform: 'uppercase',
    flex: 1,
  },
  infoValue: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#1E293B', 
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 2,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  description: { fontSize: 15.5, color: '#475569', lineHeight: 24, marginBottom: 16 },
  placeholderText: { fontSize: 15, color: '#94A3B8', fontStyle: 'italic' },

  // Section Header Row
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: { fontSize: 15, color: '#6366F1', fontWeight: '600' },

  // Requirements
  requirementItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 12, 
    gap: 10 
  },
  requirementText: { 
    flex: 1, 
    fontSize: 15, 
    color: '#475569', 
    lineHeight: 22 
  },
  skillsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginTop: 8 
  },
  skillPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  skillText: { 
    fontSize: 13, 
    color: '#6366F1', 
    fontWeight: '600' 
  },

  // Tasker
  taskerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16 
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: { 
    width: 64, 
    height: 64, 
    borderRadius: 32 
  },
  avatarInitial: { 
    color: '#FFF', 
    fontSize: 26, 
    fontWeight: '700' 
  },
  taskerDetails: { 
    flex: 1 
  },
  taskerName: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1E293B',
    marginBottom: 8,
  },
  taskerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  taskerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskerStatText: {
    fontSize: 14,
    color: '#64748B',
  },

  // Applicants Preview - Enhanced
  applicantsScrollContent: {
    paddingRight: 16,
  },
  applicantCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  applicantAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  applicantInitial: { 
    color: '#4F46E5', 
    fontSize: 18, 
    fontWeight: '700' 
  },
  applicantName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 2,
  },
  applicantDate: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  moreApplicantsCard: {
    width: 80,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  moreApplicantsText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  // Completion Progress
  progressContainer: {
    gap: 8,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  progressDotCompleted: {
    backgroundColor: '#10B981',
  },
  progressContent: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  progressLabelCompleted: {
    color: '#10B981',
  },
  progressDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  progressLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginLeft: 11,
  },
  completionSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  completionSuccessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },

  // Bottom Action Bar
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 44,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  primaryActions: { 
    gap: 12, 
    marginBottom: 20 
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeButton: { 
    backgroundColor: '#10B981', 
    shadowColor: '#10B981' 
  },
  primaryButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16.5, 
    fontWeight: '700' 
  },

  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  actionItem: { 
    alignItems: 'center', 
    gap: 6,
    position: 'relative',
  },
  applicantBadge: {
    position: 'absolute',
    top: -8,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  applicantBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionLabel: { 
    fontSize: 12, 
    color: '#475569', 
    fontWeight: '600' 
  },

  // Empty State
  emptyState: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40 
  },
  emptyTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#1E293B', 
    marginTop: 20 
  },
  emptySubtitle: { 
    fontSize: 16, 
    color: '#64748B', 
    textAlign: 'center', 
    marginVertical: 12 
  },
  backBtn: { 
    backgroundColor: '#6366F1', 
    paddingHorizontal: 28, 
    paddingVertical: 14, 
    borderRadius: 14 
  },
  backBtnText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '600' 
  },
});

export default ClientTaskDetailScreen;