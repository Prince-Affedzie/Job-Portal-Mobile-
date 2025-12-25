import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Image,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  SafeAreaView,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
//import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Header from '../../component/tasker/Header';
import ReportForm from '../../component/common/reportForm';
import WorkSubmissionModal from '../../component/tasker/WorkSubmissionModal';
import ServiceRequestFundingNoticeCard from '../../component/tasker/ServiceRequestFundingNoticeCard';
import { AuthContext } from '../../context/AuthContext';
import { serviceRequestDetail, submitOffer, updateOffer, markServiceComplete } from '../../api/serviceRequestAPI/taskerAPI';
import { startOrGetChatRoom } from '../../api/chatApi';
import { navigate } from '../../services/navigationService';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import RatingModal from '../../component/common/RatingModal';
import { MediaDisplay } from '../../component/tasker/TaskMediaDisplay';

const { width,height } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const scale = (size) => (width / guidelineBaseWidth) * size;


const ServiceRequestDetailScreen = ({ route, navigation }) => {
  const { requestId } = route.params;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);

  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [editingOffer, setEditingOffer] = useState(null);

  const { user } = useContext(AuthContext);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      const response = await serviceRequestDetail(requestId);
      if (response.status === 200) {
        setRequest(response.data);
        if (response.data.budget && !offerAmount) {
          setOfferAmount(response.data.budget.toString());
        }
      } else {
        Alert.alert('Error', 'Service request not found');
        navigation.goBack();
      }
    } catch (error) {
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

  const handleMessageClient = async () => {
    try {
      const res = await startOrGetChatRoom({
        userId2: request.client?._id,
        jobId: requestId,
      });
      if (res.status === 200) {
        navigate('ChatWindow', { roomId: res.data._id });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const handleSubmitOffer = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    try {
      const offerData = {
        amount: parseFloat(offerAmount),
        message: offerMessage.trim() || undefined,
      };
      const res = editingOffer
        ? await updateOffer(requestId, editingOffer._id, offerData)
        : await submitOffer(requestId, offerData);

      if (res.status === 200 || res.status === 201) {
        Alert.alert('Success', editingOffer ? 'Offer updated!' : 'Offer submitted!');
        setShowOfferModal(false);
        setOfferAmount('');
        setOfferMessage('');
        setEditingOffer(null);
        loadRequestDetails();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit offer');
    }
  };

  const handleEditOffer = (offer) => {
    setEditingOffer(offer);
    setOfferAmount(offer.amount.toString());
    setOfferMessage(offer.message || '');
    setShowOfferModal(true);
  };

  const handleMarkAsDone = async () => {
    Alert.alert(
      "Mark as Done",
      "Are you sure you want to mark this service as completed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            const res = await markServiceComplete(requestId);
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

  const isAssignedToUser = request?.assignedTasker && String(request.assignedTasker) === String(user?._id);
  const userOffer = request?.offers?.find(o => String(o.tasker?._id) === String(user?._id));
  const hasUserOffered = !!userOffer;
  const isOfferAccepted = userOffer?.status === 'accepted';
  const isOfferPending = userOffer?.status === 'pending';
  const canSubmitOffer = !isAssignedToUser && !hasUserOffered && request?.status === 'Pending';
  const canEditOffer = hasUserOffered && isOfferPending;
  const isCompleted = request?.status?.toLowerCase() === 'completed';
  const canMarkAsDone = isAssignedToUser && !isCompleted && !request?.markedDoneByTasker;
  const canSubmitWork = isAssignedToUser && !isCompleted;
  const canViewSubmissions = isAssignedToUser && !isCompleted;
  const canMessageClient = isAssignedToUser || hasUserOffered;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Service Request" showBackButton />
        <LoadingIndicator text="Loading details..." />
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
          <Text style={styles.emptySubtitle}>This service request may no longer be available.</Text>
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
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <Text style={styles.title}>{request.type}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(request.status) }]} />
            <Text style={styles.statusText}>{request.status.replace('-', ' ')}</Text>
            {isAssignedToUser && <Text style={styles.assignedBadge}>• Assigned to You</Text>}
            {hasUserOffered && !isAssignedToUser && (
              <Text style={isOfferAccepted ? styles.acceptedBadge : styles.pendingBadge}>
                • Offer {isOfferAccepted ? 'Accepted' : 'Pending'}
              </Text>
            )}
            <Text style={styles.metaText}>• Posted {formatDate(request.createdAt)}</Text>
          </View>
        </View>

        {/* Offer Status Banner */}
        {hasUserOffered && !isAssignedToUser && (
          <View style={[styles.offerBanner, isOfferAccepted && styles.offerAcceptedBanner]}>
            <Ionicons
              name={isOfferAccepted ? "checkmark-circle" : "time-outline"}
              size={28}
              color={isOfferAccepted ? "#10B981" : "#F59E0B"}
            />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>
                {isOfferAccepted ? 'Offer Accepted!' : 'Offer Submitted'}
              </Text>
              <Text style={styles.bannerMessage}>
                {isOfferAccepted
                  ? 'You can now begin work on this service.'
                  : 'Waiting for client response.'}
              </Text>
            </View>
            {isOfferPending && (
              <TouchableOpacity style={styles.editBtn} onPress={() => handleEditOffer(userOffer)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Funding Notice */}
        <ServiceRequestFundingNoticeCard serviceRequest={request} isAssignedToUser={isAssignedToUser} />

        {/* Quick Info Grid - Fixed Overlap */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={28} color="#10B981" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Budget</Text>
              <Text style={styles.infoValue}>
                {request.budget ? `₵${request.budget}` : 'Flexible'}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={28} color="#F59E0B" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Preferred Date</Text>
              <Text style={styles.infoValue}>
                {request.preferredDate ? formatDate(request.preferredDate) : 'Flexible'}
              </Text>
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
              <Text style={styles.infoValue}>
                {request.urgency?.charAt(0).toUpperCase() + request.urgency?.slice(1) || 'Standard'}
              </Text>
            </View>
          </View>
        </View>

        {/* Horizontal Scrollable Tabs - Prevents Overlap */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollContainer}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
            </TouchableOpacity>

            {isAssignedToUser && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'client' && styles.activeTab]}
                onPress={() => setActiveTab('client')}
              >
                <Text style={[styles.tabText, activeTab === 'client' && styles.activeTabText]}>Client</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.tab, activeTab === 'requirements' && styles.activeTab]}
              onPress={() => setActiveTab('requirements')}
            >
              <Text style={[styles.tabText, activeTab === 'requirements' && styles.activeTabText]}>Requirements</Text>
            </TouchableOpacity>

            {hasUserOffered && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'offer' && styles.activeTab]}
                onPress={() => setActiveTab('offer')}
              >
                <Text style={[styles.tabText, activeTab === 'offer' && styles.activeTabText]}>Your Offer</Text>
              </TouchableOpacity>
            )}
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

          {activeTab === 'client' && isAssignedToUser && request.client && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Client Information</Text>
              <View style={styles.clientRow}>
                <View style={styles.avatar}>
                  {request.client.profileImage ? (
                    <Image source={{ uri: request.client.profileImage }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarInitial}>{request.client.name?.[0]?.toUpperCase() || 'C'}</Text>
                  )}
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{request.client.name}</Text>
                  <Text style={styles.clientName}>{request.client.phone}</Text>
                  <Text style={styles.clientMeta}>★ {request.client.rating?.toFixed(1) || 'New'}</Text>
                </View>
              </View>
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

          {activeTab === 'offer' && hasUserOffered && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Your Offer</Text>
              <View style={styles.offerCard}>
                <Text style={styles.offerLabel}>Amount</Text>
                <Text style={styles.offerAmount}>₵{userOffer.amount}</Text>
                {userOffer.message && (
                  <>
                    <Text style={styles.offerLabel}>Message</Text>
                    <Text style={styles.offerMessage}>"{userOffer.message}"</Text>
                  </>
                )}
                {isOfferPending && (
                  <TouchableOpacity style={styles.editLargeBtn} onPress={() => handleEditOffer(userOffer)}>
                    <Ionicons name="create-outline" size={18} color="#6366F1" />
                    <Text style={styles.editLargeText}>Edit Offer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Safety Guidelines */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Safety Guidelines</Text>
          <View style={styles.safetyGrid}>
            <View style={styles.safetyItemRed}>
              <Ionicons name="warning" size={24} color="#DC2626" />
              <Text style={styles.safetyText}>Never share personal financial info</Text>
            </View>
            <View style={styles.safetyItemBlue}>
              <Ionicons name="location" size={24} color="#2563EB" />
              <Text style={styles.safetyText}>Meet in public for onsite work</Text>
            </View>
            <View style={styles.safetyItemGreen}>
              <Ionicons name="chatbubble" size={24} color="#059669" />
              <Text style={styles.safetyText}>Keep communication on platform</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.primaryActions}>
          {canSubmitOffer && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowOfferModal(true)}>
              <Ionicons name="pricetag" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Submit Offer</Text>
            </TouchableOpacity>
          )}
          {canMessageClient && (
            <TouchableOpacity style={[styles.primaryBtn, styles.messageBtn]} onPress={handleMessageClient}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Message Client</Text>
            </TouchableOpacity>
          )}
          {canMarkAsDone && (
            <TouchableOpacity style={[styles.primaryBtn, styles.completeBtn]} onPress={handleMarkAsDone}>
              <Ionicons name="checkmark-done" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.secondaryActions}>
          {canSubmitWork && (
            <TouchableOpacity style={styles.secItem} onPress={() => setShowWorkModal(true)}>
              <Ionicons name="cloud-upload" size={24} color="#6366F1" />
              <Text style={styles.secLabel}>Submit Work</Text>
            </TouchableOpacity>
          )}
          {canViewSubmissions && (
            <TouchableOpacity style={styles.secItem} onPress={() => navigate('Submissions', { taskId: request._id })}>
              <Ionicons name="document-attach-outline" size={24} color="#6366F1" />
              <Text style={styles.secLabel}>Submissions</Text>
            </TouchableOpacity>
          )}
          {isAssignedToUser && (
            <TouchableOpacity style={styles.secItem} onPress={() => setShowReportModal(true)}>
              <Ionicons name="flag-outline" size={24} color="#EF4444" />
              <Text style={[styles.secLabel, { color: '#EF4444' }]}>Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

   

{/* Offer Modal */}
{/* Offer Modal - Responsive Version */}
<Modal
  visible={showOfferModal}
  animationType="fade"
  transparent={true}
  onRequestClose={() => {
    setShowOfferModal(false);
    setEditingOffer(null);
    setOfferAmount('');
    setOfferMessage('');
  }}
  statusBarTranslucent={true}
>
  <SafeAreaView style={styles.modalContainer}>
    <TouchableOpacity
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={() => {
        setShowOfferModal(false);
        setEditingOffer(null);
        setOfferAmount('');
        setOfferMessage('');
      }}
    />
    <KeyboardAvoidingView
      style={styles.modalKeyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({
        ios: 0,
        android: StatusBar.currentHeight ? StatusBar.currentHeight + scale(20) : scale(20),
      })}
    >
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleContainer}>
            <Ionicons name="pricetag-outline" size={scale(24)} color="#FFFFFF" />
            <Text style={styles.modalTitle}>
              {editingOffer ? 'Edit Your Offer' : 'Submit Offer'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setShowOfferModal(false);
              setEditingOffer(null);
              setOfferAmount('');
              setOfferMessage('');
            }}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={scale(24)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Scrollable Body */}
        <ScrollView
          style={styles.modalBody}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.modalBodyContent}
        >
          {/* Current Information */}
          {request && (
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={scale(20)} color="#6366F1" />
                <Text style={styles.infoTitle}>Service Request Info</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Service Type:</Text>
                <Text style={styles.infoValue}>{request.type}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Client Budget:</Text>
                <Text style={styles.infoValue}>
                  {request.budget ? `₵${request.budget}` : 'Flexible'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current Status:</Text>
                <Text style={styles.infoValue}>
                  {request.status?.replace('-', ' ') || 'Pending'}
                </Text>
              </View>
            </View>
          )}

          {/* Amount Input */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>
              Offer Amount (₵) <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.sectionSubtitle}>
              Enter your proposed amount for this service
            </Text>
            <View style={styles.inputContainer}>
              <View style={styles.amountInputWrapper}>
                <Text style={styles.currencySymbol}>₵</Text>
                <TextInput
                  style={styles.amountInput}
                  value={offerAmount}
                  onChangeText={(text) => setOfferAmount(text.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  autoFocus={!editingOffer}
                />
              </View>
              <Text style={styles.helperText}>
                Competitive offers are more likely to be accepted
              </Text>
            </View>
          </View>

          {/* Message Input */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Message to Client (Optional)</Text>
            <Text style={styles.sectionSubtitle}>
              Explain why you're the best fit for this service
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.messageInput}
                value={offerMessage}
                onChangeText={setOfferMessage}
                placeholder="Write a compelling message to the client..."
                placeholderTextColor="#9CA3AF"
                multiline={true}
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={500}
              />
              <View style={styles.charCounter}>
                <Text style={styles.hintText}>Optional - Max 500 characters</Text>
                <Text style={styles.charCount}>{offerMessage.length}/500</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setShowOfferModal(false);
              setEditingOffer(null);
              setOfferAmount('');
              setOfferMessage('');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!offerAmount || parseFloat(offerAmount) <= 0) && styles.buttonDisabled,
            ]}
            onPress={handleSubmitOffer}
            disabled={!offerAmount || parseFloat(offerAmount) <= 0}
          >
            <Text style={styles.submitButtonText}>
              {editingOffer ? 'Update Offer' : 'Submit Offer'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>
</Modal>
      <WorkSubmissionModal
        isVisible={showWorkModal}
        onClose={() => setShowWorkModal(false)}
        taskId={request._id}
        task={request}
        type="serviceRequest"
        onSubmissionSuccess={loadRequestDetails}
      />

      <ReportForm
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        task={request}
        onReportSubmitted={() => Alert.alert('Success', 'Report submitted')}
      />

      <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        userId={request.client?._id}
        userName={request.client?.name}
        userRole="client"
      />
    </SafeAreaView>
  );
};

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
  title: { fontSize: 21, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  assignedBadge: { fontSize: 14, color: '#10B981', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontWeight: '600' },
  acceptedBadge: { fontSize: 14, color: '#10B981', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontWeight: '600' },
  pendingBadge: { fontSize: 14, color: '#F59E0B', backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontWeight: '600' },
  metaText: { fontSize: 14, color: '#64748B' },

  offerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    gap: 16,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  offerAcceptedBanner: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#92400E', marginBottom: 4 },
  bannerMessage: { fontSize: 14, color: '#92400E' },
  editBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#6366F1', borderRadius: 12 },
  editBtnText: { color: '#FFF', fontWeight: '600' },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
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
  infoLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginTop: 4 },

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

  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarInitial: { color: '#FFF', fontSize: 28, fontWeight: '700' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  clientMeta: { fontSize: 14, color: '#64748B', marginTop: 4 },

  reqItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  reqText: { flex: 1, fontSize: 15, color: '#475569', lineHeight: 22 },
  placeholderText: { fontSize: 15, color: '#94A3B8', fontStyle: 'italic' },

  offerCard: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16 },
  offerLabel: { fontSize: 14, color: '#64748B', fontWeight: '600', marginBottom: 6 },
  offerAmount: { fontSize: 24, fontWeight: '900', color: '#10B981', marginBottom: 16 },
  offerMessage: { fontSize: 15, color: '#475569', fontStyle: 'italic', marginBottom: 20 },
  editLargeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  editLargeText: { fontSize: 16, color: '#6366F1', fontWeight: '600' },

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
  completeBtn: { backgroundColor: '#F59E0B', shadowColor: '#F59E0B' },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },

  secondaryActions: { flexDirection: 'row', justifyContent: 'space-around' },
  secItem: { alignItems: 'center', gap: 8 },
  secLabel: { fontSize: 13, color: '#475569', fontWeight: '600' },

    // Modal Styles
modalContainer: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},

modalOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
},

modalKeyboardContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: scale(16),
  width: '100%',
},

modalContent: {
  backgroundColor: '#FFFFFF',
  borderRadius: scale(16),
  width: Math.min(width * 0.9, scale(500)),
  maxHeight: height * 0.85,
  minHeight: scale(500),
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 10,
  elevation: 10,
},

modalHeader: {
  backgroundColor: '#6366F1',
  borderTopLeftRadius: scale(16),
  borderTopRightRadius: scale(16),
  paddingHorizontal: scale(20),
  paddingVertical: scale(16),
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

modalTitleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: scale(8),
},

modalTitle: {
  fontSize: scale(20),
  fontWeight: '700',
  color: '#FFFFFF',
},

modalCloseButton: {
  padding: scale(4),
},

modalBody: {
  flex: 1,
},

modalBodyContent: {
  paddingHorizontal: scale(20),
  paddingVertical: scale(20),
},

modalFooter: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  padding: scale(20),
  borderTopWidth: 1,
  borderTopColor: '#F1F5F9',
  gap: scale(12),
},

// Info Section
infoSection: {
  backgroundColor: '#F8FAFC',
  borderRadius: scale(12),
  padding: scale(16),
  marginBottom: scale(20),
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

infoHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: scale(12),
  gap: scale(8),
},

