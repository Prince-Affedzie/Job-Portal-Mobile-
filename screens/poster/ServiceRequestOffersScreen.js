// screens/tasker/ServiceRequestOffersScreen.js
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import { AuthContext } from '../../context/AuthContext';
import { ServiceRequestContext } from '../../context/ServiceRequestContext';
import { navigate } from '../../services/navigationService';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import { acceptOffer } from '../../api/serviceRequestAPI/clientAPI';
import { startOrGetChatRoom } from '../../api/chatApi';
import { triggerPayment } from '../../services/PaymentServices';
import { usePaystack } from "react-native-paystack-webview";

const { width, height } = Dimensions.get('window');

// Enhanced OfferCard Component with similar design to ApplicantCard
// Updated OfferCard component with larger profile image
// Updated OfferCard component with full-width profile image like ApplicantCard
const OfferCard = ({ offer, request, canAccept, hasAccepted, onAccept, onDecline, onMessage, onViewProfile, onViewDetails }) => {
  const { popup } = usePaystack();
  const { user } = useContext(AuthContext);
  
  const isPending = offer.status === 'pending';
  const isAccepted = offer.status === 'accepted';
  const isDeclined = offer.status === 'declined';
  
  const userData = offer.tasker;
  
  // Get badge color based on status and rating
  const getBadgeColor = () => {
    if (isAccepted) return '#10B981'; // Green for accepted
    if (isDeclined) return '#EF4444'; // Red for declined
    if (userData?.rating >= 4.5) return '#6366F1'; // Purple for high rating
    if (userData?.rating >= 3.5) return '#F59E0B'; // Orange for medium rating
    return '#6B7280'; // Gray for low/unknown rating
  };

  // Format experience
  const formatExperience = (exp) => {
    if (!exp) return 'New';
    if (exp < 1) return 'Beginner';
    if (exp <= 3) return `${exp} year${exp !== 1 ? 's' : ''} exp`;
    return `${exp}+ years`;
  };

  // Check if offer is within budget
  const isWithinBudget = request?.budget && offer.amount <= request.budget;

  // Format price comparison
  const getPriceComparison = () => {
    if (!request?.budget) return null;
    const difference = offer.amount - request.budget;
    if (difference <= 0) {
      return { text: `Within budget`, color: '#10B981', icon: 'checkmark-circle' };
    } else {
      return { text: `₵${Math.abs(difference)} over budget`, color: '#EF4444', icon: 'alert-circle' };
    }
  };

  const priceComparison = getPriceComparison();

  // Calculate response time
  const getResponseTime = () => {
    if (!offer.createdAt) return '';
    const createdAt = moment(offer.createdAt);
    const now = moment();
    const diffHours = now.diff(createdAt, 'hours');
    
    if (diffHours < 1) return `${now.diff(createdAt, 'minutes')} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) !== 1 ? 's' : ''} ago`;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.offerCard,
        isAccepted && styles.offerCardAccepted,
        isDeclined && styles.offerCardDeclined
      ]}
      onPress={() =>  navigate('ApplicantProfile', { applicant: userData})}
      activeOpacity={0.95}
    >
      {/* Top Section with Full-Width Image - EXACTLY like ApplicantCard */}
      <View style={styles.topSection}>
        <View style={styles.profileImageContainer}>
          {userData?.profileImage ? (
            <Image
              source={{ 
                uri: userData.profileImage || 'https://res.cloudinary.com/duv3qvvjz/image/upload/v1766495900/DefaultiImagePlaceHolder_r6ai4x.jpg'
              }}
              style={styles.profileImage}
            />
          ) : (
            <LinearGradient 
              colors={['#6366F1', '#8B5CF6']} 
              style={styles.profileImage}
            >
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileInitial}>
                  {userData?.name?.[0]?.toUpperCase() || 'T'}
                </Text>
              </View>
            </LinearGradient>
          )}
          
          {/* Verified Badge - Positioned exactly like ApplicantCard */}
          {userData?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </View>
          )}
          
          {/* Status Badge - Positioned like ApplicantCard */}
          {isAccepted && (
            <View style={styles.assignedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
          {isDeclined && (
            <View style={styles.declinedBadge}>
              <Ionicons name="close" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Rating and Amount Badge - Overlay on top of image like ApplicantCard */}
        <View style={styles.ratingBadge}>
          <View style={styles.ratingStars}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {(userData?.rating || 0).toFixed(1)}
            </Text>
            {userData?.completedTasks > 0 && (
              <Text style={styles.ratingCount}>({userData.completedTasks})</Text>
            )}
          </View>
          
          {/* Amount Badge - Similar to Score Badge in ApplicantCard */}
          <View style={[styles.scoreBadge, { backgroundColor: getBadgeColor() }]}>
            <Text style={styles.scoreText}>₵{offer.amount}</Text>
            <Text style={styles.scoreLabel}>Offer</Text>
          </View>
        </View>
      </View>

      {/* Offer Details Section - Same structure as ApplicantCard */}
      <View style={styles.detailsSection}>
        <View style={styles.nameAndPrice}>
          <View style={styles.nameContainer}>
            <Text style={styles.userName} numberOfLines={1}>
              {userData?.name || 'Professional Tasker'}
            </Text>
            {userData?.isPro && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          
          {/* Price Comparison */}
          {priceComparison && (
            <Text style={[
              styles.budgetText, 
              { color: priceComparison.color }
            ]}>
              {priceComparison.text}
            </Text>
          )}
        </View>

        {/* Primary Skill */}
        <View style={styles.skillBadge}>
          <Ionicons name="briefcase-outline" size={14} color="#6366F1" />
          <Text style={styles.skillText} numberOfLines={1}>
            {userData?.skills?.[0] || 'Skilled Professional'}
          </Text>
        </View>

        {/* Experience & Location */}
        <View style={styles.statsRow}>
          {userData?.experience > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="trophy-outline" size={14} color="#F59E0B" />
              <Text style={styles.statText}>
                {formatExperience(userData.experience)}
              </Text>
            </View>
          )}
          
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text style={styles.statText}>
              {userData?.location?.city || 'Available Nationwide'}
            </Text>
          </View>
        </View>

        {/* Offer Message */}
        {offer.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText} numberOfLines={2}>
              "{offer.message}"
            </Text>
          </View>
        )}

        {/* Performance Stats */}
        <View style={styles.performanceStats}>
          {userData?.completedTasks > 0 && (
            <View style={styles.performanceItem}>
              <Ionicons name="checkmark-done" size={14} color="#10B981" />
              <Text style={styles.performanceText}>{userData.completedTasks} jobs</Text>
            </View>
          )}
          
          {userData?.onTimeRate && (
            <View style={styles.performanceItem}>
              <Ionicons name="time-outline" size={14} color="#6366F1" />
              <Text style={styles.performanceText}>{userData.onTimeRate}% on time</Text>
            </View>
          )}
          
          <View style={styles.performanceItem}>
            <Ionicons name="timer-outline" size={14} color="#F59E0B" />
            <Text style={styles.performanceText}>{getResponseTime()}</Text>
          </View>
        </View>

        {/* Action Buttons - Exactly like ApplicantCard */}
        <View style={styles.actionButtons}>
          {/* Message Button - Always Visible */}
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={() => onMessage(offer.tasker)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6366F1" />
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>

          {/* Decline/Accept Buttons */}
          {isPending && canAccept && !hasAccepted ? (
            <>
              <TouchableOpacity 
                style={[styles.assignButton, !canAccept && styles.disabledButton]}
                onPress={() => onAccept(offer)}
              >
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.assignButtonText}>
                  Accept Offer
                </Text>
              </TouchableOpacity>
            </>
          ) : isAccepted ? (
            <View style={styles.assignedButton}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.assignedButtonText}>
                Accepted
              </Text>
            </View>
          ) : isDeclined ? (
            <View style={styles.assignedButton} >
              <Ionicons name="close-circle" size={16} color="#EF4444" />
              <Text style={styles.assignedButtonText}>
                Declined
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};
// Helper Components
const FilterChip = ({ label, count, active, onPress }) => (
  <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>
      {label} ({count})
    </Text>
  </TouchableOpacity>
);

const SortChip = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.sortChip, active && styles.sortChipActive]} onPress={onPress}>
    <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{label}</Text>
    {active && <Ionicons name="checkmark" size={14} color="#6366F1" />}
  </TouchableOpacity>
);

