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
  TextInput,
  Alert,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TaskerContext } from '../../context/TaskerContext';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';
import Header from "../../component/tasker/Header";
import ReviewsComponent from '../../component/common/ReviewsComponent';
import { ProfileField } from '../../component/tasker/ProfileField';
import { LocationField } from '../../component/tasker/LocationField';
import { styles } from '../../styles/auth/ProfileScreen.Styles';
import { sendFileToS3 } from '../../api/commonApi';
import { uploadProfileImage } from '../../api/authApi';
import { updateAvailability } from '../../api/authApi'; 

import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

// Default profile image
const DEFAULT_PROFILE_IMAGE = 'https://res.cloudinary.com/duv3qvvjz/image/upload/v1760376396/male_avatar_fwgmfd.jpg';

// Availability options
const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available', color: '#10B981', icon: 'checkmark-circle', description: 'Ready for new tasks' },
  { value: 'busy', label: 'Busy', color: '#F59E0B', icon: 'time', description: 'Working on tasks' },
  { value: 'away', label: 'Away', color: '#6366F1', icon: 'bed', description: 'Temporarily unavailable' },
  { value: 'offline', label: 'Offline', color: '#6B7280', icon: 'power', description: 'Not accepting tasks' },
];

const TaskerProfileScreen = ({ navigation }) => {
  // Section editing states
  const [editingSections, setEditingSections] = useState({
    personalInfo: false,
    skills: false,
    workExperience: false,
    availability: false,
    notifications: false
  });

  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const { user, logout, updateProfile } = useContext(AuthContext);
  const [newSkill, setNewSkill] = useState('');
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [originalProfileImage, setOriginalProfileImage] = useState('');
  const [notifications, setNotifications] = useState({
    taskAlerts: true,
    messageNotifications: true,
    emailUpdates: false,
    promotional: false,
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showNextAvailablePicker, setShowNextAvailablePicker] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setExperienceForm({ 
        ...experienceForm, 
        startDate: selectedDate.toISOString().split('T')[0] 
      });
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setExperienceForm({ 
        ...experienceForm, 
        endDate: selectedDate.toISOString().split('T')[0] 
      });
    }
  };

  const onNextAvailableChange = (event, selectedDate) => {
    setShowNextAvailablePicker(false);
    if (selectedDate) {
      setProfileData({
        ...profileData,
        availability: {
          ...profileData.availability,
          nextAvailableAt: selectedDate.toISOString()
        }
      });
    }
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Select Date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Select Date';
    }
  };

  // Format time for display
  const formatDisplayTime = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // Work Experience Form State
  const [experienceForm, setExperienceForm] = useState({
    jobTitle: '',
    company: '',
    startDate: '',
    endDate: '',
    description: '',
    currentlyWorking: false,
  });

  // Initialize profile data with user data and proper schema structure
  useEffect(() => {
    if (user) {
      const userAvailability = user.availability || {};
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
        Bio: user.Bio || '',
        skills: user.skills || [],
        hourlyRate: user.hourlyRate || 0,
        availability: {
          status: userAvailability.status || 'available',
          nextAvailableAt: userAvailability.nextAvailableAt || '',
          lastActiveAt: userAvailability.lastActiveAt || new Date().toISOString(),
          manuallySet: userAvailability.manuallySet || false,
          workingHours: userAvailability.workingHours || {
            timezone: 'Africa/Accra',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            startTime: '09:00',
            endTime: '17:00'
          },
          maxConcurrentTasks: userAvailability.maxConcurrentTasks || 3,
          currentTaskCount: userAvailability.currentTaskCount || 0
        },
        profileImage: user.profileImage || DEFAULT_PROFILE_IMAGE,
        workExperience: user.workExperience || [],
        education: user.education || [],
        workPortfolio: user.workPortfolio || [],
        // Add other schema fields as needed
        ...user
      };

      setProfileData(initialData);
      setOriginalData(initialData);
      // Store original profile image to detect changes
      setOriginalProfileImage(user.profileImage || DEFAULT_PROFILE_IMAGE);
    }
  }, [user]);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Section editing handlers
  const startEditingSection = (section) => {
    setEditingSections(prev => ({
      ...prev,
      [section]: true
    }));
  };

  const cancelEditingSection = (section) => {
    // Reset to original data for this section
    setProfileData(prev => ({
      ...prev,
      ...getSectionOriginalData(section)
    }));
    
    setEditingSections(prev => ({
      ...prev,
      [section]: false
    }));

    // Reset skills if cancelling skills section
    if (section === 'skills') {
      setNewSkill('');
    }
  };

  const getSectionOriginalData = (section) => {
    switch (section) {
      case 'personalInfo':
        return {
          name: originalData.name,
          email: originalData.email,
          phone: originalData.phone,
          location: { ...originalData.location },
          Bio: originalData.Bio,
          hourlyRate: originalData.hourlyRate
        };
      case 'skills':
        return { skills: [...originalData.skills] };
      case 'workExperience':
        return { workExperience: [...originalData.workExperience] };
      case 'availability':
        return { availability: { ...originalData.availability } };
      case 'notifications':
        return {}; // Notifications are handled separately
      default:
        return {};
    }
  };

  // Upload image to S3
  const uploadImageToS3 = async(imageUri) => {
    try {
      setImageUploading(true);
      
      // Extract file info from URI
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // Create file object
      const file = {
        uri: imageUri,
        name: filename,
        type: type,
      };

      // Get pre-signed URL from backend
      const res = await uploadProfileImage({ 
        filename: file.name, 
        contentType: file.type 
      });

      console.log(res)
      
      if (res.status !== 200) {
        throw new Error('Failed to get upload URL');
      }

      const { fileKey, fileUrl, publicUrl } = res.data;
      
      // Upload file to S3 using the pre-signed URL
      await sendFileToS3(fileUrl, file);
      
      return publicUrl;
      
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  // Update availability status
  const handleUpdateAvailability = async (newStatus) => {
    try {
      setUpdatingAvailability(true);
      
      const availabilityData = {
        status: newStatus,
        nextAvailableAt: profileData.availability.nextAvailableAt
      };

      const res = await updateAvailability(availabilityData);
      
      if (res.status === 200) {
        // Update local state
        setProfileData({
          ...profileData,
          availability: {
            ...profileData.availability,
            status: newStatus,
            manuallySet: true,
            lastActiveAt: new Date().toISOString()
          }
        });

        // Update original data
        setOriginalData(prev => ({
          ...prev,
          availability: {
            ...prev.availability,
            status: newStatus,
            manuallySet: true,
            lastActiveAt: new Date().toISOString()
          }
        }));
        
        setShowAvailabilityModal(false);
        setEditingSections(prev => ({ ...prev, availability: false }));
        Alert.alert('Success', 'Availability updated successfully!');
      }
    } catch (error) {
      console.error('Availability update error:', error);
      Alert.alert('Error', 'Failed to update availability. Please try again.');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleSaveSection = async (section) => {
    setLoading(true);
    try {
      let finalProfileImage = profileData.profileImage;
      
      // Check if profile image has changed and needs to be uploaded
      const hasImageChanged = profileData.profileImage !== originalProfileImage && 
                             profileData.profileImage.startsWith('file://');
      
      if (hasImageChanged) {
        try {
          finalProfileImage = await uploadImageToS3(profileData.profileImage);
        } catch (error) {
          Alert.alert('Upload Error', 'Failed to upload profile image. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Prepare data for FormData
      const formData = new FormData();
      
      // Add all profile data fields that are being edited
      if (section === 'personalInfo' || section === 'skills') {
        formData.append('name', profileData.name);
        formData.append('email', profileData.email);
        formData.append('phone', profileData.phone);
        formData.append('Bio', profileData.Bio);
        formData.append('hourlyRate', profileData.hourlyRate.toString());
        
        // Add the profile image URL
        formData.append('profileImage', finalProfileImage);
        
        // Handle location object
        if (profileData.location) {
          formData.append('location[region]', profileData.location.region || '');
          formData.append('location[city]', profileData.location.city || '');
          formData.append('location[town]', profileData.location.town || '');
          formData.append('location[street]', profileData.location.street || '');
        }
        
        // Handle skills array
        if (profileData.skills) {
          profileData.skills.forEach((skill, index) => {
            formData.append(`skills[${index}]`, skill);
          });
        }
      }

      // Handle work experience
      if (section === 'workExperience' && profileData.workExperience) {
        profileData.workExperience.forEach((exp, index) => {
          formData.append(`workExperience[${index}][jobTitle]`, exp.jobTitle || '');
          formData.append(`workExperience[${index}][company]`, exp.company || '');
          
          if (exp.startDate && exp.startDate instanceof Date) {
            formData.append(`workExperience[${index}][startDate]`, exp.startDate.toISOString());
          } else if (exp.startDate && typeof exp.startDate === 'string') {
            const date = new Date(exp.startDate);
            if (!isNaN(date.getTime())) {
              formData.append(`workExperience[${index}][startDate]`, date.toISOString());
            }
          }
          
          if (exp.endDate && exp.endDate instanceof Date) {
            formData.append(`workExperience[${index}][endDate]`, exp.endDate.toISOString());
          } else if (exp.endDate && typeof exp.endDate === 'string') {
            const date = new Date(exp.endDate);
            if (!isNaN(date.getTime())) {
              formData.append(`workExperience[${index}][endDate]`, date.toISOString());
            }
          }
          
          formData.append(`workExperience[${index}][description]`, exp.description || '');
        });
      }

      const res = await updateProfile(formData);
      if (res?.status === 200) {
        // Update the original data and image reference
        setOriginalData(profileData);
        setOriginalProfileImage(finalProfileImage);
        setEditingSections(prev => ({ ...prev, [section]: false }));
        Alert.alert('Success', `${getSectionDisplayName(section)} updated successfully!`);
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
      skills: 'Skills',
      workExperience: 'Work experience',
      availability: 'Availability',
      notifications: 'Notification settings'
    };
    return names[section] || section;
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
    if (newSkill.trim() && !profileData.skills?.includes(newSkill.trim())) {
      setProfileData({
        ...profileData,
        skills: [...(profileData.skills || []), newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setProfileData({
      ...profileData,
      skills: profileData.skills?.filter(skill => skill !== skillToRemove) || [],
    });
  };

  // Work Experience Functions
  const openExperienceModal = (experience = null) => {
    if (experience) {
      setExperienceForm({
        jobTitle: experience.jobTitle || '',
        company: experience.company || '',
        startDate: experience.startDate ? new Date(experience.startDate).toISOString().split('T')[0] : '',
        endDate: experience.endDate ? new Date(experience.endDate).toISOString().split('T')[0] : '',
        description: experience.description || '',
        currentlyWorking: !experience.endDate,
      });
      setEditingExperience(experience);
    } else {
      setExperienceForm({
        jobTitle: '',
        company: '',
        startDate: '',
        endDate: '',
        description: '',
        currentlyWorking: false,
      });
      setEditingExperience(null);
    }
    setShowExperienceModal(true);
  };

  const closeExperienceModal = () => {
    setShowExperienceModal(false);
    setEditingExperience(null);
    setExperienceForm({
      jobTitle: '',
      company: '',
      startDate: '',
      endDate: '',
      description: '',
      currentlyWorking: false,
    });
  };

  const saveExperience = () => {
    const { jobTitle, company, startDate, description } = experienceForm;
    
    if (!jobTitle.trim() || !company.trim() || !startDate || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    let startDateObj;
    try {
      startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime())) {
        Alert.alert('Error', 'Invalid start date');
        return;
      }
    } catch (error) {
      Alert.alert('Error', 'Invalid start date format');
      return;
    }

    let endDateObj = null;
    if (!experienceForm.currentlyWorking && experienceForm.endDate) {
      try {
        endDateObj = new Date(experienceForm.endDate);
        if (isNaN(endDateObj.getTime())) {
          Alert.alert('Error', 'Invalid end date');
          return;
        }
      } catch (error) {
        Alert.alert('Error', 'Invalid end date format');
        return;
      }
    }

    const newExperience = {
      jobTitle: jobTitle.trim(),
      company: company.trim(),
      startDate: startDateObj,
      endDate: endDateObj,
      description: description.trim(),
    };

    let updatedExperience;
    if (editingExperience) {
      updatedExperience = profileData.workExperience?.map(exp => 
        exp === editingExperience ? newExperience : exp
      ) || [];
    } else {
      updatedExperience = [...(profileData.workExperience || []), newExperience];
    }

    setProfileData({
      ...profileData,
      workExperience: updatedExperience,
    });

    closeExperienceModal();
    Alert.alert('Success', `Experience ${editingExperience ? 'updated' : 'added'} successfully!`);
  };

  const removeExperience = (experienceToRemove) => {
    Alert.alert(
      'Remove Experience',
      'Are you sure you want to remove this work experience?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setProfileData({
              ...profileData,
              workExperience: profileData.workExperience?.filter(exp => exp !== experienceToRemove) || [],
            });
          }
        }
      ]
    );
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Present';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    
    let totalMonths = years * 12 + months;
    if (totalMonths < 0) totalMonths = 0;
    
    const yearsPart = Math.floor(totalMonths / 12);
    const monthsPart = totalMonths % 12;
    
    if (yearsPart === 0) {
      return `${monthsPart} mos`;
    } else if (monthsPart === 0) {
      return `${yearsPart} yr${yearsPart > 1 ? 's' : ''}`;
    } else {
      return `${yearsPart} yr${yearsPart > 1 ? 's' : ''} ${monthsPart} mos`;
    }
  };

  const getPrimarySkill = () => {
    if (!profileData.skills || profileData.skills.length === 0) return 'Tasker';
    return profileData.skills[0];
  };

  const formatMemberSince = () => {
    try {
      return new Date(profileData.createdAt).toLocaleDateString('en-US', {
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

  const getCurrentAvailability = () => {
    return AVAILABILITY_OPTIONS.find(option => option.value === profileData.availability?.status) || AVAILABILITY_OPTIONS[0];
  };

  const getAvailabilityDescription = () => {
    const current = getCurrentAvailability();
    if (profileData.availability?.status === 'away' && profileData.availability?.nextAvailableAt) {
      return `Back ${formatDisplayDate(profileData.availability.nextAvailableAt)} at ${formatDisplayTime(profileData.availability.nextAvailableAt)}`;
    }
    return current.description;
  };

  // Section Header Component with Edit/Save/Cancel buttons
  const SectionHeader = ({ title, section, icon }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Ionicons name={icon} size={20} color="#6366F1" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {!editingSections[section] ? (
        <TouchableOpacity 
          style={styles.sectionEditButton}
          onPress={() => startEditingSection(section)}
        >
          <Ionicons name="create-outline" size={18} color="#6366F1" />
          <Text style={styles.sectionEditButtonText}>Edit</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.sectionActionButtons}>
          <TouchableOpacity 
            style={styles.sectionCancelButton}
            onPress={() => cancelEditingSection(section)}
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
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sectionSaveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Simplified Header - No global edit button */}
      <Header title="My Profile" />

      <Animated.ScrollView 
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Enhanced Profile Header */}
        <LinearGradient
          colors={['#1A1F3B', '#2D325D']}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: profileData.profileImage || DEFAULT_PROFILE_IMAGE }}
              style={styles.profileImage}
              defaultSource={{ uri: DEFAULT_PROFILE_IMAGE }}
            />
            <TouchableOpacity 
              style={styles.editImageButton} 
              onPress={pickImage}
              disabled={imageUploading}
            >
              {imageUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileData.name || 'Tasker'}</Text>
            <Text style={styles.profileTitle}>{getPrimarySkill()}</Text>
            
            <View style={styles.ratingVerificationContainer}>
              {profileData.rating > 0 && (
                <View style={[styles.ratingContainer, { backgroundColor: getRatingColor(profileData.rating) }]}>
                  <Ionicons name="star" size={14} color="#FFFFFF" />
                  <Text style={styles.ratingText}>{parseFloat(profileData.rating || 0).toFixed(1)}</Text>
                </View>
              )}
              
              {profileData.isVerified && (
                <View style={styles.verificationBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verificationText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <StatsCard 
            value={profileData.performance?.tasksCompleted || '0'} 
            label="Completed" 
            icon="checkmark-done" 
            color="#10B981" 
          />
          <StatsCard 
            value={`${profileData.performance?.onTimeCompletionRate || '0'}%`}  
            label="On Time" 
            icon="trending-up" 
            color="#6366F1" 
          />
          <StatsCard 
            value={`GHS ${profileData.hourlyRate || '0'}`} 
            label="Hourly Rate" 
            icon="cash" 
            color="#F59E0B" 
          />
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <SectionHeader 
            title="Personal Information" 
            section="personalInfo" 
            icon="person-outline" 
          />
          <View style={styles.sectionContent}>
            <ProfileField
              label="Full Name"
              value={profileData.name}
              editable={editingSections.personalInfo}
              onChange={(text) => setProfileData({ ...profileData, name: text })}
              placeholder="Enter your full name"
              editing={editingSections.personalInfo}
              setProfileData={setProfileData}
            />
            <ProfileField
              label="Email"
              value={profileData.email}
              editable={editingSections.personalInfo}
              onChange={(text) => setProfileData({ ...profileData, email: text })}
              placeholder="Enter your email"
              editing={editingSections.personalInfo}
              setProfileData={setProfileData}
            />
            <ProfileField
              label="Phone"
              value={profileData.phone}
              editable={editingSections.personalInfo}
              onChange={(text) => setProfileData({ ...profileData, phone: text })}
              placeholder="Enter your phone number"
              editing={editingSections.personalInfo}
              setProfileData={setProfileData}
              profileData={profileData}
            />
            
            {/* Location Fields */}
             <LocationField
              label="Street"
              field="street"
              value={profileData.location?.street}
              editable={editingSections.personalInfo}
              editing={editingSections.personalInfo}
              setProfileData={setProfileData}
              profileData={profileData}
            />
             <LocationField
              label="Town"
              field="town"
              value={profileData.location?.town}
              editable={editingSections.personalInfo}
              editing={editingSections.personalInfo}
              setProfileData={setProfileData}
              profileData={profileData}
            />
            <LocationField
              label="City"
              field="city"
              value={profileData.location?.city}
              editable={editingSections.personalInfo}
              editing={editingSections.personalInfo}
              setProfileData={setProfileData}
              profileData={profileData}
            />
            <LocationField
              label="Region"
              field="region"
              value={profileData.location?.region}
              editable={editingSections.personalInfo}
              editing={editingSections.personalInfo}
              setProfileData={setProfileData}
              profileData={profileData}
            />
            
            <ProfileField
              label="Bio"
              value={profileData.Bio}
              editable={editingSections.personalInfo}
              onChange={(text) => setProfileData({ ...profileData, Bio: text })}
              multiline
              placeholder="Tell us about yourself and your skills..."
              editing={editingSections.personalInfo}
              setProfileData={setProfileData}
            />

          </View>
        </View>

        {/* Skills Section */}
        <View style={styles.section}>
          <SectionHeader 
            title="Skills & Expertise" 
            section="skills" 
            icon="construct-outline" 
          />
          
          <View style={styles.skillsContainer}>
            {profileData.skills && profileData.skills.length > 0 ? (
              profileData.skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                  {editingSections.skills && (
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
          
          {editingSections.skills && (
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

        {/* Work Experience Section */}
        <View style={styles.section}>
          <SectionHeader 
            title="Work Experience" 
            section="workExperience" 
            icon="briefcase-outline" 
          />
          
          {profileData.workExperience && profileData.workExperience.length > 0 ? (
            <View style={styles.experienceList}>
              {profileData.workExperience.map((experience, index) => (
                <View key={index} style={styles.experienceItem}>
                  <View style={styles.experienceContent}>
                    <View style={styles.experienceHeader}>
                      <Text style={styles.experienceJobTitle}>{experience.jobTitle}</Text>
                      {editingSections.workExperience && (
                        <View style={styles.experienceActions}>
                          <TouchableOpacity 
                            style={styles.experienceActionButton}
                            onPress={() => openExperienceModal(experience)}
                          >
                            <Ionicons name="create-outline" size={16} color="#6366F1" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.experienceActionButton}
                            onPress={() => removeExperience(experience)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.experienceCompany}>{experience.company}</Text>
                    
                    <View style={styles.experienceMeta}>
                      <Text style={styles.experienceDuration}>
                        {formatDate(experience.startDate)} - {formatDate(experience.endDate)}
                      </Text>
                      <Text style={styles.experienceLength}>
                        {calculateDuration(experience.startDate, experience.endDate)}
                      </Text>
                    </View>
                    
                    {experience.description && (
                      <Text style={styles.experienceDescription}>
                        {experience.description}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyExperience}>
              <Ionicons name="briefcase-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyExperienceText}>No work experience added</Text>
              <Text style={styles.emptyExperienceSubtext}>
                Add your professional experience to showcase your expertise
              </Text>
            </View>
          )}

          {editingSections.workExperience && (
            <TouchableOpacity 
              style={styles.addFirstExperienceButton}
              onPress={() => openExperienceModal()}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addFirstExperienceText}>Add Experience</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Enhanced Availability Section */}
        <View style={styles.section}>
          <SectionHeader 
            title="Availability" 
            section="availability" 
            icon="time-outline" 
          />
          
          <TouchableOpacity 
            style={styles.availabilityContainer}
            onPress={() => setShowAvailabilityModal(true)}
            disabled={updatingAvailability}
          >
            <View style={styles.availabilityInfo}>
              <View style={[styles.availabilityBadge, { backgroundColor: getCurrentAvailability().color }]}>
                <Ionicons name={getCurrentAvailability().icon} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.availabilityTextContainer}>
                <Text style={styles.availabilityStatus}>{getCurrentAvailability().label}</Text>
                <Text style={styles.availabilityDescription}>
                  {getAvailabilityDescription()}
                </Text>
                {profileData.availability?.currentTaskCount > 0 && (
                  <Text style={styles.currentTasksText}>
                    {profileData.availability.currentTaskCount} active task{profileData.availability.currentTaskCount !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            </View>
            {updatingAvailability ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            )}
          </TouchableOpacity>
        </View>

        {/* Reviews & Ratings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="star-outline" size={20} color="#6366F1" />
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
                <Ionicons name="chevron-forward" size={16} color="#6366F1" />
              </TouchableOpacity>
            )}
          </View>
          
          <ReviewsComponent 
            reviews={profileData.ratingsReceived || []}
            averageRating={profileData.rating || 0}
            totalReviews={profileData.numberOfRatings || 0}
            onViewAll={()=>navigation.navigate('AllReviews', { 
              reviews: profileData.ratingsReceived || [],
              userName: profileData.name,
              averageRating: profileData.rating || 0,
              totalReviews: profileData.numberOfRatings || 0
            })}
          />
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <SectionHeader 
            title="Notifications" 
            section="notifications" 
            icon="notifications-outline" 
          />
          
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

        {/* Account Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="settings-outline" size={20} color="#6366F1" />
              <Text style={styles.sectionTitle}>Account</Text>
            </View>
          </View>
          
          <View style={styles.accountActions}>
            <TouchableOpacity style={styles.accountButton}  onPress={()=>navigate('EarningScreen')}>
              <Ionicons name="lock-closed-outline" size={20} color="#6366F1" />
              <Text style={styles.accountButtonText}>Earnings</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.accountButton} onPress={() => navigate("PaymentMethodScreen")}>
              <Ionicons name="card-outline" size={20} color="#6366F1" />
              <Text style={styles.accountButtonText}>Payment Methods</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={()=>navigate('SupportScreen')} style={styles.accountButton}>
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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Member since {formatMemberSince()}
          </Text>
        </View>
      </Animated.ScrollView>

      {/* Availability Modal */}
      <Modal
        visible={showAvailabilityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAvailabilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Availability</Text>
              <TouchableOpacity onPress={() => setShowAvailabilityModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.modalSubtitle}>Select your current status:</Text>
              
              {AVAILABILITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.availabilityOption,
                    profileData.availability?.status === option.value && styles.availabilityOptionSelected
                  ]}
                  onPress={() => {
                    setProfileData({
                      ...profileData,
                      availability: {
                        ...profileData.availability,
                        status: option.value,
                        manuallySet: true
                      }
                    });
                  }}
                >
                  <View style={[styles.availabilityOptionIcon, { backgroundColor: option.color }]}>
                    <Ionicons name={option.icon} size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.availabilityOptionText}>
                    <Text style={styles.availabilityOptionLabel}>{option.label}</Text>
                    <Text style={styles.availabilityOptionDescription}>{option.description}</Text>
                  </View>
                  {profileData.availability?.status === option.value && (
                    <Ionicons name="checkmark" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}

              {/* Next Available Date for Away Status */}
              {profileData.availability?.status === 'away' && (
                <View style={styles.nextAvailableContainer}>
                  <Text style={styles.formLabel}>When will you be back?</Text>
                  <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={() => setShowNextAvailablePicker(true)}
                  >
                    <Text style={[
                      styles.dateInputText, 
                      !profileData.availability.nextAvailableAt && styles.placeholderText
                    ]}>
                      {profileData.availability.nextAvailableAt 
                        ? `${formatDisplayDate(profileData.availability.nextAvailableAt)} at ${formatDisplayTime(profileData.availability.nextAvailableAt)}`
                        : 'Select date and time'
                      }
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6366F1" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Current Tasks Info */}
              {profileData.availability?.currentTaskCount > 0 && (
                <View style={styles.currentTasksContainer}>
                  <Ionicons name="information-circle" size={20} color="#6366F1" />
                  <Text style={styles.currentTasksInfo}>
                    You have {profileData.availability.currentTaskCount} active task{profileData.availability.currentTaskCount !== 1 ? 's' : ''}. 
                    Changing to 'Offline' won't affect current tasks.
                  </Text>
                </View>
              )}

              {showNextAvailablePicker && (
                <DateTimePicker
                  value={profileData.availability.nextAvailableAt ? new Date(profileData.availability.nextAvailableAt) : new Date()}
                  mode="datetime"
                  display="default"
                  onChange={onNextAvailableChange}
                  minimumDate={new Date()}
                />
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAvailabilityModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, updatingAvailability && styles.saveButtonDisabled]}
                onPress={() => handleUpdateAvailability(profileData.availability.status)}
                disabled={updatingAvailability}
              >
                {updatingAvailability ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Update Availability</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Work Experience Modal */}
      <Modal
        visible={showExperienceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeExperienceModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingExperience ? 'Edit Experience' : 'Add Work Experience'}
              </Text>
              <TouchableOpacity onPress={closeExperienceModal}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Job Title *</Text>
                <TextInput
                  style={styles.formInput}
                  value={experienceForm.jobTitle}
                  onChangeText={(text) => setExperienceForm({ ...experienceForm, jobTitle: text })}
                  placeholder="e.g., Freelance Handyman"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Company or Client *</Text>
                <TextInput
                  style={styles.formInput}
                  value={experienceForm.company}
                  onChangeText={(text) => setExperienceForm({ ...experienceForm, company: text })}
                  placeholder="e.g., Self-Employed or ABC Properties"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Updated Date Fields with Pickers */}
              <View style={styles.formRow}>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.formLabel}>Start Date *</Text>
                  <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={[
                      styles.dateInputText, 
                      !experienceForm.startDate && styles.placeholderText
                    ]}>
                      {formatDisplayDate(experienceForm.startDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6366F1" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.formGroupHalf}>
                  <Text style={styles.formLabel}>End Date</Text>
                  <TouchableOpacity 
                    style={[
                      styles.dateInput,
                      experienceForm.currentlyWorking && styles.dateInputDisabled
                    ]}
                    onPress={() => !experienceForm.currentlyWorking && setShowEndDatePicker(true)}
                    disabled={experienceForm.currentlyWorking}
                  >
                    <Text style={[
                      styles.dateInputText, 
                      !experienceForm.endDate && styles.placeholderText,
                      experienceForm.currentlyWorking && styles.disabledText
                    ]}>
                      {experienceForm.currentlyWorking ? 'Present' : formatDisplayDate(experienceForm.endDate)}
                    </Text>
                    {!experienceForm.currentlyWorking && (
                      <Ionicons name="calendar-outline" size={20} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setExperienceForm({ 
                    ...experienceForm, 
                    currentlyWorking: !experienceForm.currentlyWorking,
                    endDate: !experienceForm.currentlyWorking ? '' : experienceForm.endDate
                  })}
                >
                  <View style={[styles.checkbox, experienceForm.currentlyWorking && styles.checkboxChecked]}>
                    {experienceForm.currentlyWorking && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>I currently work here</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={experienceForm.description}
                  onChangeText={(text) => setExperienceForm({ ...experienceForm, description: text })}
                  placeholder="Describe your responsibilities, skills used, and achievements..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Date Pickers */}
              {showStartDatePicker && (
                <DateTimePicker
                  value={experienceForm.startDate ? new Date(experienceForm.startDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={onStartDateChange}
                  maximumDate={new Date()}
                />
              )}

              {showEndDatePicker && (
                <DateTimePicker
                  value={experienceForm.endDate ? new Date(experienceForm.endDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={onEndDateChange}
                  minimumDate={experienceForm.startDate ? new Date(experienceForm.startDate) : new Date(1900, 0, 1)}
                  maximumDate={new Date()}
                />
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={closeExperienceModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveExperience}
              >
                <Text style={styles.saveButtonText}>
                  {editingExperience ? 'Update' : 'Save'} Experience
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TaskerProfileScreen;