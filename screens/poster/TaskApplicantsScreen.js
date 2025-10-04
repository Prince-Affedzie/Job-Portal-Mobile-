import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import { AuthContext } from '../../context/AuthContext';
import { assignApplicantToTask,  } from '../../api/miniTaskApi';
import { getMicroTaskApplicants,acceptBidForTask, getMicroTaskBids } from '../../api/bidApi';
import { navigate } from '../../services/navigationService';
import { triggerPayment } from '../../services/PaymentServices';
import { usePaystack } from "react-native-paystack-webview";


const { width } = Dimensions.get('window');

export default function ApplicantsScreen({ route }) {
  const { taskId, task } = route.params;
  const { user } = useContext(AuthContext);
  const { popup } = usePaystack();
  
  const [data, setData] = useState([]); // Will hold either applicants or bids
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [processingAction, setProcessingAction] = useState(null);
  const [biddingType, setBiddingType] = useState(task?.biddingType || 'fixed');

  // Check if task is already assigned or in progress/completed
  const isTaskAssigned = task?.assignedTo && task?.status !== 'Open' && task?.status !== 'Pending';
  const isTaskInProgress = task?.status === 'In-progress' || task?.status === 'Review';
  const isTaskCompleted = task?.status === 'Completed' || task?.status === 'Closed';
  const canAssign =  !isTaskInProgress && !isTaskCompleted;
  const isAlreadyFunded = task?.funded  // Assuming 'Pending' means funded but not yet accepted

  useEffect(() => {
    loadData();
  }, [taskId]);

  const loadData = async () => {
    try {
      setLoading(true);
      let response;

      if (biddingType === 'fixed') {
        response = await getMicroTaskApplicants(taskId);
        if (response.status === 200) {
          // Mark assigned applicant
          const applicants = response.data.map(applicant => ({
            ...applicant,
            isAssigned: task?.assignedTo?.toString() === applicant._id?.toString()
          }));
          setData(applicants);
        }
      } else {
        response = await getMicroTaskBids(taskId);
        if (response.status === 200) {
          // Mark accepted bid
         
          const bids = response.data.map(bid => ({
            ...bid,
            isAccepted: task?.assignedTo?.toString() === bid.bidder?._id?.toString()
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
    : `Assigning ${applicantName} will initiate a secure payment of ${task.budget} that will be held in escrow until the work is completed and approved.\n\nDo you want to continue?`;

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

            let paymentSuccess = true; // Default to true if already funded
            if (!isAlreadyFunded) {
              paymentSuccess = await triggerPayment({
                popup,
                email: user.email,
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

            // Proceed with assignment (reassignment if already funded)
            const response = await assignApplicantToTask(taskId, applicantId);
            if (response.status === 200) {
              const successMessage = isAlreadyFunded 
                ? `Task reassigned to ${applicantName}!` 
                : `Task assigned to ${applicantName}!`;
              Alert.alert("Success", successMessage);

              setData((prev) =>
                prev.map((item) => ({
                  ...item,
                  isAssigned: item._id === applicantId,
                }))
              );
               onRefresh()
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


  const handleAcceptBid = async (bidder, amount,bidId, bidderName) => {
    const alertTitle = isAlreadyFunded ? "Reassign Task" : "Accept Bid";
    const alertMessage = isAlreadyFunded 
      ? `You can reassign this task to ${bidderName} since the current tasker hasn't accepted yet. The task is already funded, so no additional payment is required.\n\nDo you want to continue?`
      : `Assigning ${bidderName} will initiate a secure payment of ₵${amount} that will be held in escrow until the work is completed and approved.\n\nDo you want to continue?`;

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

              let paymentSuccess = true; // Default to true if already funded
              if (!isAlreadyFunded) {
                paymentSuccess = await triggerPayment({
                popup,
                email: user.email,
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

              // Proceed with bid acceptance (reassignment if already funded)
              const response = await acceptBidForTask(taskId, bidId);
              if (response.status === 200) {
                const successMessage = isAlreadyFunded 
                  ? `Task reassigned to ${bidderName}!` 
                  : `Bid accepted from ${bidderName}!`;
                Alert.alert("Success", successMessage);
                
                setData(prev => prev.map(item => ({
                  ...item,
                  isAccepted: item._id === bidId
                })));

                 onRefresh()
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

  const renderApplicantCard = ({ item: applicant }) => (
    <View style={styles.applicantCard}>
      {/* Applicant Header */}
      <View style={styles.applicantHeader}>
        <View style={styles.avatarContainer}>
          {applicant.profileImage ? (
            <Image
              source={{ uri: applicant.profileImage }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {applicant.name?.charAt(0)?.toUpperCase() || 'A'}
              </Text>
            </View>
          )}
          {(isTaskAssigned && (task.assignedTo._id === applicant._id)) && (
            <View style={styles.assignedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
        
        <View style={styles.applicantInfo}>
          <Text style={styles.applicantName} numberOfLines={1}>
            {applicant.name || 'Applicant'}
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>
            {applicant.totalScore ? parseFloat(applicant.totalScore.toFixed(1)) : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Applicant Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.statValue}>{applicant.rating ? parseFloat(applicant.rating.toFixed(1)) : 'N/A'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="checkmark-done" size={16} color="#10B981" />
          <Text style={styles.statValue}>{applicant.completedTasks || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="trending-up" size={16} color="#6366F1" />
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
      </View>

      {/* Skills */}
      {applicant.skills && applicant.skills.length > 0 && (
        <View style={styles.skillsContainer}>
          <Text style={styles.skillsLabel}>Skills:</Text>
          <View style={styles.skillsList}>
            {applicant.skills.slice(0, 3).map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {applicant.skills.length > 3 && (
              <Text style={styles.moreSkillsText}>
                +{applicant.skills.length - 3} more
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Application Details */}
      <View style={styles.applicationDetails}>
        <View style={styles.applicationMeta}>
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text style={styles.applicationText}>
            Applied {applicant.appliedDate ? moment(applicant.appliedDate).fromNow() : 'recently'}
          </Text>
        </View>
        
        {applicant.proposal && (
          <Text style={styles.proposalText} numberOfLines={2}>
            "{applicant.proposal}"
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.profileButton]}
          onPress={() => handleViewProfile(applicant)}
        >
          <Ionicons name="person-outline" size={16} color="#6366F1" />
          <Text style={styles.profileButtonText}>Profile</Text>
        </TouchableOpacity>

       {/* <TouchableOpacity 
          style={[styles.actionButton, styles.chatButton]}
          onPress={() => handleChat(applicant)}
        >
          <Ionicons name="chatbubble-outline" size={16} color="#8B5CF6" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>*/}

        {task.assignedTo?._id !== applicant._id ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.assignButton, !canAssign && styles.disabledButton]}
            onPress={() => handleAssign(applicant._id, applicant.name)}
            disabled={processingAction === applicant._id || !canAssign}
          >
            {processingAction === applicant._id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.assignButtonText}>
                  {!canAssign ? 'Cannot Assign' : 'Assign'}
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
    </View>
  );

  const renderBidCard = ({ item: bid }) => {
  // Add more defensive checks
  const bidder = bid?.bidder || {};
  
  return (
    <View style={styles.applicantCard}>
      {/* Bidder Header */}
      <View style={styles.applicantHeader}>
        <View style={styles.avatarContainer}>
          {bidder?.profileImage ? (
            <Image
              source={{ uri: bidder?.profileImage }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {bidder?.name?.charAt(0)?.toUpperCase() || 'B'}
              </Text>
            </View>
          )}
          {bid?.isAccepted && (
            <View style={styles.assignedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
        
        <View style={styles.applicantInfo}>
          <Text style={styles.applicantName} numberOfLines={1}>
            {bidder?.name || 'Bidder'}
          </Text>
          
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Bid</Text>
          <Text style={styles.scoreValue}>₵{bid?.amount || '0'}</Text>
        </View>
      </View>

      {/* Bid Details */}
      <View style={styles.bidDetails}>
        <View style={styles.bidInfo}>
          <View style={styles.bidInfoItem}>
            <Ionicons name="cash-outline" size={16} color="#10B981" />
            <Text style={styles.bidInfoText}>₵{bid?.amount || '0'}</Text>
          </View>
          {bid?.timeline && (
            <View style={styles.bidInfoItem}>
              <Ionicons name="time-outline" size={16} color="#6366F1" />
              <Text style={styles.bidInfoText}>{bid.timeline} </Text>
            </View>
          )}
        </View>
        
        {bid?.message && (
          <Text style={styles.bidMessage} numberOfLines={3}>
            "{bid.message}"
          </Text>
        )}
      </View>

     
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.statValue}>{bidder?.rating ? parseFloat(bidder.rating.toFixed(1)) : 'N/A'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="checkmark-done" size={16} color="#10B981" />
          <Text style={styles.statValue}>{bidder?.completedTasks || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="trending-up" size={16} color="#6366F1" />
          <Text style={styles.statValue}>
            {bidder?.completionRate ? `${bidder.completionRate}%` : 'N/A'}
          </Text>
          <Text style={styles.statLabel}>Success</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.profileButton]}
          onPress={() => handleViewProfile(bid)}
        >
          <Ionicons name="person-outline" size={16} color="#6366F1" />
          <Text style={styles.profileButtonText}>Profile</Text>
        </TouchableOpacity>

        {/*<TouchableOpacity 
          style={[styles.actionButton, styles.chatButton]}
          onPress={() => handleChat(bid)}
        >
          <Ionicons name="chatbubble-outline" size={16} color="#8B5CF6" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>*/}

        {task.assignedTo?._id !==  bidder?._id  ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.assignButton, !canAssign && styles.disabledButton]}
            onPress={() => handleAcceptBid( bidder,bid?.amount, bid?._id, bidder?.name || 'Bidder')}
            disabled={processingAction === bid?._id || !canAssign}
          >
            {processingAction === bid?._id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.assignButtonText}>
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
    </View>
  );
};

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration}>
        <Ionicons 
          name={biddingType === 'fixed' ? "people-outline" : "cash-outline"} 
          size={60} 
          color="#9CA3AF" 
        />
      </View>
      <Text style={styles.emptyTitle}>
        No {biddingType === 'fixed' ? 'Applicants' : 'Bids'} Yet
      </Text>
      <Text style={styles.emptyDescription}>
        {biddingType === 'fixed' 
          ? 'Applicants who apply to your task will appear here. Share your task to attract more applicants.'
          : 'Bidders who place bids on your task will appear here. Share your task to attract more bids.'
        }
      </Text>
      <TouchableOpacity 
        style={styles.shareButton}
        onPress={() => {/* Implement share functionality */}}
      >
        <Ionicons name="share-outline" size={20} color="#FFFFFF" />
        <Text style={styles.shareButtonText}>Share Task</Text>
      </TouchableOpacity>
    </View>
  );

 const renderAssignedTasker = () => {
  if (!isTaskAssigned) return null;

  const assignedUser = data.find(item => 
    item?.isAssigned || item?.isAccepted
  );

  // If no assigned user found in data, use task.assignedTo
  if (!assignedUser && !task?.assignedTo) return null;

  let userData;
  if (assignedUser) {
    userData = biddingType === 'fixed' ? assignedUser : (assignedUser?.bidder || {});
  } else {
    // Fallback to task.assignedTo if available
    userData = task?.assignedTo || {};
  }

  return (
    <View style={styles.assignedTaskerCard}>
      <View style={styles.assignedHeader}>
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        <Text style={styles.assignedTitle}>Task Assigned to:</Text>
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
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {userData?.name?.charAt(0)?.toUpperCase() || 'T'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.assignedUserInfo}>
            <Text style={styles.assignedUserName}>{userData?.name || 'Assigned Tasker'}</Text>
            <Text style={styles.assignedUserEmail}>{userData?.email || 'No email available'}</Text>
             <Text style={styles.assignedUserEmail}>{userData?.phone || 'No email available'}</Text>
            {biddingType === 'open-bid' && assignedUser?.amount && (
              <Text style={styles.assignedBidAmount}>Accepted Bid: ₵{assignedUser.amount}</Text>
            )}
          </View>
        </View>
        
        <Text style={styles.taskStatus}>
          Current Status: <Text style={styles.statusText}>{task?.status || 'Unknown'}</Text>
        </Text>
      </View>
    </View>
  );
};
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={biddingType === 'fixed' ? "Applicants" : "Bids"} showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>
            Loading {biddingType === 'fixed' ? 'applicants' : 'bids'}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

 return (
  <SafeAreaView style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
    <Header title={biddingType === 'fixed' ? "Applicants" : "Bids"} showBackButton={true} />
    
    <ScrollView 
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Task Info Header */}
      <View style={styles.taskHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task?.title || 'Task'}
          </Text>
          <View style={styles.taskMetaRow}>
            <Text style={styles.taskMeta}>
              {data.length} {biddingType === 'fixed' ? 'applicant' : 'bid'}{data.length !== 1 ? 's' : ''}
            </Text>
            <View style={[styles.budgetBadge, biddingType === 'open-bid' && styles.openBidBadge]}>
              <Ionicons 
                name={biddingType === 'fixed' ? "cash-outline" : "pricetag-outline"} 
                size={16} 
                color={biddingType === 'fixed' ? "#10B981" : "#6366F1"} 
              />
              <Text style={[styles.budgetText, biddingType === 'open-bid' && styles.openBidText]}>
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
            <TouchableOpacity
              style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
                All ({data.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterButton, activeFilter === 'unassigned' && styles.filterButtonActive]}
              onPress={() => setActiveFilter('unassigned')}
            >
              <Text style={[styles.filterText, activeFilter === 'unassigned' && styles.filterTextActive]}>
                Available ({data.filter(a => !a.isAssigned && !a.isAccepted).length})
              </Text>
            </TouchableOpacity>
            
           {/* <TouchableOpacity
              style={[styles.filterButton, activeFilter === 'assigned' && styles.filterButtonActive]}
              onPress={() => setActiveFilter('assigned')}
            >
              <Text style={[styles.filterText, activeFilter === 'assigned' && styles.filterTextActive]}>
                {biddingType === 'fixed' ? 'Assigned' : 'Accepted'} ({data.filter(a => a.isAssigned || a.isAccepted).length})
              </Text>
            </TouchableOpacity>*/}
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

      {/* Data List - Now using regular mapping instead of FlatList */}
      <View style={styles.dataContainer}>
        {filteredAndSortedData.length > 0 ? (
          filteredAndSortedData.map((item) => 
            biddingType === 'fixed' ? renderApplicantCard({ item }) : renderBidCard({ item })
          )
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
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  taskMeta: {
    fontSize: 14,
    color: '#64748B',
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  budgetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  controlsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    marginBottom:8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  },
  sortText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  list: {
    flex: 1,
  },
  applicantCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
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
  },
  applicantInfo: {
    flex: 1,
    marginRight: 12,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  applicantEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  applicantPhone: {
    fontSize: 14,
    color: '#64748B',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  skillsContainer: {
    marginBottom: 12,
  },
  skillsLabel: {
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
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
  },
  applicationDetails: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  applicationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  applicationText: {
    fontSize: 14,
    color: '#64748B',
  },
  proposalText: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  profileButton: {
    backgroundColor: '#F1F5F9',
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  chatButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  assignButton: {
    backgroundColor: '#10B981',
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assignedButton: {
    backgroundColor: '#D1FAE5',
  },
  assignedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyIllustration: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  assignedTaskerCard: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  assignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  assignedTitle: {
    fontSize: 16,
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
    marginBottom: 2,
  },
  assignedUserEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  assignedBidAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  taskStatus: {
    fontSize: 14,
    color: '#64748B',
  },
  statusText: {
    fontWeight: '600',
    color: '#1E293B',
  },
  statusWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  statusWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  taskMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openBidBadge: {
    backgroundColor: '#EEF2FF',
  },
  openBidText: {
    color: '#6366F1',
  },
  bidDetails: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  bidInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  bidInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bidInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  bidMessage: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
});