const ActionButton = ({ icon, title, color, bg = null, onPress }) => (
  <TouchableOpacity style={[styles.modalBtn, bg && { backgroundColor: bg }]} onPress={onPress}>
    <Ionicons name={icon} size={22} color={color} />
    <View>
      <Text style={[styles.modalBtnTitle, { color }]}>{title}</Text>
    </View>
  </TouchableOpacity>
);

// Negotiation Info Banner Component
const NegotiationInfoBanner = () => (
  <View style={styles.negotiationBanner}>
    <View style={styles.negotiationIcon}>
      <Ionicons name="chatbubble-ellipses" size={20} color="#6366F1" />
    </View>
    <View style={styles.negotiationTextContainer}>
      <Text style={styles.negotiationTitle}>Want to negotiate the offer?</Text>
      <Text style={styles.negotiationSubtitle}>
        Message the tasker directly to discuss pricing, timeline, or any other details
      </Text>
    </View>
    <Ionicons name="information-circle" size={20} color="#6366F1" />
  </View>
);

// Payment Flexibility Banner Component
const PaymentFlexibilityBanner = () => (
  <View style={styles.paymentFlexibilityBanner}>
    <View style={styles.paymentFlexibilityIcon}>
      <Ionicons name="card-outline" size={20} color="#10B981" />
    </View>
    <View style={styles.paymentFlexibilityTextContainer}>
      <Text style={styles.paymentFlexibilityTitle}>Payment Flexibility Available</Text>
      <Text style={styles.paymentFlexibilitySubtitle}>
        Can't pay the full amount? Contact support for payment plan options
      </Text>
    </View>
    <Ionicons name="information-circle" size={20} color="#10B981" />
  </View>
);

