import React, { useState, useContext } from 'react';
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
import { TaskerContext } from '../../context/TaskerContext';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';
import Header from "../../component/tasker/Header";

const { width } = Dimensions.get('window');

// Default profile image
const DEFAULT_PROFILE_IMAGE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150';

const TaskerProfileScreen = ({ navigation }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, logout, updateProfile } = useContext(AuthContext);
  const [newSkill, setNewSkill] = useState('');
  const [notifications, setNotifications] = useState({
    taskAlerts: true,
    messageNotifications: true,
    emailUpdates: false,
    promotional: false,
  });
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Initialize profile data with user data and fallbacks
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Tasker',
    email: user?.email || 'No email provided',
    phone: user?.phone || '+233 XX XXX XXXX',
    location: user?.location?.city || 'Location not set',
    bio: user?.Bio || 'Tell us about yourself and your skills...',
    skills: user?.skills || ['Add your skills'],
    hourlyRate: user?.hourlyRate || 0,
    availability: user?.availability || 'Available',
    verified: user?.verified || false,
    completedTasks: user?.completedTasks || 0,
    successRate: user?.successRate || '0%',
    rating: user?.rating || 0,
    memberSince: user?.createdAt || new Date().toISOString(),
    profileImage: user?.profileImage || DEFAULT_PROFILE_IMAGE,
  });

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
      await updateProfile(profileData);
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

  const addSkill = () => {
    if (newSkill.trim() && !profileData.skills.includes(newSkill.trim())) {
      setProfileData({
        ...profileData,
        skills: [...profileData.skills, newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setProfileData({
      ...profileData,
      skills: profileData.skills.filter(skill => skill !== skillToRemove),
    });
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

  const ProfileField = ({ label, value, editable = false, onChange, multiline = false, placeholder = '' }) => (
    <View style={styles.profileField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing && editable ? (
        <TextInput
          style={[styles.fieldInput, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
        />
      ) : (
        <Text style={[styles.fieldValue, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
      )}
    </View>
  );

  const getPrimarySkill = () => {
    if (!profileData.skills || profileData.skills.length === 0) return 'Tasker';
    return profileData.skills[0];
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

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return '#10B981';
    if (rating >= 4.0) return '#F59E0B';
    if (rating >= 3.0) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView 
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Header */}
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
            <Text style={styles.profileTitle}>{getPrimarySkill()}</Text>
            
            <View style={styles.ratingVerificationContainer}>
              {profileData.rating > 0 && (
                <View style={[styles.ratingContainer, { backgroundColor: getRatingColor(profileData.rating) }]}>
                  <Ionicons name="star" size={14} color="#FFFFFF" />
                  <Text style={styles.ratingText}>{parseFloat(profileData.rating).toFixed(1)}</Text>
                </View>
              )}
              
              {profileData.verified && (
                <View style={styles.verificationBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verificationText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Enhanced Stats Overview */}
        <View style={styles.statsContainer}>
          <StatsCard 
            value={profileData.completedTasks} 
            label="Completed" 
            icon="checkmark-done" 
            color="#10B981" 
          />
          <StatsCard 
            value={profileData.successRate} 
            label="Success Rate" 
            icon="trending-up" 
            color="#6366F1" 
          />
          <StatsCard 
            value={`₵${profileData.hourlyRate}`} 
            label="Hourly Rate" 
            icon="cash" 
            color="#F59E0B" 
          />
        </View>

        {/* Enhanced Profile Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>
          <View style={styles.sectionContent}>
            <ProfileField
              label="Full Name"
              value={profileData.name}
              editable
              onChange={(text) => setProfileData({ ...profileData, name: text })}
              placeholder="Enter your full name"
            />
            <ProfileField
              label="Email"
              value={profileData.email}
              editable
              onChange={(text) => setProfileData({ ...profileData, email: text })}
              placeholder="Enter your email"
            />
            <ProfileField
              label="Phone"
              value={profileData.phone}
              editable
              onChange={(text) => setProfileData({ ...profileData, phone: text })}
              placeholder="Enter your phone number"
            />
            <ProfileField
              label="Location"
              value={profileData.location}
              editable
              onChange={(text) => setProfileData({ ...profileData, location: text })}
              placeholder="Enter your location"
            />
            <ProfileField
              label="Bio"
              value={profileData.bio}
              editable
              onChange={(text) => setProfileData({ ...profileData, bio: text })}
              multiline
              placeholder="Tell us about yourself and your skills..."
            />
          </View>
        </View>

        {/* Enhanced Skills Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct-outline" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Skills & Expertise</Text>
          </View>
          
          <View style={styles.skillsContainer}>
            {profileData.skills && profileData.skills.length > 0 ? (
              profileData.skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                  {editing && (
                    <TouchableOpacity 
                      style={styles.removeSkillButton}
                      onPress={() => removeSkill(skill)}
                    >
                      <Ionicons name="close" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noSkillsText}>No skills added yet</Text>
            )}
          </View>
          
          {editing && (
            <View style={styles.addSkillContainer}>
              <TextInput
                style={styles.skillInput}
                value={newSkill}
                onChangeText={setNewSkill}
                placeholder="Add a new skill..."
                onSubmitEditing={addSkill}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity 
                style={[styles.addSkillButton, !newSkill.trim() && styles.addSkillButtonDisabled]} 
                onPress={addSkill}
                disabled={!newSkill.trim()}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Enhanced Availability */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Availability</Text>
          </View>
          <View style={styles.availabilityContainer}>
            <View style={styles.availabilityInfo}>
              <Ionicons 
                name={profileData.availability === 'Available' ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={profileData.availability === 'Available' ? "#10B981" : "#EF4444"} 
              />
              <View>
                <Text style={styles.availabilityStatus}>{profileData.availability}</Text>
                <Text style={styles.availabilityText}>
                  {profileData.availability === 'Available' ? 'Ready for new tasks' : 'Not accepting new tasks'}
                </Text>
              </View>
            </View>
            <Switch
              value={profileData.availability === 'Available'}
              onValueChange={(value) => setProfileData({
                ...profileData,
                availability: value ? 'Available' : 'Not Available'
              })}
              disabled={!editing}
              trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
              thumbColor={profileData.availability === 'Available' ? '#4F46E5' : '#9CA3AF'}
            />
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
                <Ionicons name="briefcase-outline" size={20} color="#6366F1" />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationLabel}>Task Alerts</Text>
                  <Text style={styles.notificationDescription}>New tasks and updates</Text>
                </View>
              </View>
              <Switch
                value={notifications.taskAlerts}
                onValueChange={() => toggleNotification('taskAlerts')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={notifications.taskAlerts ? '#4F46E5' : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#6366F1" />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationLabel}>Messages</Text>
                  <Text style={styles.notificationDescription}>New messages from clients</Text>
                </View>
              </View>
              <Switch
                value={notifications.messageNotifications}
                onValueChange={() => toggleNotification('messageNotifications')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={notifications.messageNotifications ? '#4F46E5' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Enhanced Account Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          
          <View style={styles.accountActions}>
            <TouchableOpacity style={styles.accountButton}>
              <Ionicons name="lock-closed-outline" size={20} color="#6366F1" />
              <Text style={styles.accountButtonText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.accountButton}>
              <Ionicons name="card-outline" size={20} color="#6366F1" />
              <Text style={styles.accountButtonText}>Payment Methods</Text>
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
            Member since {formatMemberSince()}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginBottom: 12,
  },
  ratingVerificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    lineHeight: 22,
  },
  fieldInput: {
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  placeholderText: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  skillText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
  removeSkillButton: {
    padding: 2,
  },
  addSkillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  addSkillButton: {
    backgroundColor: '#6366F1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addSkillButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  noSkillsText: {
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  availabilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  availabilityStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  availabilityText: {
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
});

export default TaskerProfileScreen;