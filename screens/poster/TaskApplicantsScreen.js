import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import { AuthContext } from '../../context/AuthContext';
import { assignApplicantToTask, clientGetTaskInfo } from '../../api/miniTaskApi';
import { getMicroTaskApplicants, acceptBidForTask, getMicroTaskBids } from '../../api/bidApi';
import { navigate } from '../../services/navigationService';
import { triggerPayment } from '../../services/PaymentServices';
import { usePaystack } from "react-native-paystack-webview";
import LoadingIndicator from '../../component/common/LoadingIndicator'


const { width } = Dimensions.get('window');

export default function ApplicantsScreen({ route }) {
  const { taskId, task: initialTask } = route.params;
  const { user } = useContext(AuthContext);
  const { popup } = usePaystack();
  
  const [data, setData] = useState([]);
  const [task, setTask] = useState(initialTask);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [processingAction, setProcessingAction] = useState(null);
  const [biddingType, setBiddingType] = useState(initialTask?.biddingType || 'fixed');

  // Update derived states based on current task
  const isTaskAssigned = task?.assignedTo && task?.status !== 'Open' && task?.status !== 'Pending';
  const isTaskInProgress = task?.status === 'In-progress' || task?.status === 'Review';
  const isTaskCompleted = task?.status === 'Completed' || task?.status === 'Closed';
  const canAssign = !isTaskInProgress && !isTaskCompleted;
  const isAlreadyFunded = task?.funded;

  // Fetch latest task data
  const fetchTaskData = async () => {
    try {
      const response = await clientGetTaskInfo(taskId);
      if (response.status === 200) {
        setTask(response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching task data:', error);
    }
    return task;
  };

  useEffect(() => {
    loadData();
  }, [taskId]);

  const loadData = async () => {
    try {
      setLoading(true);
      let response;

      // First, get the latest task data
      const latestTask = await fetchTaskData();
      
      if (biddingType === 'fixed') {
        response = await getMicroTaskApplicants(taskId);
        if (response.status === 200) {
          const applicants = response.data.map(applicant => ({
            ...applicant,
            isAssigned: latestTask?.assignedTo?.toString() === applicant._id?.toString()
          }));
          setData(applicants);
        }
      } else {
        response = await getMicroTaskBids(taskId);
        if (response.status === 200) {
          const bids = response.data.map(bid => ({
            ...bid,
            isAccepted: latestTask?.assignedTo?.toString() === bid.bidder?._id?.toString()
          }));
          setData(bids);
        }
      }

      if (response.status !== 200) {
        throw new Error(`Failed to load ${biddingType === 'fixed' ? 'applicants' : 'bids'}`);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', `Failed to load ${biddingType === 'fixed' ? 'applicants' : 'bids'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleAssign = async (applicantId, applicantName) => {
    const alertTitle = isAlreadyFunded ? "Reassign Task" : "Assign Task & Make Payment";
    const alertMessage = isAlreadyFunded 
      ? `You can reassign this task to ${applicantName} since the current tasker hasn't accepted yet. The task is already funded, so no additional payment is required.\n\nDo you want to continue?`
      : `Assigning ${applicantName} will initiate a secure payment of GH₵${task.budget} that will be held in escrow until the work is completed and approved.\n\nDo you want to continue?`;

    Alert.alert(
      alertTitle,
      alertMessage,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isAlreadyFunded ? "Reassign" : "Continue",
          style: "default",
          onPress: async () => {
            try {
              setProcessingAction(applicantId);

              let paymentSuccess = true;
              if (!isAlreadyFunded) {
                paymentSuccess = await triggerPayment({
                  popup,
                  email: user.email,
                  phone: user.phone,
                  amount: task.budget,
                  taskId: task._id,
                  beneficiary: applicantId,
                });
                
                if (!paymentSuccess) {
                  Alert.alert(
                    "Payment Not Completed",
                    "Task assignment has been cancelled since payment was not successful."
                  );
                  return; 
                }
              }

              const response = await assignApplicantToTask(taskId, applicantId);
              if (response.status === 200) {
                const successMessage = isAlreadyFunded 
                  ? `Task reassigned to ${applicantName}!` 
                  : `Task assigned to ${applicantName}!`;
                Alert.alert("Success", successMessage);

                await Promise.all([
                  fetchTaskData(),
                  loadData()
                ]);

                setData(prev => prev.map(item => ({
                  ...item,
                  isAssigned: item._id === applicantId,
                })));

              } else {
                throw new Error(response.data?.message || "Assignment failed");
              }
            } catch (error) {
              const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Error assigning task";
              Alert.alert("Error", errorMessage);
              console.error(error);
            } finally {
              setProcessingAction(null);
            }
          },
        },
      ]
    );
  };

  const handleAcceptBid = async (bidder, amount, bidId, bidderName) => {
    const alertTitle = isAlreadyFunded ? "Reassign Task" : "Accept Bid";
    const alertMessage = isAlreadyFunded 
      ? `You can reassign this task to ${bidderName} since the current tasker hasn't accepted yet. The task is already funded, so no additional payment is required.\n\nDo you want to continue?`
      : `Assigning ${bidderName} will initiate a secure payment of GH₵${amount} that will be held in escrow until the work is completed and approved.\n\nDo you want to continue?`;

    Alert.alert(
      alertTitle,
      alertMessage,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: isAlreadyFunded ? "Reassign" : "Accept Bid", 
          style: "default",
          onPress: async () => {
            try {
              setProcessingAction(bidId);

              let paymentSuccess = true;
              if (!isAlreadyFunded) {
                paymentSuccess = await triggerPayment({
                  popup,
                  email: user.email,
                  phone: user.phone,
                  amount: amount,
                  taskId: task._id,
                  beneficiary: bidder._id,
                });
                
                if (!paymentSuccess) {
                  Alert.alert(
                    "Payment Not Completed",
                    "Task assignment has been cancelled since payment was not successful."
                  );
                  return; 
                }
              }

              const response = await acceptBidForTask(taskId, bidId);
              if (response.status === 200) {
                const successMessage = isAlreadyFunded 
                  ? `Task reassigned to ${bidderName}!` 
                  : `Bid accepted from ${bidderName}!`;
                Alert.alert("Success", successMessage);
                
                await Promise.all([
                  fetchTaskData(),
                  loadData()
                ]);

                setData(prev => prev.map(item => ({
                  ...item,
                  isAccepted: item._id === bidId
                })));

              } else {
                throw new Error(response.data?.message || 'Bid acceptance failed');
              }
            } catch (error) {
              const errorMessage = error.response?.data?.message ||
                error.response?.data?.error || 'Error accepting bid';
              Alert.alert("Error", errorMessage);
              console.error(error);
            } finally {
              setProcessingAction(null);
            }
          }
        }
      ]
    );
  };

  const handleViewProfile = (item) => {
    const userData = biddingType === 'fixed' ? item : item.bidder;
    navigate('ApplicantProfile', { applicant: userData, taskId });
  };

  const handleChat = (item) => {
    const userData = biddingType === 'fixed' ? item : item.bidder;
    navigate('Chat', { 
      userId: userData._id,
      userName: userData.name,
      taskId 
    });
  };

  // Filter and sort data
  const filteredAndSortedData = data
    .filter(item => {
      if (activeFilter === 'assigned') return item.isAssigned || item.isAccepted;
      if (activeFilter === 'unassigned') return !item.isAssigned && !item.isAccepted;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.totalScore || 0) - (a.totalScore || 0);
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'experience') return (b.experience || 0) - (a.experience || 0);
      if (sortBy === 'amount' && biddingType === 'open-bid') return a.amount - b.amount;
      return 0;
    });

  const renderEmptyState = () => {
    const isFixedBid = biddingType === 'fixed';
    const emptyTitle = isFixedBid ? "No Applicants Yet" : "No Bids Yet";
    const emptyDescription = isFixedBid 
      ? "No one has applied to your task yet. Share your task to get more visibility and attract qualified taskers."
      : "No bids have been submitted for your task yet. Taskers are reviewing your requirements and will submit their bids soon.";
    const emptyIcon = isFixedBid ? "people-outline" : "pricetags-outline";

    return (
      <View style={styles.emptyState}>
        <LinearGradient
          colors={['#F8FAFC', '#F1F5F9']}
          style={styles.emptyIllustration}
        >
          <Ionicons name={emptyIcon} size={48} color="#6366F1" />
        </LinearGradient>
        
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyDescription}>{emptyDescription}</Text>
        
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => {
            Alert.alert(
              "Share Task",
              "Share this task with potential taskers to get more applications.",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Share", 
                  onPress: () => console.log("Share task:", taskId)
                }
              ]
            );
          }}
        >
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            style={styles.shareButtonGradient}
          >
            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>Share Task</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips to attract more {isFixedBid ? 'applicants' : 'bids'}:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.tipText}>Ensure your task description is clear and detailed</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.tipText}>Set a competitive budget for your task</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.tipText}>Add specific requirements and skills needed</Text>
          </View>
          {!isFixedBid && (
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.tipText}>Consider setting a realistic timeline for completion</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderApplicantCard = ({ item: applicant }) => (
    <LinearGradient
      colors={['#FFFFFF', '#F8FAFC']}
      style={styles.applicantCard}
    >
      {/* Header Section */}
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {applicant.profileImage ? (
              <Image
                source={{ uri: applicant.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {applicant.name?.charAt(0)?.toUpperCase() || 'A'}
                </Text>
              </LinearGradient>
            )}
            {(applicant.isAssigned || applicant.isAccepted) && (
              <View style={styles.assignedBadge}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>
          
          <View style={styles.userDetails}>
            <Text style={styles.applicantName} numberOfLines={1}>
              {applicant.name || 'Applicant'}
            </Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>
                {applicant.rating ? parseFloat(applicant.rating.toFixed(1)) : 'N/A'}
              </Text>
              <Text style={styles.completedText}>
                • {applicant.completedTasks || 0} completed
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            style={styles.scoreGradient}
          >
            <Text style={styles.scoreValue}>
              {applicant.totalScore ? parseFloat(applicant.totalScore.toFixed(1)) : 'N/A'}
            </Text>
            <Text style={styles.scoreLabel}>Score</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Stats Grid 
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Ionicons name="trending-up" size={16} color="#10B981" />
          <Text style={styles.statValue}>
            {applicant.completionRate ? `${applicant.completionRate}%` : 'N/A'}
          </Text>
          <Text style={styles.statLabel}>Success</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="time" size={16} color="#8B5CF6" />
          <Text style={styles.statValue}>{applicant.experience || 0}</Text>
          <Text style={styles.statLabel}>Exp</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="calendar" size={16} color="#F59E0B" />
          <Text style={styles.statValue}>
            {applicant.appliedDate ? moment(applicant.appliedDate).fromNow() : 'Recently'}
          </Text>
          <Text style={styles.statLabel}>Applied</Text>
        </View>
      </View>*/}

      {/* Skills */}
      {applicant.skills && applicant.skills.length > 0 && (
        <View style={styles.skillsContainer}>
          <Text style={styles.sectionLabel}>Key Skills</Text>
          <View style={styles.skillsList}>
            {applicant.skills.slice(0, 4).map((skill, index) => (
              <LinearGradient
                key={index}
                colors={['#EEF2FF', '#E0E7FF']}
                style={styles.skillTag}
              >
                <Text style={styles.skillText}>{skill}</Text>
              </LinearGradient>
            ))}
            {applicant.skills.length > 4 && (
              <Text style={styles.moreSkillsText}>
                +{applicant.skills.length - 4} more
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Proposal */}
      {applicant.proposal && (
        <View style={styles.proposalContainer}>
          <Text style={styles.sectionLabel}>Proposal</Text>
          <Text style={styles.proposalText} numberOfLines={3}>
            "{applicant.proposal}"
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => handleViewProfile(applicant)}
        >
          <Ionicons name="person-outline" size={16} color="#6366F1" />
          <Text style={styles.secondaryButtonText}>View Profile</Text>
        </TouchableOpacity>

        {/*<TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => handleChat(applicant)}
        >
          <Ionicons name="chatbubble-outline" size={16} color="#8B5CF6" />
          <Text style={styles.secondaryButtonText}>Chat</Text>
        </TouchableOpacity>*/}

        {!applicant.isAssigned ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton, !canAssign && styles.disabledButton]}
            onPress={() => handleAssign(applicant._id, applicant.name)}
            disabled={processingAction === applicant._id || !canAssign}
          >
            {processingAction === applicant._id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {!canAssign ? 'Cannot Assign' : 'Assign Task'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.actionButton, styles.assignedButton]}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.assignedButtonText}>Assigned</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );

  const renderBidCard = ({ item: bid }) => {
    const bidder = bid?.bidder || {};
    
    return (
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.applicantCard}
      >
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {bidder?.profileImage ? (
                <Image
                  source={{ uri: bidder?.profileImage }}
                  style={styles.avatar}
                />
              ) : (
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {bidder?.name?.charAt(0)?.toUpperCase() || 'B'}
                  </Text>
                </LinearGradient>
              )}
              {bid?.isAccepted && (
                <View style={styles.assignedBadge}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            
            <View style={styles.userDetails}>
              <Text style={styles.applicantName} numberOfLines={1}>
                {bidder?.name || 'Bidder'}
              </Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {bidder?.rating ? parseFloat(bidder.rating.toFixed(1)) : 'N/A'}
                </Text>
                <Text style={styles.completedText}>
                  • {bidder?.completedTasks || 0} completed
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.scoreContainer}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.scoreGradient}
            >
              <Text style={styles.scoreValue}>₵{bid?.amount || '0'}</Text>
              <Text style={styles.scoreLabel}>Bid</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Bid Details */}
        <View style={styles.bidDetails}>
          <View style={styles.bidMeta}>
            {bid?.timeline && (
              <View style={styles.bidMetaItem}>
                <Ionicons name="time-outline" size={16} color="#6366F1" />
                <Text style={styles.bidMetaText}>{bid.timeline}</Text>
              </View>
            )}
            <View style={styles.bidMetaItem}>
              <Ionicons name="calendar-outline" size={16} color="#8B5CF6" />
              <Text style={styles.bidMetaText}>
                {bid?.createdAt ? moment(bid.createdAt).fromNow() : 'Recently'}
              </Text>
            </View>
          </View>
          
          {bid?.message && (
            <View style={styles.proposalContainer}>
              <Text style={styles.sectionLabel}>Bid Message</Text>
              <Text style={styles.proposalText} numberOfLines={5}>
                "{bid.message}"
              </Text>
            </View>
          )}
        </View>

        {/* Stats Grid 
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={16} color="#10B981" />
            <Text style={styles.statValue}>
              {bidder?.completionRate ? `${bidder.completionRate}%` : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color="#8B5CF6" />
            <Text style={styles.statValue}>{bidder?.experience || 0}</Text>
            <Text style={styles.statLabel}>Exp</Text>
          </View>
        </View>*/}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => handleViewProfile(bid)}
          >
            <Ionicons name="person-outline" size={16} color="#6366F1" />
            <Text style={styles.secondaryButtonText}>Profile</Text>
          </TouchableOpacity>

          {/*<TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => handleChat(bid)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#8B5CF6" />
            <Text style={styles.secondaryButtonText}>Chat</Text>
          </TouchableOpacity>*/}

          {!bid.isAccepted ? (
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, !canAssign && styles.disabledButton]}
              onPress={() => handleAcceptBid(bidder, bid?.amount, bid?._id, bidder?.name || 'Bidder')}
              disabled={processingAction === bid?._id || !canAssign}
            >
              {processingAction === bid?._id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    {!canAssign ? 'Cannot Accept' : 'Accept Bid'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.actionButton, styles.assignedButton]}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.assignedButtonText}>Accepted</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    );
  };

  const renderAssignedTasker = () => {
    if (!isTaskAssigned) return null;

    const assignedUser = data.find(item => 
      item?.isAssigned || item?.isAccepted
    );

    if (!assignedUser && !task?.assignedTo) return null;

    let userData;
    if (assignedUser) {
      userData = biddingType === 'fixed' ? assignedUser : (assignedUser?.bidder || {});
    } else {
      userData = task?.assignedTo || {};
    }

    return (
      <LinearGradient
        colors={['#F0FDF4', '#DCFCE7']}
        style={styles.assignedTaskerCard}
      >
        <View style={styles.assignedHeader}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.assignedTitle}>Task Assigned</Text>
        </View>
        
        <View style={styles.assignedContent}>
          <View style={styles.assignedUser}>
            <View style={styles.avatarContainer}>
              {userData?.profileImage ? (
                <Image
                  source={{ uri: userData?.profileImage }}
                  style={styles.avatar}
                />
              ) : (
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {userData?.name?.charAt(0)?.toUpperCase() || 'T'}
                  </Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.assignedUserInfo}>
              <Text style={styles.assignedUserName}>{userData?.name || 'Assigned Tasker'}</Text>
              <Text style={styles.assignedUserDetail}>{userData?.email || 'No email available'}</Text>
              <Text style={styles.assignedUserDetail}>{userData?.phone || 'No phone available'}</Text>
              {biddingType === 'open-bid' && assignedUser?.amount && (
                <Text style={styles.assignedBidAmount}>Accepted Bid: ₵{assignedUser.amount}</Text>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Header 
          title={biddingType === 'fixed' ? "Applicants" : "Bids"} 
          showBackButton={true} 
        />
        <View style={styles.loadingContainer}>
          <LoadingIndicator text='Loading Task Applicants...'/>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <Header 
        title={biddingType === 'fixed' ? "Applicants" : "Bids"} 
        showBackButton={true} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#6366F1']}
          />
        }
      >
        {/* Task Info Header */}
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.taskHeader}
        >
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {task?.title || 'Task'}
            </Text>
            <View style={styles.taskMetaRow}>
              <View style={styles.taskMeta}>
                <Ionicons name="people-outline" size={16} color="#E0E7FF" />
                <Text style={styles.taskMetaText}>
                  {data.length} {biddingType === 'fixed' ? 'applicant' : 'bid'}{data.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.budgetBadge}>
                <Ionicons 
                  name={biddingType === 'fixed' ? "cash-outline" : "pricetag-outline"} 
                  size={16} 
                  color="#FFFFFF" 
                />
                <Text style={styles.budgetText}>
                  {biddingType === 'fixed' ? `₵${task?.budget || '0'}` : 'Open Bid'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Assigned Tasker Section */}
        {renderAssignedTasker()}

        {/* Task Status Warning */}
        {!canAssign && (
          <View style={styles.statusWarning}>
            <Ionicons name="information-circle" size={20} color="#F59E0B" />
            <Text style={styles.statusWarningText}>
              {isTaskCompleted 
                ? 'This task has been completed and cannot be assigned.'
                : isTaskInProgress
                ? 'This task is already in progress and cannot be reassigned.'
                : 'This task has already been assigned.'
              }
            </Text>
          </View>
        )}

        {/* Filters and Sort */}
        <View style={styles.controlsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
          >
            <View style={styles.filtersContainer}>
              {['all', 'unassigned'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                    {filter === 'all' 
                      ? `All (${data.length})`
                      : `Available (${data.filter(a => !a.isAssigned && !a.isAccepted).length})`
                    }
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => {
              const sortOptions = [
                { text: "Score", onPress: () => setSortBy('score') },
                { text: "Rating", onPress: () => setSortBy('rating') },
                { text: "Experience", onPress: () => setSortBy('experience') },
              ];
              
              if (biddingType === 'open-bid') {
                sortOptions.push({ text: "Bid Amount", onPress: () => setSortBy('amount') });
              }
              
              sortOptions.push({ text: "Cancel", style: "cancel" });
              
              Alert.alert("Sort By", "Choose how to sort", sortOptions);
            }}
          >
            <Ionicons name="filter" size={16} color="#6366F1" />
            <Text style={styles.sortText}>
              Sort: {sortBy === 'score' ? 'Score' : sortBy === 'rating' ? 'Rating' : sortBy === 'experience' ? 'Experience' : 'Bid Amount'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Data List */}
        <View style={styles.dataContainer}>
          {filteredAndSortedData.length > 0 ? (
            filteredAndSortedData.map((item) => (
              <View key={item._id}>
                {biddingType === 'fixed' ? renderApplicantCard({ item }) : renderBidCard({ item })}
              </View>
            ))
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D325D',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  taskHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 28,
  },
  taskMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskMetaText: {
    fontSize: 14,
    color: '#E0E7FF',
    fontWeight: '500',
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  budgetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  controlsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  filtersScroll: {
    marginBottom: 12,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  dataContainer: {
    padding: 16,
    paddingTop: 8,
  },
  applicantCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  assignedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  userDetails: {
    flex: 1,
  },
  applicantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  completedText: {
    fontSize: 14,
    color: '#64748B',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 70,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 6,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  skillsContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366F1',
  },
  moreSkillsText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    alignSelf: 'center',
    marginLeft: 4,
  },
  proposalContainer: {
    marginBottom: 16,
  },
  proposalText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  bidDetails: {
    marginBottom: 16,
  },
  bidMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  bidMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bidMetaText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    minHeight: 44,
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  primaryButton: {
    backgroundColor: '#10B981',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assignedButton: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  assignedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  shareButton: {
    width: '100%',
    marginBottom: 32,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  assignedTaskerCard: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  assignedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
  },
  assignedContent: {
    gap: 12,
  },
  assignedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assignedUserInfo: {
    flex: 1,
  },
  assignedUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  assignedUserDetail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  assignedBidAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  statusWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  statusWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
});