const ServiceRequestOffersScreen = ({ route, navigation }) => {
  const { requestId, offers: initialOffers, request } = route.params;
  const [offers, setOffers] = useState(initialOffers || []);
  const [loading, setLoading] = useState(!initialOffers);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { popup } = usePaystack();

  const { user } = useContext(AuthContext);
  const { getServiceRequestDetails, declineOffer } = useContext(ServiceRequestContext);

  // Load offers on mount if not provided
  useEffect(() => {
    if (!initialOffers) loadOffers();
  }, [requestId]);

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getServiceRequestDetails(requestId);
      if (response.status === 200) {
        setOffers(response.data.offers || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load offers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId, getServiceRequestDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOffers();
  }, [loadOffers]);

  // Process full payment for offer acceptance
  const processFullPayment = async (offer) => {
    const paymentSuccess = await triggerPayment({
      popup,
      email: user.email,
      phone: user.phone,
      amount: offer.amount,
      taskId: requestId,
      beneficiary: offer.tasker._id,
    });

    if (!paymentSuccess) {
      Alert.alert("Payment Failed", "Offer not accepted.");
      return;
    }

    try {
      const res = await acceptOffer(requestId, offer._id);
      if (res.status === 200) {
        Alert.alert("Success", "Offer accepted!");
        setActionModalVisible(false);
        loadOffers();
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to accept offer");
    }
  };
  
  // Accept Offer with Payment Flexibility
  const handleAcceptOffer = useCallback(async (offer) => {
    Alert.alert(
      "Accept Offer",
      `Accept ${offer.tasker?.name || 'tasker'}'s offer of ₵${offer.amount}?
      \nYour payment of ₵${offer.amount} will be securely held in escrow and only released to ${offer.tasker?.name || 'the tasker'}
once you both confirm the task is completed satisfactorily.`,
      [
        { text: "Cancel", style: "cancel" },
        /*{
          text: "Can't Pay In Full?",
          onPress: () => handleCantPayFull(offer)
        },*/
        {
          text: "Yes, Pay Full Amount",
          onPress: () => processFullPayment(offer)
        },
      ]
    );
  }, [user, requestId, popup, navigation, loadOffers]);

  // Handle "can't pay full" scenario
  const handleCantPayFull = (offer) => {
    Alert.alert(
      "Need Payment Assistance?",
      `Our support team can help you arrange a partial payment plan with ${offer.tasker?.name}.\n\nWe'll contact the tasker on your behalf and if they agree, you can pay 50% now and 50% later.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Contact Support", 
          onPress: () => contactSupportForPaymentPlan(offer)
        }
      ]
    );
  };

  // Contact support for payment plan
  const contactSupportForPaymentPlan = (offer) => {
    const supportMessage = `Hello, I need help with a payment plan for service request "${request?.type}".\n\nRequestId: ${request?._id}\nTasker: ${offer.tasker?.name}\nOffer Amount: ₵${offer.amount}\nI'd like to pay 50% now and 50% later.\n\nPlease contact the tasker on my behalf.`;

    Alert.alert(
      "Contact Support",
      "Choose how you'd like to contact our support team:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Call Support", 
          onPress: () => callSupport(supportMessage)
        },
        { 
          text: "WhatsApp Support", 
          onPress: () => whatsAppSupport(supportMessage)
        },
        { 
          text: "Email Support", 
          onPress: () => emailSupport(supportMessage)
        }
      ]
    );
  };

  // Support contact methods
  const callSupport = (message) => {
    Alert.alert(
      "Call Support",
      "Call our support team at +233505671577 to discuss your payment plan.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Call Now", 
          onPress: () => Linking.openURL('tel:+233505671577')
        }
      ]
    );
  };

  const whatsAppSupport = (message) => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/233505671577?text=${encodedMessage}`;
    
    Alert.alert(
      "WhatsApp Support",
      "Open WhatsApp to message our support team about your payment plan?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Open WhatsApp", 
          onPress: () => Linking.openURL(whatsappUrl)
        }
      ]
    );
  };

  const emailSupport = (message) => {
    const emailUrl = `mailto:workaflow726@gmail.com?subject=Payment Plan Request - Service: ${request?.type}&body=${encodeURIComponent(message)}`;
    
    Alert.alert(
      "Email Support",
      "Send an email to our support team about your payment plan?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Send Email", 
          onPress: () => Linking.openURL(emailUrl)
        }
      ]
    );
  };

  const handleDeclineOffer = useCallback(async (offer) => {
    Alert.alert(
      "Decline Offer",
      `Decline ${offer.tasker?.name}'s offer?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await declineOffer(requestId, offer._id);
              if (res.status === 200) {
                Alert.alert("Declined", "Offer declined.");
                setActionModalVisible(false);
                loadOffers();
              }
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to decline");
            }
          }
        }
      ]
    );
  }, [requestId, loadOffers]);

  const openChat = useCallback(async (tasker) => {
    try {
      const res = await startOrGetChatRoom({ userId2: tasker._id, jobId: requestId });
      if (res.status === 200) {
        navigate('ChatWindow', { roomId: res.data._id });
      }
    } catch {
      Alert.alert('Error', 'Could not start chat');
    }
  }, [requestId]);

  const handleOfferAction = (offer) => {
    setSelectedOffer(offer);
    setActionModalVisible(true);
  };

  // Filter & Sort Logic
  const filteredAndSortedOffers = useMemo(() => {
    let filtered = offers;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(o => o.status === filter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.tasker?.name?.toLowerCase().includes(q) ||
        o.message?.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price_low': return a.amount - b.amount;
        case 'price_high': return b.amount - a.amount;
        case 'rating': return (b.tasker?.rating || 0) - (a.tasker?.rating || 0);
        default: return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
  }, [offers, filter, searchQuery, sortBy]);

  const offerCounts = useMemo(() => ({
    all: offers.length,
    pending: offers.filter(o => o.status === 'pending').length,
    accepted: offers.filter(o => o.status === 'accepted').length,
    declined: offers.filter(o => o.status === 'declined').length,
  }), [offers]);

  const hasAccepted = offers.some(o => o.status === 'accepted');
  const canAccept = ['Pending', 'Quoted'].includes(request?.status);

  // List Header
  const ListHeader = () => (
    <View>
      {/* Summary Card */}
      <LinearGradient colors={['#1A1F3B', '#2D1B69']} style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <Text style={styles.summaryTitle} numberOfLines={2}>{request?.type}</Text>
          <View style={styles.offerCount}>
            <Text style={styles.offerCountText}>{offers.length}</Text>
          </View>
        </View>
        <Text style={styles.summaryDesc} numberOfLines={2}>{request?.description}</Text>
        <View style={styles.summaryMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={14} color="#E0E7FF" />
            <Text style={styles.metaText}>Budget: ₵{request?.budget || 'Flexible'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="pricetags-outline" size={14} color="#E0E7FF" />
            <Text style={styles.metaText}>{offers.length} Offers</Text>
          </View>
          {hasAccepted && (
            <View style={styles.metaItem}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.metaText}>Offer Accepted</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Payment Flexibility Banner 
      {offers.length > 0 && (
        <PaymentFlexibilityBanner />
      )}*/}

      {/* Search & Filter */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color="#6366F1" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search taskers or messages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={20} color={showFilters ? '#FFF' : '#6366F1'} />
          {(filter !== 'all' || sortBy !== 'newest') && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>Filters & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            {['all', 'pending', 'accepted', 'declined'].map(status => (
              <FilterChip
                key={status}
                label={status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                count={offerCounts[status]}
                active={filter === status}
                onPress={() => setFilter(status)}
              />
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Sort By</Text>
          <View style={styles.sortGrid}>
            {[
              { label: 'Newest', value: 'newest' },
              { label: 'Price: Low', value: 'price_low' },
              { label: 'Price: High', value: 'price_high' },
              { label: 'Rating', value: 'rating' },
            ].map(item => (
              <SortChip
                key={item.value}
                {...item}
                active={sortBy === item.value}
                onPress={() => setSortBy(item.value)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredAndSortedOffers.length} {filteredAndSortedOffers.length === 1 ? 'Offer' : 'Offers'}
        </Text>
        {(filter !== 'all' || searchQuery || sortBy !== 'newest') && (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setFilter('all');
              setSearchQuery('');
              setSortBy('newest');
            }}
          >
            <Ionicons name="refresh" size={14} color="#6366F1" />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Empty State Component
  const EmptyState = () => (
    <View style={styles.empty}>
      <Ionicons name="chatbubble-ellipses-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>
        {offers.length === 0 ? 'No Offers Yet' : 'No Matching Offers'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {offers.length === 0
          ? 'Taskers will submit offers soon. Check back later.'
          : 'Try adjusting filters or search.'}
      </Text>
      
      {/* Add negotiation info to empty state */}
      {offers.length === 0 && (
        <View style={styles.emptyNegotiationInfo}>
          <Text style={styles.emptyNegotiationTitle}>Pro Tip:</Text>
          <Text style={styles.emptyNegotiationText}>
            When offers come in, you can message taskers directly to negotiate pricing or discuss details before accepting.
          </Text>
        </View>
      )}
    </View>
  );

  // Action Modal with Payment Flexibility
  const ActionModal = () => (
    <Modal visible={actionModalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Offer Details</Text>
            <TouchableOpacity onPress={() => setActionModalVisible(false)}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>

          {selectedOffer && (
            <View style={styles.modalBody}>
              <View style={styles.modalSummary}>
                <Text style={styles.modalAmount}>₵{selectedOffer.amount}</Text>
                <Text style={styles.modalTasker}>by {selectedOffer.tasker?.name}</Text>
                {selectedOffer.message && (
                  <Text style={styles.modalMessage}>"{selectedOffer.message}"</Text>
                )}
                
                {/* Payment flexibility reminder */}
                <View style={styles.paymentFlexibilityModalTip}>
                  <Ionicons name="card-outline" size={16} color="#10B981" />
                  <Text style={styles.paymentFlexibilityModalText}>
                    Can't pay full amount? Contact support for payment plan options
                  </Text>
                </View>
              </View>

              <View style={styles.modalButtons}>
                {selectedOffer.status === 'pending' && canAccept && !hasAccepted && (
                  <>
                    <ActionButton
                      icon="checkmark-circle"
                      title="Pay Full Amount"
                      color="#10B981"
                      onPress={() => handleAcceptOffer(selectedOffer)}
                    />
                    <ActionButton
                      icon="close-circle"
                      title="Decline"
                      color="#EF4444"
                      onPress={() => handleDeclineOffer(selectedOffer)}
                    />
                  </>
                )}
                <ActionButton
                  icon="chatbubble-ellipses"
                  title="Message Tasker"
                  color="#3B82F6"
                  bg="#EFF6FF"
                  onPress={() => openChat(selectedOffer.tasker)}
                />
                <ActionButton
                  icon="card-outline"
                  title="Payment Plan Help"
                  color="#10B981"
                  bg="#F0FDF4"
                  onPress={() => {
                    setActionModalVisible(false);
                    handleCantPayFull(selectedOffer);
                  }}
                />
                <ActionButton
                  icon="person-circle"
                  title="View Profile"
                  color="#6366F1"
                  bg="#F8FAFC"
                  onPress={() => {
                    setActionModalVisible(false);
                    navigate('ApplicantProfile', { applicant: selectedOffer.tasker, requestId });
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Offers" showBackButton />
        <LoadingIndicator text="Loading offers..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Service Offers" showBackButton />

      <FlatList
        data={filteredAndSortedOffers}
        renderItem={({ item }) => (
          <OfferCard
            offer={item}
            request={request}
            canAccept={canAccept}
            hasAccepted={hasAccepted}
            onAccept={handleAcceptOffer}
            onDecline={handleDeclineOffer}
            onMessage={openChat}
            onViewProfile={(tasker) => navigate('ApplicantProfile', { applicant: tasker, requestId })}
            onViewDetails={handleOfferAction}
          />
        )}
        keyExtractor={item => item._id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState />}
      />

      {/* Action Modal */}
      <ActionModal />
    </SafeAreaView>
  );
};

// Styles - Matching ApplicantCard design
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  listContent: { paddingBottom: 24 },
  
  // Summary Card
  summaryCard: { margin: 16, padding: 20, borderRadius: 20, elevation: 6 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryTitle: { fontSize: 19, fontWeight: '800', color: '#FFF', flex: 1, marginRight: 12 },
  offerCount: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  offerCountText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  summaryDesc: { color: '#E0E7FF', marginVertical: 12, fontSize: 14, lineHeight: 20 },
  summaryMeta: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#E0E7FF', fontSize: 13, fontWeight: '500' },

  // Payment Flexibility Banner
  paymentFlexibilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    gap: 12,
  },
  paymentFlexibilityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentFlexibilityTextContainer: {
    flex: 1,
  },
  paymentFlexibilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 2,
  },
  paymentFlexibilitySubtitle: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 16,
  },

  // Offer Card Styles (Matching ApplicantCard)
   offerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
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
  offerCardAccepted: {
    borderColor: '#10B981',
    borderWidth: 1.5,
  },
  offerCardDeclined: {
    borderColor: '#EF4444',
    borderWidth: 1,
    opacity: 0.8,
  },
  
  // Top Section - EXACTLY like ApplicantCard
  topSection: {
    position: 'relative',
    height: 140, // Same height as ApplicantCard
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  
  profileImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  
  profileImage: {
    width: '100%',
    height: '130%',
    resizeMode: 'cover',
  },
  
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '700',
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
  
  declinedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
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
  
  // Details Section - EXACTLY like ApplicantCard
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
  
  // Action Buttons - EXACTLY like ApplicantCard
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
  // Search & Filter Styles
  searchBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 12 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, marginLeft: 8, color: '#1F2937' },
  filterBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  filterBtnActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  filterDot: { position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  
  // Filters Panel
  filtersPanel: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 16, elevation: 4 },
  filtersHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  filtersTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10, marginTop: 8 },
  chipsRow: { marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
  chipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  chipText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  chipTextActive: { color: '#FFF' },
  sortGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', flex: 1, minWidth: 100 },
  sortChipActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  sortChipText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  sortChipTextActive: { color: '#6366F1', fontWeight: '600' },
  
  // Results Bar
  resultsBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  resultsText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetText: { color: '#6366F1', fontSize: 13, fontWeight: '600' },
  
  // Empty State
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#64748B', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  
  // Empty State Negotiation Info
  emptyNegotiationInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#0EA5E9',
  },
  emptyNegotiationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 4,
  },
  emptyNegotiationText: {
    fontSize: 13,
    color: '#0C4A6E',
    lineHeight: 18,
  },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 19, fontWeight: '700', color: '#FFF' },
  modalBody: { padding: 24 },
  modalSummary: { alignItems: 'center', backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16, marginBottom: 20 },
  modalAmount: { fontSize: 30, fontWeight: '700', color: '#10B981' },
  modalTasker: { fontSize: 16, color: '#64748B', marginTop: 4, fontWeight: '500' },
  modalMessage: { fontSize: 15, color: '#475569', fontStyle: 'italic', marginTop: 12, textAlign: 'center', lineHeight: 22 },
  
  // Payment Flexibility Modal Tip
  paymentFlexibilityModalTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  paymentFlexibilityModalText: {
    fontSize: 13,
    color: '#065F46',
    flex: 1,
    fontWeight: '500',
    lineHeight: 18,
  },
  
  modalButtons: { gap: 12 },
  modalBtn: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, gap: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
  modalBtnTitle: { fontSize: 16, fontWeight: '600' },
});

export default ServiceRequestOffersScreen;