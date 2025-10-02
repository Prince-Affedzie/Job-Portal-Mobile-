import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  Dimensions,
  Share,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMiniTaskInfo, applyToMiniTask, bidOnMiniTask } from '../../api/miniTaskApi';
import moment from 'moment'
import { BidModal } from '../../component/tasker/BidModal';
import { ScamAlertModal } from '../../component/tasker/ScamAlertModal';
const HANDYMAN_AVATAR = require('../../assets/HandyManAvatar.png');
import Header from "../../component/tasker/Header";
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { width } = Dimensions.get('window');



const TaskDetailsScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showScamAlert, setShowScamAlert] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [applyClicked, setApplyClicked] = useState(false);
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));

  const [bidData, setBidData] = useState({
    amount: "",
    message: "",
    timeline: ""
  });

  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        setLoading(true);
        const response = await getMiniTaskInfo(taskId);
        
        if (response.status === 200) {
          setTask(response.data);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }).start();
        } else {
          throw new Error('Failed to fetch task details');
        }
      } catch (error) {
        console.error('Error fetching task:', error);
        Alert.alert('Error', 'Failed to load task details');
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetails();
  }, [taskId]);

  const handleApplyOrBid = async () => {
    if (task?.biddingType === "open-bid") {
      setShowBidModal(true);
      return;
    }
    
    await handleFixedApplication();
  };

  const handleFixedApplication = async () => {
    setApplying(true);
    try {
      const response = await applyToMiniTask(taskId);
      if (response.status === 200) {
        setApplyClicked(true);
        Alert.alert('Success', "You've shown interest in this job! Stay Tuned — the client might reach out soon.");
      } else {
        Alert.alert('Error', 'An error occurred. Please try again later.');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        "An unexpected error occurred. Please try again.";
      Alert.alert('Error', errorMessage);
    } finally {
      setApplying(false);
    }
  };

  const submitBid = async () => {
    if (!bidData.amount || !bidData.timeline) {
      Alert.alert('Error', 'Please provide both amount and timeline for your bid');
      return;
    }

    setApplying(true);
    try {
      const response = await bidOnMiniTask(taskId, bidData);
      if (response.status === 200) {
        setApplyClicked(true);
        setShowBidModal(false);
        Alert.alert('Success', 'Your bid has been submitted successfully!');
      } else {
        Alert.alert('Error', 'An error occurred. Please try again later.');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        "An unexpected error occurred. Please try again.";
      Alert.alert('Error', errorMessage);
    } finally {
      setApplying(false);
    }
  };


  const getRequirements = () => {
    if (!task || !task.requirements || task.requirements.length === 0) {
      return [
        'Good communication skills',
        'Reliable and punctual',
        'Attention to detail',
        'Quality work delivery'
      ];
    }
    return task.requirements;
  };

  const getSkills = () => {
    if (!task || !task.skillsRequired || task.skillsRequired.length === 0) {
      const categorySkills = {
        'Creative Tasks': ['Creativity', 'Design Sense', 'Attention to Detail'],
        'Delivery & Errands': ['Punctuality', 'Reliability', 'Communication'],
        'Digital Services': ['Technical Skills', 'Problem Solving', 'Efficiency'],
        'Home Services': ['Handyman Skills', 'Reliability', 'Quality Work']
      };
      return categorySkills[task?.category] || ['Reliable', 'Professional', 'Skilled'];
    }
    return task.skillsRequired;
  };

  const handleContact = () => {
    const email = task?.employer?.email || 'contact@example.com';
    Linking.openURL(`mailto:${email}?subject=Regarding: ${task?.title}`);
  };

  const calculateTimeLeft = () => {
    if (!task?.deadline) return 'N/A';
    const now = new Date();
    const deadline = new Date(task.deadline);
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days left` : 'Expired';
  };

  const getButtonText = () => {
    if (applying) return "Processing...";
    if (applyClicked) return task?.biddingType === "open-bid" ? "Bid Sent!" : "Interest Sent!";
    if (task?.biddingType === "open-bid") return "Place a Bid";
    return "Show Interest";
  };

  if (loading) {
    return (
      <LoadingIndicator text='Loading task details...'/>
    );
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Task not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

 
  const requirements = getRequirements();
  const skills = getSkills();

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView 
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
         <Header title="Task Details" showBackButton={true} />
        {/* Header Images */}
        <View style={styles.imageContainer}>
      <View style={styles.avatarWrapper}>
        <Image
          source={HANDYMAN_AVATAR}
          style={styles.taskAvatar}
          resizeMode="contain"
        />
      </View>
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 16 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Title and Bidding Type */}
          <View style={styles.header}>
            <Text style={styles.title}>{task.title}</Text>
            {task.biddingType && (
              <View style={[
                styles.biddingTypeBadge,
                task.biddingType === "open-bid" ? styles.openBidBadge : styles.fixedBidBadge
              ]}>
                <Ionicons 
                  name={task.biddingType === "open-bid" ? "pricetags" : "lock-closed"} 
                  size={14} 
                  color={task.biddingType === "open-bid" ? "#1D4ED8" : "#059669"} 
                />
                <Text style={[
                  styles.biddingTypeText,
                  task.biddingType === "open-bid" ? styles.openBidText : styles.fixedBidText
                ]}>
                  {task.biddingType === "open-bid" ? "Open for Bids" : "Fixed Budget"}
                </Text>
              </View>
            )}
          </View>

          {/* Price and Status */}
          <View style={styles.priceStatusContainer}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.priceBadge}
            >
              <Text style={styles.price}>₵{task.budget}</Text>
            </LinearGradient>
            <View style={[
              styles.statusBadge,
              task.status?.toLowerCase() === 'active' ? styles.activeStatus : styles.inactiveStatus
            ]}>
              <Text style={styles.statusText}>{task.status || 'Active'}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
           {/* <View style={styles.stat}>
              <Ionicons name="eye" size={16} color="#64748B" />
              <Text style={styles.statText}>{task.views || 0} views</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="people" size={16} color="#64748B" />
              <Text style={styles.statText}>{task.applications || 0} applications</Text>
            </View>*/}
            <View style={styles.stat}>
              <Ionicons name="time" size={16} color="#64748B" />
              <Text style={styles.statText}>{calculateTimeLeft()}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{task.description}</Text>
          </View>

          {/* Requirements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What We're Looking For</Text>
            {requirements.map((req, index) => (
              <View key={index} style={styles.requirementItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))}
          </View>

          {/* Skills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended Skills</Text>
            <View style={styles.skillsContainer}>
              {skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationCard}>
              <Ionicons name="location" size={20} color="#6366F1" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>{task.locationType || 'Flexible Location'}</Text>
                <Text style={styles.addressText}>
                  {task.address ? `${task.address.region}, ${task.address.city}, ${task.address.suburb}` : 'Location details available after application'}
                </Text>
              </View>
            </View>
          </View>

          {/* Client Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Client</Text>
            <View style={styles.clientCard}>
              <View style={styles.clientHeader}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.avatarText}>
                    {task.employer?.name?.charAt(0) || 'C'}
                  </Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{task.employer?.name || 'Client'}</Text>
                  <View style={styles.rating}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingText}>{task.employer?.rating || '4.5'}</Text>
                    {task.employer?.isVerified && (
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" style={styles.verifiedIcon} />
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Safety Tips */}
          <View style={styles.section}>
            <View style={styles.safetyHeader}>
              <Text style={styles.sectionTitle}>Safety First</Text>
              <TouchableOpacity onPress={() => setShowScamAlert(true)}>
                <Text style={styles.learnMoreText}>Learn More</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.safetyCard}>
              <View style={styles.safetyContent}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
                <View style={styles.safetyTextContainer}>
                  <Text style={styles.safetyTitle}>Your Safety Is Our Priority</Text>
                  <Text style={styles.safetyText}>
                    Never pay any initial money or incentives to anyone. This platform does not require any upfront payments to secure tasks.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Fixed Apply Button */}
      <LinearGradient
        colors={['rgba(248, 250, 252, 0.95)', 'rgba(248, 250, 252, 1)']}
        style={[styles.footer, { paddingBottom: insets.bottom - 16 }]}
      >
        <View style={styles.footerContent}>
          <TouchableOpacity
            style={[styles.applyButton, (applying || applyClicked) && styles.applyButtonDisabled]}
            onPress={handleApplyOrBid}
            disabled={applying || applyClicked}
          >
            {applying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons 
                  name={applyClicked ? "checkmark-circle" : "hand-right"} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.applyText}>{getButtonText()}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Modals */}
      <ScamAlertModal 
        visible={showScamAlert} 
        onClose={() => setShowScamAlert(false)} 
      />
      
      <BidModal
        visible={showBidModal}
        onClose={() => setShowBidModal(false)}
        bidData={bidData}
        setBidData={setBidData}
        onSubmit={submitBid}
        isProcessing={applying}
      />
    </SafeAreaView>
  );
};


export const styles = StyleSheet.create({

 container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
 imageContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#1A1F3B', 
  borderRadius: 16,
  padding: 5,
  marginHorizontal:2,
  marginVertical: 2,
  marginTop:10,
},
avatarWrapper: {
  width: 250, 
  height: 250,
  borderRadius: 0,
  justifyContent: 'center',
  alignItems: 'center',
 
},
taskAvatar: {
  width: 200,
  height: 200,
  borderRadius: 10,
},
  backButton: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 12,
    lineHeight: 32,
  },
  priceBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  price: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 24,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    color: '#3730A3',
    fontSize: 12,
    fontWeight: '500',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  locationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#64748B',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 20,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
    marginRight: 8,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  clientStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  clientStat: {
    alignItems: 'center',
    flex: 1,
  },
  clientStatNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 2,
  },
  clientStatLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  contactText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 16,
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  // New styles for bidding and modals
  biddingTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  openBidBadge: {
    backgroundColor: '#DBEAFE',
  },
  fixedBidBadge: {
    backgroundColor: '#D1FAE5',
  },
  biddingTypeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  openBidText: {
    color: '#1D4ED8',
  },
  fixedBidText: {
    color: '#059669',
  },
  priceStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeStatus: {
    backgroundColor: '#D1FAE5',
  },
  inactiveStatus: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    
   
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 400,
    padding: 20,
    paddingBottom:10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    paddingTop:3,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  scamAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scamAlertContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  scamAlertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  scamAlertList: {
    marginBottom: 24,
  },
  scamAlertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scamAlertText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  scamAlertButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scamAlertButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  safetyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  learnMoreText: {
    color: '#6366F1',
    fontWeight: '500',
    fontSize: 14,
  },
  safetyCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  safetyContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  safetyTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  safetyText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
});

export default TaskDetailsScreen;