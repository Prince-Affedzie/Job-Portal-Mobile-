// screens/tasker/BidDetailsScreen.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from '../../component/tasker/Header';
import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';
import { getBidDetails, withdrawBid, updateBid } from '../../api/bidApi';
import { startOrGetChatRoom } from '../../api/chatApi';

const { width } = Dimensions.get('window');

const BidDetailsScreen = ({ route, navigation }) => {
  const { bidId, taskId } = route.params;
  const [bid, setBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBid, setEditingBid] = useState({
    amount: '',
    timeline: '',
    message: '',
  });
  const { user } = useContext(AuthContext);

  useEffect(() => {
    loadBidDetails();
  }, [bidId]);

  const loadBidDetails = async () => {
    try {
      setLoading(true);
      const response = await getBidDetails(bidId);
      
      if (response.status === 200) {
        setBid(response.data);
        // Initialize edit form with current values
        setEditingBid({
          amount: response.data.amount.toString(),
          timeline: response.data.timeline || '',
          message: response.data.message || '',
        });
      } else {
        Alert.alert('Error', 'Bid not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading bid details:', error);
      Alert.alert('Error', 'Failed to load bid details');
    } finally {
      setLoading(false);
    }
  };

  // Format helpers
  const formatDate = (date) => moment(date).format("MMM DD, YYYY");
  const formatDateTime = (date) => moment(date).format("MMM DD, YYYY [at] h:mm A");
  
  // Status helpers
  const getBidStatusInfo = (status) => {
    const statuses = {
      'pending': { label: 'Pending Review', color: '#F59E0B', icon: 'time-outline', bg: '#FEF3C7' },
      'accepted': { label: 'Accepted', color: '#10B981', icon: 'checkmark-circle', bg: '#D1FAE5' },
      'rejected': { label: 'Not Selected', color: '#EF4444', icon: 'close-circle', bg: '#FEE2E2' },
      'withdrawn': { label: 'Withdrawn', color: '#6B7280', icon: 'arrow-back-circle', bg: '#F3F4F6' },
      'expired': { label: 'Expired', color: '#6B7280', icon: 'timer-outline', bg: '#F3F4F6' }
    };
    return statuses[status?.toLowerCase()] || statuses.pending;
  };

  // ========== ACTUAL ACTION HANDLERS ==========

  const handleWithdrawBid = useCallback(async () => {
    Alert.alert(
      "Withdraw Bid",
      "Are you sure you want to withdraw your bid? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Withdraw", 
          style: "destructive",
          onPress: async () => {
            try {
              setUpdating(true);
              const res = await withdrawBid(bidId);
              
              if (res.status === 200) {
                Alert.alert("Success", "Bid withdrawn successfully!");
                // Update local state
                setBid(prev => ({
                  ...prev,
                  status: 'withdrawn',
                  updatedAt: new Date().toISOString()
                }));
                // Optionally navigate back or reload
                navigation.goBack();
              } else {
                Alert.alert("Error", res.data?.message || "Failed to withdraw bid");
              }
            } catch (error) {
              console.error('Withdraw error:', error);
              Alert.alert("Error", error.response?.data?.message || "Failed to withdraw bid");
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  }, [bidId, navigation]);

  const handleEditBid = useCallback(async () => {
    // Validate inputs
    if (!editingBid.amount || parseFloat(editingBid.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid bid amount');
      return;
    }

    if (!editingBid.timeline) {
      Alert.alert('Error', 'Please enter a timeline');
      return;
    }

    try {
      setUpdating(true);
      const bidData = {
        amount: parseFloat(editingBid.amount),
        timeline: editingBid.timeline,
        message: editingBid.message || '',
      };

      const res = await updateBid(bidId, bidData);
      
      if (res.status === 200) {
        Alert.alert("Success", "Bid updated successfully!");
        setBid(prev => ({
          ...prev,
          ...bidData,
          updatedAt: new Date().toISOString()
        }));
        setShowEditModal(false);
        // Reload bid details to get fresh data
        loadBidDetails();
      } else {
        Alert.alert("Error", res.data?.message || "Failed to update bid");
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert("Error", error.response?.data?.message || "Failed to update bid");
    } finally {
      setUpdating(false);
    }
  }, [bidId, editingBid]);

  const handleMessageClient = useCallback(async () => {
    if (!bid?.task?.employer?._id) {
      Alert.alert('Error', 'Client information not available');
      return;
    }
    
    try {
      const res = await startOrGetChatRoom({ 
        userId2: bid.task.employer._id, 
        jobId: bid.task._id 
      });
      
      if (res.status === 200) {
        navigate('ChatWindow', { roomId: res.data._id });
      } else {
        Alert.alert('Error', 'Failed to start chat');
      }
    } catch (error) {
      console.error('Chat error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to start chat with client');
    }
  }, [bid]);

  const handleViewTask = useCallback(() => {
    if (bid?.task?._id) {
      navigate('AppliedTaskDetails', { taskId: bid.task._id });
    } else if (taskId) {
      // Fallback to taskId from params
      navigate('AppliedTaskDetails', { taskId });
    } else {
      Alert.alert('Error', 'Task information not available');
    }
  }, [bid, taskId]);

  const handleManageAcceptedTask = useCallback(() => {
    if (bid?.task?._id) {
      // Navigate to task details where they can accept assignment, message client, etc.
      navigate('AppliedTaskDetails', { 
        taskId: bid.task._id,
        showTaskTools: true // Optional flag to highlight task tools
      });
    }
  }, [bid]);

  // Status checks
  const isBidEditable = bid?.status?.toLowerCase() === 'pending' && 
                       moment().isBefore(moment(bid.task?.deadline));
  const canMessage = ['pending', 'accepted'].includes(bid?.status?.toLowerCase());
  const isAccepted = bid?.status?.toLowerCase() === 'accepted';

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Bid Details" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading bid details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No bid found
  if (!bid) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Bid Details" showBackButton={true} />
        <View style={styles.errorContainer}>
          <Ionicons name="document-outline" size={64} color="#94A3B8" />
          <Text style={styles.errorTitle}>Bid Not Found</Text>
          <Text style={styles.errorText}>The bid you're looking for doesn't exist or has been removed.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getBidStatusInfo(bid.status);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <Header title="Bid Details" showBackButton={true} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusInfo.bg }]}>
          <View style={styles.statusContent}>
            <View style={[styles.statusIcon, { backgroundColor: statusInfo.color }]}>
              <Ionicons name={statusInfo.icon} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.statusText}>
              <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
              <Text style={styles.statusSubtext}>
                {bid.status?.toLowerCase() === 'pending' 
                  ? 'Your bid is under review by the client' 
                  : bid.status?.toLowerCase() === 'accepted'
                  ? 'Congratulations! The client selected your bid'
                  : `Bid status updated on ${formatDateTime(bid.updatedAt)}`
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Bid Summary Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag-outline" size={22} color="#6366F1" />
            <Text style={styles.sectionTitle}>Your Bid</Text>
          </View>

          <View style={styles.bidSummary}>
            <View style={styles.bidAmountCard}>
              <Text style={styles.bidAmountLabel}>Your Bid Amount</Text>
              <Text style={styles.bidAmount}>₵{bid.amount}</Text>
              {bid.task?.budget && (
                <Text style={styles.clientBudget}>
                  Client's budget: ₵{bid.task.budget}
                </Text>
              )}
            </View>

            <View style={styles.bidDetailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={18} color="#64748B" />
                <Text style={styles.detailLabel}>Timeline</Text>
                <Text style={styles.detailValue}>{bid.timeline} days</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={18} color="#64748B" />
                <Text style={styles.detailLabel}>Bid Submitted</Text>
                <Text style={styles.detailValue}>{formatDateTime(bid.createdAt)}</Text>
              </View>
            </View>

            {/* Bid Message */}
            {bid.message && (
              <View style={styles.messageCard}>
                <View style={styles.messageHeader}>
                  <Ionicons name="chatbubble-outline" size={18} color="#6366F1" />
                  <Text style={styles.messageTitle}>Your Message to Client</Text>
                </View>
                <Text style={styles.messageText}>"{bid.message}"</Text>
              </View>
            )}
          </View>
        </View>

        {/* Task Info Card */}
        <TouchableOpacity style={styles.sectionCard} onPress={handleViewTask} activeOpacity={0.7}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase-outline" size={22} color="#6366F1" />
            <Text style={styles.sectionTitle}>Task Details</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={styles.seeMoreIcon} />
          </View>

          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{bid.task?.title}</Text>
            <Text style={styles.taskDescription} numberOfLines={3}>
              {bid.task?.description}
            </Text>
            
            <View style={styles.taskMeta}>
              <View style={styles.taskMetaItem}>
                <Ionicons name="calendar-outline" size={14} color="#64748B" />
                <Text style={styles.taskMetaText}>Due {formatDate(bid.task?.deadline)}</Text>
              </View>
              <View style={styles.taskMetaItem}>
                <Ionicons name="location-outline" size={14} color="#64748B" />
                <Text style={styles.taskMetaText}>
                  {bid.task?.locationType === 'remote' ? 'Remote' : 'On-site'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Client Info Card */}
        {bid.task?.employer && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={22} color="#6366F1" />
              <Text style={styles.sectionTitle}>Client Information</Text>
            </View>

            <View style={styles.clientCard}>
              <View style={styles.clientHeader}>
                <View style={styles.clientAvatar}>
                  {bid.task.employer.profileImage ? (
                    <Image
                      source={{ uri: bid.task.employer.profileImage }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {bid.task.employer.name?.charAt(0)?.toUpperCase() || 'C'}
                    </Text>
                  )}
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{bid.task.employer.name}</Text>
                  {bid.task.employer.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      <Text style={styles.verifiedText}>Verified Client</Text>
                    </View>
                  )}
                </View>
              </View>

              {canMessage && (
                <TouchableOpacity 
                  style={styles.messageClientButton}
                  onPress={handleMessageClient}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#6366F1" />
                  ) : (
                    <>
                      <Ionicons name="chatbubble-ellipses" size={18} color="#6366F1" />
                      <Text style={styles.messageClientText}>Message Client</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Next Steps Card - IMPROVED GUIDANCE */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="arrow-forward-circle-outline" size={22} color="#6366F1" />
            <Text style={styles.sectionTitle}>What's Next?</Text>
          </View>

          <View style={styles.nextSteps}>
            {bid.status?.toLowerCase() === 'pending' && (
              <>
                <View style={styles.stepItem}>
                  <View style={styles.stepIcon}>
                    <Text style={styles.stepNumber}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Wait for client review</Text>
                    <Text style={styles.stepDescription}>
                      The client will review your bid and other bids. You'll be notified when they make a decision.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.stepItem}>
                  <View style={styles.stepIcon}>
                    <Text style={styles.stepNumber}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Be responsive</Text>
                    <Text style={styles.stepDescription}>
                      Check your notifications regularly. If the client has questions, they may reach out.
                    </Text>
                  </View>
                </View>
              </>
            )}

            {bid.status?.toLowerCase() === 'accepted' && (
              <>
                <View style={styles.stepItem}>
                  <View style={[styles.stepIcon, styles.stepIconSuccess]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Congratulations!</Text>
                    <Text style={styles.stepDescription}>
                      The client selected your bid. You're now assigned to this task.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.stepItem}>
                  <View style={styles.stepIcon}>
                    <Text style={styles.stepNumber}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Manage Your Task</Text>
                    <Text style={styles.stepDescription}>
                      Go to the task details to accept the assignment, message the client, and manage all task-related activities.
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={[styles.viewAssignmentButton, styles.manageTaskButton]}
                  onPress={handleManageAcceptedTask}
                >
                  <Ionicons name="briefcase" size={18} color="#FFFFFF" />
                  <Text style={ styles.manageTaskText}>
                    Go to Task Management
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}

            {bid.status?.toLowerCase() === 'rejected' && (
              <View style={styles.stepItem}>
                <View style={[styles.stepIcon, styles.stepIconNeutral]}>
                  <Ionicons name="information" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Bid Not Selected</Text>
                  <Text style={styles.stepDescription}>
                    The client selected another tasker for this job. Don't worry, keep bidding on other tasks!
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Timeline Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={22} color="#6366F1" />
            <Text style={styles.sectionTitle}>Bid Timeline</Text>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Bid Submitted</Text>
                <Text style={styles.timelineDate}>{formatDateTime(bid.createdAt)}</Text>
              </View>
            </View>
            
            <View style={styles.timelineConnector} />
            
            <View style={styles.timelineItem}>
              <View style={[
                styles.timelineDot,
                bid.status?.toLowerCase() !== 'pending' && styles.timelineDotActive
              ]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Client Decision</Text>
                <Text style={styles.timelineDate}>
                  {bid.status?.toLowerCase() !== 'pending' 
                    ? formatDateTime(bid.updatedAt) 
                    : 'Awaiting decision...'
                  }
                </Text>
              </View>
            </View>

            {bid.task?.deadline && (
              <>
                <View style={styles.timelineConnector} />
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Task Deadline</Text>
                    <Text style={styles.timelineDate}>{formatDate(bid.task.deadline)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {isBidEditable && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setShowEditModal(true)}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <>
                  <Ionicons name="create-outline" size={18} color="#6366F1" />
                  <Text style={styles.editButtonText}>Edit Bid</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.withdrawButton]}
              onPress={handleWithdrawBid}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="arrow-back-outline" size={18} color="#EF4444" />
                  <Text style={styles.withdrawButtonText}>Withdraw</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {!isBidEditable && !isAccepted && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => navigate('MainTabs',{screen:'AvailableTasks'})}
          >
            <Ionicons name="search-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Browse More Tasks</Text>
          </TouchableOpacity>
        )}

        {isAccepted && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.successButton]}
            onPress={handleManageAcceptedTask}
          >
            <Ionicons name="briefcase" size={18} color="#FFFFFF" />
            <Text style={styles.successButtonText}>Manage Task</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Edit Bid Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Your Bid</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Bid Amount (₵) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingBid.amount}
                    onChangeText={(text) => setEditingBid(prev => ({ ...prev, amount: text.replace(/[^0-9.]/g, '') }))}
                    placeholder="Enter your bid amount"
                    keyboardType="numeric"
                    editable={!updating}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Timeline (Days) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingBid.timeline}
                    onChangeText={(text) => setEditingBid(prev => ({ ...prev, timeline: text }))}
                    placeholder="e.g., 3 days, 1 week"
                    editable={!updating}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Message to Client (Optional)</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    value={editingBid.message}
                    onChangeText={(text) => setEditingBid(prev => ({ ...prev, message: text }))}
                    placeholder="Add any additional information for the client..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!updating}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => setShowEditModal(false)}
                  disabled={updating}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveModalButton]}
                  onPress={handleEditBid}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveModalButtonText}>Update Bid</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
    fontSize: 14,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  // Status Banner
  statusBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusText: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
    flex: 1,
  },
  seeMoreIcon: {
    marginLeft: 'auto',
  },
  // Bid Summary
  bidSummary: {
    marginTop: 8,
  },
  bidAmountCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  bidAmountLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  bidAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
  },
  clientBudget: {
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bidDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  messageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  // Task Info
  taskInfo: {
    marginTop: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskMetaText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 4,
  },
  // Client Info
  clientCard: {
    marginTop: 8,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6366F1',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  messageClientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  messageClientText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 8,
  },
  // Next Steps
  nextSteps: {
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepIconSuccess: {
    backgroundColor: '#10B981',
  },
  stepIconNeutral: {
    backgroundColor: '#6B7280',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  viewAssignmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  viewAssignmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginRight: 8,
  },
  manageTaskButton: {
    backgroundColor: '#10B981',
  },
  manageTaskText: {
    color: '#FFFFFF',
    marginHorizontal: 8,
  },
  // Timeline
  timeline: {
    marginTop: 8,
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: '#6366F1',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 20,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 13,
    color: '#64748B',
  },
  timelineConnector: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginLeft: 5.5,
  },
  // Action Buttons
    actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  editButton: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 8,
  },
  withdrawButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  withdrawButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  successButton: {
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#059669',
  },
  successButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  cancelModalButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  saveModalButton: {
    backgroundColor: '#6366F1',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  saveModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BidDetailsScreen;
   