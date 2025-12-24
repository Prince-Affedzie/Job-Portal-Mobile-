import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Switch,
  TextInput,
  StyleSheet,
  Alert,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// Context & API
import { AuthContext } from '../../context/AuthContext';
import { TaskerContext } from '../../context/TaskerContext';
import { navigate,reset } from '../../services/navigationService';
import { sendFileToS3 } from '../../api/commonApi';
import { uploadProfileImage, updateAvailability, switchAccount } from '../../api/authApi';
import ReviewsComponent from '../../component/common/ReviewsComponent';
import VerificationTooltip from "../../component/common/VerificationToolTip";


// Components
import Header from "../../component/tasker/Header";
import { ProfileField } from '../../component/tasker/ProfileField';
import { LocationField } from '../../component/tasker/LocationField';

// Constants
const { width } = Dimensions.get('window');
const DEFAULT_PROFILE_IMAGE = 'https://res.cloudinary.com/duv3qvvjz/image/upload/v1760376396/male_avatar_fwgmfd.jpg';

// Theme Colors
const THEME = {
  primary: '#1A1F3B',    // Dark blue
  secondary: '#2D1B69',   // Purple
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

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available', color: THEME.success, icon: 'checkmark-circle', description: 'Ready for new tasks' },
  { value: 'busy', label: 'Busy', color: THEME.warning, icon: 'time', description: 'Working on tasks' },
  { value: 'away', label: 'Away', color: THEME.info, icon: 'bed', description: 'Temporarily unavailable' },
  { value: 'offline', label: 'Offline', color: '#6B7280', icon: 'power', description: 'Not accepting tasks' },
];

