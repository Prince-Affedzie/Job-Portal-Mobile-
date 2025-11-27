// screens/tasker/ServiceRequestDetailScreen.js
import React, { useState, useEffect, useContext,useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {styles} from '../../styles/tasker/ServiceRequestDetailScreen.Styles'
import moment from 'moment';
import Header from '../../component/tasker/Header';
import ReportForm from '../../component/common/reportForm';
import { AuthContext } from '../../context/AuthContext';
import { ServiceRequestContext } from '../../context/ServiceRequestContext';
import { navigate } from '../../services/navigationService';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import RatingModal from '../../component/common/RatingModal';
import { MediaDisplay } from '../../component/tasker/TaskMediaDisplay';
import {serviceRequestDetail,submitOffer,updateOffer,markServiceComplete} from '../../api/serviceRequestAPI/taskerAPI'
import {startOrGetChatRoom} from '../../api/chatApi'
import WorkSubmissionModal from '../../component/tasker/WorkSubmissionModal'



const { width } = Dimensions.get('window');

const ServiceRequestDetailScreen = ({ route, navigation }) => {
  const { requestId } = route.params;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useContext(AuthContext);
 
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
  //const [fabExpanded, setFabExpanded] = useState(false);
  //const [fabAnimation] = useState(new Animated.Value(0));
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [editingOffer, setEditingOffer] = useState(null);

 // FIXED: Use useRef for animations, useState for state
const [fabExpanded, setFabExpanded] = useState(false);
const fabAnimation = useRef(new Animated.Value(0)).current; // CHANGED to useRef

const toggleFAB = () => {
  if (fabExpanded) {
    // Close animation
    Animated.timing(fabAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setFabExpanded(false);
    });
  } else {
    // Open animation - set state first, then animate
    setFabExpanded(true);
    // Use setTimeout to ensure state is updated before animation starts
    setTimeout(() => {
      Animated.timing(fabAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 10);
  }
};

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      console.log(requestId)
      const response = await serviceRequestDetail(requestId);
      
      if (response.status === 200) {
        setRequest(response.data);
        console.log(response.data)
        // Pre-fill offer amount with budget if available
        if (response.data.budget && !offerAmount) {
          setOfferAmount(response.data.budget.toString());
        }
      } else {
        Alert.alert('Error', 'Service request not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading service request details:', error);
      Alert.alert('Error', 'Failed to load service request details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOffer = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid offer amount');
      return;
    }

    try {
      const offerData = {
        amount: parseFloat(offerAmount),
        message: offerMessage.trim() || undefined
      };

      let response;
      if (editingOffer) {
        response = await updateOffer(requestId, editingOffer._id, offerData);
      } else {
        response = await submitOffer(requestId, offerData);
      }

      if (response.status === 200 || response.status === 201) {
        Alert.alert(
          'Success', 
          editingOffer ? 'Offer updated successfully!' : 'Offer submitted successfully!'
        );
        setShowOfferModal(false);
        setOfferAmount('');
        setOfferMessage('');
        setEditingOffer(null);
        loadRequestDetails();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error || 'Error submitting offer';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleEditOffer = (offer) => {
    setEditingOffer(offer);
    setOfferAmount(offer.amount.toString());
    setOfferMessage(offer.message || '');
    setShowOfferModal(true);
  };

  const handleMarkAsDone = async () => {
    try {
      Alert.alert(
        "Mark as Done",
        "Are you sure you want to mark this service request as completed?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Mark as Done", 
            style: "default",
            onPress: async () => {
              const res = await markServiceComplete(requestId);
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
    if (!isAssignedToUser) {
      Alert.alert(
        'Not Assigned',
        'You can only report issues for service requests assigned to you.'
      );
      return;
    }
    setShowReportModal(true);
  };

  const handleReportSubmitted = () => {
    Alert.alert('Success', 'Your report has been submitted successfully!');
  };

  const handleMessageClient = async () => {
    try {
      // Navigate to chat with client
      const res = await startOrGetChatRoom({userId2: request.client?._id,jobId: requestId})
      if(res.status === 200) {
        const roomId = res.data._id
         navigate('ChatWindow', { 
         roomId: roomId 
    });
      }
      
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat with client');
    }
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

  const getUrgencyColor = (urgency) => {
    const colors = {
      'flexible': '#10B981',
      'urgent': '#EF4444',
      'scheduled': '#3B82F6'
    };
    return colors[urgency] || '#6B7280';
  };

  const formatDate = (date) => {
    return moment(date).format("MMM DD, YYYY");
  };

  const formatDateTime = (date) => {
    return moment(date).format("MMM DD, YYYY [at] h:mm A");
  };

  const formatFullAddress = (address) => {
    if (!address || (!address.region && !address.city && !address.suburb)) {
      return "Remote";
    }
    
    const parts = [
      address.region,
      address.city, 
      address.suburb
    ].filter(part => part && part.trim() !== '');
    
    return parts.join(', ');
  };

  // Helper functions
  const isAssignedToUser = request?.assignedTasker && String(request.assignedTasker) === String(user?._id);
  const userOffer = request?.offers?.find(offer => String(offer.tasker?._id) === String(user?._id));
  const hasUserOffered = !!userOffer;
  const isOfferAccepted = userOffer?.status === 'accepted';
  const isOfferPending = userOffer?.status === 'pending';
  const canSubmitOffer = !isAssignedToUser && !hasUserOffered && request?.status === 'Pending';
  const canEditOffer = hasUserOffered && isOfferPending;
  const isCompleted = request?.status?.toLowerCase() === 'completed';
  const canMarkAsDone = isAssignedToUser && !isCompleted && request?.markedDoneByTasker === false;
  const hasTaskerMarkedDone = request?.markedDoneByTasker === true;
  const canSubmitWork = isAssignedToUser && !isCompleted;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container1}>
          <Header title={"Service Request"} showBackButton={true} />
          <LoadingIndicator text='Loading Service Request Details...' logoStyle="glow"/>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container1}>
          <Header title={"Service Request"} showBackButton={true} />
          <View style={styles.errorContainer}>
            <Ionicons name="sad-outline" size={48} color="#94A3B8" />
            <Text style={styles.errorText}>Service request not found</Text>
          </View>
        </View>
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

  const RequirementItem = ({ requirement, index }) => (
    <View style={styles.requirementItem}>
      <View style={styles.requirementBullet}>
        <Ionicons name="ellipse" size={8} color="#10B981" />
      </View>
      <Text style={styles.requirementText}>{requirement}</Text>
    </View>
  );

  const OfferStatusBadge = ({ status }) => {
    const getStatusConfig = (status) => {
      const configs = {
        'pending': { bg: '#FEF3C7', text: '#92400E', label: 'Pending Review', icon: 'time-outline' },
        'accepted': { bg: '#D1FAE5', text: '#065F46', label: 'Accepted', icon: 'checkmark-circle' },
        'declined': { bg: '#FEE2E2', text: '#991B1B', label: 'Declined', icon: 'close-circle-outline' },
      };
      
      return configs[status?.toLowerCase()] || { 
        bg: '#F3F4F6', 
        text: '#6B7280', 
        label: status || 'Unknown',
        icon: 'help-circle-outline'
      };
    };

    const config = getStatusConfig(status);

    return (
      <View style={[styles.offerStatusBadge, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={14} color={config.text} />
        <Text style={[styles.offerStatusText, { color: config.text }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container1}>
        <StatusBar barStyle="light-content" backgroundColor="#1A1F3B" />
        <Header title={"Service Request"} showBackButton={true} />
        
        {/* Offer Status Banner */}
        {hasUserOffered && !isAssignedToUser && (
          <View style={[
            styles.offerStatusCard,
            isOfferAccepted && styles.offerStatusCardAccepted,
            userOffer.status === 'declined' && styles.offerStatusCardDeclined
          ]}>
            <View style={styles.offerStatusHeader}>
              <Ionicons 
                name={isOfferAccepted ? "checkmark-circle" : "time"} 
                size={24} 
                color={isOfferAccepted ? "#10B981" : "#F59E0B"} 
              />
              <Text style={styles.offerStatusTitle}>
                {isOfferAccepted ? 'Offer Accepted!' : 'Offer Submitted'}
              </Text>
            </View>
            <Text style={styles.offerStatusMessage}>
              {isOfferAccepted 
                ? 'The client has accepted your offer. You can now start working on this service request.'
                : 'Your offer is under review by the client. You will be notified when they make a decision.'
              }
            </Text>
            {isOfferPending && (
              <TouchableOpacity 
                style={styles.editOfferButton}
                onPress={() => handleEditOffer(userOffer)}
              >
                <Ionicons name="create-outline" size={16} color="#6366F1" />
                <Text style={styles.editOfferText}>Edit Offer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Enhanced Header Section */}
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
                      <Ionicons name="cash-outline" size={14} color="#E0E7FF" />
                      <Text style={styles.heroMetaText}>
                        {request.budget ? `₵${request.budget}` : 'Flexible Budget'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Assignment Status Badge */}
                {isAssignedToUser ? (
                  <View style={styles.assignmentStatusBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.assignmentStatusText}>Assigned</Text>
                  </View>
                ) : hasUserOffered ? (
                  <OfferStatusBadge status={userOffer.status} />
                ) : (
                  <View style={styles.assignmentStatusBadge}>
                    <Ionicons name="add-circle-outline" size={16} color="#E0E7FF" />
                    <Text style={styles.assignmentStatusText}>Available</Text>
                  </View>
                )}
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <View style={styles.quickStat}>
                  <Ionicons name="calendar-outline" size={14} color="#E0E7FF" />
                  <Text style={styles.quickStatText}>
                    {request.preferredDate 
                      ? `Preferred ${formatDate(request.preferredDate)}`
                      : 'Flexible timing'
                    }
                  </Text>
                </View>
                <View style={styles.quickStat}>
                  <Ionicons name="speedometer-outline" size={14} color="#E0E7FF" />
                  <Text style={[
                    styles.quickStatText,
                    { color: getUrgencyColor(request.urgency) }
                  ]}>
                    {request.urgency?.charAt(0).toUpperCase() + request.urgency?.slice(1)}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Enhanced Completion Status */}
          {isAssignedToUser && (
            <View style={styles.completionCard}>
              <Text style={styles.completionTitle}>Completion Progress</Text>
              <View style={styles.progressContainer}>
                <ProgressStep
                  completed={request.markedDoneByTasker}
                  current={!request.markedDoneByTasker && !request.markedDoneByEmployer}
                  label="You marked as done"
                  date={request.taskerDoneAt}
                />
                <View style={styles.progressLine} />
                <ProgressStep
                  completed={request.markedDoneByEmployer}
                  current={request.markedDoneByTasker && !request.markedDoneByEmployer}
                  label="Client marked as done"
                  date={request.employerDoneAt}
                />
              </View>

              {request.markedDoneByTasker && request.markedDoneByEmployer && (
                <View style={styles.mutualCompletion}>
                  <Ionicons name="checkmark-done" size={20} color="#10B981" />
                  <Text style={styles.mutualCompletionText}>
                    Service mutually completed!
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
            {isAssignedToUser && (
              <TabButton
                title="Client"
                icon="person-outline"
                isActive={activeTab === 'client'}
                onPress={() => setActiveTab('client')}
              />
            )}
            <TabButton
              title="Requirements"
              icon="checkmark-done-outline"
              isActive={activeTab === 'requirements'}
              onPress={() => setActiveTab('requirements')}
              badge={request.requirements?.length || null}
            />
            {hasUserOffered && (
              <TabButton
                title="Your Offer"
                icon="pricetag-outline"
                isActive={activeTab === 'offer'}
                onPress={() => setActiveTab('offer')}
              />
            )}
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
                      subtitle={request.finalCost ? `Final: ₵${request.finalCost}` : 'Client budget'}
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
                      value={formatFullAddress(request.address)}
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
                </View>
              </>
            )}

            {activeTab === 'client' && isAssignedToUser && request.client && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person" size={22} color="#6366F1" />
                  <Text style={styles.sectionTitle}>Client Profile</Text>
                </View>

                <View style={styles.clientCard}>
                  <View style={styles.clientHeader}>
                    <View style={styles.clientAvatar}>
                      {request.client.profileImage ? (
                        <Image
                          source={{ uri: request.client.profileImage }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {request.client.name?.charAt(0)?.toUpperCase() || 'C'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{request.client.name}</Text>
                      {request.client.isVerified && (
                        <View style={styles.verifiedBadge}>
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                          <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                      )}
                      <Text style={styles.clientBio}>
                        {request.client.Bio || "No bio available"}
                      </Text>
                    </View>
                  </View>

                  {/* Contact Information */}
                  <View style={styles.contactSection}>
                    <View style={styles.contactItem}>
                      <Ionicons name="mail" size={20} color="#6366F1" />
                      <View>
                        <Text style={styles.contactLabel}>Email</Text>
                        <Text style={styles.contactValue}>{request.client.email}</Text>
                      </View>
                    </View>
                    {request.client.phone && (
                      <View style={styles.contactItem}>
                        <Ionicons name="call" size={20} color="#6366F1" />
                        <View>
                          <Text style={styles.contactLabel}>Phone</Text>
                          <Text style={styles.contactValue}>{request.client.phone}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Enhanced Client Stats */}
                  <View style={styles.clientStats}>
                    <View style={styles.ratingStatsCard}>
                      <View style={styles.ratingMain}>
                        <View style={styles.ratingStars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={star <= Math.floor(request.client.rating || 0) ? "star" : "star-outline"}
                              size={16}
                              color="#F59E0B"
                            />
                          ))}
                        </View>
                        <Text style={styles.ratingValue}>
                          {request.client.rating?.toFixed(1) || '0.0'}
                        </Text>
                      </View>
                      <Text style={styles.reviewsCount}>
                        {request.client.numberOfRatings || 0} reviews
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
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
                        No specific requirements listed. Please contact the client for details.
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
                          ? 'Client has secured payment for this service.'
                          : 'Payment will be processed once the client accepts an offer.'
                        }
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'offer' && hasUserOffered && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pricetag" size={22} color="#6366F1" />
                  <Text style={styles.sectionTitle}>Your Offer</Text>
                </View>

                <View style={styles.offerDetailsCard}>
                  <View style={styles.offerAmountSection}>
                    <Text style={styles.offerAmountLabel}>Your Offer Amount</Text>
                    <Text style={styles.offerAmount}>₵{userOffer.amount}</Text>
                  </View>

                  {userOffer.message && (
                    <View style={styles.offerMessageSection}>
                      <Text style={styles.offerMessageLabel}>Your Message</Text>
                      <Text style={styles.offerMessageText}>"{userOffer.message}"</Text>
                    </View>
                  )}

                  <View style={styles.offerMeta}>
                    <View style={styles.offerMetaItem}>
                      <Ionicons name="time-outline" size={16} color="#64748B" />
                      <Text style={styles.offerMetaText}>
                        Submitted {formatDateTime(userOffer.createdAt)}
                      </Text>
                    </View>
                    {userOffer.updatedAt && userOffer.updatedAt !== userOffer.createdAt && (
                      <View style={styles.offerMetaItem}>
                        <Ionicons name="create-outline" size={16} color="#64748B" />
                        <Text style={styles.offerMetaText}>
                          Updated {formatDateTime(userOffer.updatedAt)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {isOfferPending && (
                    <TouchableOpacity 
                      style={styles.editOfferButtonLarge}
                      onPress={() => handleEditOffer(userOffer)}
                    >
                      <Ionicons name="create-outline" size={18} color="#6366F1" />
                      <Text style={styles.editOfferTextLarge}>Edit Offer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Enhanced Safety Guidelines */}
          <View style={styles.safetyCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={22} color="#6366F1" />
              <Text style={styles.sectionTitle}>Safety Guidelines</Text>
            </View>
            
            <View style={styles.safetyList}>
              <View style={[styles.safetyItem, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Ionicons name="warning" size={16} color="#EF4444" />
                <Text style={[styles.safetyText, { color: '#EF4444' }]}>
                  Never share personal financial information
                </Text>
              </View>
              <View style={[styles.safetyItem, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
                <Ionicons name="location" size={16} color="#3B82F6" />
                <Text style={[styles.safetyText, { color: '#3B82F6' }]}>
                  Meet in public places for onsite work
                </Text>
              </View>
              <View style={[styles.safetyItem, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Ionicons name="chatbubble" size={16} color="#10B981" />
                <Text style={[styles.safetyText, { color: '#10B981' }]}>
                  Keep all communication on the platform
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

      
<View style={styles.fabContainer}>
  {/* Backdrop */}
  {fabExpanded && (
    <TouchableWithoutFeedback onPress={toggleFAB}>
      <View style={styles.fabBackdrop} />
    </TouchableWithoutFeedback>
  )}

  {/* Action Buttons with Staggered Animation - ADD CONDITION */}
  {fabExpanded && (
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
      {canSubmitWork && (
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
        style={[styles.fabActionButton, styles.fabSubmit]}
        onPress={() => {
        toggleFAB();
        setShowWorkModal(true);
        }}
        >
        <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
        <Text style={styles.fabActionText}>Submit Work</Text>
        </TouchableOpacity>
        </Animated.View>
        )}
      {isAssignedToUser && (
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
              navigate('Submissions', { taskId: request._id, taskTitle: request.title });
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
                outputRange: [20, 0]
              })
            }],
            opacity: fabAnimation
          }}>
            
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

          {/* Mark as Done Button */}
          {hasTaskerMarkedDone ? (
            <Animated.View style={{
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0]
                })
              }],
              opacity: fabAnimation
            }}>
              <View style={[styles.fabActionButton, styles.fabCompleteDisabled]}>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.fabActionText}> Marked Done</Text>
              </View>
            </Animated.View>
          ) : canMarkAsDone ? (
            <Animated.View style={{
              transform: [{
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [5, 0]
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
          ) : null}
        </>
      )}

      {/* Offer Submission Buttons */}
      {canSubmitOffer && (
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
            style={[styles.fabActionButton, styles.fabOffer]}
            onPress={() => {
              toggleFAB();
              setShowOfferModal(true);
            }}
          >
            <Ionicons name="pricetag" size={20} color="#FFFFFF" />
            <Text style={styles.fabActionText}>Submit Offer</Text>
          </TouchableOpacity>

        </Animated.View>
      )}

      {canEditOffer && (
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
            style={[styles.fabActionButton, styles.fabEditOffer]}
            onPress={() => {
              toggleFAB();
              handleEditOffer(userOffer);
            }}
          >
            <Ionicons name="create" size={20} color="#FFFFFF" />
            <Text style={styles.fabActionText}>Edit Offer</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

       <TouchableOpacity 
        style={[styles.fabActionButton, styles.fabMessage]}
        onPress={() => {
        toggleFAB();
        handleMessageClient();
        }}
        >
        <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
        <Text style={styles.fabActionText}>Message Client</Text>
        </TouchableOpacity>

      {/* Enhanced Hint Cards */}
      {!isAssignedToUser && !hasUserOffered && request?.status !== 'Pending' && (
        <View style={styles.fabHintCard}>
          <Ionicons name="time" size={20} color="#F59E0B" />
          <View style={styles.hintTextContainer}>
            <Text style={styles.hintTitle}>Not Available</Text>
            <Text style={styles.hintDescription}>
              This service request is no longer accepting offers
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  )}

  {/* Enhanced Main FAB */}
  <TouchableOpacity 
    style={[
      styles.mainFAB,
      fabExpanded && styles.mainFABExpanded
    ]}
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

        {/* Offer Submission Modal */}
        <Modal
          visible={showOfferModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowOfferModal(false);
            setEditingOffer(null);
            setOfferAmount('');
            setOfferMessage('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingOffer ? 'Edit Your Offer' : 'Submit Offer'}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowOfferModal(false);
                    setEditingOffer(null);
                    setOfferAmount('');
                    setOfferMessage('');
                  }}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.offerInputGroup}>
                  <Text style={styles.inputLabel}>Offer Amount (₵)</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="Enter your offer amount"
                    value={offerAmount}
                    onChangeText={setOfferAmount}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                  {request.budget && (
                    <Text style={styles.budgetHint}>
                      Client budget: ₵{request.budget}
                    </Text>
                  )}
                </View>

                <View style={styles.offerInputGroup}>
                  <Text style={styles.inputLabel}>Message to Client (Optional)</Text>
                  <TextInput
                    style={styles.messageInput}
                    placeholder="Briefly describe why you're a good fit for this service..."
                    value={offerMessage}
                    onChangeText={setOfferMessage}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.offerTips}>
                  <Text style={styles.offerTipsTitle}>Tips for a great offer:</Text>
                  <View style={styles.tipItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.tipText}>Be competitive with your pricing</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.tipText}>Highlight your relevant experience</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.tipText}>Be clear about your availability</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={() => {
                    setShowOfferModal(false);
                    setEditingOffer(null);
                    setOfferAmount('');
                    setOfferMessage('');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.primaryButton,
                    (!offerAmount || parseFloat(offerAmount) <= 0) && styles.primaryButtonDisabled
                  ]}
                  onPress={handleSubmitOffer}
                  disabled={!offerAmount || parseFloat(offerAmount) <= 0}
                >
                  <Text style={styles.primaryButtonText}>
                    {editingOffer ? 'Update Offer' : 'Submit Offer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ReportForm
          isVisible={showReportModal}
          onClose={() => setShowReportModal(false)}
          task={request}
          onReportSubmitted={handleReportSubmitted}
        />

        <WorkSubmissionModal
        isVisible={showWorkModal}
        onClose={() => setShowWorkModal(false)}
        taskId={request._id}
        task={request}
        type='serviceRequest'
        onSubmissionSuccess={() => {
        loadRequestDetails();
        }}
        />

        <RatingModal
          visible={ratingModalVisible}
          onClose={() => setRatingModalVisible(false)}
          userId={request.client?._id}
          userName={request.client?.name}
          userRole='client'
        />
      </View>
    </SafeAreaView>
  );
};

export default ServiceRequestDetailScreen;