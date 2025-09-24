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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TaskerContext } from '../../context/TaskerContext';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';

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
  

  // Initialize profile data with user data and fallbacks
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Tasker',
    email: user?.email || 'No email provided',
    phone: user?.phone || '+233 XX XXX XXXX',
    location: user?.location.city || 'Location not set',
    bio: user?.bio || 'Tell us about yourself and your skills...',
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

  const handleSave = async () => {
    setLoading(true);
    try {
      // Call updateProfile from TaskerContext
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
      Alert.alert('Success', 'Profile picture updated!');
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

  // Get primary skill for profile title
  const getPrimarySkill = () => {
    if (!profileData.skills || profileData.skills.length === 0) return 'Tasker';
    return profileData.skills[0];
  };

  // Format member since date
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          {editing ? (
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#6366F1" />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Header */}
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.profileHeader}
        >
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: profileData.profileImage }}
              style={styles.profileImage}
              defaultSource={{ uri: DEFAULT_PROFILE_IMAGE }}
              onError={() => setProfileData({...profileData, profileImage: DEFAULT_PROFILE_IMAGE})}
            />
            {editing && (
              <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
                <Ionicons name="camera" size={20} color="#6366F1" />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.profileName}>{profileData.name}</Text>
          <Text style={styles.profileTitle}>{getPrimarySkill()}</Text>
          
          {profileData.verified && (
            <View style={styles.verificationBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.verificationText}>Verified Tasker</Text>
            </View>
          )}

          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingText}>{profileData.rating || 'No ratings'}</Text>
            <Text style={styles.ratingCount}>({profileData.completedTasks} tasks)</Text>
          </View>
        </LinearGradient>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <StatsCard 
            value={profileData.completedTasks} 
            label="Tasks Completed" 
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
            value={`₵${profileData.hourlyRate}/hr`} 
            label="Hourly Rate" 
            icon="cash" 
            color="#F59E0B" 
          />
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
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

        {/* Skills */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Skills & Expertise</Text>
            {editing && (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Ionicons name="add-circle" size={24} color="#6366F1" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.skillsContainer}>
            {profileData.skills && profileData.skills.length > 0 ? (
              profileData.skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                  {editing && (
                    <TouchableOpacity onPress={() => removeSkill(skill)}>
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
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
              <TouchableOpacity style={styles.addSkillButton} onPress={addSkill}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.availabilityContainer}>
            <View style={styles.availabilityInfo}>
              <Ionicons name="time" size={20} color="#6366F1" />
              <View>
                <Text style={styles.availabilityStatus}>{profileData.availability}</Text>
                <Text style={styles.availabilityText}>For new tasks</Text>
              </View>
            </View>
            <Switch
              value={profileData.availability === 'Available'}
              onValueChange={(value) => setProfileData({
                ...profileData,
                availability: value ? 'Available' : 'Not Available'
              })}
              disabled={!editing}
            />
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          <View style={styles.notificationItem}>
            <View>
              <Text style={styles.notificationLabel}>Task Alerts</Text>
              <Text style={styles.notificationDescription}>Get notified about new tasks</Text>
            </View>
            <Switch
              value={notifications.taskAlerts}
              onValueChange={() => toggleNotification('taskAlerts')}
            />
          </View>
          <View style={styles.notificationItem}>
            <View>
              <Text style={styles.notificationLabel}>Message Notifications</Text>
              <Text style={styles.notificationDescription}>Notify about new messages</Text>
            </View>
            <Switch
              value={notifications.messageNotifications}
              onValueChange={() => toggleNotification('messageNotifications')}
            />
          </View>
          <View style={styles.notificationItem}>
            <View>
              <Text style={styles.notificationLabel}>Email Updates</Text>
              <Text style={styles.notificationDescription}>Receive email summaries</Text>
            </View>
            <Switch
              value={notifications.emailUpdates}
              onValueChange={() => toggleNotification('emailUpdates')}
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.accountButton}>
            <Ionicons name="lock-closed" size={20} color="#64748B" />
            <Text style={styles.accountButtonText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.accountButton}>
            <Ionicons name="card" size={20} color="#64748B" />
            <Text style={styles.accountButtonText}>Payment Methods</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.accountButton}>
            <Ionicons name="help-circle" size={20} color="#64748B" />
            <Text style={styles.accountButtonText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.accountButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={[styles.accountButtonText, styles.logoutText]}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Member Since */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Member since {formatMemberSince()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Add these new styles to your existing styles
const styles = StyleSheet.create({
 
  placeholderText: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  noSkillsText: {
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
   container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  editButton: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius:10,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
   
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    gap: 4,
  },
  verificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 2,
  },
  ratingCount: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  },
 sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
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
  },
  fieldInput: {
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
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
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  skillText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  addSkillButton: {
    backgroundColor: '#6366F1',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  accountButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#94A3B8',
  },
});

export default TaskerProfileScreen;