import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  Modal,
  SafeAreaView,
  TextInput,
  Dimensions,
} from 'react-native';
//import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import ReportForm from '../../component/common/reportForm';
import { AuthContext } from '../../context/AuthContext';
import { useServiceRequest } from '../../context/ServiceRequestContext';
import { acceptOffer, markServiceDone } from '../../api/serviceRequestAPI/clientAPI';
import { triggerPayment } from '../../services/PaymentServices';
import { usePaystack } from "react-native-paystack-webview";
import { startOrGetChatRoom } from '../../api/chatApi';
import { navigate } from '../../services/navigationService';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import RatingModal from '../../component/common/RatingModal';
import { MediaDisplay } from '../../component/tasker/TaskMediaDisplay';
import ServiceRequestRefundNoticeCard from '../../component/client/ServiceRequestRefundNotificationCard';

const { width } = Dimensions.get('window');

const ServiceRequestDetailScreen = ({ route, navigation }) => {
  const { requestId } = route.params;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showReportModal, setShowReportModal] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const {getServiceRequestDetails} = useServiceRequest()

  const { user } = useContext(AuthContext);
  const { popup } = usePaystack();

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
      console.log(error)
      Alert.alert('Error', 'Failed to load service request');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequestDetails();
  };

  const handleMessageTasker = async () => {
    if (!request?.assignedTasker?._id) return;
    try {
      const res = await startOrGetChatRoom({
        userId2: request.assignedTasker._id,
        jobId: request._id,
      });
      if (res.status === 200) {
        navigate('ChatWindow', { roomId: res.data._id });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const handleEditRequest = () => {
    navigate('EditServiceRequest', { serviceRequest: request });
  };

  const handleViewOffers = () => {
    navigate('ServiceRequestOffers', {
      requestId: request._id,
      offers: request.offers || [],
      request: request,
    });
  };

  const handleViewSubmissions = () => {
    navigation.navigate('TaskSubmissions', { taskId: request._id, taskTitle: request.type });
  };

  const handleAcceptOffer = async (offer) => {
    Alert.alert(
      "Accept Offer",
      `Accept ${offer.tasker?.name || 'tasker'}'s offer of ₵${offer.amount}?\n\nPayment will be held securely in escrow until completion.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept & Pay",
          onPress: async () => {
            const paymentSuccess = await triggerPayment({
              popup,
              email: user.email,
              phone: user.phone,
              amount: offer.amount,
              taskId: requestId,
              beneficiary: offer.tasker._id,
            });

            if (!paymentSuccess) {
              Alert.alert("Payment Failed", "Offer acceptance cancelled.");
              return;
            }

            try {
              const res = await acceptOffer(requestId, offer._id);
              if (res.status === 200) {
                Alert.alert("Success", "Offer accepted! Tasker assigned.");
                loadRequestDetails();
              }
            } catch (err) {
              Alert.alert("Error", "Failed to accept offer");
            }
          },
        },
      ]
    );
  };

  const handleMarkAsDone = async () => {
    Alert.alert(
      "Mark as Done",
      "This will release payment to the tasker.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Release",
          onPress: async () => {
            const res = await markServiceDone(requestId);
            if (res.status === 200) {
              Alert.alert("Success", "Service marked as completed!");
              setTimeout(() => setRatingModalVisible(true), 800);
              loadRequestDetails();
            }
          },
        },
      ]
    );
  };

  const formatDate = (date) => moment(date).format("MMM D, YYYY");
  const formatFullAddress = (address) =>
    !address || (!address.region && !address.city && !address.suburb)
      ? "Remote"
      : [address.region, address.city, address.suburb].filter(Boolean).join(', ');

  const getStatusColor = (status) => {
    const map = {
      pending: '#F97316',
      quoted: '#8B5CF6',
      booked: '#3B82F6',
      'in-progress': '#F59E0B',
      review: '#8B5CF6',
      completed: '#10B981',
      closed: '#6B7280',
      canceled: '#EF4444',
    };
    return map[status?.toLowerCase()] || '#6B7280';
  };

  const getUrgencyColor = (urgency) => {
    const map = { flexible: '#10B981', urgent: '#EF4444', scheduled: '#3B82F6' };
    return map[urgency] || '#6B7280';
  };

  const hasOffers = request?.offers && request.offers.length > 0;
  const isAssigned = request?.assignedTasker && request.status !== 'Pending';
  const isCompleted = request?.status?.toLowerCase() === 'completed';
  const canMarkAsDone = isAssigned && !isCompleted && !request?.markedDoneByEmployer;
  const canMessageTasker = isAssigned && !isCompleted;
  const canViewSubmissions = isAssigned ;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Service Request" showBackButton />
        <LoadingIndicator text="Loading request..." />
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Service Request" showBackButton />
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={80} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Request Not Found</Text>
          <Text style={styles.emptySubtitle}>This service request may have been removed.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={request.type} showBackButton />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.title}>{request.type}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(request.status) }]} />
            <Text style={styles.statusText}>{request.status.replace('-', ' ')}</Text>
            {isAssigned && <Text style={styles.assignedBadge}>• Assigned</Text>}
            {hasOffers && !isAssigned && <Text style={styles.pendingBadge}>• Offers Received</Text>}
            <Text style={styles.metaText}>• Posted {formatDate(request.createdAt)}</Text>
          </View>
        </View>

        

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={28} color="#10B981" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Budget</Text>
              <Text style={styles.infoValue}>{request.budget ? `₵${request.budget}` : 'Flexible'}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={28} color="#F59E0B" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Preferred Date</Text>
              <Text style={styles.infoValue}>{request.preferredDate ? formatDate(request.preferredDate) : 'Flexible'}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={28} color="#6366F1" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{formatFullAddress(request.address)}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="speedometer-outline" size={28} color={getUrgencyColor(request.urgency)} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Urgency</Text>
              <Text style={styles.infoValue}>{request.urgency?.charAt(0).toUpperCase() + request.urgency?.slice(1)}</Text>
            </View>
          </View>
        </View>

        {/* Horizontal Scrollable Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollContainer}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
            </TouchableOpacity>

            {hasOffers && !isAssigned && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
                onPress={() => setActiveTab('offers')}
              >
                <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>
                  Offers ({request.offers.length})
                </Text>
              </TouchableOpacity>
            )}

            {isAssigned && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'tasker' && styles.activeTab]}
                onPress={() => setActiveTab('tasker')}
              >
                <Text style={[styles.tabText, activeTab === 'tasker' && styles.activeTabText]}>Tasker</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.tab, activeTab === 'requirements' && styles.activeTab]}
              onPress={() => setActiveTab('requirements')}
            >
              <Text style={[styles.tabText, activeTab === 'requirements' && styles.activeTabText]}>Requirements</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{request.description}</Text>
              <MediaDisplay media={request.media} />
            </View>
          )}

          {activeTab === 'offers' && hasOffers && !isAssigned && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Offers Received</Text>
              {request.offers.map((offer, i) => (
                <View key={i} style={styles.offerItem}>
                  <View style={styles.offerHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarInitial}>
                        {offer.tasker?.name?.[0]?.toUpperCase() || 'T'}
                      </Text>
                    </View>
                    <View style={styles.offerInfo}>
                      <Text style={styles.offerName}>{offer.tasker?.name || 'Tasker'}</Text>
                      <Text style={styles.offerRating}>★ {offer.tasker?.rating?.toFixed(1) || 'New'}</Text>
                    </View>
                    <Text style={styles.offerAmount}>₵{offer.amount}</Text>
                  </View>
                  {offer.message && <Text style={styles.offerMessage}>"{offer.message}"</Text>}
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptOffer(offer)}>
                    <Text style={styles.acceptText}>Accept Offer</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'tasker' && isAssigned && request.assignedTasker && (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>Assigned Tasker</Text>
    <TouchableOpacity
      style={styles.taskerProfile}
      onPress={() => navigate('ApplicantProfile', { applicant: request.assignedTasker, requestId })}
    >
      <View style={styles.taskerHeader}>
        <View style={styles.avatarContainer}>
          {request.assignedTasker.profileImage ? (
            <Image 
              source={{ uri: request.assignedTasker.profileImage }} 
              style={styles.avatarImage} 
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {request.assignedTasker.name?.[0]?.toUpperCase() || 'T'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.taskerBasicInfo}>
          <Text style={styles.taskerName}>{request.assignedTasker.name}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {request.assignedTasker.rating?.toFixed(1) || 'New'} 
              {request.assignedTasker.numberOfRatings ? 
                ` (${request.assignedTasker.numberOfRatings} reviews)` : 
                ' (No reviews yet)'
              }
            </Text>
          </View>
          {request.assignedTasker.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.verifiedText}>Verified Tasker</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </View>

      {/* Tasker Contact Information */}
      <View style={styles.contactInfoSection}>
        {request.assignedTasker.email && (
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Ionicons name="mail" size={16} color="#6366F1" />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{request.assignedTasker.email}</Text>
            </View>
          </View>
        )}

        {request.assignedTasker.phone && (
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Ionicons name="call" size={16} color="#6366F1" />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>{request.assignedTasker.phone}</Text>
            </View>
          </View>
        )}

        {request.assignedTasker.bio && (
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Ionicons name="information-circle" size={16} color="#6366F1" />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>About</Text>
              <Text style={styles.contactValue} numberOfLines={3}>
                {request.assignedTasker.bio}
              </Text>
            </View>
          </View>
        )}

        {request.assignedTasker.skills && request.assignedTasker.skills.length > 0 && (
          <View style={styles.skillsContainer}>
            <Text style={styles.skillsLabel}>Skills:</Text>
            <View style={styles.skillsList}>
              {request.assignedTasker.skills.slice(0, 3).map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
              {request.assignedTasker.skills.length > 3 && (
                <Text style={styles.moreSkillsText}>
                  +{request.assignedTasker.skills.length - 3} more
                </Text>
              )}
            </View>
          </View>
        )}

        <Text style={styles.viewProfileText}>
          Tap to view full profile and portfolio →
        </Text>
      </View>
    </TouchableOpacity>
  </View>
)}
          {activeTab === 'requirements' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Requirements</Text>
              {(request.requirements || []).length > 0 ? (
                request.requirements.map((req, i) => (
                  <View key={i} style={styles.reqItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.reqText}>{req}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.placeholderText}>No specific requirements listed.</Text>
              )}
            </View>
          )}
        </View>

        {/* Completion Progress */}
        {isAssigned && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Completion Progress</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressStep}>
                <View style={[styles.progressDot, request.markedDoneByEmployer && styles.progressDotCompleted]}>
                  {request.markedDoneByEmployer && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={[styles.progressLabel, request.markedDoneByEmployer && styles.progressLabelCompleted]}>
                  You marked as done
                </Text>
              </View>
              <View style={styles.progressLine} />
              <View style={styles.progressStep}>
                <View style={[styles.progressDot, request.markedDoneByTasker && styles.progressDotCompleted]}>
                  {request.markedDoneByTasker && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={[styles.progressLabel, request.markedDoneByTasker && styles.progressLabelCompleted]}>
                  Tasker marked as done
                </Text>
              </View>
            </View>
            {request.markedDoneByEmployer && request.markedDoneByTasker && (
              <View style={styles.completionSuccess}>
                <Ionicons name="checkmark-done" size={24} color="#10B981" />
                <Text style={styles.completionText}>Service Completed!</Text>
              </View>
            )}
          </View>
        )}

        {/* Safety Guidelines */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Safety Guidelines</Text>
          <View style={styles.safetyGrid}>
            <View style={styles.safetyItemRed}>
              <Ionicons name="warning" size={24} color="#DC2626" />
              <Text style={styles.safetyText}>Never pay outside the platform</Text>
            </View>
            <View style={styles.safetyItemBlue}>
              <Ionicons name="location" size={24} color="#2563EB" />
              <Text style={styles.safetyText}>Meet in safe, public places</Text>
            </View>
            <View style={styles.safetyItemGreen}>
              <Ionicons name="chatbubble" size={24} color="#059669" />
              <Text style={styles.safetyText}>Keep communication here</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      {/* Funding Notice */}
        <ServiceRequestRefundNoticeCard serviceRequest={request} isTaskOwner={true} />

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.primaryActions}>
          {canMessageTasker && (
            <TouchableOpacity style={[styles.primaryBtn, styles.messageBtn]} onPress={handleMessageTasker}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Message Tasker</Text>
            </TouchableOpacity>
          )}

          {canMarkAsDone && (
            <TouchableOpacity style={[styles.primaryBtn, styles.completeBtn]} onPress={handleMarkAsDone}>
              <Ionicons name="checkmark-done" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}

          {hasOffers && !isAssigned && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleViewOffers}>
              <Ionicons name="pricetag" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>View Offers ({request.offers.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.secItem} onPress={handleEditRequest}>
            <Ionicons name="create-outline" size={24} color="#6366F1" />
            <Text style={styles.secLabel}>Edit</Text>
          </TouchableOpacity>

          {canViewSubmissions && (
            <TouchableOpacity style={styles.secItem} onPress={handleViewSubmissions}>
              <Ionicons name="document-attach-outline" size={24} color="#6366F1" />
              <Text style={styles.secLabel}>Submissions</Text>
            </TouchableOpacity>
          )}

          {isAssigned && (
            <TouchableOpacity style={styles.secItem} onPress={() => setShowReportModal(true)}>
              <Ionicons name="flag-outline" size={24} color="#EF4444" />
              <Text style={[styles.secLabel, { color: '#EF4444' }]}>Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ReportForm
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        task={request}
        onReportSubmitted={() => Alert.alert('Success', 'Report submitted')}
      />

      <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        userId={request.assignedTasker?._id}
        userName={request.assignedTasker?.name}
        userRole="tasker"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { paddingBottom: 160 },

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
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  assignedBadge: { fontSize: 14, color: '#10B981', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontWeight: '600' },
  pendingBadge: { fontSize: 14, color: '#F59E0B', backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontWeight: '600' },
  metaText: { fontSize: 14, color: '#64748B' },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 24 },
  infoItem: {
    width: (width - 56) / 2,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginTop: 6 },

  tabScrollContainer: { marginBottom: 8 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 },
  tab: { paddingHorizontal: 16, paddingBottom: 12 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#6366F1' },
  tabText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  activeTabText: { color: '#6366F1', fontWeight: '700' },

  tabContent: { paddingHorizontal: 16 },
  sectionCard: { backgroundColor: '#FFFFFF', marginBottom: 24, padding: 24, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  description: { fontSize: 15.5, color: '#475569', lineHeight: 24, marginBottom: 20 },

  offerItem: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16, marginBottom: 16 },
  offerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  offerInfo: { flex: 1, marginLeft: 16 },
  offerName: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  offerRating: { fontSize: 14, color: '#64748B', marginTop: 4 },
  offerAmount: { fontSize: 22, fontWeight: '900', color: '#10B981' },
  offerMessage: { fontSize: 15, color: '#475569', fontStyle: 'italic', marginVertical: 12 },
  acceptBtn: { backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  acceptText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  taskerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  taskerInfo: { flex: 1 },
  taskerName: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  taskerMeta: { fontSize: 14, color: '#64748B', marginTop: 4 },

  reqItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  reqText: { flex: 1, fontSize: 15, color: '#475569', lineHeight: 22 },
  placeholderText: { fontSize: 15, color: '#94A3B8', fontStyle: 'italic' },

  progressContainer: { gap: 12 },
  progressStep: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  progressDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  progressDotCompleted: { backgroundColor: '#10B981' },
  progressLabel: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  progressLabelCompleted: { color: '#10B981' },
  progressLine: { width: 3, height: 28, backgroundColor: '#E2E8F0', marginLeft: 14.5 },
  completionSuccess: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, marginTop: 16 },
  completionText: { fontSize: 18, fontWeight: '800', color: '#065F46' },

  safetyGrid: { gap: 16 },
  safetyItemRed: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 2, padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  safetyItemBlue: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 2, padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  safetyItemGreen: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 2, padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  safetyText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E293B' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  primaryActions: { gap: 12, marginBottom: 24 },
  primaryBtn: { flexDirection: 'row', backgroundColor: '#6366F1', paddingVertical: 18, borderRadius: 18, justifyContent: 'center', alignItems: 'center', gap: 12, shadowColor: '#6366F1', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  messageBtn: { backgroundColor: '#3B82F6', shadowColor: '#3B82F6' },
  completeBtn: { backgroundColor: '#10B981', shadowColor: '#10B981' },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },

  secondaryActions: { flexDirection: 'row', justifyContent: 'space-around' },
  secItem: { alignItems: 'center', gap: 8 },
  secLabel: { fontSize: 13, color: '#475569', fontWeight: '600' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginTop: 20 },
  emptySubtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', marginVertical: 12 },
  backBtn: { backgroundColor: '#6366F1', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, marginTop: 20 },
  backBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  taskerProfile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  taskerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  taskerBasicInfo: {
    flex: 1,
    marginLeft: 16,
  },
  taskerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },

  // Contact Information Styles
  contactInfoSection: {
    paddingTop: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '400',
    lineHeight: 20,
  },

  // Skills Styles
  skillsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  skillsLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  skillTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '500',
  },
  moreSkillsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  viewProfileText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

});

export default ServiceRequestDetailScreen;