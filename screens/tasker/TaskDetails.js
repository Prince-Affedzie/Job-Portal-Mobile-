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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMiniTaskInfo, applyToMiniTask, bidOnMiniTask } from '../../api/miniTaskApi';
import moment from 'moment';
import { BidModal } from '../../component/tasker/BidModal';
import { ScamAlertModal } from '../../component/tasker/ScamAlertModal';
const HANDYMAN_AVATAR = require('../../assets/HandyManAvatar.png');
import Header from '../../component/tasker/Header';
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { width } = Dimensions.get('window');

const TaskDetailsScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showScamAlert, setShowScamAlert] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [applyClicked, setApplyClicked] = useState(false);
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));

  const [bidData, setBidData] = useState({
    amount: '',
    message: '',
    timeline: '',
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
    if (task?.biddingType === 'open-bid') {
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
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'An unexpected error occurred. Please try again.';
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
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'An unexpected error occurred. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setApplying(false);
    }
  };

  const getRequirements = () => {
    if (!task || !task.requirements || task.requirements.length === 0) {
      return ['Good communication skills', 'Reliable and punctual', 'Attention to detail', 'Quality work delivery'];
    }
    return task.requirements;
  };

  const getSkills = () => {
    if (!task || !task.skillsRequired || task.skillsRequired.length === 0) {
      const categorySkills = {
        'Creative Tasks': ['Creativity', 'Design Sense', 'Attention to Detail'],
        'Delivery & Errands': ['Punctuality', 'Reliability', 'Communication'],
        'Digital Services': ['Technical Skills', 'Problem Solving', 'Efficiency'],
        'Home Services': ['Handyman Skills', 'Reliability', 'Quality Work'],
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
    if (applying) return 'Processing...';
    if (applyClicked) return task?.biddingType === 'open-bid' ? 'Bid Sent!' : 'Interest Sent!';
    if (task?.biddingType === 'open-bid') return 'Place a Bid';
    return 'Show Interest';
  };

  if (loading) {
    return <LoadingIndicator text="Loading task details..." />;
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
       <Header title="Task Details" showBackButton={true} />
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
       
        
        {/* Hero Section */}
        <LinearGradient colors={['#1A1F3B', '#2D1B69']} style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View style={styles.avatarContainer}>
              <Image source={HANDYMAN_AVATAR} style={styles.taskAvatar} resizeMode="contain" />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>{task.title}</Text>
              <View style={styles.heroBadges}>
                <View style={styles.budgetBadge}>
                  <Ionicons name="cash" size={16} color="#FFFFFF" />
                  <Text style={styles.budgetText}>₵{task.budget}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  task.status?.toLowerCase() === 'active' ? styles.activeStatus : styles.inactiveStatus
                ]}>
                  <Text style={styles.statusText}>{task.status || 'Active'}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Task Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={18} color="#6366F1" />
              <Text style={styles.metaText}>{calculateTimeLeft()}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name={task.biddingType === 'open-bid' ? 'pricetags-outline' : 'lock-closed-outline'} 
                       size={18} color="#6366F1" />
              <Text style={styles.metaText}>
                {task.biddingType === 'open-bid' ? 'Open for Bids' : 'Fixed Budget'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.description}>{task.description}</Text>
          </View>

          {/* Requirements */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>What We're Looking For</Text>
            </View>
            <View style={styles.requirementsList}>
              {requirements.map((req, index) => (
                <View key={index} style={styles.requirementItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={styles.requirementText}>{req}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Skills */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="build-outline" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>Recommended Skills</Text>
            </View>
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
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>Location</Text>
            </View>
            <View style={styles.locationCard}>
              <Ionicons name="location" size={24} color="#6366F1" style={styles.locationIcon} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationType}>{task.locationType || 'Flexible Location'}</Text>
                <Text style={styles.addressText}>
                  {task.address
                    ? `${task.address.region}, ${task.address.city}, ${task.address.suburb}`
                    : 'Location details available after application'}
                </Text>
              </View>
            </View>
          </View>

          {/* Client Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>About the Client</Text>
            </View>
            <View style={styles.clientCard}>
              <View style={styles.clientHeader}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.avatarText}>{task.employer?.name?.charAt(0) || 'C'}</Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{task.employer?.name || 'Client'}</Text>
                  <View style={styles.clientMeta}>
                    <View style={styles.rating}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.ratingText}>Rating: {task.employer.rating}</Text>
                    </View>
                    {task.employer?.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Safety Tips */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>Safety First</Text>
            </View>
            <View style={styles.safetyCard}>
              <View style={styles.safetyHeader}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
                <View style={styles.safetyTextContainer}>
                  <Text style={styles.safetyTitle}>Your Safety Is Our Priority</Text>
                  <Text style={styles.safetyText}>
                    Never pay any initial money or incentives to anyone. This platform does not require any upfront payments to secure tasks.
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.learnMoreButton}
                onPress={() => setShowScamAlert(true)}
              >
                <Text style={styles.learnMoreText}>Learn More About Safety</Text>
                <Ionicons name="chevron-forward" size={16} color="#6366F1" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Fixed Apply Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.applyButton,
            (applying || applyClicked) && styles.applyButtonDisabled
          ]}
          onPress={handleApplyOrBid}
          disabled={applying || applyClicked}
        >
          {applying ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons 
                name={applyClicked ? 'checkmark-circle' : 
                      task?.biddingType === 'open-bid' ? 'pricetag' : 'hand-right'} 
                size={22} 
                color="#FFFFFF" 
              />
              <Text style={styles.applyText}>{getButtonText()}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <ScamAlertModal visible={showScamAlert} onClose={() => setShowScamAlert(false)} />
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
  scrollContent: {
    paddingBottom: 100,
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
  
  // Hero Section
  heroSection: {
    padding: 24,
    marginHorizontal:12,
    borderRadius: 24,
    
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  taskAvatar: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 32,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  budgetText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeStatus: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  inactiveStatus: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Content
  content: {
    padding: 20,
  },
  metaContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  description: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 24,
  },

  // Requirements
  requirementsList: {
    gap: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  requirementText: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
    lineHeight: 20,
  },

  // Skills
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skillText: {
    color: '#3730A3',
    fontSize: 14,
    fontWeight: '500',
  },

  // Location
  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  locationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  locationInfo: {
    flex: 1,
  },
  locationType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },

  // Client
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  clientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#64748B',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },

  // Safety
  safetyCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  safetyTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 6,
  },
  safetyText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  learnMoreText: {
    color: '#6366F1',
    fontWeight: '500',
    fontSize: 14,
  },

  // Footer/Apply Button
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  applyButtonDisabled: {
    opacity: 0.7,
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
});

export default TaskDetailsScreen;