const TaskerProfileScreen = ({ navigation }) => {
 // const navigation = useNavigation()
  // States
  const [editingSections, setEditingSections] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const { user, logout, updateProfile,setUser } = useContext(AuthContext);
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
  const [fadeAnim] = useState(new Animated.Value(0));

  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  
  // useEffect to check verification status
  useEffect(() => {
    if (user && user.role === 'job_seeker' && !user.isVerified) {
      // Show prompt after a short delay
      const timer = setTimeout(() => {
        setShowVerificationPrompt(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Initialize profile data
  useEffect(() => {
    if (user) {
      const userAvailability = user.availability || {};
      const initialData = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || {
          region: '', city: '', town: '', street: ''
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
        rating: user.rating || 0,
        isVerified: user.isVerified || false,
        performance: user.performance || {},
        numberOfRatings: user.numberOfRatings || 0,
        ratingsReceived: user.ratingsReceived || [],
        createdAt: user.createdAt || new Date().toISOString(),
        ...user
      };

      setProfileData(initialData);
      setOriginalData(initialData);
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

  // Date handlers
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

  // Format helpers
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

  // Editing handlers
  const startEditingSection = (section) => {
    setEditingSections(prev => ({ ...prev, [section]: true }));
  };

  const cancelEditingSection = (section) => {
    if (section === 'profileImage') {
      setProfileData(prev => ({
        ...prev,
        profileImage: originalProfileImage
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        ...getSectionOriginalData(section)
      }));
    }
    
    setEditingSections(prev => ({
      ...prev,
      [section]: false
    }));

    if (section === 'skills') {
      setNewSkill('');
    }
  };

  const getSectionOriginalData = (section) => {
    switch (section) {
      case 'profileImage':
        return { profileImage: originalProfileImage };
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
      default:
        return {};
    }
  };

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

  // Availability update
  const handleUpdateAvailability = async (newStatus) => {
    try {
      setUpdatingAvailability(true);
      const availabilityData = {
        status: newStatus,
        nextAvailableAt: profileData.availability.nextAvailableAt
      };

      const res = await updateAvailability(availabilityData);
      
      if (res.status === 200) {
        setProfileData({
          ...profileData,
          availability: {
            ...profileData.availability,
            status: newStatus,
            manuallySet: true,
            lastActiveAt: new Date().toISOString()
          }
        });

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
        Alert.alert('Success', 'Availability updated successfully!');
      }
    } catch (error) {
      console.error('Availability update error:', error);
      Alert.alert('Error', 'Failed to update availability. Please try again.');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  // Save section
  const handleSaveSection = async (section) => {
    setLoading(true);
    try {
      let finalProfileImage = profileData.profileImage;
      
      const hasImageChanged = profileData.profileImage !== originalProfileImage && 
                           (profileData.profileImage.startsWith('file://') || 
                            profileData.profileImage.startsWith('content://'));
      
      if (hasImageChanged) {
        try {
          finalProfileImage = await uploadImageToS3(profileData.profileImage);
        } catch (error) {
          Alert.alert('Upload Error', 'Failed to upload profile image. Please try again.');
          setLoading(false);
          return;
        }
      }

      const formData = new FormData();
      
      if (section === 'profileImage') {
        formData.append('profileImage', finalProfileImage);
      } else if (section === 'personalInfo' || section === 'skills') {
        formData.append('name', profileData.name);
        formData.append('email', profileData.email);
        formData.append('phone', profileData.phone);
        formData.append('Bio', profileData.Bio);
        formData.append('hourlyRate', profileData.hourlyRate.toString());
        
        if (hasImageChanged) {
          formData.append('profileImage', finalProfileImage);
        }
        
        if (profileData.location) {
          formData.append('location[region]', profileData.location.region || '');
          formData.append('location[city]', profileData.location.city || '');
          formData.append('location[town]', profileData.location.town || '');
          formData.append('location[street]', profileData.location.street || '');
        }
        
        if (profileData.skills) {
          profileData.skills.forEach((skill, index) => {
            formData.append(`skills[${index}]`, skill);
          });
        }
      }

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
        setOriginalData(prev => ({
          ...prev,
          profileImage: finalProfileImage
        }));
        setOriginalProfileImage(finalProfileImage);
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
      skills: 'Skills',
      workExperience: 'Work experience',
      availability: 'Availability',
      notifications: 'Notification settings',
      profileImage: 'Profile image',
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

  // Skills management
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

  // Work Experience functions
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

  // Notifications
  const toggleNotification = (type) => {
    setNotifications({
      ...notifications,
      [type]: !notifications[type],
    });
  };

  // Account actions
  const handleSwitchToClient = async() => {
    Alert.alert(
      'Switch to Client Mode',
      'Are you sure you want to switch to client mode? You can switch back anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Switch', 
          onPress: async() => {
            const res = await switchAccount();
            if(res.status === 200){
              /*Alert.alert('Success', 'Switched to client mode');
             navigation.reset({
                  index: 0,
                  routes: [{ name: 'AuthStack' }],
                });*/
              setUser(res.data.user)
          }
        }
      }
      ]
    );
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

  // Helper functions
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
    if (rating >= 4.5) return THEME.success;
    if (rating >= 4.0) return THEME.warning;
    if (rating >= 3.0) return THEME.warning;
    return THEME.danger;
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
          onPress={() => startEditingSection(section)}
        >
          <Ionicons name="create-outline" size={16} color={THEME.accent} />
        </TouchableOpacity>
      ) : showEdit && editingSections[section] && (
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
              <ActivityIndicator size="small" color={THEME.white} />
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
      <Header title="My Profile" showBack={false} />
      <VerificationTooltip 
        placement="right"
        offset={12}
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
                
                {!editingSections.profileImage ? (
                  <TouchableOpacity 
                    style={styles.editImageButton} 
                    onPress={() => startEditingSection('profileImage')}
                  >
                    <Ionicons name="camera" size={16} color={THEME.white} />
                  </TouchableOpacity>
                ) : (
                  <>
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
                    
                    {profileData.profileImage !== originalProfileImage && (
                      <TouchableOpacity 
                        style={styles.saveImageButton}
                        onPress={() => handleSaveSection('profileImage')}
                        disabled={loading || imageUploading}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color={THEME.white} />
                        ) : (
                          <Ionicons name="checkmark" size={16} color={THEME.white} />
                        )}
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
            
            {/* Profile Info */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profileData.name || 'Tasker'}</Text>
              <Text style={styles.profileTitle}>{getPrimarySkill()}</Text>
              
              <View style={styles.ratingVerificationContainer}>
                {profileData.rating > 0 && (
                  <View style={[styles.ratingContainer, { backgroundColor: getRatingColor(profileData.rating) }]}>
                    <Ionicons name="star" size={12} color={THEME.white} />
                    <Text style={styles.ratingText}>
                      {parseFloat(profileData.rating || 0).toFixed(1)}
                    </Text>
                  </View>
                )}
                
                {profileData.isVerified && (
                  <View style={styles.verificationBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={THEME.success} />
                    <Text style={styles.verificationText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.headerStats}>
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{profileData.performance?.tasksCompleted || '0'}</Text>
              <Text style={styles.headerStatLabel}>Completed</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{`${profileData.performance?.onTimeCompletionRate || '0'}%`}</Text>
              <Text style={styles.headerStatLabel}>On Time</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>GHS {profileData.hourlyRate || '0'}</Text>
              <Text style={styles.headerStatLabel}>Hourly Rate</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Switch to Client Button */}
        <TouchableOpacity 
          style={styles.switchAccountButton}
          onPress={handleSwitchToClient}
        >
          <Ionicons name="swap-horizontal" size={18} color={THEME.primary} />
          <Text style={styles.switchAccountText}>Switch to Client Mode</Text>
          <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} />
        </TouchableOpacity>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <SectionHeader 
            title="Personal Information" 
            section="personalInfo" 
            icon="person-outline" 
          />
          
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
            placeholder="Tell clients about your skills and experience..."
            editing={editingSections.personalInfo}
            setProfileData={setProfileData}
            characterCount
            maxLength={500}
            containerStyle={styles.bioField}
          />
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
                      <Ionicons name="close" size={12} color={THEME.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No skills added yet</Text>
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
                placeholderTextColor={THEME.textSecondary}
              />
              <TouchableOpacity 
                style={[styles.addSkillButton, !newSkill.trim() && styles.addSkillButtonDisabled]} 
                onPress={addSkill}
                disabled={!newSkill.trim()}
              >
                <Ionicons name="add" size={18} color={THEME.white} />
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
                            <Ionicons name="create-outline" size={16} color={THEME.accent} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.experienceActionButton}
                            onPress={() => removeExperience(experience)}
                          >
                            <Ionicons name="trash-outline" size={16} color={THEME.danger} />
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
              style={styles.addExperienceButton}
              onPress={() => openExperienceModal()}
            >
              <Ionicons name="add" size={20} color={THEME.white} />
              <Text style={styles.addExperienceText}>Add Experience</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Availability Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="time-outline" size={20} color={THEME.accent} />
              <Text style={styles.sectionTitle}>Availability Status</Text>
            </View>
            <TouchableOpacity 
              style={styles.sectionEditButton}
              onPress={() => setShowAvailabilityModal(true)}
            >
              <Ionicons name="create-outline" size={16} color={THEME.accent} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.availabilityCard}
            onPress={() => setShowAvailabilityModal(true)}
          >
            <View style={styles.availabilityContent}>
              <View style={[styles.availabilityIcon, { backgroundColor: getCurrentAvailability().color }]}>
                <Ionicons name={getCurrentAvailability().icon} size={20} color={THEME.white} />
              </View>
              <View style={styles.availabilityText}>
                <Text style={styles.availabilityStatus}>{getCurrentAvailability().label}</Text>
                <Text style={styles.availabilityDescription}>{getAvailabilityDescription()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Work Samples Preview */}
        {/* Enhanced Work Portfolio Preview Section */}
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleContainer}>
      <Ionicons name="trophy-outline" size={22} color={THEME.accent} />
      <Text style={styles.sectionTitle}>Your Work Portfolio</Text>
      {/*<View style={styles.portfolioStatusBadge}>
        <Text style={styles.portfolioStatusText}>
          {profileData.workPortfolio?.length || 0} {profileData.workPortfolio?.length === 1 ? 'Project' : 'Projects'}
        </Text>
      </View>*/}
    </View>
    <TouchableOpacity 
      style={styles.portfolioCtaButton}
      onPress={() => navigate('WorkSamples')}
    >
      <Text style={styles.portfolioCtaText}>Manage</Text>
      <Ionicons name="chevron-forward" size={16} color={THEME.white} />
    </TouchableOpacity>
  </View>
  
  <Text style={styles.portfolioSubtitle}>
    Showcase your best work. A strong portfolio helps you win <Text style={styles.highlightText}>3x more jobs</Text>.
  </Text>
  
  {/* Portfolio Stats & Benefits Card */}
 
  
  {/* Action Card - Clear CTA */}
  <TouchableOpacity 
    style={styles.portfolioActionCard}
    onPress={() => navigate('WorkSamples')}
    activeOpacity={0.9}
  >
    <LinearGradient
      colors={[THEME.primary, THEME.secondary]}
      style={styles.actionCardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.actionCardContent}>
        <View style={styles.actionCardIcon}>
          <Ionicons name="sparkles" size={28} color={THEME.white} />
        </View>
        <View style={styles.actionCardText}>
          <Text style={styles.actionCardTitle}>
            {profileData.workPortfolio?.length > 0 
              ? 'Make Your Portfolio Stand Out' 
              : 'Launch Your Portfolio Today'}
          </Text>
          <Text style={styles.actionCardDescription}>
            {profileData.workPortfolio?.length > 0 
              ? `You have ${profileData.workPortfolio.length} projects. Add more to increase your visibility.` 
              : 'Add your first project to start attracting better clients and higher-paying jobs.'}
          </Text>
        </View>
        <View style={styles.actionCardArrow}>
          <Ionicons name="arrow-forward-circle" size={32} color={THEME.white} />
        </View>
      </View>
    </LinearGradient>
  </TouchableOpacity>
  
  {/* Project Thumbnails Preview */}
  {profileData.workPortfolio && profileData.workPortfolio.length > 0 ? (
    <>
      <View style={styles.portfolioPreviewHeader}>
        <Text style={styles.previewTitle}>Recent Projects</Text>
        <TouchableOpacity onPress={() => navigate('WorkSamples')}>
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.portfolioPreview}
      >
        {profileData.workPortfolio.slice(0, 3).map((project, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.projectThumbnail}
            onPress={() => navigate('WorkSamples', { scrollToProject: project.id })}
          >
            <View style={styles.thumbnailImageContainer}>
              {project.files && project.files.length > 0 ? (
                <Image 
                  source={{ uri: project.files[0].publicUrl }}
                  style={styles.thumbnailImage}
                  defaultSource={{ uri: DEFAULT_PROFILE_IMAGE }}
                />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Ionicons name="images-outline" size={32} color={THEME.textSecondary} />
                </View>
              )}
              <View style={styles.thumbnailBadge}>
                <Ionicons name="image" size={12} color={THEME.white} />
                <Text style={styles.thumbnailBadgeText}>
                  {project.files ? project.files.length : 0}
                </Text>
              </View>
            </View>
            <View style={styles.thumbnailInfo}>
              <Text style={styles.thumbnailTitle} numberOfLines={1}>
                {project.title || 'Untitled Project'}
              </Text>
              <Text style={styles.thumbnailCategory} numberOfLines={1}>
                {project.category || 'General'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        
        {/* Add More Project Button */}
        <TouchableOpacity 
          style={styles.addMoreCard}
          onPress={() => navigate('WorkSamples')}
        >
          <View style={styles.addMoreContent}>
            <Ionicons name="add-circle" size={32} color={THEME.accent} />
            <Text style={styles.addMoreText}>Add More</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </>
  ) : (
    <View style={styles.emptyPortfolioState}>
      <View style={styles.emptyPortfolioIcon}>
        <Ionicons name="images-outline" size={48} color={THEME.textSecondary} />
      </View>
      <Text style={styles.emptyPortfolioTitle}>Your Portfolio is Empty</Text>
      <Text style={styles.emptyPortfolioDescription}>
        Clients want to see your work before hiring. Add projects to:
      </Text>
      <View style={styles.emptyBenefitsList}>
        <View style={styles.emptyBenefitItem}>
          <Ionicons name="checkmark-circle" size={16} color={THEME.success} />
          <Text style={styles.emptyBenefitText}>Attract more clients</Text>
        </View>
        <View style={styles.emptyBenefitItem}>
          <Ionicons name="checkmark-circle" size={16} color={THEME.success} />
          <Text style={styles.emptyBenefitText}>Justify higher rates</Text>
        </View>
        <View style={styles.emptyBenefitItem}>
          <Ionicons name="checkmark-circle" size={16} color={THEME.success} />
          <Text style={styles.emptyBenefitText}>Stand out from competitors</Text>
        </View>
      </View>
    </View>
  )}
  
  {/* Quick Tips */}
  <View style={styles.portfolioTips}>
    <View style={styles.tipsHeader}>
      <Ionicons name="bulb-outline" size={18} color={THEME.warning} />
      <Text style={styles.tipsTitle}>Pro Tip:</Text>
    </View>
    <Text style={styles.tipsText}>
      Include before/after photos and videos, client testimonials, and project details. 
      Tell the story of how you solved a problem.
    </Text>
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

        {/* Notification Settings *
        <View style={styles.section}>
          <SectionHeader 
            title="Notifications" 
            section="notifications" 
            icon="notifications-outline" 
          />
          
          <View style={styles.notificationList}>
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Ionicons name="briefcase-outline" size={20} color={THEME.accent} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationLabel}>Task Alerts</Text>
                  <Text style={styles.notificationDescription}>New tasks and updates</Text>
                </View>
              </View>
              <Switch
                value={notifications.taskAlerts}
                onValueChange={() => toggleNotification('taskAlerts')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={notifications.taskAlerts ? THEME.accent : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={THEME.accent} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationLabel}>Messages</Text>
                  <Text style={styles.notificationDescription}>New messages from clients</Text>
                </View>
              </View>
              <Switch
                value={notifications.messageNotifications}
                onValueChange={() => toggleNotification('messageNotifications')}
                trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                thumbColor={notifications.messageNotifications ? THEME.accent : '#9CA3AF'}
              />
            </View>
          </View>
        </View>*/}

        {/* Account Settings */}
        <View style={styles.section}>
          <SectionHeader 
            title="Account Settings" 
            section="account" 
            icon="settings-outline" 
            showEdit={false}
          />
          
          <View style={styles.settingsList}>
            <TouchableOpacity style={styles.settingItem} onPress={() => navigate('EarningScreen')}>
              <Ionicons name="cash-outline" size={20} color={THEME.accent} />
              <Text style={styles.settingText}>Earnings</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem} onPress={() => navigate("PaymentMethodScreen")}>
              <Ionicons name="card-outline" size={20} color={THEME.accent} />
              <Text style={styles.settingText}>Payment Methods</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem} onPress={() => navigate('SupportScreen')}>
              <Ionicons name="help-circle-outline" size={20} color={THEME.accent} />
              <Text style={styles.settingText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, styles.logoutItem]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={THEME.danger} />
              <Text style={[styles.settingText, styles.logoutText]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Member since {formatMemberSince()}</Text>
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
                <Ionicons name="close" size={24} color={THEME.textSecondary} />
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
                    <Ionicons name={option.icon} size={20} color={THEME.white} />
                  </View>
                  <View style={styles.availabilityOptionText}>
                    <Text style={styles.availabilityOptionLabel}>{option.label}</Text>
                    <Text style={styles.availabilityOptionDescription}>{option.description}</Text>
                  </View>
                  {profileData.availability?.status === option.value && (
                    <Ionicons name="checkmark" size={20} color={THEME.success} />
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
                    <Ionicons name="calendar-outline" size={20} color={THEME.accent} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Current Tasks Info */}
              {profileData.availability?.currentTaskCount > 0 && (
                <View style={styles.currentTasksContainer}>
                  <Ionicons name="information-circle" size={20} color={THEME.accent} />
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
                  <ActivityIndicator size="small" color={THEME.white} />
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
                <Ionicons name="close" size={24} color={THEME.textSecondary} />
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
                  placeholderTextColor={THEME.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Company or Client *</Text>
                <TextInput
                  style={styles.formInput}
                  value={experienceForm.company}
                  onChangeText={(text) => setExperienceForm({ ...experienceForm, company: text })}
                  placeholder="e.g., Self-Employed or ABC Properties"
                  placeholderTextColor={THEME.textSecondary}
                />
              </View>

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
                    <Ionicons name="calendar-outline" size={20} color={THEME.accent} />
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
                      <Ionicons name="calendar-outline" size={20} color={THEME.accent} />
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
                      <Ionicons name="checkmark" size={16} color={THEME.white} />
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
                  placeholderTextColor={THEME.textSecondary}
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
  saveImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: THEME.success,
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
  profileTitle: {
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
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 14,
    color: THEME.textPrimary,
  },
  removeSkillButton: {
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontStyle: 'italic',
  },
  addSkillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.textPrimary,
    marginRight: 8,
  },
  addSkillButton: {
    backgroundColor: THEME.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSkillButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  // Work Experience Styles
  experienceList: {
    marginBottom: 16,
  },
  experienceItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  experienceContent: {
    flex: 1,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  experienceJobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textPrimary,
    flex: 1,
  },
  experienceActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  experienceActionButton: {
    padding: 4,
    marginLeft: 8,
  },
  experienceCompany: {
    fontSize: 14,
    color: THEME.accent,
    fontWeight: '500',
    marginBottom: 8,
  },
  experienceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  experienceDuration: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  experienceLength: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  experienceDescription: {
    fontSize: 14,
    color: THEME.textPrimary,
    lineHeight: 20,
  },
  emptyExperience: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyExperienceText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyExperienceSubtext: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  addExperienceButton: {
    backgroundColor: THEME.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  addExperienceText: {
    color: THEME.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Availability Styles
  availabilityCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  availabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  availabilityText: {
    flex: 1,
  },
  availabilityStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  availabilityDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  // Work Samples Styles
  // Add these styles to your existing StyleSheet
portfolioStatusBadge: {
  backgroundColor: THEME.accent,
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 10,
  marginLeft: 8,
},
portfolioStatusText: {
  color: THEME.white,
  fontSize: 11,
  fontWeight: '600',
},
portfolioCtaButton: {
  backgroundColor: THEME.accent,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
},
portfolioCtaText: {
  color: THEME.white,
  fontSize: 14,
  fontWeight: '600',
  marginRight: 4,
},
portfolioSubtitle: {
  fontSize: 14,
  color: THEME.textPrimary,
  marginBottom: 16,
  lineHeight: 20,
},
highlightText: {
  color: THEME.success,
  fontWeight: '700',
},
portfolioBenefitsCard: {
  backgroundColor: '#F8FAFC',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
},
benefitsGrid: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
benefitItem: {
  alignItems: 'center',
  flex: 1,
  paddingHorizontal: 8,
},
benefitIcon: {
  width: 48,
  height: 48,
  borderRadius: 24,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
},
benefitTitle: {
  fontSize: 13,
  fontWeight: '600',
  color: THEME.textPrimary,
  textAlign: 'center',
  marginBottom: 4,
},
benefitDescription: {
  fontSize: 11,
  color: THEME.textSecondary,
  textAlign: 'center',
  lineHeight: 14,
},
portfolioActionCard: {
  borderRadius: 16,
  overflow: 'hidden',
  marginBottom: 20,
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
},
actionCardGradient: {
  padding: 20,
},
actionCardContent: {
  flexDirection: 'row',
  alignItems: 'center',
},
actionCardIcon: {
  marginRight: 16,
},
actionCardText: {
  flex: 1,
},
actionCardTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: THEME.white,
  marginBottom: 4,
},
actionCardDescription: {
  fontSize: 14,
  color: 'rgba(255, 255, 255, 0.9)',
  lineHeight: 18,
},
actionCardArrow: {
  marginLeft: 12,
},
portfolioPreviewHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
previewTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: THEME.textPrimary,
},
viewAllLink: {
  fontSize: 14,
  color: THEME.accent,
  fontWeight: '500',
},
portfolioPreview: {
  flexDirection: 'row',
  marginBottom: 20,
},
projectThumbnail: {
  width: 140,
  marginRight: 12,
  backgroundColor: THEME.white,
  borderRadius: 12,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: THEME.border,
},
thumbnailImageContainer: {
  width: '100%',
  height: 100,
  position: 'relative',
},
thumbnailImage: {
  width: '100%',
  height: '100%',
},
thumbnailPlaceholder: {
  width: '100%',
  height: '100%',
  backgroundColor: '#F8FAFC',
  alignItems: 'center',
  justifyContent: 'center',
},
thumbnailBadge: {
  position: 'absolute',
  top: 8,
  right: 8,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 10,
},
thumbnailBadgeText: {
  color: THEME.white,
  fontSize: 10,
  fontWeight: '600',
  marginLeft: 2,
},
thumbnailInfo: {
  padding: 12,
},
thumbnailTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: THEME.textPrimary,
  marginBottom: 4,
},
thumbnailCategory: {
  fontSize: 12,
  color: THEME.textSecondary,
},
addMoreCard: {
  width: 140,
  backgroundColor: '#F8FAFC',
  borderRadius: 12,
  borderWidth: 2,
  borderColor: THEME.border,
  borderStyle: 'dashed',
  alignItems: 'center',
  justifyContent: 'center',
},
addMoreContent: {
  alignItems: 'center',
  padding: 20,
},
addMoreText: {
  fontSize: 14,
  fontWeight: '600',
  color: THEME.accent,
  marginTop: 8,
},
emptyPortfolioState: {
  alignItems: 'center',
  backgroundColor: '#F8FAFC',
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
},
emptyPortfolioIcon: {
  marginBottom: 16,
},
emptyPortfolioTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: THEME.textPrimary,
  marginBottom: 12,
},
emptyPortfolioDescription: {
  fontSize: 14,
  color: THEME.textSecondary,
  textAlign: 'center',
  marginBottom: 16,
  lineHeight: 20,
},
emptyBenefitsList: {
  alignSelf: 'stretch',
},
emptyBenefitItem: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},
emptyBenefitText: {
  fontSize: 14,
  color: THEME.textPrimary,
  marginLeft: 8,
},
portfolioTips: {
  backgroundColor: 'rgba(245, 158, 11, 0.05)',
  borderLeftWidth: 4,
  borderLeftColor: THEME.warning,
  padding: 12,
  borderRadius: 8,
},
tipsHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 4,
},
tipsTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: THEME.warning,
  marginLeft: 8,
},
tipsText: {
  fontSize: 13,
  color: THEME.textPrimary,
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
  // Notification Styles
  notificationList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    overflow: 'hidden',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationText: {
    marginLeft: 12,
    flex: 1,
  },
  notificationLabel: {
    fontSize: 16,
    color: THEME.textPrimary,
    fontWeight: '500',
  },
  notificationDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  // Settings Styles
  settingsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
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
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  modalForm: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 16,
  },
  availabilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  availabilityOptionSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: THEME.accent,
  },
  availabilityOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  availabilityOptionText: {
    flex: 1,
  },
  availabilityOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  availabilityOptionDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  nextAvailableContainer: {
    marginTop: 20,
  },
  currentTasksContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  currentTasksInfo: {
    flex: 1,
    fontSize: 14,
    color: THEME.textPrimary,
    marginLeft: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: THEME.textPrimary,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formGroupHalf: {
    width: '48%',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: THEME.textPrimary,
  },
  dateInputDisabled: {
    backgroundColor: '#F1F5F9',
  },
  placeholderText: {
    color: THEME.textSecondary,
  },
  disabledText: {
    color: '#94A3B8',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: THEME.accent,
    borderColor: THEME.accent,
  },
  checkboxLabel: {
    fontSize: 16,
    color: THEME.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  saveButton: {
    flex: 2,
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: THEME.accent,
  },
  saveButtonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.white,
  },
});

export default TaskerProfileScreen;