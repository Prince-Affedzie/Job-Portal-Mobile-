import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Alert,
  RefreshControl,
  FlatList,
  Linking,
} from 'react-native';
//import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
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

  // Format experience
  const formatExperience = (exp) => {
    if (!exp) return 'New';
    if (exp < 1) return 'Beginner';
    if (exp <= 3) return `${exp} year${exp !== 1 ? 's' : ''} exp`;
    return `${exp}+ years`;
  };

  // Get first 4 skills
  const displaySkills = userData.skills?.slice(0, 4) || [];

  return (
    <View style={styles.applicantCard}>
      {/* Header with Profile and Quick Actions */}
      <View style={styles.cardHeader}>
        <TouchableOpacity 
          style={styles.profileSection}
          onPress={() => handleViewProfile(item)}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: userData.profileImage || 'https://res.cloudinary.com/duv3qvvjz/image/upload/v1766495900/DefaultiImagePlaceHolder_r6ai4x.jpg' 
              }}
              style={styles.avatar}
            />
            {userData.isVerified && (
              <View style={styles.verifiedBadge}>
                <Feather name="check-circle" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {userData.name || 'Professional'}
              </Text>
              {userData.isPro && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
              {isAssigned && (
                <View style={styles.assignedBadge}>
                  <Feather name="check" size={10} color="#FFFFFF" />
                  <Text style={styles.assignedBadgeText}>Assigned</Text>
                </View>
              )}
            </View>
            
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.rating}>
                {userData.rating?.toFixed(1) || '5.0'}
              </Text>
              <Text style={styles.ratingCount}>
                ({userData.numberOfRatings || 0})
              </Text>
              <View style={styles.divider} />
              <Text style={styles.experience}>
                {formatExperience(userData.experience)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionIcon}
            onPress={() => handleMessage(userData._id, userData.name)}
          >
            <Feather name="message-circle" size={20} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionIcon}
            onPress={() => handleViewProfile(item)}
          >
            <Feather name="user" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Price and Status Section */}
      <View style={styles.priceSection}>
        <View style={styles.priceContainer}>
          {biddingType === 'open-bid' ? (
            <>
              <View style={styles.bidAmountContainer}>
                <Feather name="tag" size={16} color="#6366F1" />
                <Text style={styles.priceLabel}>Bid Amount:</Text>
                <Text style={styles.priceValue}>₵{item.amount}</Text>
              </View>
              <Text style={[
             styles.bidNote,
             { color: item.isAccepted ? '#10B981' : '#F59E0B' }
             ]}>
                {item.isAccepted ? 'Bid Accepted' : 'Pending Acceptance'}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.bidAmountContainer}>
                <Feather name="dollar-sign" size={16} color="#6366F1" />
                <Text style={styles.priceLabel}>Task Budget:</Text>
                <Text style={styles.priceValue}>₵{task?.budget || '0'}</Text>
              </View>
              <Text style={styles.bidNote}>
                {item.isAssigned ? 'Task Assigned' : 'Available for Assignment'}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Skills Section */}
      {displaySkills.length > 0 && (
        <View style={styles.skillsSection}>
          <View style={styles.skillsHeader}>
            <Feather name="layers" size={14} color="#64748B" />
            <Text style={styles.skillsTitle}>Skills</Text>
          </View>
          <View style={styles.skillsContainer}>
            {displaySkills.map((skill, index) => (
              <View key={index} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {userData.skills?.length > 4 && (
              <View style={[styles.skillChip, styles.moreSkillsChip]}>
                <Text style={styles.moreSkillsText}>
                  +{userData.skills.length - 4}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Location and Experience */}
      <View style={styles.locationSection}>
        <View style={styles.locationRow}>
          <View style={styles.locationItem}>
            <Feather name="map-pin" size={14} color="#64748B" />
            <Text style={styles.locationText}>
              {userData.location?.city || 'Nationwide'}
            </Text>
          </View>
          <View style={styles.locationItem}>
            <Feather name="briefcase" size={14} color="#64748B" />
            <Text style={styles.locationText}>
              {formatExperience(userData.experience)}
            </Text>
          </View>
        </View>
      </View>

      {/* Proposal/Bid Message */}
      {(item.proposal || item.message) && (
        <View style={styles.messageBox}>
          <Feather name="message-square" size={14} color="#6366F1" style={styles.messageIcon} />
          <Text style={styles.messageText} numberOfLines={3}>
            {item.proposal || item.message}
          </Text>
        </View>
      )}

      {/* Performance Metrics */}
      <View style={styles.metricsRow}>
        {userData.completedJobs > 0 && (
          <View style={styles.metricItem}>
            <Feather name="check-circle" size={14} color="#10B981" />
            <Text style={styles.metricText}>{userData.completedJobs} jobs</Text>
          </View>
        )}
        
        {userData.onTimeRate && (
          <View style={styles.metricItem}>
            <Feather name="clock" size={14} color="#6366F1" />
            <Text style={styles.metricText}>{userData.onTimeRate}% on time</Text>
          </View>
        )}
        
        {userData.positiveReviews && (
          <View style={styles.metricItem}>
            <Feather name="thumbs-up" size={14} color="#F59E0B" />
            <Text style={styles.metricText}>{userData.positiveReviews}% positive</Text>
          </View>
        )}
      </View>

      {/* Primary Action Button */}
      {!isAssigned ? (
        <TouchableOpacity 
          style={[styles.primaryButton, !canAssign && styles.disabledButton]}
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
              <Feather 
                name={biddingType === 'fixed' ? "user-plus" : "check-circle"} 
                size={16} 
                color="#FFFFFF" 
              />
              <Text style={styles.primaryButtonText}>
                {biddingType === 'fixed' ? 'Assign Task' : 'Accept Bid'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.assignedStatus}>
          <Feather name="check-circle" size={16} color="#10B981" />
          <Text style={styles.assignedStatusText}>
            {biddingType === 'fixed' ? 'Task Assigned' : 'Bid Accepted'}
          </Text>
        </View>
      )}
    </View>
  );
};

  const renderEmptyState = () => {
    const isFixedBid = biddingType === 'fixed';
    const emptyTitle = isFixedBid ? "No Applicants Yet" : "No Bids Yet";
    const emptyDescription = isFixedBid 
      ? "Share your task to attract qualified professionals"
      : "Taskers are reviewing your requirements";
    const emptyIcon = isFixedBid ? "users" : "tag";

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Feather name={emptyIcon} size={64} color="#CBD5E1" />
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
          <Feather name="share-2" size={18} color="#FFFFFF" />
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
      <View style={styles.assignedBanner}>
        <View style={styles.assignedHeader}>
          <Feather name="check-circle" size={20} color="#10B981" />
          <Text style={styles.assignedHeaderText}>Task Assigned</Text>
        </View>
        
        <View style={styles.assignedContent}>
          <Image
            source={{ 
              uri: userData?.profileImage || 'https://res.cloudinary.com/duv3qvvjz/image/upload/v1766495900/DefaultiImagePlaceHolder_r6ai4x.jpg'
            }}
            style={styles.assignedAvatar}
          />
          <View style={styles.assignedInfo}>
            <Text style={styles.assignedName}>{userData?.name || 'Assigned Tasker'}</Text>
            <View style={styles.assignedContact}>
              {userData?.email && (
                <Text style={styles.assignedContactText}>{userData.email}</Text>
              )}
              {userData?.phone && (
                <Text style={styles.assignedContactText}>• {userData.phone}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity 
            style={styles.assignedChatButton}
            onPress={() => handleMessage(userData._id, userData.name)}
          >
            <Feather name="message-circle" size={16} color="#FFFFFF" />
            <Text style={styles.assignedChatText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSortOptions = () => {
    const sortOptions = [
      { key: 'score', label: 'Highest Score', icon: 'trending-up' },
      { key: 'rating', label: 'Highest Rating', icon: 'star' },
      { key: 'experience', label: 'Most Experience', icon: 'award' },
    ];
    
    if (biddingType === 'open-bid') {
      sortOptions.push({ key: 'amount', label: 'Lowest Bid', icon: 'dollar-sign' });
    }

    return (
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortOptions}
        >
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.sortOption, sortBy === option.key && styles.sortOptionActive]}
              onPress={() => setSortBy(option.key)}
            >
              <Feather 
                name={option.icon} 
                size={14} 
                color={sortBy === option.key ? '#FFFFFF' : '#6366F1'} 
              />
              <Text style={[
                styles.sortOptionText,
                sortBy === option.key && styles.sortOptionTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header 
        title={biddingType === 'fixed' ? "Task Applicants" : "Task Bids"} 
        showBackButton={true} 
        rightComponent={
          <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
            <Feather name="refresh-cw" size={20} color="#6366F1" />
          </TouchableOpacity>
        }
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
      >
        {/* Task Overview Card */}
        <View style={styles.taskOverview}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task?.title || 'Task'}
          </Text>
          <View style={styles.taskStats}>
            <View style={styles.statItem}>
              <Feather name={biddingType === 'fixed' ? "users" : "tag"} size={16} color="#6366F1" />
              <Text style={styles.statValue}>{data.length}</Text>
              <Text style={styles.statLabel}>
                {biddingType === 'fixed' ? 'Applicants' : 'Bids'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Feather name="dollar-sign" size={16} color="#10B981" />
              <Text style={styles.statValue}>
                {biddingType === 'fixed' ? `₵${task?.budget || '0'}` : 'Open'}
              </Text>
              <Text style={styles.statLabel}>Budget</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Feather name="calendar" size={16} color="#F59E0B" />
              <Text style={styles.statValue}>
                {task?.deadline ? moment(task.deadline).format('MMM D') : 'Flexible'}
              </Text>
              <Text style={styles.statLabel}>Deadline</Text>
            </View>
          </View>
        </View>

        {/* Assigned Tasker Section */}
        {renderAssignedTasker()}

        {/* Status Alert */}
        {!canAssign && (
          <View style={styles.statusAlert}>
            <Feather name="alert-circle" size={18} color="#F59E0B" />
            <Text style={styles.statusAlertText}>
              {isTaskCompleted 
                ? 'This task has been completed'
                : 'This task is already in progress'
              }
            </Text>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
              All ({data.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'unassigned' && styles.filterTabActive]}
            onPress={() => setActiveFilter('unassigned')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'unassigned' && styles.filterTabTextActive]}>
              Available ({data.filter(a => !a.isAssigned && !a.isAccepted).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort Options */}
        {renderSortOptions()}

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
        
        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerButton: {
    padding: 8,
  },
  // Task Overview
  taskOverview: {
    backgroundColor: '#2D1B69',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    lineHeight: 26,
  },
  taskStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Assigned Banner
  assignedBanner: {
    backgroundColor: '#F0F9FF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  assignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  assignedHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  assignedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assignedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  assignedInfo: {
    flex: 1,
  },
  assignedName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  assignedContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  assignedContactText: {
    fontSize: 13,
    color: '#64748B',
  },
  assignedChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  assignedChatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Status Alert
  statusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  statusAlertText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    padding: 4,
    borderRadius: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  // Sort Container
  sortContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortOptionActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6366F1',
  },
  sortOptionTextActive: {
    color: '#FFFFFF',
  },
  // Data Container
  dataContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  // Applicant Card
  applicantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
  profileSection: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  proBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  assignedBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  ratingCount: {
    fontSize: 13,
    color: '#64748B',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  experience: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scorePriceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  priceSection: {
    marginBottom: 16,
  },
  priceContainer: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bidAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  bidNote: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Skills Section
  skillsSection: {
    marginBottom: 16,
  },
  skillsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  skillsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  skillText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
  },
  moreSkillsChip: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  moreSkillsText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // Location Section
  locationSection: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },

  // Metrics Row (updated)
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  messageBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  messageIcon: {
    marginTop: 2,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  assignedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  assignedStatusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    minWidth: 180,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 32,
  },
});