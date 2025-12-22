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
  Linking,
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
import { startOrGetChatRoom } from '../../api/chatApi';

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

  // Handle messaging
  const handleMessage = async (userId, userName) => {
    try {
      const res = await startOrGetChatRoom({ 
        userId2: userId, 
        jobId: taskId 
      });
      
      if (res.status === 200) {
        navigate('ChatWindow', { 
          roomId: res.data._id,
          recipientName: userName
        });
      } else {
        Alert.alert('Error', 'Failed to start chat');
      }
    } catch (error) {
      console.error('Chat error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to start chat');
    }
  };

  // Process full payment for assignment
  const processFullPayment = async (applicantId, applicantName) => {
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
  };

  // Process full payment for bid acceptance
  const processFullBidPayment = async (bidder, amount, bidId, bidderName) => {
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
  };

  // Handle assignment with payment flexibility
  const handleAssign = async (applicantId, applicantName) => {
    const alertTitle = isAlreadyFunded ? "Reassign Task" : "Assign Task & Make Payment";
    
    if (isAlreadyFunded) {
      // If already funded, just reassign
      Alert.alert(
        alertTitle,
        `You can reassign this task to ${applicantName} since the current tasker hasn't accepted yet. The task is already funded, so no additional payment is required.\n\nDo you want to continue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reassign",
            style: "default",
            onPress: () => processFullPayment(applicantId, applicantName)
          },
        ]
      );
    } else {
      // Ask about payment capability
      Alert.alert(
        alertTitle,
        `Assigning ${applicantName} requires payment of GH₵${task.budget}.
        \nYour payment of ₵${task.budget} will be securely held in escrow and only released to ${applicantName || 'the tasker'}
once you both confirm the task is completed satisfactorily.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, Pay Full Amount",
            style: "default",
            onPress: () => processFullPayment(applicantId, applicantName)
          },
        ]
      );
    }
  };

  // Handle bid acceptance with payment flexibility
  const handleAcceptBid = async (bidder, amount, bidId, bidderName) => {
    const alertTitle = isAlreadyFunded ? "Reassign Task" : "Accept Bid";
    
    if (isAlreadyFunded) {
      // If already funded, just reassign
      Alert.alert(
        alertTitle,
        `You can reassign this task to ${bidderName} since the current tasker hasn't accepted yet. The task is already funded, so no additional payment is required.\n\nDo you want to continue?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Reassign", 
            style: "default",
            onPress: () => processFullBidPayment(bidder, amount, bidId, bidderName)
          }
        ]
      );
    } else {
      // Ask about payment capability
      Alert.alert(
        alertTitle,
        `Accepting ${bidderName}'s bid requires payment of GH₵${amount}.
        \nYour payment of ₵${amount} will be securely held in escrow and only released to ${bidderName || 'the tasker'}
once you both confirm the task is completed satisfactorily.`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Yes, Pay Full Amount", 
            style: "default",
            onPress: () => processFullBidPayment(bidder, amount, bidId, bidderName)
          },
        ]
      );
    }
  };

  const handleViewProfile = (item) => {
    const userData = biddingType === 'fixed' ? item : item.bidder;
    navigate('ApplicantProfile', { applicant: userData, taskId });
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

  // ========== ENHANCED APPLICANT CARD COMPONENT ==========
  const ApplicantCard = ({ item }) => {
    const userData = biddingType === 'fixed' ? item : item.bidder;
    const isAssigned = item.isAssigned || item.isAccepted;
    
    // Get badge color based on status
    const getBadgeColor = () => {
      if (isAssigned) return '#10B981'; // Green for assigned
      if (item.totalScore >= 80) return '#6366F1'; // Purple for high score
      if (item.totalScore >= 60) return '#F59E0B'; // Orange for medium score
      return '#6B7280'; // Gray for low score
    };

    // Format experience
    const formatExperience = (exp) => {
      if (!exp) return 'New';
      if (exp < 1) return 'Beginner';
      if (exp <= 3) return `${exp} year${exp !== 1 ? 's' : ''} exp`;
      return `${exp}+ years`;
    };

    return (
      <TouchableOpacity onPress={() => handleViewProfile(item)} style={styles.applicantCard}>
        {/* Top Section with Image */}
        <View style={styles.topSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ 
                uri: userData.profileImage || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80' 
              }}
              style={styles.profileImage}
            />
            
            {/* Verified Badge */}
            {userData.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </View>
            )}
            
            {/* Assigned Badge */}
            {isAssigned && (
              <View style={styles.assignedBadge}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Rating and Score Badge */}
          <View style={styles.ratingBadge}>
            <View style={styles.ratingStars}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>
                {userData.rating?.toFixed(1) || '5.0'}
              </Text>
              {userData.numberOfRatings > 0 && (
                <Text style={styles.ratingCount}>({userData.numberOfRatings})</Text>
              )}
            </View>
            
            {/* Score Badge */}
            <View style={[styles.scoreBadge, { backgroundColor: getBadgeColor() }]}>
              <Text style={styles.scoreText}>{item.totalScore || 0}</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
          </View>
        </View>

        {/* User Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.nameAndPrice}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName} numberOfLines={1}>
                {userData.name || 'Professional'}
              </Text>
              {userData.isPro && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            
            {/* Price/Bid Amount */}
            {biddingType === 'open-bid' ? (
              <Text style={styles.bidAmount}>₵{item.amount}</Text>
            ) : (
              <Text style={styles.budgetText}>Budget: ₵{task?.budget || '0'}</Text>
            )}
          </View>

          {/* Primary Skill */}
          <View style={styles.skillBadge}>
            <Ionicons name="briefcase-outline" size={14} color="#6366F1" />
            <Text style={styles.skillText} numberOfLines={1}>
              {userData.skills?.[0] || 'Skilled Professional'}
            </Text>
          </View>

          {/* Experience & Location */}
          <View style={styles.statsRow}>
            {userData.experience > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="trophy-outline" size={14} color="#F59E0B" />
                <Text style={styles.statText}>{formatExperience(userData.experience)}</Text>
              </View>
            )}
            
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={14} color="#64748B" />
              <Text style={styles.statText}>
                {userData.location?.city || 'Available Nationwide'}
              </Text>
            </View>
          </View>

          {/* Proposal/Bid Message */}
          {(item.proposal || item.message) && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText} numberOfLines={2}>
                "{item.proposal || item.message}"
              </Text>
            </View>
          )}

          {/* Stats Row (like Fiverr) */}
          <View style={styles.performanceStats}>
            {userData.completedJobs > 0 && (
              <View style={styles.performanceItem}>
                <Ionicons name="checkmark-done" size={14} color="#10B981" />
                <Text style={styles.performanceText}>{userData.completedJobs} jobs</Text>
              </View>
            )}
            
            {userData.onTimeRate && (
              <View style={styles.performanceItem}>
                <Ionicons name="time-outline" size={14} color="#6366F1" />
                <Text style={styles.performanceText}>{userData.onTimeRate}% on time</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Message Button - Always Visible */}
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={() => handleMessage(userData._id, userData.name)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6366F1" />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>

            {/* Profile Button 
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => handleViewProfile(item)}
            >
              <Ionicons name="person-outline" size={16} color="#6366F1" />
              <Text style={styles.profileButtonText}>Profile</Text>
            </TouchableOpacity>*/}

            {/* Assign/Accept Button */}
            {!isAssigned ? (
              <TouchableOpacity 
                style={[styles.assignButton, !canAssign && styles.disabledButton]}
                onPress={() => {
                  if (biddingType === 'fixed') {
                    handleAssign(item._id, userData.name);
                  } else {
                    handleAcceptBid(userData, item.amount, item._id, userData.name);
                  }
                }}
                disabled={processingAction === item._id || !canAssign}
              >
                {processingAction === item._id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons 
                      name={biddingType === 'fixed' ? "person-add" : "checkmark-circle"} 
                      size={16} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.assignButtonText}>
                      {biddingType === 'fixed' ? 'Assign' : 'Accept Bid'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.assignedButton}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.assignedButtonText}>
                  {biddingType === 'fixed' ? 'Assigned' : 'Accepted'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const isFixedBid = biddingType === 'fixed';
    const emptyTitle = isFixedBid ? "No Applicants Yet" : "No Bids Yet";
    const emptyDescription = isFixedBid 
      ? "No one has applied to your task yet. Share your task to get more visibility and attract qualified taskers."
      : "No bids have been submitted for your task yet. Taskers are reviewing your requirements and will submit their bids soon.";
    const emptyIcon = isFixedBid ? "people-outline" : "pricetags-outline";

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIllustration}>
          <Ionicons name={emptyIcon} size={48} color="#CBD5E1" />
        </View>
        
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
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>Share Task</Text>
        </TouchableOpacity>
      </View>
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
      <View style={styles.assignedTaskerCard}>
        <View style={styles.assignedHeader}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.assignedTitle}>Task Assigned</Text>
        </View>
        
        <View style={styles.assignedContent}>
          <View style={styles.assignedUser}>
            <Image
              source={{ 
                uri: userData?.profileImage || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80' 
              }}
              style={styles.assignedAvatar}
            />
            <View style={styles.assignedUserInfo}>
              <Text style={styles.assignedUserName}>{userData?.name || 'Assigned Tasker'}</Text>
              <Text style={styles.assignedUserDetail}>
                {userData?.email || 'No email available'}
              </Text>
               <Text style={styles.assignedUserDetail}>
                {userData?.phone || 'No Phone Number available'}
              </Text>
              <TouchableOpacity 
                style={styles.assignedChatButton}
                onPress={() => handleMessage(userData._id, userData.name)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
                <Text style={styles.assignedChatText}>Message Tasker</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
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
        <View style={styles.taskHeader}>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {task?.title || 'Task'}
            </Text>
            <View style={styles.taskMetaRow}>
              <View style={styles.taskMeta}>
                <Ionicons name="people-outline" size={16} color="#FFFFFF" />
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
        </View>

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
              <ApplicantCard key={item._id} item={item} />
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
  // Task Header
  taskHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#1A1F3B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '700',
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
    borderRadius: 20,
    gap: 6,
  },
  budgetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Controls
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
  // Data Container
  dataContainer: {
    padding: 16,
    paddingTop: 8,
  },
  // Applicant Card - Enhanced Design
  applicantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  // Top Section
  topSection: {
    position: 'relative',
    height: 140,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  profileImageContainer: {
    width: '100%',
    height: '130%',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#10B981',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  assignedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'flex-end',
    gap: 6,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  ratingCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  // Details Section
  detailsSection: {
    padding: 16,
  },
  nameAndPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  proBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  budgetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  // Skill Badge
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  skillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  // Message Container
  messageContainer: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  messageText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  // Performance Stats
  performanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  performanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  performanceText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  profileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  assignButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  assignedButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  assignedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  // Empty State
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
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E2E8F0',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    width: '100%',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Assigned Tasker Card
  assignedTaskerCard: {
    backgroundColor: '#FFFFFF',
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
  assignedAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    marginBottom: 8,
  },
  assignedChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  assignedChatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Status Warning
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