infoTitle: {
  fontSize: scale(16),
  fontWeight: '600',
  color: '#1F2937',
},

infoRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: scale(8),
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
},

infoLabel: {
  fontSize: scale(14),
  color: '#6B7280',
},

infoValue: {
  fontSize: scale(14),
  fontWeight: '600',
  color: '#1F2937',
},

// Form Sections
formSection: {
  marginBottom: scale(24),
},

sectionTitle: {
  fontSize: scale(16),
  fontWeight: '600',
  color: '#111827',
  marginBottom: scale(4),
},

sectionSubtitle: {
  fontSize: scale(14),
  color: '#6B7280',
  marginBottom: scale(12),
},

required: {
  color: '#EF4444',
},

inputContainer: {
  marginBottom: scale(8),
},

amountInputWrapper: {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#E5E7EB',
  borderRadius: scale(12),
  backgroundColor: '#FFFFFF',
  overflow: 'hidden',
},

currencySymbol: {
  fontSize: scale(18),
  fontWeight: '600',
  color: '#6366F1',
  paddingHorizontal: scale(16),
  paddingVertical: scale(14),
  backgroundColor: '#F8FAFC',
},

amountInput: {
  flex: 1,
  fontSize: scale(18),
  fontWeight: '600',
  color: '#1F2937',
  paddingHorizontal: scale(16),
  paddingVertical: scale(14),
},

