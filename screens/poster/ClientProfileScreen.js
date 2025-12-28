import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Switch,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

// Context & API
import { AuthContext } from '../../context/AuthContext';
import { PosterContext } from '../../context/PosterContext';
import { navigate } from '../../services/navigationService';
import { sendFileToS3 } from '../../api/commonApi';
import { uploadProfileImage, switchAccount } from '../../api/authApi';

// Components
import Header from "../../component/tasker/Header";
import ReviewsComponent from '../../component/common/ReviewsComponent';
import { ProfileField } from '../../component/tasker/ProfileField';
import { LocationField } from '../../component/tasker/LocationField';

// Constants
const { width } = Dimensions.get('window');
const DEFAULT_PROFILE_IMAGE = 'https://res.cloudinary.com/duv3qvvjz/image/upload/v1760376396/male_avatar_fwgmfd.jpg';

// Theme Colors
const THEME = {
  primary: '#1A1F3B',
  secondary: '#2D1B69',
  white: '#FFFFFF',
  lightBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  accent: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6'
};

const ClientProfileScreen = ({ navigation }) => {
  // States
  const [editingSections, setEditingSections] = useState({});
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const { user, logout, updateProfile, setUser ,removeAccount} = useContext(AuthContext);
  const { postedTasks, payments } = useContext(PosterContext);
  const [profileData, setProfileData] = useState({});
  const [originalProfileImage, setOriginalProfileImage] = useState('');
  const [notifications, setNotifications] = useState({
    taskUpdates: true,
    applicantAlerts: true,
    messageNotifications: true,
    paymentAlerts: true,
  });
  const [preferences, setPreferences] = useState({
    verifiedOnly: false,
    highRatedOnly: false,
  });
  const [fadeAnim] = useState(new Animated.Value(0));
  
  const insets = useSafeAreaInsets();

  // Calculate client stats
  const totalTasksPosted = postedTasks?.length || 0;
  const activeTasks = postedTasks?.filter(task => 
    ['Open', 'Assigned', 'In-progress'].includes(task.status)
  ).length || 0;
  const completedTasks = postedTasks?.filter(task => 
    ['Completed', 'Closed'].includes(task.status)
  ).length || 0;
  const totalSpent = payments?.filter(payment => payment.status === 'released')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

  // Initialize profile data
  useEffect(() => {
    if (user) {
      const initialData = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || {
          region: '',
          city: '',
          town: '',
          street: ''
        },
        profileImage: user.profileImage || DEFAULT_PROFILE_IMAGE,
        Bio: user.Bio || '',
        verified: user.verified || false,
        rating: user.rating || 0,
        numberOfRatings: user.numberOfRatings || 0,
        ratingsReceived: user.ratingsReceived || [],
        memberSince: user.createdAt || new Date().toISOString(),
        ...user
      };

      setProfileData(initialData);
      setOriginalProfileImage(user.profileImage || DEFAULT_PROFILE_IMAGE);
      setPreferences(user.preferences || preferences);
    }
  }, [user]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Image upload
  const uploadImageToS3 = async (imageUri) => {
    try {
      setImageUploading(true);
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      const file = {
        uri: imageUri,
        name: filename,
        type: type,
      };

      const res = await uploadProfileImage({ 
        filename: file.name, 
        contentType: file.type 
      });

      if (res.status !== 200) {
        throw new Error('Failed to get upload URL');
      }

      const { fileKey, fileUrl, publicUrl } = res.data;
      await sendFileToS3(fileUrl, file);
      return publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  // Account switching
  const handleSwitchToTasker = async () => {
    Alert.alert(
      'Switch to Tasker Mode',
      'Are you sure you want to switch to tasker mode? You can switch back anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Switch', 
          onPress: async () => {
            try {
              const res = await switchAccount();
              if (res.status === 200) {
                setUser(res.data.user);
              }
            } catch (error) {
              console.error('Switch account error:', error);
              Alert.alert('Error', 'Failed to switch account');
            }
          }
        }
      ]
    );
  };

  // Save section
  const handleSaveSection = async (section) => {
    setLoading(true);
    try {
      let finalProfileImage = profileData.profileImage;
      
      const hasImageChanged = profileData.profileImage !== originalProfileImage && 
                           (profileData.profileImage.startsWith('file://') || 
                            profileData.profileImage.startsWith('content://'));
      
      if (hasImageChanged && section === 'personalInfo') {
        try {
          finalProfileImage = await uploadImageToS3(profileData.profileImage);
        } catch (error) {
          Alert.alert('Upload Error', 'Failed to upload profile image. Please try again.');
          setLoading(false);
          return;
        }
      }

      const formData = new FormData();
      
      if (section === 'personalInfo') {
        formData.append('name', profileData.name);
        formData.append('email', profileData.email);
        formData.append('phone', profileData.phone);
        formData.append('Bio', profileData.Bio || '');
        
        if (hasImageChanged) {
          formData.append('profileImage', finalProfileImage);
        }
        
        if (profileData.location) {
          formData.append('location[region]', profileData.location.region || '');
          formData.append('location[city]', profileData.location.city || '');
          formData.append('location[town]', profileData.location.town || '');
          formData.append('location[street]', profileData.location.street || '');
        }
      }

      if (section === 'preferences') {
        formData.append('preferences[verifiedOnly]', preferences.verifiedOnly.toString());
        formData.append('preferences[highRatedOnly]', preferences.highRatedOnly.toString());
      }

      const res = await updateProfile(formData);
      if (res?.status === 200) {
        if (hasImageChanged) {
          setOriginalProfileImage(finalProfileImage);
        }
        setEditingSections(prev => ({ ...prev, [section]: false }));
        Alert.alert('Success', `${getSectionDisplayName(section)} updated successfully!`);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', `Failed to update ${getSectionDisplayName(section).toLowerCase()}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const getSectionDisplayName = (section) => {
    const names = {
      personalInfo: 'Personal information',
      preferences: 'Task preferences',
      notifications: 'Notification settings',
    };
    return names[section] || section;
  };

  // Image picker
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileData({
        ...profileData,
        profileImage: result.assets[0].uri,
      });
    }
  };

  // Toggle functions
  const toggleNotification = (type) => {
    setNotifications({
      ...notifications,
      [type]: !notifications[type],
    });
  };

  const togglePreference = (type) => {
    setPreferences({
      ...preferences,
      [type]: !preferences[type],
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', onPress: logout, style: 'destructive' }
      ]
    );
  };


  const handleDeleteAccount = () => {
      Alert.alert(
        'Delete Account',
        'Are you sure you want to delete your account?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', onPress: removeAccount, style: 'destructive' }
        ]
      );
    };
  

  
  const formatMemberSince = () => {
    try {
      return new Date(profileData.memberSince).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
    } catch {
      return 'Recently';
    }
  };

  // Component: Stats Card
  const StatsCard = ({ value, label, icon, color }) => (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color={THEME.white} />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
  );

  // Component: Section Header
  const SectionHeader = ({ title, section, icon, showEdit = true }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Ionicons name={icon} size={20} color={THEME.accent} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {showEdit && !editingSections[section] ? (
        <TouchableOpacity 
          style={styles.sectionEditButton}
          onPress={() => setEditingSections(prev => ({ ...prev, [section]: true }))}
        >
          <Ionicons name="create-outline" size={16} color={THEME.accent} />
        </TouchableOpacity>
      ) : showEdit && editingSections[section] && (
        <View style={styles.sectionActionButtons}>
          <TouchableOpacity 
            style={styles.sectionCancelButton}
            onPress={() => {
              setEditingSections(prev => ({ ...prev, [section]: false }));
              // Reset to original data if needed
            }}
            disabled={loading}
          >
            <Text style={styles.sectionCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.sectionSaveButton}
            onPress={() => handleSaveSection(section)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={THEME.white} />
            ) : (
              <Text style={styles.sectionSaveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Component: Quick Action Button
  const QuickActionButton = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <LinearGradient
        colors={[color, `${color}CC`]}
        style={styles.quickActionGradient}
      >
        <Ionicons name={icon} size={24} color={THEME.white} />
        <Text style={styles.quickActionText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="My Profile" 
        showBackButton={false}
      />

      <Animated.ScrollView 
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Profile Header */}
        <LinearGradient
          colors={[THEME.primary, THEME.secondary]}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileHeaderContent}>
            {/* Profile Image */}
            <View style={styles.profileImageWrapper}>
              <View style={styles.profileImageContainer}>
                <Image
                  source={{ uri: profileData.profileImage || DEFAULT_PROFILE_IMAGE }}
                  style={styles.profileImage}
                  defaultSource={{ uri: DEFAULT_PROFILE_IMAGE }}
                />
                
                {editingSections.personalInfo ? (
                  <TouchableOpacity 
                    style={styles.editImageButton} 
                    onPress={pickImage}
                    disabled={imageUploading}
                  >
                    {imageUploading ? (
                      <ActivityIndicator size="small" color={THEME.white} />
                    ) : (
                      <Ionicons name="camera" size={16} color={THEME.white} />
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.editImageButton} 
                    onPress={() => setEditingSections(prev => ({ ...prev, personalInfo: true }))}
                  >
                    <Ionicons name="camera" size={16} color={THEME.white} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Profile Info */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profileData.name || 'Client'}</Text>
              <Text style={styles.profileEmail}>{profileData.email}</Text>
              
              <View style={styles.ratingVerificationContainer}>
                {profileData.rating > 0 && (
                  <View style={[styles.ratingContainer, { backgroundColor: THEME.success }]}>
                    <Ionicons name="star" size={12} color={THEME.white} />
                    <Text style={styles.ratingText}>
                      {parseFloat(profileData.rating || 0).toFixed(1)}
                    </Text>
                  </View>
                )}
                
                {profileData.verified && (
                  <View style={styles.verificationBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={THEME.success} />
                    <Text style={styles.verificationText}>Verified Client</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.headerStats}>
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{totalTasksPosted}</Text>
              <Text style={styles.headerStatLabel}>Posted</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{activeTasks}</Text>
              <Text style={styles.headerStatLabel}>Active</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>₵{totalSpent.toLocaleString()}</Text>
              <Text style={styles.headerStatLabel}>Spent</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Switch to Tasker Button */}
        <TouchableOpacity 
          style={styles.switchAccountButton}
          onPress={handleSwitchToTasker}
        >
          <Ionicons name="swap-horizontal" size={18} color={THEME.primary} />
          <Text style={styles.switchAccountText}>Switch to Tasker Mode</Text>
          <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} />
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="flash-outline" size={20} color={THEME.accent} />
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
          </View>
          
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              title="Post Task"
              icon="add-circle"
              color={THEME.success}
              onPress={() => navigate('PostedTasks', { screen: 'CreateTask' })}
            />
            <QuickActionButton
              title="My Tasks"
              icon="list"
              color={THEME.accent}
              onPress={() => navigate('PostedTasks')}
            />
            <QuickActionButton
              title="Messages"
              icon="chatbubbles"
              color="#8B5CF6"
              onPress={() => navigate('Chat')}
            />
            <QuickActionButton
              title="Payments"
              icon="wallet"
              color={THEME.warning}
              onPress={() => navigate('Payments')}
            />
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <SectionHeader 
            title="Personal Information" 
            section="personalInfo" 
            icon="person-outline" 
          />
          
          <View style={styles.sectionContent}>
            <View style={styles.formGrid}>
              <ProfileField
                label="Full Name"
                value={profileData.name}
                editable={editingSections.personalInfo}
                onChange={(text) => setProfileData({ ...profileData, name: text })}
                placeholder="Your full name"
                editing={editingSections.personalInfo}
                setProfileData={setProfileData}
                containerStyle={styles.formField}
              />
              
              <ProfileField
                label="Email"
                value={profileData.email}
                editable={editingSections.personalInfo}
                onChange={(text) => setProfileData({ ...profileData, email: text })}
                placeholder="Your email"
                editing={editingSections.personalInfo}
                setProfileData={setProfileData}
                containerStyle={styles.formField}
              />
              
              <ProfileField
                label="Phone"
                value={profileData.phone}
                editable={editingSections.personalInfo}
                onChange={(text) => setProfileData({ ...profileData, phone: text })}
                placeholder="Phone number"
                editing={editingSections.personalInfo}
                setProfileData={setProfileData}
                containerStyle={styles.formField}
              />
            </View>

            {/* Location Fields */}
            <View style={styles.locationSection}>
              <Text style={styles.sectionSubtitle}>Location</Text>
              <View style={styles.locationGrid}>
                <LocationField
                  label="Region"
                  field="region"
                  value={profileData.location?.region}
                  editable={editingSections.personalInfo}
                  editing={editingSections.personalInfo}
                  setProfileData={setProfileData}
                  profileData={profileData}
                  containerStyle={styles.locationField}
                />
                <LocationField
                  label="City"
                  field="city"
                  value={profileData.location?.city}
                  editable={editingSections.personalInfo}
                  editing={editingSections.personalInfo}
                  setProfileData={setProfileData}
                  profileData={profileData}
                  containerStyle={styles.locationField}
                />
                <LocationField
                  label="Town"
                  field="town"
                  value={profileData.location?.town}
                  editable={editingSections.personalInfo}
                  editing={editingSections.personalInfo}
                  setProfileData={setProfileData}
                  profileData={profileData}
                  containerStyle={styles.locationField}
                />
                <LocationField
                  label="Street"
                  field="street"
                  value={profileData.location?.street}
                  editable={editingSections.personalInfo}
                  editing={editingSections.personalInfo}
                  setProfileData={setProfileData}
                  profileData={profileData}
                  containerStyle={styles.locationField}
                />
              </View>
            </View>

            {/* Bio */}
            <ProfileField
              label="About Me"
              value={profileData.Bio}
              editable={editingSections.personalInfo}
              onChange={(text) => setProfileData({ ...profileData, Bio: text })}
              multiline
              placeholder="Tell taskers about yourself and what kind of tasks you usually post..."
              editing={editingSections.personalInfo}
              setProfileData={setProfileData}
              characterCount
              maxLength={500}
              containerStyle={styles.bioField}
            />
          </View>
        </View>

        {/* Task Preferences */}
        <View style={styles.section}>
          <SectionHeader 
            title="Task Preferences" 
            section="preferences" 
            icon="options-outline" 
          />
          
          <View style={styles.preferencesList}>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Ionicons name="shield-checkmark-outline" size={20} color={THEME.accent} />
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceLabel}>Verified Taskers Only</Text>
                  <Text style={styles.preferenceDescription}>Only show verified taskers in applications</Text>
                </View>
              </View>
              <Switch
                value={preferences.verifiedOnly}
                onValueChange={() => togglePreference('verifiedOnly')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={preferences.verifiedOnly ? THEME.accent : '#9CA3AF'}
                disabled={!editingSections.preferences}
              />
            </View>
            
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Ionicons name="star-outline" size={20} color={THEME.accent} />
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceLabel}>High-Rated Taskers</Text>
                  <Text style={styles.preferenceDescription}>Prioritize taskers with 4+ star ratings</Text>
                </View>
              </View>
              <Switch
                value={preferences.highRatedOnly}
                onValueChange={() => togglePreference('highRatedOnly')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={preferences.highRatedOnly ? THEME.accent : '#9CA3AF'}
                disabled={!editingSections.preferences}
              />
            </View>
          </View>
        </View>

        {/* Reviews & Ratings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="star-outline" size={20} color={THEME.accent} />
              <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
            </View>
            {profileData.ratingsReceived && profileData.ratingsReceived.length > 0 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('AllReviews', { 
                  reviews: profileData.ratingsReceived || [],
                  userName: profileData.name,
                  averageRating: profileData.rating || 0,
                  totalReviews: profileData.numberOfRatings || 0
                })}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color={THEME.accent} />
              </TouchableOpacity>
            )}
          </View>
          
          <ReviewsComponent 
            reviews={profileData.ratingsReceived || []}
            averageRating={profileData.rating || 0}
            totalReviews={profileData.numberOfRatings || 0}
            onViewAll={() => navigation.navigate('AllReviews', { 
              reviews: profileData.ratingsReceived || [],
              userName: profileData.name,
              averageRating: profileData.rating || 0,
              totalReviews: profileData.numberOfRatings || 0
            })}
          />
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <SectionHeader 
            title="Notifications" 
            section="notifications" 
            icon="notifications-outline" 
          />
          
          <View style={styles.notificationList}>
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Ionicons name="person-add-outline" size={20} color={THEME.accent} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationLabel}>New Applicants</Text>
                  <Text style={styles.notificationDescription}>When someone applies to your tasks</Text>
                </View>
              </View>
              <Switch
                value={notifications.applicantAlerts}
                onValueChange={() => toggleNotification('applicantAlerts')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={notifications.applicantAlerts ? THEME.accent : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={THEME.accent} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationLabel}>Messages</Text>
                  <Text style={styles.notificationDescription}>New messages from taskers</Text>
                </View>
              </View>
              <Switch
                value={notifications.messageNotifications}
                onValueChange={() => toggleNotification('messageNotifications')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={notifications.messageNotifications ? THEME.accent : '#9CA3AF'}
              />
            </View>

            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Ionicons name="checkmark-done-outline" size={20} color={THEME.accent} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationLabel}>Task Updates</Text>
                  <Text style={styles.notificationDescription}>Task status changes and completions</Text>
                </View>
              </View>
              <Switch
                value={notifications.taskUpdates}
                onValueChange={() => toggleNotification('taskUpdates')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={notifications.taskUpdates ? THEME.accent : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="settings-outline" size={20} color={THEME.accent} />
              <Text style={styles.sectionTitle}>Account Settings</Text>
            </View>
          </View>
          
          <View style={styles.settingsList}>
            <TouchableOpacity style={styles.settingItem} onPress={() => navigate('PostedTasks')}>
              <Ionicons name="list-outline" size={20} color={THEME.accent} />
              <Text style={styles.settingText}>My Posted Tasks</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem} onPress={() => navigate('Payments')}>
              <Ionicons name="receipt-outline" size={20} color={THEME.accent} />
              <Text style={styles.settingText}>Payment History</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem} onPress={() => navigate('ClientSupport')}>
              <Ionicons name="help-circle-outline" size={20} color={THEME.accent} />
              <Text style={styles.settingText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, styles.logoutItem]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={THEME.danger} />
              <Text style={[styles.settingText, styles.logoutText]}>Log Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingItem, styles.logoutItem]} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={20} color={THEME.danger} />
                <Text style={[styles.settingText, styles.logoutText]}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Client since {formatMemberSince()}</Text>
          <Text style={styles.footerSubtext}>
            {totalTasksPosted} tasks posted • {completedTasks} completed • ₵{totalSpent.toLocaleString()} spent
          </Text>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.lightBg,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileHeader: {
    padding: 20,
    borderRadius: 34,
    marginHorizontal: 12,
    marginTop: 12,
  },
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageWrapper: {
    marginRight: 16,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: THEME.white,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: THEME.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.white,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  ratingVerificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  ratingText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verificationText: {
    color: THEME.success,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  headerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.white,
    marginBottom: 4,
  },
  headerStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  switchAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    marginHorizontal: 16,
    marginTop: -20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  switchAccountText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.primary,
    marginLeft: 12,
  },
  section: {
    backgroundColor: THEME.cardBg,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginLeft: 12,
  },
  sectionEditButton: {
    padding: 8,
  },
  sectionActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  sectionCancelButtonText: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  sectionSaveButton: {
    backgroundColor: THEME.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sectionSaveButtonText: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionGradient: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionContent: {
    gap: 16,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  formField: {
    width: '48%',
    marginBottom: 16,
  },
  locationSection: {
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 12,
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  locationField: {
    width: '48%',
    marginBottom: 12,
  },
  bioField: {
    marginTop: 8,
  },
  preferencesList: {
    gap: 12,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  preferenceText: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
  notificationList: {
    gap: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  notificationText: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: THEME.accent,
    fontWeight: '500',
    marginRight: 4,
  },
  settingsList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: THEME.textPrimary,
    marginLeft: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: THEME.danger,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default ClientProfileScreen;