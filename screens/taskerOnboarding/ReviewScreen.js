import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { navigate } from '../../services/navigationService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const ReviewScreen = () => {
  const { 
    bio,
    phone,
    location,
    skills,
    profileImage,
    submitOnboarding
  } = useTaskerOnboarding();
  
  const [activeTab, setActiveTab] = useState(0);
  const [localSubmitting, setLocalSubmitting] = useState(false);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const tabs = [
    { key: 'overview', title: 'Overview', icon: 'analytics-outline', gradient: ['#667eea', '#764ba2'] },
    { key: 'profile', title: 'Profile', icon: 'person-outline', gradient: ['#f093fb', '#f5576c'] },
    { key: 'skills', title: 'Skills', icon: 'construct-outline', gradient: ['#4facfe', '#00f2fe'] },
    { key: 'preview', title: 'Preview', icon: 'eye-outline', gradient: ['#43e97b', '#38f9d7'] },
  ];

  const completeness = getCompleteness();

  useEffect(() => {
    // Animate progress circle on mount
    Animated.spring(progressAnim, {
      toValue: completeness / 100,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [completeness]);

  useEffect(() => {
    // Animate tab indicator
    Animated.spring(tabIndicatorAnim, {
      toValue: activeTab,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [activeTab]);

  function getCompleteness() {
    let completed = 0;
    if (bio?.trim()) completed++;
    if (phone?.trim()) completed++;
    if (location.region && location.city) completed++;
    if (skills.length > 0) completed++;
    if (profileImage?.uri) completed++;
    return Math.round((completed / 5) * 100);
  }

  const handleTabChange = (newTab) => {
    if (newTab === activeTab) return;
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: newTab > activeTab ? -20 : 20,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveTab(newTab);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleSubmit = async () => {
    if (completeness < 100) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete all sections before launching your profile.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setLocalSubmitting(true);
    try {
      await submitOnboarding();
      Alert.alert(
        '🎉 Welcome!',
        'Your profile is now live and ready to attract clients!',
        [
          { 
            text: 'Start Earning', 
            onPress: () => navigate('TaskerStack', { screen: 'AvailableTab' }),
            style: 'default'
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Oops!',
        'Something went wrong. Please check your connection and try again.',
        [{ text: 'Try Again', style: 'default' }]
      );
    } finally {
      setLocalSubmitting(false);
    }
  };

  const renderTabContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 0:
          return <OverviewTab completeness={completeness} />;
        case 1:
          return <ProfileTab bio={bio} phone={phone} location={location} profileImage={profileImage} />;
        case 2:
          return <SkillsTab skills={skills} />;
        case 3:
          return <PreviewTab bio={bio} location={location} skills={skills} profileImage={profileImage} />;
        default:
          return null;
      }
    })();

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
          flex: 1, // FIX: Added flex: 1
        }}
      >
        {content}
      </Animated.View>
    );
  };

  const indicatorWidth = width / tabs.length;

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      {/* Enhanced Tab Navigation */}
      <View style={styles.tabContainer}>
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              left: tabIndicatorAnim.interpolate({
                inputRange: [0, 1, 2, 3],
                outputRange: [0, indicatorWidth, indicatorWidth * 2, indicatorWidth * 3],
              }),
            },
          ]}
        />
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => handleTabChange(index)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.tabContent,
              activeTab === index && styles.activeTabContent
            ]}>
              <Ionicons 
                name={tab.icon} 
                size={22} 
                color={activeTab === index ? '#667eea' : '#8E8E93'} 
              />
              <Text style={[
                styles.tabText, 
                activeTab === index && styles.activeTabText
              ]}>
                {tab.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View> 
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Review Your Profile</Text>
        <Text style={styles.headerSubtitle}>Final check before going live</Text>
        
        {/* Animated Progress Circle */}
        <View style={styles.progressContainer}>
          <Animated.View style={styles.progressCircle}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  transform: [{
                    rotate: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  }],
                },
              ]}
            />
            <View style={styles.progressInner}>
              <Text style={styles.progressText}>{completeness}%</Text>
              <Text style={styles.progressLabel}>Complete</Text>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>

      
      {/* FIXED: Content Container */}
      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderTabContent()}
        </ScrollView>
      </View>

      {/* Enhanced Footer */}
      <BlurView intensity={100} tint="light" style={styles.footer}>
        <View style={styles.buttonRow}>
          {activeTab > 0 && (
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => handleTabChange(activeTab - 1)}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color="#667eea" />
              <Text style={styles.secondaryButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          {activeTab < tabs.length - 1 ? (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => handleTabChange(activeTab + 1)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, completeness < 100 && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={localSubmitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={completeness >= 100 ? ['#30D158', '#28CD41'] : ['#D1D1D6', '#AEAEB2']}
                style={styles.buttonGradient}
              >
                {localSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Launch Profile</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        
        {completeness < 100 && (
          <View style={styles.warningContainer}>
            <Ionicons name="alert-circle-outline" size={16} color="#FF3B30" />
            <Text style={styles.completenessWarning}>
              Complete your profile ({completeness}%) to continue
            </Text>
          </View>
        )}
      </BlurView>
    </ScrollView>
  );
};

// Enhanced Tab Components - FIXED LAYOUT
const OverviewTab = ({ completeness }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, []);

  return (
    <View style={styles.tabContentContainer}> {/* FIX: Changed style name */}
      <Animated.View style={[styles.overviewCard, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.iconContainer}
        >
          <Ionicons name="checkmark-done" size={32} color="#fff" />
        </LinearGradient>
        
        <Text style={styles.overviewTitle}>Ready to Go Live!</Text>
        <Text style={styles.overviewText}>
          Your profile is {completeness}% complete. Review each section carefully before launching your professional journey.
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.statCircle}>
              <Text style={styles.statNumber}>{completeness}%</Text>
            </LinearGradient>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
          <View style={styles.statItem}>
            <LinearGradient colors={['#30D158', '#28CD41']} style={styles.statCircle}>
              <Ionicons name="star" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.statLabel}>Professional</Text>
          </View>
          <View style={styles.statItem}>
            <LinearGradient colors={['#FF9500', '#FF6B00']} style={styles.statCircle}>
              <Ionicons name="flash" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.statLabel}>Ready</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const ProfileTab = ({ bio, phone, location, profileImage }) => (
  <View style={styles.tabContentContainer}> {/* FIX: Changed style name */}
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {profileImage?.uri ? (
            <Image source={{ uri: profileImage.uri }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={['#F093FB', '#F5576C']}
              style={styles.avatarPlaceholder}
            >
              <Ionicons name="person" size={28} color="#fff" />
            </LinearGradient>
          )}
          <View style={styles.statusBadge}>
            <Ionicons 
              name={profileImage?.uri ? "checkmark-circle" : "add-circle"} 
              size={20} 
              color={profileImage?.uri ? "#30D158" : "#FF9500"} 
            />
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Your Profile</Text>
          <Text style={styles.profileStatus}>
            {profileImage?.uri ? ' Photo added' : 'Add photo'}
          </Text>
        </View>
      </View>
      
      <ProfileSection 
  title="Professional Summary" 
  value={bio || ""}  // Ensure it's always a string
  icon="document-text-outline"
  placeholder="Add a compelling bio to attract clients"
/>
<ProfileSection 
  title="Contact Information" 
  value={phone || ""}  // Ensure it's always a string
  icon="call-outline"
  placeholder="Add your phone number"
/>
<ProfileSection 
  title="Location" 
  value={location.city && location.region ? `${location.city}, ${location.region}` : ""}  // Empty string instead of null
  icon="location-outline"
  placeholder="Set your service location"
/>
    </View>
  </View>
);

const ProfileSection = ({ title, value, icon, placeholder }) => (
  <View style={styles.detailSection}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color="#667eea" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <Text style={[styles.detailValue, !value && styles.placeholderText]}>
      {value || placeholder}
    </Text>
  </View>
);

const SkillsTab = ({ skills }) => (
  <View style={styles.tabContentContainer}> {/* FIX: Changed style name */}
    <View style={styles.skillsCard}>
      <View style={styles.skillsHeader}>
        <LinearGradient
          colors={['#4FACFE', '#00F2FE']}
          style={styles.skillsIconContainer}
        >
          <Ionicons name="construct" size={24} color="#fff" />
        </LinearGradient>
        <Text style={styles.skillsTitle}>Your Skills ({skills.length})</Text>
      </View>
      
      {skills.length > 0 ? (
        <View style={styles.skillsGrid}>
          {skills.map((skill, index) => (
            <View key={index} style={styles.skillTag}>
              <LinearGradient
                colors={['#4FACFE', '#00F2FE']}
                style={styles.skillGradient}
              >
                <Text style={styles.skillText}>{skill}</Text>
              </LinearGradient>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptySkills}>
          <Ionicons name="construct-outline" size={64} color="#D1D1D6" />
          <Text style={styles.emptyTitle}>No skills added yet</Text>
          <Text style={styles.emptySubtext}>Add your skills to showcase your expertise</Text>
        </View>
      )}
    </View>
  </View>
);

const PreviewTab = ({ bio, location, skills, profileImage }) => (
  <View style={styles.tabContentContainer}> {/* FIX: Changed style name */}
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <LinearGradient
          colors={['#43E97B', '#38F9D7']}
          style={styles.previewIconContainer}
        >
          <Ionicons name="eye" size={24} color="#fff" />
        </LinearGradient>
        <Text style={styles.previewTitle}>How Clients See You</Text>
      </View>
      
      <View style={styles.clientView}>
        <View style={styles.mockupHeader}>
          <View style={styles.mockupBars}>
            <View style={[styles.mockupBar, { backgroundColor: '#FF3B30' }]} />
            <View style={[styles.mockupBar, { backgroundColor: '#FF9500' }]} />
            <View style={[styles.mockupBar, { backgroundColor: '#30D158' }]} />
          </View>
        </View>
        
        <View style={styles.clientProfile}>
          <View style={styles.clientHeader}>
            {profileImage?.uri ? (
              <Image source={{ uri: profileImage.uri }} style={styles.previewAvatar} />
            ) : (
              <LinearGradient
                colors={['#F093FB', '#F5576C']}
                style={styles.previewAvatarPlaceholder}
              >
                <Ionicons name="person" size={24} color="#fff" />
              </LinearGradient>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>Professional Tasker</Text>
              <View style={styles.ratingContainer}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons key={i} name="star" size={14} color="#FF9500" />
                ))}
                <Text style={styles.ratingText}>5.0 • New</Text>
              </View>
              <Text style={styles.previewLocation}>
                 {location.city || 'Location not set'}
              </Text>
            </View>
          </View>
          
          {bio && (
            <Text style={styles.previewBio} numberOfLines={3}>
              "{bio}"
            </Text>
          )}
          
          {skills.length > 0 && (
            <View style={styles.previewSkills}>
              <Text style={styles.skillsLabel}>🛠️ Top Skills:</Text>
              <Text style={styles.skillsPreview}>
                {skills.slice(0, 3).join(' ')}
                {skills.length > 3 && `${skills.length - 3} more`}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  </View>
);

// FIXED Styles
const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
 header: {
  backgroundColor: '#FFFFFF',
  margin: 20,
  marginTop: Platform.OS === 'ios' ? 50 : 30,
  borderRadius: 20,
  padding: 24,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 4,
  },
},
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 100,
    height: 100,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressFill: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
  },
  progressInner: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: width / 4,
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  tab: {
    flex: 1,
    padding: 16,
  },
  tabContent: {
    alignItems: 'center',
    gap: 6,
  },
  activeTabContent: {
    transform: [{ scale: 1.05 }],
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#667eea',
    fontWeight: '600',
  },
  // FIXED: Content Container Styles
  contentContainer: {
    flex: 1, // This is crucial
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1, // Important for ScrollView
    padding: 20,
    paddingBottom: 30,
  },
  // FIXED: Tab Content Container
  tabContentContainer: {
    flex: 1,
    minHeight: 400, // Reasonable minimum height
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  secondaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderWidth: 2,
    borderColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  primaryButton: {
    flex: 2,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  submitButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  completenessWarning: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  // Card Styles (unchanged but included for completeness)
  overviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  // ... rest of your card styles remain the same
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  overviewText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  statCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  overviewText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  statCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: 15,
    color: '#8E8E93',
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  detailValue: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 24,
    paddingLeft: 26,
  },
  placeholderText: {
    color: '#C7C7CC',
    fontStyle: 'italic',
  },
  skillsCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    minHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  skillsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  skillsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skillTag: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  skillGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skillText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptySkills: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 8,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  previewIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  clientView: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  mockupHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
    paddingLeft: 8,
  },
  mockupBars: {
    flexDirection: 'row',
    gap: 6,
  },
  mockupBar: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  clientProfile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  previewAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
    fontWeight: '500',
  },
  previewLocation: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  previewBio: {
    fontSize: 15,
    color: '#48484A',
    lineHeight: 22,
    marginBottom: 16,
    fontStyle: 'italic',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  previewSkills: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 16,
  },
  skillsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  skillsPreview: {
    fontSize: 14,
    color: '#667eea',
    lineHeight: 20,
    fontWeight: '500',
  },
  
};

export default ReviewScreen;