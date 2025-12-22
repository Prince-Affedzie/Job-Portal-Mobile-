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
  Alert,
  RefreshControl,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {styles} from '../../styles/poster/ServiceRequestDetailsScreen.Styles'
import moment from 'moment';
import Header from "../../component/tasker/Header";
import ReportForm from '../../component/common/reportForm';
import { AuthContext } from '../../context/AuthContext';
import { ServiceRequestContext } from '../../context/ServiceRequestContext';
import { navigate } from '../../services/navigationService'
import LoadingIndicator from '../../component/common/LoadingIndicator';
import RatingModal from '../../component/common/RatingModal';
import { MediaDisplay } from '../../component/tasker/TaskMediaDisplay';
import {acceptOffer,markServiceDone} from '../../api/serviceRequestAPI/clientAPI'
import { triggerPayment } from '../../services/PaymentServices';
import { usePaystack } from "react-native-paystack-webview";
import { startOrGetChatRoom } from '../../api/chatApi';
import ServiceRequestRefundNoticeCard from '../../component/client/ServiceRequestRefundNotificationCard';

const { width, height } = Dimensions.get('window');

const ServiceRequestDetailScreen = ({ route, navigation }) => {
  const { requestId } = route.params;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useContext(AuthContext);
  const { getServiceRequestDetails, updateServiceRequest } = useContext(ServiceRequestContext);
  const [showReportModal, setShowReportModal] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);
  const [fabAnimation] = useState(new Animated.Value(0));
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [headerScroll] = useState(new Animated.Value(0));
  const { popup } = usePaystack();

  // Enhanced FAB animation
  const toggleFAB = () => {
    const toValue = fabExpanded ? 0 : 1;
    setFabExpanded(!fabExpanded);
    Animated.spring(fabAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      const response = await getServiceRequestDetails(requestId);
      if (response.status === 200) {
        setRequest(response.data);
      } else {
        Alert.alert('Error', 'Service request not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading service request details:', error);
      Alert.alert('Error', 'Failed to load service request details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequestDetails();
  };

  // NEW: Message Tasker Functionality
  const handleMessageTasker = async () => {
    try {
      if (!request?.assignedTasker?._id) {
        Alert.alert('Error', 'Tasker information not available');
        return;
      }

      const res = await startOrGetChatRoom({ 
        userId2: request.assignedTasker._id, 
        jobId: request._id 
      });
      
      if (res.status === 200) {
        const roomId = res.data._id;
        toggleFAB(); // Close FAB menu
        navigate('ChatWindow', { roomId: roomId });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat with tasker');
    }
  };

  const handleEditRequest = () => {
    navigate('EditServiceRequest', { serviceRequest: request });
  };

  const handleViewOffers = () => {
    navigate('ServiceRequestOffers', {
      requestId: request._id,
      offers: request.offers || [],
      request: request
    });
  };

  const handleMarkAsDone = async () => {
    try {
      Alert.alert(
        "Mark as Done",
        "Are you sure you want to mark this service request as completed? This will release payment to the tasker.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark as Done",
            style: "default",
            onPress: async () => {
              const res = await markServiceDone(requestId);
              if (res.status === 200) {
                Alert.alert("Success", "Service request marked as completed!");
                setTimeout(() => {
                  setRatingModalVisible(true);
                }, 750);
                loadRequestDetails();
              }
            }
          }
        ]
      );
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error || 'Error marking service request as done';
      console.error(errorMessage);
      Alert.alert(errorMessage);
    }
  };

  const handleReportPress = () => {
    setShowReportModal(true);
  };

  const handleReportSubmitted = () => {
    Alert.alert('Success', 'Your report has been submitted successfully!');
  };

  const handleAcceptOffer = async (offer) => {
    try {
      Alert.alert(
        "Accept Offer",
         `Accept ${offer.tasker?.name || 'tasker'}'s offer of ₵${offer.amount}?

Your payment of ₵${offer.amount} will be securely held in escrow and only released to ${offer.tasker?.name || 'the tasker'}
once you both confirm the task is completed satisfactorily.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Accept Offer",
            style: "default",
            onPress: async () => {
              let paymentSuccess = true;
                  paymentSuccess = await triggerPayment({
                  popup,
                  email: user.email,
                  phone: user.phone,
                  amount: offer.amount,
                  taskId: requestId,
                  beneficiary:offer.tasker._id,
                  });
                                            
                  if (!paymentSuccess) {
                   Alert.alert(
                  "Payment Not Completed",
                  "Task assignment has been cancelled since payment was not successful."
                   );
                  return; 
                  }
                             
              const res = await acceptOffer(requestId,offer._id);
              if (res.status === 200) {
                Alert.alert("Success", "Offer accepted successfully!");
                loadRequestDetails();
              }
            }
          }
        ]
      );
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error || 'Error accepting offer';
      Alert.alert("Error", errorMessage);
    }
  };


  const handleViewSubmissions = () => {
      navigation.navigate('TaskSubmissions', { taskId: request._id, taskTitle: request.type });
    };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#F97316',
      'quoted': '#8B5CF6',
      'booked': '#3B82F6',
      'in-progress': '#F59E0B',
      'review': '#8B5CF6',
      'completed': '#10B981',
      'closed': '#6B7280',
      'canceled': '#EF4444'
    };
    return colors[status?.toLowerCase()] || '#6B7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'pending': 'time',
      'quoted': 'chatbubble',
      'booked': 'bookmark',
      'in-progress': 'timer',
      'review': 'eye',
      'completed': 'checkmark-circle',
      'closed': 'lock-closed',
      'canceled': 'close-circle'
    };
    return icons[status?.toLowerCase()] || 'help-circle';
  };

  const formatDate = (date) => {
    return moment(date).format("MMM DD, YYYY");
  };

  const formatDateTime = (date) => {
    return moment(date).format("MMM DD, YYYY [at] h:mm A");
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      'flexible': '#10B981',
      'urgent': '#EF4444',
      'scheduled': '#3B82F6'
    };
    return colors[urgency] || '#6B7280';
  };

  const hasOffers = request?.offers && request.offers.length > 0;
  const isAssigned = request?.assignedTasker && !['Pending', 'Canceled'].includes(request.status);
  const isCompleted = request?.status?.toLowerCase() === 'completed';
  const canMarkAsDone = isAssigned && !isCompleted && request?.markedDoneByEmployer === false;
  const hasActiveOffers = hasOffers && request.status === 'Pending';
  
  // NEW: Check if client can message tasker
  const canMessageTasker = isAssigned && !isCompleted;

  // Header animation values
  const headerOpacity = headerScroll.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollView}>
          <Header title="Service Request" showBackButton={true} />
          <LoadingIndicator text='Loading Service Request Details...' />
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <Header title="Service Request" showBackButton={true} />
          <View style={styles.errorContainer}>
            <Ionicons name="sad-outline" size={64} color="#94A3B8" />
            <Text style={styles.errorTitle}>Request Not Found</Text>
            <Text style={styles.errorSubtitle}>
              The service request you're looking for doesn't exist or has been removed.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Enhanced Components
  const TabButton = ({ title, icon, isActive, onPress, badge }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <View style={styles.tabIconContainer}>
        <Ionicons
          name={icon}
          size={20}
          color={isActive ? '#FFFFFF' : '#6B7280'}
        />
        {badge && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const InfoCard = ({ icon, title, value, color = '#6366F1', subtitle }) => (
    <View style={styles.infoCard}>
      <LinearGradient
        colors={[color + '20', color + '10']}
        style={[styles.infoIcon, { borderColor: color + '40' }]}
      >
        <Ionicons name={icon} size={20} color={color} />
      </LinearGradient>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
        {subtitle && <Text style={styles.infoSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const ProgressStep = ({ completed, current, label, date }) => (
    <View style={styles.progressStep}>
      <View style={[
        styles.progressDot,
        completed && styles.progressDotCompleted,
        current && styles.progressDotCurrent
      ]}>
        {completed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
      </View>
      <View style={styles.progressContent}>
        <Text style={[
          styles.progressLabel,
          completed && styles.progressLabelCompleted,
          current && styles.progressLabelCurrent
        ]}>
          {label}
        </Text>
        {date && (
          <Text style={styles.progressDate}>
            {formatDateTime(date)}
          </Text>
        )}
      </View>
    </View>
  );

  const OfferItem = ({ offer, index }) => (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View style={styles.offerTaskerInfo}>
          <View style={styles.offerAvatar}>
            {offer.tasker?.profileImage ? (
              <Image
                source={{ uri: offer.tasker.profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {offer.tasker?.name?.charAt(0)?.toUpperCase() || 'T'}
              </Text>
            )}
          </View>
          <View style={styles.offerTaskerDetails}>
            <Text style={styles.offerTaskerName}>
              {offer.tasker?.name || 'Tasker'}
            </Text>
            <Text style={styles.offerTaskerRating}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              {offer.tasker?.rating?.toFixed(1) || 'N/A'}
            </Text>
          </View>
        </View>
        <Text style={styles.offerAmount}>₵{offer.amount}</Text>
      </View>
      
      {offer.message && (
        <Text style={styles.offerMessage}>{offer.message}</Text>
      )}
      
      <View style={styles.offerFooter}>
        <Text style={styles.offerDate}>
          {formatDateTime(offer.createdAt)}
        </Text>
        {request.status === 'Pending' && (
          <TouchableOpacity
            style={styles.acceptOfferButton}
            onPress={() => handleAcceptOffer(offer)}
          >
            <Text style={styles.acceptOfferText}>Accept Offer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const RequirementItem = ({ requirement, index }) => (
    <View style={styles.requirementItem}>
      <View style={styles.requirementBullet}>
        <Ionicons name="ellipse" size={8} color="#10B981" />
      </View>
      <Text style={styles.requirementText}>{requirement}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Service Request" showBackButton={true} transparent />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: headerScroll } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        
        {/* Main Content */}
        <View style={styles.content}>

          {/* Enhanced Request Header Card */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['#1A1F3B', '#2D1B69']}
              style={styles.heroGradient}
            >
              <View style={styles.heroHeader}>
                <View style={styles.heroTitleContainer}>
                  <Text style={styles.heroTitle} numberOfLines={2}>{request.type}</Text>
                  <View style={styles.heroMeta}>
                    <View style={styles.heroMetaItem}>
                      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(request.status) }]} />
                      <Text style={styles.heroMetaText}>Status: {request.status}</Text>
                    </View>
                    <View style={styles.heroMetaItem}>
                      <Ionicons name="calendar-outline" size={14} color="#E0E7FF" />
                      <Text style={styles.heroMetaText}>Posted {formatDate(request.createdAt)}</Text>
                    </View>
                    {request.preferredDate && (
                      <View style={styles.heroMetaItem}>
                        <Ionicons name="time-outline" size={14} color="#E0E7FF" />
                        <Text style={styles.heroMetaText}>Preferred {formatDate(request.preferredDate)}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.heroEditButton}
                  onPress={handleEditRequest}
                >
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{request.offers?.length || 0}</Text>
                  <Text style={styles.quickStatLabel}>Offers</Text>
                </View>
               
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>
                    {request.budget ? `₵${request.budget}` : 'Flexible'}
                  </Text>
                  <Text style={styles.quickStatLabel}>Budget</Text>
                </View>
                
                <View style={styles.quickStat}>
                  <View style={[
                    styles.urgencyBadge,
                    { backgroundColor: getUrgencyColor(request.urgency) + '40' }
                  ]}>
                    <Text style={[
                      styles.urgencyText,
                      { color: getUrgencyColor(request.urgency) }
                    ]}>
                      {request.urgency}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Enhanced Completion Status */}
          
          {isAssigned && (
            <View style={styles.completionCard}>
              <Text style={styles.completionTitle}>Completion Progress</Text>
              <View style={styles.progressContainer}>
                <ProgressStep
                  completed={request.markedDoneByEmployer}
                  current={!request.markedDoneByEmployer && !request.markedDoneByTasker}
                  label="You marked as done"
                  date={request.employerDoneAt}
                />
                <View style={styles.progressLine} />
                <ProgressStep
                  completed={request.markedDoneByTasker}
                  current={request.markedDoneByEmployer && !request.markedDoneByTasker}
                  label="Tasker marked as done"
                  date={request.taskerDoneAt}
                />
              </View>

              {request.markedDoneByEmployer && request.markedDoneByTasker && (
                <View style={styles.mutualCompletion}>
                  <Ionicons name="checkmark-done" size={20} color="#10B981" />
                  <Text style={styles.mutualCompletionText}>
                    Service completed successfully!
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Enhanced Tab Navigation */}
          <View style={styles.tabContainer}>
            <TabButton
              title="Overview"
              icon="document-text-outline"
              isActive={activeTab === 'overview'}
              onPress={() => setActiveTab('overview')}
            />
            {hasOffers && !isAssigned &&(
              <TabButton
                title="Offers"
                icon="chatbubble-outline"
                isActive={activeTab === 'offers'}
                onPress={() => setActiveTab('offers')}
                badge={request.offers?.length || null}
              />
            )}
            {isAssigned && (
              <TabButton
                title="Tasker"
                icon="person-outline"
                isActive={activeTab === 'tasker'}
                onPress={() => setActiveTab('tasker')}
                badge={request.assignedTasker ? "1" : null}
              />
            )}
            <TabButton
              title="Requirements"
              icon="checkmark-done-outline"
              isActive={activeTab === 'requirements'}
              onPress={() => setActiveTab('requirements')}
              badge={request.requirements?.length || null}
            />
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'overview' && (
              <>
                {/* Enhanced Request Overview */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="information-circle" size={22} color="#6366F1" />
                    <Text style={styles.sectionTitle}>Service Description</Text>
                  </View>
                  <Text style={styles.taskDescription}>{request.description}</Text>
                  
                  {/* Media Display */}
                  <MediaDisplay media={request.media} />

                  {/* Key Information Grid */}
                  <View style={styles.infoGrid}>
                    <InfoCard
                      icon="cash-outline"
                      title="Budget"
                      value={request.budget ? `₵${request.budget}` : 'Flexible'}
                      color="#10B981"
                      subtitle={request.finalCost ? `Final: ₵${request.finalCost}` : 'Estimated'}
                    />
                    
                    {request.preferredDate && (
                      <InfoCard
                        icon="calendar-outline"
                        title="Preferred Date"
                        value={formatDate(request.preferredDate)}
                        color="#F59E0B"
                        subtitle={request.preferredTime || 'Any time'}
                      />
                    )}
                    
                    <InfoCard
                      icon="location-outline"
                      title="Location"
                      value={request.address?.city || request.address?.region || 'Not specified'}
                      color="#6366F1"
                      subtitle={request.address?.suburb || 'Location details'}
                    />
                    
                    <InfoCard
                      icon="speedometer-outline"
                      title="Urgency"
                      value={request.urgency?.charAt(0).toUpperCase() + request.urgency?.slice(1)}
                      color={getUrgencyColor(request.urgency)}
                      subtitle="Service priority"
                    />
                  </View>
                </View>

                {/* Enhanced Timeline */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time-outline" size={22} color="#6366F1" />
                    <Text style={styles.sectionTitle}>Timeline</Text>
                  </View>
                  <View style={styles.timeline}>
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Request Created</Text>
                        <Text style={styles.timelineDate}>{formatDateTime(request.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={styles.timelineConnector} />
                    {request.preferredDate && (
                      <>
                        <View style={styles.timelineItem}>
                          <View style={styles.timelineDot} />
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineLabel}>Preferred Date</Text>
                            <Text style={styles.timelineDate}>{formatDateTime(request.preferredDate)}</Text>
                          </View>
                        </View>
                        <View style={styles.timelineConnector} />
                      </>
                    )}
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Last Updated</Text>
                        <Text style={styles.timelineDate}>{formatDateTime(request.updatedAt)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            {activeTab === 'offers' && hasOffers && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbubble" size={22} color="#6366F1" />
                  <Text style={styles.sectionTitle}>
                    Received Offers ({request.offers.length})
                  </Text>
                </View>

                <View style={styles.offersList}>
                  {request.offers.map((offer, index) => (
                    <OfferItem key={offer._id || index} offer={offer} index={index} />
                  ))}
                </View>

                {request.status === 'Pending' && (
                  <View style={styles.offersNote}>
                    <Ionicons name="information-circle" size={16} color="#6366F1" />
                    <Text style={styles.offersNoteText}>
                      Accept an offer to assign a tasker to your service request.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'tasker' && isAssigned && request.assignedTasker && (
              <TouchableOpacity
                onPress={() => navigate('ApplicantProfile', { applicant: request.assignedTasker, requestId })}
                style={styles.sectionCard}
              >
                <View style={styles.sectionHeader}>
                  <Ionicons name="person" size={22} color="#6366F1" />
                  <Text style={styles.sectionTitle}>Assigned Tasker</Text>
                </View>

                <View style={styles.taskerCard}>
                  <View style={styles.taskerHeader}>
                    <View style={styles.taskerAvatar}>
                      {request.assignedTasker.profileImage ? (
                        <Image
                          source={{ uri: request.assignedTasker.profileImage }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {request.assignedTasker.name?.charAt(0)?.toUpperCase() || 'T'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.taskerInfo}>
                      <Text style={styles.taskerName}>
                        {request.assignedTasker.name || 'Tasker'}
                      </Text>
                      <Text style={styles.taskerEmail}>
                        {request.assignedTasker.email}
                      </Text>
                      {request.assignedTasker.phone && (
                        <Text style={styles.taskerPhone}>
                          {request.assignedTasker.phone}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                  </View>

                  <View style={styles.taskerStats}>
                    <View style={styles.taskerStat}>
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Text style={styles.taskerStatValue}>
                        {request.assignedTasker.rating?.toFixed(1) || 'N/A'}
                      </Text>
                      <Text style={styles.taskerStatLabel}>Rating</Text>
                    </View>
                    <View style={styles.taskerStat}>
                      <Ionicons name="checkmark-done" size={16} color="#10B981" />
                      <Text style={styles.taskerStatValue}>
                        {request.assignedTasker.completedTasks || '0'}
                      </Text>
                      <Text style={styles.taskerStatLabel}>Completed</Text>
                    </View>
                    <View style={styles.taskerStat}>
                      <Ionicons name="trending-up" size={16} color="#6366F1" />
                      <Text style={styles.taskerStatValue}>
                        {request.assignedTasker.completionRate ? `${request.assignedTasker.completionRate}%` : 'N/A'}
                      </Text>
                      <Text style={styles.taskerStatLabel}>Success Rate</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {activeTab === 'requirements' && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-done" size={22} color="#6366F1" />
                  <Text style={styles.sectionTitle}>Service Requirements</Text>
                </View>

                {/* Requirements Section */}
                <View style={styles.requirementsSection}>
                  <Text style={styles.subsectionTitle}>Specific Requirements</Text>
                  <View style={styles.requirementsList}>
                    {request.requirements && request.requirements.length > 0 ? (
                      request.requirements.map((requirement, index) => (
                        <RequirementItem 
                          key={index} 
                          requirement={requirement} 
                          index={index} 
                        />
                      ))
                    ) : (
                      <Text style={styles.noRequirementsText}>
                        No specific requirements listed. Taskers will contact you for details.
                      </Text>
                    )}
                  </View>
                </View>

                {/* Service Type Information */}
                <View style={styles.serviceTypeSection}>
                  <Text style={styles.subsectionTitle}>Service Type</Text>
                  <View style={styles.serviceTypeCard}>
                    <Ionicons name="build-outline" size={20} color="#6366F1" />
                    <Text style={styles.serviceTypeText}>{request.type}</Text>
                  </View>
                </View>

                {/* Funding Status */}
                {request.funded !== undefined && (
                  <View style={styles.fundingSection}>
                    <Ionicons 
                      name={request.funded ? "checkmark-circle" : "time-outline"} 
                      size={20} 
                      color={request.funded ? "#10B981" : "#F59E0B"} 
                    />
                    <View style={styles.fundingContent}>
                      <Text style={styles.fundingTitle}>
                        {request.funded ? 'Payment Secured' : 'Payment Pending'}
                      </Text>
                      <Text style={styles.fundingText}>
                        {request.funded 
                          ? 'Your payment is secured and ready for release upon completion.'
                          : 'Payment will be processed once you accept an offer.'
                        }
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Enhanced Offers Preview */}
          {hasActiveOffers && (
            <View style={styles.offersPreview}>
              <View style={styles.sectionHeader}>
                <Ionicons name="chatbubble" size={22} color="#6366F1" />
                <Text style={styles.sectionTitle}>Recent Offers</Text>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={handleViewOffers}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#6366F1" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.offersScroll}
              >
                {request.offers.slice(0, 3).map((offer, index) => (
                  <View key={index} style={styles.offerPreviewCard}>
                    <View style={styles.offerPreviewAvatar}>
                      <Text style={styles.offerPreviewAvatarText}>
                        {offer.tasker?.name?.charAt(0)?.toUpperCase() || 'T'}
                      </Text>
                    </View>
                    <Text style={styles.offerPreviewName} numberOfLines={1}>
                      {offer.tasker?.name || 'Tasker'}
                    </Text>
                    <Text style={styles.offerPreviewAmount}>₵{offer.amount}</Text>
                    <Text style={styles.offerPreviewDate}>
                      {offer.createdAt ? moment(offer.createdAt).fromNow() : 'Recently'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      
      </ScrollView>
      <ServiceRequestRefundNoticeCard serviceRequest={request} isTaskOwner={true}/>
      {/* Enhanced FAB with Message Tasker Functionality */}
      <View style={styles.fabContainer}>
        {/* Backdrop */}
        {fabExpanded && (
          <TouchableWithoutFeedback onPress={toggleFAB}>
            <View style={styles.fabBackdrop} />
          </TouchableWithoutFeedback>
        )}

        {/* Action Buttons with Improved Staggering */}
        <Animated.View
          style={[
            styles.fabActionButtons,
            {
              opacity: fabAnimation,
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [80, 0]
                })
              }]
            }
          ]}
        >
          {/* NEW: Message Tasker Button - Top Priority */}
          {canMessageTasker && (
            <Animated.View style={{
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }],
              opacity: fabAnimation
            }}>
              <TouchableOpacity
                style={[styles.fabActionButton, styles.fabMessage]}
                onPress={handleMessageTasker}
              >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
                  <Text style={styles.fabMessageText}>Message Tasker</Text>
                
              </TouchableOpacity>
            </Animated.View>
          )}

          {hasOffers && request.status === 'Pending' && (
            <Animated.View style={{
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [25, 0]
                })
              }],
              opacity: fabAnimation
            }}>
              <TouchableOpacity
                style={[styles.fabActionButton, styles.fabOffers]}
                onPress={() => {
                  toggleFAB();
                  handleViewOffers();
                }}
              >
                <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                <Text style={styles.fabActionText}>
                  Offers ({request.offers?.length || 0})
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <Animated.View style={{
            transform: [{
              translateY: fabAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })
            }],
            opacity: fabAnimation
          }}>
            <TouchableOpacity
              style={[styles.fabActionButton, styles.fabEdit]}
              onPress={() => {
                toggleFAB();
                handleEditRequest();
              }}
            >
              <Ionicons name="create" size={20} color="#FFFFFF" />
              <Text style={styles.fabActionText}>Edit Request</Text>
            </TouchableOpacity>
          </Animated.View>

          {(request.status === "Booked" || request.status === "In-progress") && (
            <>
            <Animated.View style={{
            transform: [{
             translateY: fabAnimation.interpolate({
             inputRange: [0, 1],
             outputRange: [15, 0]
              })
              }],
              opacity: fabAnimation
               }}>
              <TouchableOpacity
               style={[styles.fabActionButton, styles.fabSubmissions]}
              onPress={() => {
              toggleFAB();
              handleViewSubmissions();
               }}
              >
             <Ionicons name="document-text" size={20} color="#FFFFFF" />
             <Text style={styles.fabActionText}>Submissions</Text>
              </TouchableOpacity>
              </Animated.View>
            <Animated.View style={{
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, 0]
                })
              }],
              opacity: fabAnimation
            }}>
              <TouchableOpacity
                style={[styles.fabActionButton, styles.fabReport]}
                onPress={() => {
                  toggleFAB();
                  handleReportPress();
                }}
              >
                <Ionicons name="flag" size={20} color="#FFFFFF" />
                <Text style={styles.fabActionText}>Report Issue</Text>
              </TouchableOpacity>
            </Animated.View>
            </>
          )}

          {canMarkAsDone && (
            <Animated.View style={{
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0]
                })
              }],
              opacity: fabAnimation
            }}>
              <TouchableOpacity
                style={[styles.fabActionButton, styles.fabComplete]}
                onPress={() => {
                  toggleFAB();
                  handleMarkAsDone();
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.fabActionText}>Mark Complete</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* Main FAB */}
        <TouchableOpacity
          style={[styles.mainFAB, fabExpanded && styles.mainFABExpanded]}
          onPress={toggleFAB}
          activeOpacity={0.8}
        >
          <Animated.View style={{
            transform: [{
              rotate: fabAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '45deg']
              })
            }]
          }}>
            <Ionicons
              name={fabExpanded ? "close" : "ellipsis-horizontal"}
              size={24}
              color="#FFFFFF"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ReportForm
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        task={request}
        onReportSubmitted={handleReportSubmitted}
      />

      <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        userId={request.assignedTasker?._id}
        userName={request.assignedTasker?.name}
        userRole='tasker'
      />

     
    </SafeAreaView>
  );
};

export default ServiceRequestDetailScreen;