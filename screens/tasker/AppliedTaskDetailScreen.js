// screens/tasker/AppliedTaskDetailsScreen.js
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
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Header from '../../component/tasker/Header';
import ReportForm from '../../component/common/reportForm';
import WorkSubmissionModal from '../../component/tasker/WorkSubmissionModal';
import { AuthContext } from '../../context/AuthContext';
import {
  getMiniTaskInfo,
  acceptMiniTaskAssignment,
  rejectMiniTaskAssignment,
  markTaskAsDoneTasker,
} from '../../api/miniTaskApi';
import { startOrGetChatRoom } from '../../api/chatApi';
import { navigate } from '../../services/navigationService';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import RatingModal from '../../component/common/RatingModal';
import { MediaDisplay } from '../../component/tasker/TaskMediaDisplay';
import FullyFundedBadge from '../../component/tasker/FullyFundedBadge';

const { width } = Dimensions.get('window');

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:            '#F8FAFF',
  surface:       '#FFFFFF',
  border:        '#E4E8EE',
  primary:       '#1E3A6E',
  primaryMid:    '#1A56DB',
  gold:          '#D49B3F',
  green:         '#0E9F6E',
  red:           '#DC2626',
  redLight:      '#FEE2E2',
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  white:         '#FFFFFF',
  charcoal:      '#0F1A35',
};

const formatFullAddress = (address) => {
  if (!address || (!address.region && !address.city && !address.suburb)) return 'Remote';
  return [address.region, address.city, address.suburb]
    .filter((p) => p && p.trim() !== '')
    .join(', ');
};

