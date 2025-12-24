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
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
//import { SafeAreaView } from 'react-native-safe-area-context';
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
  
  // Status helpers with TaskRabbit/Fiverr style
  const getBidStatusInfo = (status) => {
    const statuses = {
      'pending': { 
        label: 'Pending Review', 
        color: '#F59E0B', 
        icon: 'time', 
        bg: '#FFFBF0',
        border: '#FDE68A',
        gradient: ['#FFFBEB', '#FEF3C7']
      },
      'accepted': { 
        label: 'Accepted', 
        color: '#10B981', 
        icon: 'checkmark-circle', 
        bg: '#F0FDF4',
        border: '#A7F3D0',
        gradient: ['#ECFDF5', '#D1FAE5']
      },
      'rejected': { 
        label: 'Not Selected', 
        color: '#EF4444', 
        icon: 'close-circle', 
        bg: '#FEF2F2',
        border: '#FECACA',
        gradient: ['#FEF2F2', '#FEE2E2']
      },
      'withdrawn': { 
        label: 'Withdrawn', 
        color: '#6B7280', 
        icon: 'arrow-back', 
        bg: '#F9FAFB',
        border: '#E5E7EB',
        gradient: ['#F9FAFB', '#F3F4F6']
      },
      'expired': { 
        label: 'Expired', 
        color: '#6B7280', 
        icon: 'timer', 
        bg: '#F9FAFB',
        border: '#E5E7EB',
        gradient: ['#F9FAFB', '#F3F4F6']
      }
    };
    return statuses[status?.toLowerCase()] || statuses.pending;
  };

  // Action Handlers (same as before)
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
                setBid(prev => ({
                  ...prev,
                  status: 'withdrawn',
                  updatedAt: new Date().toISOString()
                }));
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
      navigate('AppliedTaskDetails', { taskId });
    } else {
      Alert.alert('Error', 'Task information not available');
    }
  }, [bid, taskId]);

  const handleManageAcceptedTask = useCallback(() => {
    if (bid?.task?._id) {
      navigate('AppliedTaskDetails', { 
        taskId: bid.task._id,
        showTaskTools: true
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
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading bid details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!bid) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <Ionicons name="document-outline" size={80} color="#CBD5E1" />
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Custom Header like Fiverr */}
      
      <Header title={'Bid Details'} showBackButton/>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Header Card - Like TaskRabbit */}
        <LinearGradient
          colors={statusInfo.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.statusHeader, { borderColor: statusInfo.border }]}
        >
          <View style={styles.statusHeaderContent}>
            <View style={[styles.statusIconCircle, { backgroundColor: statusInfo.color }]}>
              <Ionicons name={statusInfo.icon} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
              <Text style={styles.statusDescription}>
                {bid.status?.toLowerCase() === 'pending' 
                  ? 'Your bid is under review by the client' 
                  : bid.status?.toLowerCase() === 'accepted'
                  ? 'Congratulations! The client selected your bid'
                  : `Status updated: ${formatDateTime(bid.updatedAt)}`
                }
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Bid Amount Card - Like Fiverr Pricing */}
          <View style={styles.bidAmountCard}>
            <View style={styles.bidAmountHeader}>
              <Ionicons name="pricetag" size={20} color="#6366F1" />
              <Text style={styles.bidAmountTitle}>Your Bid</Text>
            </View>
            <Text style={styles.bidAmountValue}>₵{bid.amount}</Text>
            {bid.task?.budget && (
              <View style={styles.budgetComparison}>
                <Text style={styles.budgetLabel}>Client's Budget:</Text>
                <Text style={styles.budgetValue}>₵{bid.task.budget}</Text>
              </View>
            )}
            <View style={styles.bidMetaGrid}>
              <View style={styles.bidMetaItem}>
                <Ionicons name="calendar" size={18} color="#6366F1" />
                <Text style={styles.bidMetaLabel}>Timeline</Text>
                <Text style={styles.bidMetaValue}>{bid.timeline} </Text>
              </View>
              <View style={styles.bidMetaItem}>
                <Ionicons name="time" size={18} color="#6366F1" />
                <Text style={styles.bidMetaLabel}>Submitted</Text>
                <Text style={styles.bidMetaValue}>{formatDateTime(bid.createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* Bid Message - Like TaskRabbit Notes */}
          {bid.message && (
            <View style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <Ionicons name="chatbubble" size={18} color="#6366F1" />
                <Text style={styles.messageTitle}>Message to Client</Text>
              </View>
              <Text style={styles.messageContent}>"{bid.message}"</Text>
            </View>
          )}

          {/* Task Details Card - Like Fiverr Gig Card */}
          <TouchableOpacity style={styles.taskCard} onPress={handleViewTask} activeOpacity={0.7}>
            <View style={styles.taskCardHeader}>
              <Ionicons name="briefcase" size={20} color="#6366F1" />
              <Text style={styles.taskCardTitle}>Task Details</Text>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" style={styles.cardChevron} />
            </View>
            <Text style={styles.taskTitle}>{bid.task?.title}</Text>
            <Text style={styles.taskDescription} numberOfLines={2}>
              {bid.task?.description}
            </Text>
            <View style={styles.taskTags}>
              <View style={styles.taskTag}>
                <Ionicons name="calendar" size={14} color="#64748B" />
                <Text style={styles.taskTagText}>Due {formatDate(bid.task?.deadline)}</Text>
              </View>
              <View style={styles.taskTag}>
                <Ionicons name="location" size={14} color="#64748B" />
                <Text style={styles.taskTagText}>
                  {bid.task?.locationType === 'remote' ? 'Remote' : 'On-site'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Client Info Card - Like TaskRabbit Client Card */}
          {bid.task?.employer && (
            <View style={styles.clientCard}>
              <View style={styles.clientCardHeader}>
                <Ionicons name="person" size={20} color="#6366F1" />
                <Text style={styles.clientCardTitle}>Client Information</Text>
              </View>
              <View style={styles.clientInfo}>
                <View style={styles.clientAvatarContainer}>
                  {bid.task.employer.profileImage ? (
                    <Image
                      source={{ uri: bid.task.employer.profileImage }}
                      style={styles.clientAvatar}
                    />
                  ) : (
                    <View style={[styles.clientAvatar, styles.clientAvatarFallback]}>
                      <Text style={styles.clientAvatarText}>
                        {bid.task.employer.name?.charAt(0)?.toUpperCase() || 'C'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.clientDetails}>
                  <Text style={styles.clientName}>{bid.task.employer.name}</Text>
                  {bid.task.employer.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.verifiedText}>Verified Client</Text>
                    </View>
                  )}
                </View>
                {canMessage && (
                  <TouchableOpacity 
                    style={styles.messageButton}
                    onPress={handleMessageClient}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
                        <Text style={styles.messageButtonText}>Message</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Next Steps - Like Fiverr Guidance */}
          <View style={styles.guidanceCard}>
            <View style={styles.guidanceHeader}>
              <Ionicons name="information-circle" size={20} color="#6366F1" />
              <Text style={styles.guidanceTitle}>Next Steps</Text>
            </View>
            
            {bid.status?.toLowerCase() === 'pending' && (
              <View style={styles.guidanceSteps}>
                <View style={styles.guidanceStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Wait for Review</Text>
                    <Text style={styles.stepDescription}>
                      The client is reviewing your bid and others. You'll be notified when they decide.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.guidanceStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Stay Available</Text>
                    <Text style={styles.stepDescription}>
                      Check notifications regularly. The client may reach out with questions.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {bid.status?.toLowerCase() === 'accepted' && (
              <>
                <View style={styles.guidanceSteps}>
                  <View style={[styles.guidanceStep, styles.successStep]}>
                    <View style={[styles.stepNumber, styles.successStepNumber]}>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.successStepTitle}>🎉 Congratulations!</Text>
                      <Text style={styles.stepDescription}>
                        The client selected your bid! You're now assigned to this task.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.guidanceStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Manage Your Task</Text>
                      <Text style={styles.stepDescription}>
                        Go to task details to accept assignment, message client, and manage all activities.
                      </Text>
                    </View>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.manageTaskButton}
                  onPress={handleManageAcceptedTask}
                >
                  <Ionicons name="briefcase" size={18} color="#FFFFFF" />
                  <Text style={styles.manageTaskText}>Go to Task Management</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}

            {bid.status?.toLowerCase() === 'rejected' && (
              <View style={[styles.guidanceSteps, styles.rejectedGuidance]}>
                <View style={styles.guidanceStep}>
                  <View style={[styles.stepNumber, styles.neutralStepNumber]}>
                    <Ionicons name="information" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Bid Not Selected</Text>
                    <Text style={styles.stepDescription}>
                      The client selected another tasker. Don't worry, keep bidding on other opportunities!
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Timeline - Clean Modern Timeline */}
          <View style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <Ionicons name="time" size={20} color="#6366F1" />
              <Text style={styles.timelineTitle}>Bid Timeline</Text>
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
        </View>
      </ScrollView>

      {/* Action Buttons - Bottom Bar like TaskRabbit */}
      <View style={styles.actionBar}>
        {isBidEditable && (
          <>
            <TouchableOpacity 
              style={styles.editActionButton}
              onPress={() => setShowEditModal(true)}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <>
                  <Ionicons name="create-outline" size={18} color="#6366F1" />
                  <Text style={styles.editActionText}>Edit Bid</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.withdrawActionButton}
              onPress={handleWithdrawBid}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="arrow-back" size={18} color="#EF4444" />
                  <Text style={styles.withdrawActionText}>Withdraw</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {!isBidEditable && !isAccepted && (
          <TouchableOpacity 
            style={styles.primaryActionButton}
            onPress={() => navigate('MainTabs',{screen:'AvailableTasks'})}
          >
            <Ionicons name="search" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Browse More Tasks</Text>
          </TouchableOpacity>
        )}

        {isAccepted && (
          <TouchableOpacity 
            style={styles.successActionButton}
            onPress={handleManageAcceptedTask}
          >
            <Ionicons name="briefcase" size={18} color="#FFFFFF" />
            <Text style={styles.successActionText}>Manage Task</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Edit Bid Modal - Modern Bottom Sheet */}
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
                <TouchableOpacity 
                  onPress={() => setShowEditModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Bid Amount (₵) *</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.amountPrefix}>₵</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={editingBid.amount}
                      onChangeText={(text) => setEditingBid(prev => ({ ...prev, amount: text.replace(/[^0-9.]/g, '') }))}
                      placeholder="0.00"
                      keyboardType="numeric"
                      editable={!updating}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Timeline </Text>
                  <View style={styles.timelineInputContainer}>
                    <TextInput
                      style={styles.timelineInput}
                      value={editingBid.timeline}
                      onChangeText={(text) => setEditingBid(prev => ({ ...prev, timeline: text }))}
                      placeholder="e.g., 3 hours"
                     
                      editable={!updating}
                    />
                    
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Message to Client (Optional)</Text>
                  <TextInput
                    style={styles.messageInput}
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
                  style={styles.cancelButton}
                  onPress={() => setShowEditModal(false)}
                  disabled={updating}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.updateButton}
                  onPress={handleEditBid}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.updateButtonText}>Update Bid</Text>
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
    backgroundColor: '#FFFFFF',
  },
  // Header
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerRight: {
    width: 32,
  },
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // Status Header
  statusHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  statusHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  // Content Container
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  // Bid Amount Card
  bidAmountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bidAmountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bidAmountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  bidAmountValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 12,
    textAlign: 'center',
  },
  budgetComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'center',
  },
  budgetLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 4,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  bidMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  bidMetaItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  bidMetaLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    marginBottom: 2,
  },
  bidMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  // Message Card
  messageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  messageContent: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  // Task Card
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  cardChevron: {
    marginLeft: 'auto',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  taskTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  taskTagText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  // Client Card
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  clientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatarContainer: {
    marginRight: 12,
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  clientAvatarFallback: {
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6366F1',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
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
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Guidance Card
  guidanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  guidanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  guidanceSteps: {
    marginBottom: 16,
  },
  guidanceStep: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  successStep: {
    marginBottom: 24,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
  successStepNumber: {
    backgroundColor: '#10B981',
  },
  neutralStepNumber: {
    backgroundColor: '#6B7280',
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  successStepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  rejectedGuidance: {
    opacity: 0.9,
  },
  manageTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  manageTaskText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Timeline Card
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  timeline: {
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
    marginTop: 6,
  },
  timelineDotActive: {
    backgroundColor: '#6366F1',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 24,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  timelineConnector: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginLeft: 5.5,
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    maxWidth: 200,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // Action Bar
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
    paddingBottom:54,
  },
  editActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  editActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
  },
  withdrawActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  withdrawActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  successActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  modalContainer: {
     maxHeight: '95%',
     zIndex: 10000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  amountPrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timelineInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  timelineInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timelineSuffix: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
  },
  messageInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    height: 120,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  updateButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BidDetailsScreen;