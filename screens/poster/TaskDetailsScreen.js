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
  SafeAreaView,
  Dimensions,
} from 'react-native';
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

// ─── Theme: Pacific Indigo & Warm Gold ──────────────────────────────────────
const C = {
  bg:           '#F8FAFF',
  surface:      '#FFFFFF',
  border:       '#E4E8EE',
  primary:      '#1E3A6E',
  primaryDark:  '#152C4F',
  primaryGlow:  '#EBF5FF',
  gold:         '#D49B3F',
  green:        '#0F766E',
  greenLight:   '#D1FAE5',
  red:          '#DC2626',
  redLight:     '#FEE2E2',
  purple:       '#7E3AF2',
  purpleLight:  '#EDE9FE',
  textPrimary:  '#0F172A',
  textSecondary:'#475569',
  textMuted:    '#94A3B8',
  white:        '#FFFFFF',
};

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
  const handleViewBids = () => navigation.navigate('TaskApplicants', { taskId: task._id, task, assignedTo: task.assignedTo });
  const handleViewSubmissions = () => navigation.navigate('TaskSubmissions', { taskId: task._id, taskTitle: task.title });

  const getStatusColor = (status) => {
    const map = {
      open:      C.green,
      pending:   C.gold,
      assigned:  C.primary,
      'in-progress': C.gold,
      review:    C.purple,
      completed: C.green,
      closed:    C.textMuted,
    };
    return map[status?.toLowerCase()] || C.textMuted;
  };

  const formatDate = (date) => moment(date).format("MMM D, YYYY");

  const isAssigned = task?.assignedTo && !['Open', 'Pending'].includes(task?.status);
  const isInProgressPhase = ['Assigned', 'In-progress', 'Review'].includes(task?.status);
  const isCompleted = task?.status?.toLowerCase() === 'completed';
  const canMarkAsDone = isInProgressPhase && !isCompleted && !task?.markedDoneByEmployer;
  const canMessage = isAssigned && !isCompleted;
  const canViewSubmissions = isAssigned;
  const canEditTask = ['Open', 'Pending'].includes(task?.status);

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
          <Ionicons name="briefcase-outline" size={80} color={C.textMuted} />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
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

        {/* Quick Info Grid */}
        <View style={styles.infoGridContainer}>
          <Text style={styles.sectionHeader}>Task Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="cash-outline" size={20} color={C.green} />
                <Text style={styles.infoLabel}>Budget</Text>
              </View>
              <Text style={styles.infoValue}>₵{task.budget}</Text>
              <Text style={styles.infoSubtext}>Fixed price</Text>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="calendar-outline" size={20} color={C.gold} />
                <Text style={styles.infoLabel}>Deadline</Text>
              </View>
              <Text style={styles.infoValue}>{formatDate(task.deadline)}</Text>
              <Text style={styles.infoSubtext}>{moment(task.deadline).fromNow()}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="location-outline" size={20} color={C.primary} />
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

            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="people-outline" size={20} color={C.purple} />
                <Text style={styles.infoLabel}>Bids</Text>
              </View>
              <Text style={styles.infoValue}>{task.applicants?.length || 0}</Text>
              <Text style={styles.infoSubtext}>
                {task.applicants?.length > 0 ? `${task.applicants.length} bids` : 'No bids yet'}
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
              <Ionicons name="chevron-forward" size={24} color={C.textMuted} />
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
                <Text style={styles.taskerPhone}>{task.assignedTo.phone}</Text>
                <View style={styles.taskerStats}>
                  <View style={styles.taskerStat}>
                    <Ionicons name="star" size={16} color={C.gold} />
                    <Text style={styles.taskerStatText}>{task.assignedTo.rating?.toFixed(1) || 'New'}</Text>
                  </View>
                  <View style={styles.taskerStat}>
                    <Ionicons name="checkmark-circle" size={16} color={C.green} />
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
                <Ionicons name="checkmark-circle" size={20} color={C.green} />
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

        {/* Bids Preview (renamed from Applicants) */}
        {task.applicants?.length > 0 && !isCompleted && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Bids</Text>
                <Text style={styles.sectionSubtitle}>{task.applicants.length} bid{task.applicants.length !== 1 ? 's' : ''} received</Text>
              </View>
              <TouchableOpacity style={styles.viewAllButton} onPress={handleViewBids}>
                <Text style={styles.linkText}>View all</Text>
                <Ionicons name="chevron-forward" size={18} color={C.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={{ marginTop: 16 }}
              contentContainerStyle={styles.bidsScrollContent}
            >
              {task.applicants.slice(0, 6).map((bidder, i) => (
                <View key={i} style={styles.bidderCard}>
                  <View style={styles.bidderAvatar}>
                    <Text style={styles.bidderInitial}>
                      {bidder.name?.[0]?.toUpperCase() || 'A'}
                    </Text>
                  </View>
                  <Text style={styles.bidderName} numberOfLines={1}>
                    {bidder.name || 'Bidder'}
                  </Text>
                  {bidder.appliedDate && (
                    <Text style={styles.bidderDate}>
                      {moment(bidder.appliedDate).fromNow()}
                    </Text>
                  )}
                </View>
              ))}
              {task.applicants.length > 6 && (
                <TouchableOpacity style={styles.moreBiddersCard} onPress={handleViewBids}>
                  <Text style={styles.moreBiddersText}>+{task.applicants.length - 6} more</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* Completion Progress */}
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
                    <Ionicons name="checkmark" size={12} color={C.white} />
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
                    <Ionicons name="checkmark" size={12} color={C.white} />
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
                <Ionicons name="checkmark-done" size={20} color={C.green} />
                <Text style={styles.completionSuccessText}>
                  Task completed successfully!
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <ClientRefundNoticeCard task={task} isTaskOwner={true} />

      {/* Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        <View style={styles.primaryActions}>
          {canMessage && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleMessageTasker}>
              <Ionicons name="chatbubble-ellipses" size={20} color={C.white} />
              <Text style={styles.primaryButtonText}>Message Tasker</Text>
            </TouchableOpacity>
          )}

          {canMarkAsDone && (
            <TouchableOpacity style={[styles.primaryButton, styles.completeButton]} onPress={handleMarkAsDone}>
              <Ionicons name="checkmark-done" size={20} color={C.white} />
              <Text style={styles.primaryButtonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.secondaryActions}>
          {canEditTask && (
            <TouchableOpacity style={styles.actionItem} onPress={handleEditTask}>
              <Ionicons name="create-outline" size={24} color={C.primary} />
              <Text style={styles.actionLabel}>Edit</Text>
            </TouchableOpacity>
          )}

          {task.applicants?.length > 0 && !isCompleted && (
            <TouchableOpacity style={styles.actionItem} onPress={handleViewBids}>
              <View style={styles.bidBadge}>
                <Text style={styles.bidBadgeText}>{task.applicants.length}</Text>
              </View>
              <Ionicons name="people-outline" size={24} color={C.primary} />
              <Text style={styles.actionLabel}>Bids</Text>
            </TouchableOpacity>
          )}

          {canViewSubmissions && (
            <TouchableOpacity style={styles.actionItem} onPress={handleViewSubmissions}>
              <Ionicons name="document-attach-outline" size={24} color={C.primary} />
              <Text style={styles.actionLabel}>Submissions</Text>
            </TouchableOpacity>
          )}

          {isInProgressPhase && (
            <TouchableOpacity style={styles.actionItem} onPress={() => setShowReportModal(true)}>
              <Ionicons name="flag-outline" size={24} color={C.red} />
              <Text style={[styles.actionLabel, { color: C.red }]}>Report</Text>
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
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 160 },

  // Hero
  heroCard: {
    backgroundColor: C.surface,
    margin: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
    textTransform: 'capitalize',
  },
  metaText: { fontSize: 14, color: C.textSecondary },

  // Info Grid
  infoGridContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    width: (width - 44) / 2,
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
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
    color: C.textSecondary, 
    fontWeight: '600', 
    textTransform: 'uppercase',
    flex: 1,
  },
  infoValue: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: C.textPrimary, 
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  sectionSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    marginTop: 2,
  },
  description: { fontSize: 15.5, color: C.textSecondary, lineHeight: 24, marginBottom: 16 },
  placeholderText: { fontSize: 15, color: C.textMuted, fontStyle: 'italic' },

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
  linkText: { fontSize: 15, color: C.primary, fontWeight: '600' },

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
    color: C.textSecondary, 
    lineHeight: 22 
  },
  skillsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginTop: 8 
  },
  skillPill: {
    backgroundColor: C.primaryGlow,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.primary + '30',
  },
  skillText: { 
    fontSize: 13, 
    color: C.primary, 
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
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: { 
    width: 64, 
    height: 64, 
    borderRadius: 32 
  },
  avatarInitial: { 
    color: C.white, 
    fontSize: 26, 
    fontWeight: '700' 
  },
  taskerDetails: { 
    flex: 1 
  },
  taskerName: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: C.textPrimary,
    marginBottom: 4,
  },
  taskerPhone: {
    fontSize: 14,
    color: C.textSecondary,
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
    color: C.textSecondary,
  },

  // Bids Preview (renamed)
  bidsScrollContent: {
    paddingRight: 16,
  },
  bidderCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  bidderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bidderInitial: { 
    color: C.primary, 
    fontSize: 18, 
    fontWeight: '700' 
  },
  bidderName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 2,
  },
  bidderDate: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
  },
  moreBiddersCard: {
    width: 80,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  moreBiddersText: {
    fontSize: 13,
    color: C.textSecondary,
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
    backgroundColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  progressDotCompleted: {
    backgroundColor: C.green,
  },
  progressContent: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: 2,
  },
  progressLabelCompleted: {
    color: C.green,
  },
  progressDate: {
    fontSize: 12,
    color: C.textMuted,
  },
  progressLine: {
    width: 2,
    height: 20,
    backgroundColor: C.border,
    marginLeft: 11,
  },
  completionSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.greenLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  completionSuccessText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.green,
  },

  // Bottom Action Bar
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 44,
    borderTopWidth: 1,
    borderColor: C.border,
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
    backgroundColor: C.primary,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeButton: { 
    backgroundColor: C.green, 
    shadowColor: C.green 
  },
  primaryButtonText: { 
    color: C.white, 
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
  bidBadge: {
    position: 'absolute',
    top: -8,
    right: -2,
    backgroundColor: C.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  bidBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.white,
  },
  actionLabel: { 
    fontSize: 12, 
    color: C.textSecondary, 
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
    color: C.textPrimary, 
    marginTop: 20 
  },
  emptySubtitle: { 
    fontSize: 16, 
    color: C.textSecondary, 
    textAlign: 'center', 
    marginVertical: 12 
  },
  backBtn: { 
    backgroundColor: C.primary, 
    paddingHorizontal: 28, 
    paddingVertical: 14, 
    borderRadius: 14 
  },
  backBtnText: { 
    color: C.white, 
    fontSize: 16, 
    fontWeight: '600' 
  },
});

export default ClientTaskDetailScreen;