// ─── Options Menu (dropdown) ──────────────────────────────────────────────────
function HeaderOptionsMenu({ visible, onClose, onSubmitWork, onSubmissions, onReport }) {
  if (!visible) return null;

  return (
    <TouchableOpacity style={hm.backdrop} activeOpacity={1} onPress={onClose}>
      <View style={hm.menu}>
        {/* Submit Work */}
        <TouchableOpacity
          style={hm.item}
          onPress={() => { onClose(); onSubmitWork(); }}
        >
          <View style={[hm.iconBox, { backgroundColor: C.primary + '18' }]}>
            <Ionicons name="cloud-upload-outline" size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={hm.itemText}>Submit Work</Text>
            <Text style={hm.itemSub}>Upload completed work</Text>
          </View>
        </TouchableOpacity>

        <View style={hm.divider} />

        {/* Submissions */}
        <TouchableOpacity
          style={hm.item}
          onPress={() => { onClose(); onSubmissions(); }}
        >
          <View style={[hm.iconBox, { backgroundColor: C.primary + '18' }]}>
            <Ionicons name="document-attach-outline" size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={hm.itemText}>Submissions</Text>
            <Text style={hm.itemSub}>View submitted work</Text>
          </View>
        </TouchableOpacity>

        <View style={hm.divider} />

        {/* Report */}
        <TouchableOpacity
          style={hm.item}
          onPress={() => { onClose(); onReport(); }}
        >
          <View style={[hm.iconBox, { backgroundColor: C.redLight }]}>
            <Ionicons name="flag-outline" size={18} color={C.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[hm.itemText, { color: C.red }]}>Report</Text>
            <Text style={hm.itemSub}>Flag this task</Text>
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const hm = StyleSheet.create({
  // Covers the whole screen so tapping outside the menu closes it
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 200,
    // Push the menu down below the header (~56 px) and right-align it
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 12,
  },
  menu: {
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  itemText: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  itemSub:  { fontSize: 11, color: C.textMuted, marginTop: 1 },
  divider:  { height: 1, backgroundColor: C.border, marginHorizontal: 12 },
});

// ─── Ellipsis button (passed as rightComponent to Header) ─────────────────────
// Defined outside the screen so it never re-creates on render.
const EllipsisButton = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={eb.btn}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    accessibilityLabel="More options"
  >
    <Ionicons name="ellipsis-vertical" size={20} color={C.charcoal} />
  </TouchableOpacity>
);

const eb = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    // subtle shadow so it lifts off the header bg
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AppliedTaskDetailsScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const { user }   = useContext(AuthContext);

  const [task,             setTask]             = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [showReportModal,  setShowReportModal]  = useState(false);
  const [showWorkModal,    setShowWorkModal]    = useState(false);
  const [showOptionsMenu,  setShowOptionsMenu]  = useState(false);
  const [activeTab,        setActiveTab]        = useState('overview');

  // ── Data fetching ──────────────────────────────────────────────────────────
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
    } catch {
      Alert.alert('Error', 'Failed to load task details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadTaskDetails(); }, [taskId]);

  const onRefresh = () => { setRefreshing(true); loadTaskDetails(); };

  // ── Derived flags ──────────────────────────────────────────────────────────
  const isAssignedToUser  = task?.assignedTo && String(task.assignedTo.userId) === String(user?._id);
  const isAssignmentPending  = isAssignedToUser && task?.assignmentAccepted === false;
  const isTaskCompleted   = task?.status?.toLowerCase() === 'completed';
  const canSubmitWork     = isAssignedToUser && task?.assignmentAccepted && !isTaskCompleted;
  const hasTaskerMarkedDone = task?.markedDoneByTasker === true;
  const canMarkAsDone     = isAssignedToUser && task?.assignmentAccepted && !isTaskCompleted && !hasTaskerMarkedDone;
  const canMessageClient  = isAssignedToUser && task?.assignmentAccepted && !isTaskCompleted;
  const isInProgressPhase = ['Assigned', 'In-progress', 'Review'].includes(task?.status);
  const canViewSubmissions = isInProgressPhase && isAssignedToUser && task?.assignmentAccepted;

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleMessageClient = async () => {
    if (!task?.employer?._id) return;
    try {
      const res = await startOrGetChatRoom({ userId2: task.employer._id, jobId: task._id });
      if (res.status === 200) navigate('ChatWindow', { roomId: res.data._id });
    } catch {
      Alert.alert('Error', 'Failed to start chat with client');
    }
  };

  const handleAcceptAssignment = () => {
    Alert.alert('Accept Assignment', 'Are you sure you want to accept this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            const res = await acceptMiniTaskAssignment(taskId);
            if (res.status === 200) { Alert.alert('Success', 'Task accepted!'); loadTaskDetails(); }
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Error accepting assignment');
          }
        },
      },
    ]);
  };

  const handleDeclineAssignment = () => {
    Alert.alert(
      'Decline Assignment',
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline', style: 'destructive',
          onPress: async () => {
            try {
              const res = await rejectMiniTaskAssignment(taskId);
              if (res.status === 200) {
                Alert.alert('Declined', 'You have declined this task.');
                navigation.goBack();
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Error declining assignment');
            }
          },
        },
      ]
    );
  };

  const handleMarkAsDone = () => {
    Alert.alert('Mark as Done', 'Confirm this task is completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark as Done',
        onPress: async () => {
          try {
            const res = await markTaskAsDoneTasker(taskId);
            if (res.status === 200) {
              Alert.alert('Great!', 'Task marked as completed.');
              loadTaskDetails();
              setTimeout(() => setRatingModalVisible(true), 800);
            }
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Error marking task as done');
          }
        },
      },
    ]);
  };

  const handleReportPress = () => {
    if (!isAssignedToUser) {
      Alert.alert('Not Assigned', 'You can only report issues for tasks assigned to you.');
      return;
    }
    setShowReportModal(true);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getStatusColor = (status) => ({
    open:          '#10B981',
    pending:       '#F59E0B',
    assigned:      '#3B82F6',
    'in-progress': '#F59E0B',
    review:        '#8B5CF6',
    completed:     '#10B981',
    closed:        '#6B7280',
  }[status?.toLowerCase()] || '#6B7280');

  const formatDate = (d) => moment(d).format('MMM D, YYYY');

  // ── Loading / Error ────────────────────────────────────────────────────────
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
          <Text style={styles.emptySubtitle}>
            This task may have been deleted or is no longer available.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/*
        Pass the ellipsis button as rightComponent.
        We use a stable callback reference so the Header doesn't re-render needlessly.
      */}
      <Header
        title={task.title.substring(0,14)+"..."}
        showBackButton
        showNotifications={false}
        rightComponent={
          <EllipsisButton onPress={() => setShowOptionsMenu(true)} />
        }
      />

      {/*
        The dropdown menu is rendered OUTSIDE ScrollView at SafeAreaView level
        so its zIndex sits above all scroll content and the header.
      */}
      <HeaderOptionsMenu
        visible={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        onSubmitWork={() => {
          if (canSubmitWork) setShowWorkModal(true);
          else Alert.alert('Not Available', 'You can only submit work after the assignment is accepted.');
        }}
        onSubmissions={() => {
          if (canViewSubmissions) navigate('Submissions', { taskId: task._id, taskTitle: task.title });
          else Alert.alert('Not Available', 'Submissions are only available after the assignment is accepted.');
        }}
        onReport={handleReportPress}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{task.title}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(task.status) }]} />
            <Text style={styles.statusText}>{task.status.replace('-', ' ')}</Text>
            {isAssignedToUser && task?.assignmentAccepted ? (
              <View style={styles.assignedPill}>
                <Text style={styles.assignedPillText}>Assigned to You</Text>
              </View>
            ) : isAssignmentPending ? (
              <View style={styles.pendingPill}>
                <Text style={styles.pendingPillText}>Pending Acceptance</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.metaText}>Posted {formatDate(task.createdAt)}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>Due {formatDate(task.deadline)}</Text>
          </View>
        </View>

        {/* Assignment Banner */}
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
              <Text style={styles.infoSubtext} numberOfLines={2}>
                {task.locationType === 'on-site' && task.address
                  ? formatFullAddress(task.address)
                  : 'Work from anywhere'}
              </Text>
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
          {['overview', ...(isAssignedToUser && task?.assignmentAccepted ? ['client'] : []), 'requirements'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>

          {/* ── Overview ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
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

          {/* ── Client ───────────────────────────────────────────────── */}
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
                        {[1,2,3,4,5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= Math.floor(task.employer.rating) ? 'star' : 'star-outline'}
                            size={20}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                      <Text style={styles.ratingValue}>{task.employer.rating?.toFixed(1)}/5.0</Text>
                    </View>
                    <Text style={styles.ratingReviews}>
                      Based on {task.employer.numberOfRatings || 0} reviews
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Requirements ─────────────────────────────────────────── */}
          {activeTab === 'requirements' && (
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Ionicons name="checkmark-done" size={20} color="#10B981" />
                </View>
                <Text style={styles.cardTitle}>Requirements</Text>
              </View>

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

              {task.verificationRequired && (
                <View style={styles.verificationCard}>
                  <View style={styles.verificationIcon}>
                    <Ionicons name="shield-checkmark" size={24} color="#F59E0B" />
                  </View>
                  <View style={styles.verificationContent}>
                    <Text style={styles.verificationTitle}>Verification Required</Text>
                    <Text style={styles.verificationText}>
                      Task completion requires verification before payment release.
                    </Text>
                  </View>
                </View>
              )}

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

        {/* Completion Progress */}
        {isAssignedToUser && task?.assignmentAccepted && (
          <View style={[styles.sectionCard, { marginHorizontal: 16 }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="trending-up" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.cardTitle}>Completion Progress</Text>
            </View>

            <View style={styles.progressContainer}>
              {[
                { done: task.markedDoneByTasker, label: 'You marked as done', date: task.taskerDoneAt },
                { done: task.markedDoneByEmployer, label: 'Client marked as done', date: task.employerDoneAt },
              ].map((step, i, arr) => (
                <React.Fragment key={step.label}>
                  <View style={styles.progressStep}>
                    <View style={[styles.progressDot, step.done && styles.progressDotCompleted]}>
                      {step.done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <View style={styles.progressContent}>
                      <Text style={[styles.progressLabel, step.done && styles.progressLabelCompleted]}>
                        {step.label}
                      </Text>
                      {step.date && (
                        <Text style={styles.progressDate}>
                          {moment(step.date).format('MMM D, h:mm A')}
                        </Text>
                      )}
                    </View>
                  </View>
                  {i < arr.length - 1 && <View style={styles.progressLine} />}
                </React.Fragment>
              ))}
            </View>

            {task.markedDoneByTasker && task.markedDoneByEmployer && (
              <View style={styles.completionSuccess}>
                <Ionicons name="checkmark-done" size={24} color="#10B981" />
                <View style={styles.completionTextContainer}>
                  <Text style={styles.completionSuccessTitle}>Task Completed! 🎉</Text>
                  <Text style={styles.completionSuccessText}>
                    Both parties have confirmed completion.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Safety Guidelines */}
        <View style={[styles.sectionCard, { marginHorizontal: 16, marginTop: 16 }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.cardTitle}>Safety Guidelines</Text>
          </View>

          <View style={styles.safetyGrid}>
            {[
              { icon: 'warning', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', title: 'Financial Safety', text: 'Never share personal financial info or pay outside the platform.' },
              { icon: 'location', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', title: 'Physical Safety', text: 'Meet in public places for on-site work and inform someone of your whereabouts.' },
              { icon: 'chatbubble', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', title: 'Communication', text: 'Keep all communication on the platform for security and dispute resolution.' },
            ].map((s) => (
              <View key={s.title} style={[styles.safetyCard, { backgroundColor: s.bg, borderColor: s.border }]}>
                <Ionicons name={s.icon} size={22} color={s.color} style={{ marginBottom: 10 }} />
                <Text style={styles.safetyTitle}>{s.title}</Text>
                <Text style={styles.safetyText}>{s.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom Action Bar ─────────────────────────────────────────────── */}
      {isAssignmentPending ? (
        <View style={styles.bottomActionBar}>
          <TouchableOpacity style={[styles.halfBtn, styles.acceptButton]} onPress={handleAcceptAssignment}>
            <Ionicons name="checkmark-circle" size={18} color={C.white} />
            <Text style={styles.primaryBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.halfBtn, styles.declineButton]} onPress={handleDeclineAssignment}>
            <Ionicons name="close-circle" size={18} color={C.white} />
            <Text style={styles.primaryBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      ) : (canMessageClient || canMarkAsDone) ? (
        <View style={styles.bottomActionBar}>
          {canMessageClient && (
            <TouchableOpacity
              style={[styles.halfBtn, { backgroundColor: C.primaryMid }]}
              onPress={handleMessageClient}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={C.white} />
              <Text style={styles.primaryBtnText}>Message</Text>
            </TouchableOpacity>
          )}
          {canMarkAsDone && (
            <TouchableOpacity
              style={[styles.halfBtn, { backgroundColor: C.gold }]}
              onPress={handleMarkAsDone}
            >
              <Ionicons name="checkmark-done" size={18} color={C.white} />
              <Text style={styles.primaryBtnText}>Mark Done</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <ReportForm
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedUserId={task.employer?._id}
        taskId={task._id}
        taskTitle={task.title?.substring(0, 40)}
        onReportSubmitted={() => Alert.alert('Success', 'Report submitted successfully!')}
      />

      <WorkSubmissionModal
        isVisible={showWorkModal}
        onClose={() => setShowWorkModal(false)}
        taskId={task._id}
        task={task}
        type="miniTask"
        onSubmissionSuccess={loadTaskDetails}
      />

      <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        userId={task.employer?._id}
        userName={task.employer?.name}
        userRole="client"
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { paddingBottom: 160 },

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
  heroTitle: { fontSize: 21, fontWeight: '800', color: '#1E293B', marginBottom: 12, lineHeight: 30 },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  assignedPill: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  assignedPillText: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
  pendingPill: {
    backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  pendingPillText: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#CBD5E1' },

  // Assignment Banner
  assignmentBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFBEB', borderColor: '#FCD34D', borderWidth: 2,
    marginHorizontal: 16, marginBottom: 20,
    padding: 18, borderRadius: 18, gap: 14,
  },
  assignmentTextContainer: { flex: 1 },
  assignmentTitle: { fontSize: 16, fontWeight: '800', color: '#92400E', marginBottom: 4 },
  assignmentMessage: { fontSize: 14, color: '#92400E', lineHeight: 20 },

  // Info Grid
  infoGridContainer: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 14, marginLeft: 2 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoItem: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF', padding: 18, borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
    borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 4,
  },
  infoItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 3 },
  infoSubtext: { fontSize: 12, color: '#94A3B8', lineHeight: 17, fontWeight: '500' },

  // Tabs
  tabContainer: {
    flexDirection: 'row', paddingHorizontal: 16,
    marginTop: 8, marginBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  tab: { paddingBottom: 14, marginRight: 28 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#6366F1' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  activeTabText: { color: '#6366F1', fontWeight: '700' },
  tabContent: { paddingHorizontal: 16 },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF', marginBottom: 16,
    padding: 20, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  cardHeaderIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  description: { fontSize: 15, color: '#475569', lineHeight: 24, marginBottom: 16, fontWeight: '500' },

  // Timeline
  timeline: { gap: 4 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#6366F1', borderWidth: 3, borderColor: '#EEF2FF' },
  timelineConnector: { width: 3, height: 22, backgroundColor: '#E2E8F0', marginLeft: 4.5 },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 3 },
  timelineDate: { fontSize: 13, color: '#64748B' },

  // Client
  clientProfile: { gap: 18 },
  clientHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clientAvatar: { width: 64, height: 64, borderRadius: 32 },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 10, alignSelf: 'flex-start',
  },
  verifiedText: { fontSize: 12, color: '#059669', fontWeight: '700' },
  clientContact: { gap: 14 },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  contactIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  contactValue: { fontSize: 14, color: '#475569', lineHeight: 20 },
  ratingCard: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D', borderWidth: 2, padding: 18, borderRadius: 18 },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  ratingTitle: { fontSize: 16, fontWeight: '800', color: '#92400E' },
  ratingContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  ratingStars: { flexDirection: 'row', gap: 3 },
  ratingValue: { fontSize: 20, fontWeight: '800', color: '#92400E' },
  ratingReviews: { fontSize: 13, color: '#92400E', fontWeight: '500' },

  // Requirements
  requirementsSection: { marginBottom: 20 },
  subsectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 14 },
  requirementsList: { gap: 10 },
  requirementItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  requirementIcon: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  requirementText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 21 },
  placeholderCard: {
    backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 2,
    borderStyle: 'dashed', padding: 28, borderRadius: 16,
    alignItems: 'center', gap: 10,
  },
  placeholderText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  skillsSection: { marginBottom: 20 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#6366F1', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, gap: 6,
  },
  skillText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  verificationCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFBEB', borderColor: '#FCD34D', borderWidth: 2,
    padding: 18, borderRadius: 16, gap: 14, marginBottom: 16,
  },
  verificationIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center',
  },
  verificationContent: { flex: 1 },
  verificationTitle: { fontSize: 15, fontWeight: '800', color: '#92400E', marginBottom: 4 },
  verificationText: { fontSize: 13, color: '#92400E', lineHeight: 19 },
  instructionsCard: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 2, padding: 18, borderRadius: 16 },
  instructionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  instructionsTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  instructionsText: { fontSize: 14, color: '#475569', lineHeight: 21 },

  // Progress
  progressContainer: { gap: 4 },
  progressStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  progressDot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
  },
  progressDotCompleted: { backgroundColor: '#10B981' },
  progressContent: { flex: 1, paddingTop: 3 },
  progressLabel: { fontSize: 15, fontWeight: '700', color: '#64748B', marginBottom: 4 },
  progressLabelCompleted: { color: '#10B981' },
  progressDate: { fontSize: 12, color: '#94A3B8' },
  progressLine: { width: 3, height: 24, backgroundColor: '#E2E8F0', marginLeft: 13.5 },
  completionSuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F0FDF4', borderColor: '#86EFAC', borderWidth: 2,
    padding: 18, borderRadius: 16, marginTop: 16,
  },
  completionTextContainer: { flex: 1 },
  completionSuccessTitle: { fontSize: 16, fontWeight: '800', color: '#065F46', marginBottom: 3 },
  completionSuccessText: { fontSize: 13, color: '#059669' },

  // Safety
  safetyGrid: { gap: 12 },
  safetyCard: { padding: 18, borderRadius: 16, borderWidth: 2 },
  safetyTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  safetyText: { fontSize: 13, color: '#475569', lineHeight: 20 },

  // Bottom Action Bar
  bottomActionBar: {
    position: 'absolute', bottom: 16, left: 0, right: 0,
    backgroundColor: C.surface,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 34,
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  halfBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 14, gap: 8,
  },
  acceptButton:  { backgroundColor: C.green },
  declineButton: { backgroundColor: C.red },
  primaryBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginVertical: 10, lineHeight: 23 },
  backBtn: {
    backgroundColor: '#6366F1', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, marginTop: 14,
  },
  backBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

export default AppliedTaskDetailsScreen;