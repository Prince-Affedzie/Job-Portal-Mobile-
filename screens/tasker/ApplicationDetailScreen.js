import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import ActionButton from '../../components/ActionButton';
import StatusBadge from '../../component/tasker/TaskStatusBadge';

const ApplicationDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  
  // Get the task data directly from params instead of fetching
  const { task, isBid = false, bid } = route.params;
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState(task);

  // If we need to refresh the task data, we can still fetch it
  const [refreshing, setRefreshing] = useState(false);

  const loadTaskDetails = async () => {
    try {
      setRefreshing(true);
      const response = await getMiniTaskById(currentTask._id);
      setCurrentTask(response.data);
    } catch (error) {
      console.error('Error refreshing task details:', error);
      Alert.alert('Error', 'Failed to refresh task details');
    } finally {
      setRefreshing(false);
    }
  };

  const isAssigned = currentTask?.assignedTo?.toString() === user?._id;
  const canSubmitWork = isAssigned && (currentTask?.status === "In-progress" || currentTask?.status === "Review");
  const needsAcceptance = currentTask?.assignedTo?.toString() === user?._id && !currentTask?.assignmentAccepted;

  // Use the bid from params or find it in the task
  const userBid = bid || (isBid && currentTask?.bids?.find(b => b.bidder?.toString() === user?._id));

  const handleSubmitWork = () => {
    navigation.navigate('SubmitWork', { taskId: currentTask._id });
  };

  const handleViewSubmission = () => {
    navigation.navigate('Submissions', { taskId: currentTask._id });
  };

  const handleChatWithClient = () => {
    navigation.navigate('Chat', { 
      recipientId: currentTask.employer._id,
      taskId: currentTask._id,
      taskTitle: currentTask.title 
    });
  };

  const handleReport = () => {
    navigation.navigate('Report', { taskId: currentTask._id });
  };

  const handleAcceptTask = async () => {
    try {
      setIsProcessing(true);
      // Implement accept task API call
      // After successful acceptance, update the local state
      setCurrentTask(prev => ({ ...prev, assignmentAccepted: true }));
      Alert.alert('Success', 'Task accepted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept task');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineTask = async () => {
    try {
      setIsProcessing(true);
      // Implement decline task API call
      Alert.alert('Success', 'Task declined');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to decline task');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return `₵${amount?.toLocaleString() || '0'}`;
  };

  if (!currentTask) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Task not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadTaskDetails}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Task Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.taskTitle}>{currentTask.title}</Text>
            <StatusBadge status={currentTask.status} />
          </View>

          <Text style={styles.taskDescription}>{currentTask.description}</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={16} color="#64748B" />
              <Text style={styles.detailLabel}>Budget:</Text>
              <Text style={styles.detailValue}>{formatCurrency(currentTask.budget)}</Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
              <Text style={styles.detailLabel}>Deadline:</Text>
              <Text style={styles.detailValue}>{formatDate(currentTask.deadline)}</Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color="#64748B" />
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>
                {currentTask.locationType === 'remote' ? 'Remote' : 'On-site'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={16} color="#64748B" />
              <Text style={styles.detailLabel}>Client:</Text>
              <Text style={styles.detailValue}>{currentTask.employer?.name || 'Unknown'}</Text>
            </View>
          </View>

          {/* Bid Details (if this is a bid) */}
          {isBid && userBid && (
            <View style={styles.bidSection}>
              <Text style={styles.sectionTitle}>Your Bid Details</Text>
              <View style={styles.bidDetails}>
                <View style={styles.bidDetailItem}>
                  <Text style={styles.bidLabel}>Bid Amount:</Text>
                  <Text style={styles.bidValue}>{formatCurrency(userBid.amount)}</Text>
                </View>
                {userBid.timeline && (
                  <View style={styles.bidDetailItem}>
                    <Text style={styles.bidLabel}>Timeline:</Text>
                    <Text style={styles.bidValue}>{userBid.timeline}</Text>
                  </View>
                )}
                {userBid.message && (
                  <View style={styles.bidDetailItem}>
                    <Text style={styles.bidLabel}>Message:</Text>
                    <Text style={styles.bidMessage}>{userBid.message}</Text>
                  </View>
                )}
                <View style={styles.bidDetailItem}>
                  <Text style={styles.bidLabel}>Bid Status:</Text>
                  <StatusBadge status={userBid.status} />
                </View>
              </View>
            </View>
          )}

          {/* Application Status */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Your Status</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>
                {isBid ? 'Bid Status:' : 'Application Status:'}
              </Text>
              <StatusBadge status={isBid ? userBid?.status : currentTask.status} />
            </View>
            {isAssigned && (
              <Text style={styles.assignedText}>
                ✅ You have been assigned to this task
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Primary Actions */}
          <View style={styles.primaryActions}>
            {needsAcceptance && (
              <>
                <ActionButton
                  label={isProcessing ? 'Accepting...' : 'Accept Task'}
                  icon={(props) => <Ionicons name="checkmark" {...props} />}
                  onClick={handleAcceptTask}
                  variant="success"
                  disabled={isProcessing}
                  loading={isProcessing}
                />
                <ActionButton
                  label={isProcessing ? 'Declining...' : 'Decline Task'}
                  icon={(props) => <Ionicons name="close" {...props} />}
                  onClick={handleDeclineTask}
                  variant="danger"
                  disabled={isProcessing}
                  loading={isProcessing}
                />
              </>
            )}

            {canSubmitWork && (
              <ActionButton
                label={currentTask.locationType === 'on-site' ? 'Submit Proof' : 'Submit Work'}
                icon={(props) => <Ionicons name="cloud-upload-outline" {...props} />}
                onClick={handleSubmitWork}
                variant="primary"
              />
            )}

            {isAssigned && (
              <ActionButton
                label="Chat with Client"
                icon={(props) => <Ionicons name="chatbubble-ellipses" {...props} />}
                onClick={handleChatWithClient}
                variant="secondary"
              />
            )}
          </View>

          {/* Secondary Actions */}
          <View style={styles.secondaryActions}>
            {canSubmitWork && (
              <ActionButton
                label="View Submission"
                icon={(props) => <Ionicons name="document-text-outline" {...props} />}
                onClick={handleViewSubmission}
                variant="ghost"
              />
            )}

            <ActionButton
              label="Report Issue"
              icon={(props) => <Ionicons name="flag-outline" {...props} />}
              onClick={handleReport}
              variant="ghost"
              style={styles.reportButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#1E293B',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerRight: {
    width: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
    marginRight: 12,
  },
  taskDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    minWidth: 60,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  bidSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  bidDetails: {
    gap: 8,
  },
  bidDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bidLabel: {
    fontSize: 14,
    color: '#64748B',
    minWidth: 80,
  },
  bidValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  bidMessage: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
    flex: 1,
  },
  statusSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  assignedText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  actionsContainer: {
    padding: 16,
    gap: 16,
  },
  primaryActions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  submitButton: {
    backgroundColor: '#6366F1',
  },
  chatButton: {
    backgroundColor: '#8B5CF6',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  reportText: {
    color: '#EF4444',
  },
});

export default ApplicationDetailScreen;