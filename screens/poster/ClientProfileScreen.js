import React, { useState, useContext,useEffect } from 'react';
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
  TextInput,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { PosterContext } from '../../context/PosterContext';
import { ProfileField } from '../../component/tasker/ProfileField';
import { LocationField } from '../../component/tasker/LocationField';
import { navigate } from '../../services/navigationService';
import Header from "../../component/tasker/Header";

const { width } = Dimensions.get('window');

// Default profile image
const DEFAULT_PROFILE_IMAGE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150';

const ClientProfileScreen = ({ navigation }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, logout, updateProfile } = useContext(AuthContext);
  const { postedTasks } = useContext(PosterContext);
  const [profileData, setProfileData] = useState({});
  const [notifications, setNotifications] = useState({
    taskUpdates: true,
    applicantAlerts: true,
    messageNotifications: true,
    paymentAlerts: true,
  });
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Calculate client-specific stats
  const totalTasksPosted = postedTasks?.length || 0;
  const activeTasks = postedTasks?.filter(task => 
    ['Open', 'Assigned', 'In-progress'].includes(task.status)
  ).length || 0;
  const completedTasks = postedTasks?.filter(task => 
    ['Completed', 'Closed'].includes(task.status)
  ).length || 0;
  const totalSpent = postedTasks?.reduce((sum, task) => sum + (task.budget || 0), 0) || 0;

  // Initialize profile data with user data and fallbacks
 useEffect(() => {
     if (user) {
       setProfileData({
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
         ...user
       });
     }
   }, [user]);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
    
    // Add all profile data fields
    formData.append('name', profileData.name);
    formData.append('email', profileData.email);
    formData.append('phone', profileData.phone);

   if (profileData.location) {
      formData.append('location[region]', profileData.location.region || '');
      formData.append('location[city]', profileData.location.city || '');
      formData.append('location[town]', profileData.location.town || '');
      formData.append('location[street]', profileData.location.street || '');
    }

    if (profileData.profileImage && profileData.profileImage.startsWith('file://')) {
      const filename = profileData.profileImage.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image';
      
      formData.append('profileImage', {
        uri: profileData.profileImage,
        name: filename,
        type,
      });
    } else if (profileData.profileImage) {
      // If it's a URL, just send the URL
      formData.append('profileImageUrl', profileData.profileImage);
    }
      await updateProfile(formData);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const toggleNotification = (type) => {
    setNotifications({
      ...notifications,
      [type]: !notifications[type],
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

  const StatsCard = ({ value, label, icon, color }) => (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
  );
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

  const QuickActionButton = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={24} color="#FFFFFF" />
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView 
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Header 
          title="My Profile" 
          rightComponent={
            <TouchableOpacity 
              style={[styles.headerButton, editing && styles.headerButtonActive]}
              onPress={editing ? handleSave : () => setEditing(true)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <Text style={[styles.headerButtonText, editing && styles.headerButtonTextActive]}>
                  {editing ? 'Save' : 'Edit'}
                </Text>
              )}
            </TouchableOpacity>
          }
        />

        {/* Enhanced Profile Header */}
        <LinearGradient
          colors={['#1A1F3B', '#2D325D']}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: profileData.profileImage }}
              style={styles.profileImage}
              defaultSource={{ uri: DEFAULT_PROFILE_IMAGE }}
            />
            {editing && (
              <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileData.name}</Text>
            <View style={styles.verificationContainer}>
              {profileData.verified && (
                <View style={styles.verificationBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verificationText}>Verified Client</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Client Stats Overview */}
        <View style={styles.statsContainer}>
          <StatsCard 
            value={totalTasksPosted} 
            label="Tasks Posted" 
            icon="document-text" 
            color="#6366F1" 
          />
          <StatsCard 
            value={activeTasks} 
            label="Active Tasks" 
            icon="time" 
            color="#F59E0B" 
          />
          <StatsCard 
            value={`₵${totalSpent}`} 
            label="Total Spent" 
            icon="cash" 
            color="#10B981" 
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              title="Post Task"
              icon="add-circle"
              color="#10B981"
              onPress={() => navigate('PostedTasks',{ screen: 'CreateTask' })}
            />
            <QuickActionButton
              title="My Tasks"
              icon="list"
              color="#6366F1"
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
              color="#F59E0B"
              onPress={() => navigate('Payments')}
            />
          </View>
        </View>

        {/* Enhanced Profile Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business-outline" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Business Information</Text>
          </View>
          <View style={styles.sectionContent}>
            <ProfileField
              label="Full Name"
              value={profileData.name}
              editable
              onChange={(text) => setProfileData({ ...profileData, name: text })}
              placeholder="Enter your full name"
              editing = {editing}
              setProfileData ={setProfileData}
            />
            <ProfileField
              label="Email"
              value={profileData.email}
              editable
              onChange={(text) => setProfileData({ ...profileData, email: text })}
              placeholder="Enter your email"
              editing = {editing}
              setProfileData ={setProfileData}
            />
            <ProfileField
              label="Phone"
              value={profileData.phone}
              editable
              onChange={(text) => setProfileData({ ...profileData, phone: text })}
              placeholder="Enter your phone number"
              editing = {editing}
              setProfileData ={setProfileData}
            />
            
            {/* Location Fields */}
               <LocationField
                label="City"
                field="city"
                value={profileData.location?.city}
                editable
                editing = {editing}
                setProfileData ={setProfileData}
                profileData={profileData}
                />
                <LocationField
                label="Region"
                field="region"
                value={profileData.location?.region}
                editable
                editing = {editing}
                setProfileData ={setProfileData}
                profileData={profileData}
            
                  />
                 <LocationField
                  label="Town"
                  ield="town"
                  value={profileData.location?.town}
                  editable
                  editing = {editing}
                  setProfileData ={setProfileData}
                  profileData={profileData}
                  />
                  <LocationField
                  label="Street"
                  field="street"
                  value={profileData.location?.street}
                  editable
                  editing = {editing}
                  setProfileData ={setProfileData}
                  profileData={profileData}
                />
            
          </View>
        </View>

        {/* Task Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options-outline" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Task Preferences</Text>
          </View>
          
          <View style={styles.preferencesList}>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#6366F1" />
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceLabel}>Verified Taskers Only</Text>
                  <Text style={styles.preferenceDescription}>Only show verified taskers in applications</Text>
                </View>
              </View>
              <Switch
                value={user?.preferences?.verifiedOnly || false}
                onValueChange={(value) => {/* Handle preference change */}}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={user?.preferences?.verifiedOnly ? '#4F46E5' : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Ionicons name="star-outline" size={20} color="#6366F1" />
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceLabel}>High-Rated Taskers</Text>
                  <Text style={styles.preferenceDescription}>Prioritize taskers with 4+ star ratings</Text>
                </View>
              </View>
              <Switch
                value={user?.preferences?.highRatedOnly || false}
                onValueChange={(value) => {/* Handle preference change */}}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={user?.preferences?.highRatedOnly ? '#4F46E5' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Enhanced Notification Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          
          <View style={styles.notificationList}>
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Ionicons name="person-add-outline" size={20} color="#6366F1" />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationLabel}>New Applicants</Text>
                  <Text style={styles.notificationDescription}>When someone applies to your tasks</Text>
                </View>
              </View>
              <Switch
                value={notifications.applicantAlerts}
                onValueChange={() => toggleNotification('applicantAlerts')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={notifications.applicantAlerts ? '#4F46E5' : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#6366F1" />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationLabel}>Messages</Text>
                  <Text style={styles.notificationDescription}>New messages from taskers</Text>
                </View>
              </View>
              <Switch
                value={notifications.messageNotifications}
                onValueChange={() => toggleNotification('messageNotifications')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={notifications.messageNotifications ? '#4F46E5' : '#9CA3AF'}
              />
            </View>

            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Ionicons name="checkmark-done-outline" size={20} color="#6366F1" />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationLabel}>Task Updates</Text>
                  <Text style={styles.notificationDescription}>Task status changes and completions</Text>
                </View>
              </View>
              <Switch
                value={notifications.taskUpdates}
                onValueChange={() => toggleNotification('taskUpdates')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={notifications.taskUpdates ? '#4F46E5' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Enhanced Account Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Account Settings</Text>
          </View>
          
          <View style={styles.accountActions}>
            <TouchableOpacity style={styles.accountButton} onPress={() => navigate('PostedTasks')}>
              <Ionicons name="list-outline" size={20} color="#6366F1" />
              <Text style={styles.accountButtonText}>My Posted Tasks</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.accountButton} onPress={() => navigate('PaymentMethods')}>
              <Ionicons name="card-outline" size={20} color="#6366F1" />
              <Text style={styles.accountButtonText}>Payment Methods</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.accountButton} onPress={() => navigate('BillingHistory')}>
              <Ionicons name="receipt-outline" size={20} color="#6366F1" />
              <Text style={styles.accountButtonText}>Billing History</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.accountButton}>
              <Ionicons name="help-circle-outline" size={20} color="#6366F1" />
              <Text style={styles.accountButtonText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.accountButton, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[styles.accountButtonText, styles.logoutText]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Client since {formatMemberSince()}
          </Text>
          <Text style={styles.footerSubtext}>
            {totalTasksPosted} tasks posted • {completedTasks} completed
          </Text>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  headerButtonActive: {
    backgroundColor: '#6366F1',
  },
  headerButtonText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 14,
  },
  headerButtonTextActive: {
    color: '#FFFFFF',
  },
  profileHeader: {
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editImageButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#6366F1',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  profileIndustry: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  sectionContent: {
    gap: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  profileField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 8,
  },
  fieldInput: {
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  placeholderText: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  preferencesList: {
    gap: 8,
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
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  notificationList: {
    gap: 8,
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
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  accountActions: {
    gap: 4,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 12,
  },
  accountButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default ClientProfileScreen;