messageInput: {
  borderWidth: 2,
  borderColor: '#E5E7EB',
  borderRadius: scale(12),
  paddingHorizontal: scale(16),
  paddingVertical: scale(12),
  fontSize: scale(16),
  backgroundColor: '#FFFFFF',
  minHeight: scale(120),
  textAlignVertical: 'top',
  color: '#111827',
},
helperText: {
  fontSize: scale(13),
  color: '#6B7280',
  marginTop: scale(6),
},

charCounter: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: scale(8),
},



charCount: {
  color: '#6B7280',
  fontSize: scale(14),
},


// Button Styles
cancelButton: {
  flex: 1,
  backgroundColor: '#FFFFFF',
  borderWidth: 2,
  borderColor: '#E5E7EB',
  paddingVertical: scale(16),
  borderRadius: scale(12),
  alignItems: 'center',
  justifyContent: 'center',
},

cancelButtonText: {
  color: '#374151',
  fontSize: scale(16),
  fontWeight: '600',
},

submitButton: {
  flex: 1,
  backgroundColor: '#6366F1',
  paddingVertical: scale(16),
  borderRadius: scale(12),
  alignItems: 'center',
  justifyContent: 'center',
},

submitButtonText: {
  color: '#FFFFFF',
  fontSize: scale(16),
  fontWeight: '600',
},

buttonDisabled: {
  opacity: 0.6,
},

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginTop: 20 },
  emptySubtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', marginVertical: 12 },
  backBtn: { backgroundColor: '#6366F1', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, marginTop: 20 },
  backBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default ServiceRequestDetailScreen;