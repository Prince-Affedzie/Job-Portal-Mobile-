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

import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

// Default profile image
const DEFAULT_PROFILE_IMAGE = 'https://res.cloudinary.com/duv3qvvjz/image/upload/v1760376396/male_avatar_fwgmfd.jpg';

const TaskerProfileScreen = ({ navigation }) => {
  const [editing, setEditing] = useState(false);
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
        Bio: user.Bio || '',
        skills: user.skills || [],
        hourlyRate: user.hourlyRate || 0,
        availability: user.availability || 'Available',
        profileImage: user.profileImage || DEFAULT_PROFILE_IMAGE,
        workExperience: user.workExperience || [],
        education: user.education || [],
        workPortfolio: user.workPortfolio || [],
        // Add other schema fields as needed
        ...user
      });
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

  const handleSave = async () => {
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
      
      // Add all profile data fields
      formData.append('name', profileData.name);
      formData.append('email', profileData.email);
      formData.append('phone', profileData.phone);
      formData.append('Bio', profileData.Bio);
      formData.append('hourlyRate', profileData.hourlyRate.toString());
      formData.append('availability', profileData.availability);
      
      // Add the profile image URL (either the existing one or the new S3 URL)
      formData.append('profileImage', finalProfileImage);
      
      // Handle location object
      if (profileData.location) {
        formData.append('location[region]', profileData.location.region || '');
        formData.append('location[city]', profileData.location.city || '');
        formData.append('location[town]', profileData.location.town || '');
        formData.append('location[street]', profileData.location.street || '');
      }
      
      // Handle arrays
      if (profileData.skills) {
        profileData.skills.forEach((skill, index) => {
          formData.append(`skills[${index}]`, skill);
        });
      }
      
      // Properly handle work experience dates
      if (profileData.workExperience) {
        profileData.workExperience.forEach((exp, index) => {
          formData.append(`workExperience[${index}][jobTitle]`, exp.jobTitle || '');
          formData.append(`workExperience[${index}][company]`, exp.company || '');
          
          // Ensure startDate is a valid date string
          if (exp.startDate && exp.startDate instanceof Date) {
            formData.append(`workExperience[${index}][startDate]`, exp.startDate.toISOString());
          } else if (exp.startDate && typeof exp.startDate === 'string') {
            // If it's already a string, validate it's a proper date
            const date = new Date(exp.startDate);
            if (!isNaN(date.getTime())) {
              formData.append(`workExperience[${index}][startDate]`, date.toISOString());
            } else {
              console.warn('Invalid startDate:', exp.startDate);
              // Skip this experience entry or handle error
              return;
            }
          } else {
            console.warn('Missing or invalid startDate for experience:', exp);
            // Skip this experience entry
            return;
          }
          
          // Handle endDate (can be null if currently working)
          if (exp.endDate && exp.endDate instanceof Date) {
            formData.append(`workExperience[${index}][endDate]`, exp.endDate.toISOString());
          } else if (exp.endDate && typeof exp.endDate === 'string') {
            const date = new Date(exp.endDate);
            if (!isNaN(date.getTime())) {
              formData.append(`workExperience[${index}][endDate]`, date.toISOString());
            }
          }
          // If endDate is null/undefined, don't send it (handles "currently working" case)
          
          formData.append(`workExperience[${index}][description]`, exp.description || '');
        });
      }

      const res = await updateProfile(formData);
      if (res?.status === 200) {
        // Update the original image reference
        setOriginalProfileImage(finalProfileImage);
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
      setEditing(false);
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

    // FIX: Ensure we have valid Date objects
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
      startDate: startDateObj, // Use the Date object
      endDate: endDateObj, // Use the Date object or null
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header */}
      <Header 
        title="My Profile" 
        rightComponent={
          <TouchableOpacity 
            style={[styles.headerButton, editing && styles.headerButtonActive]}
            onPress={editing ? handleSave : () => setEditing(true)}
            disabled={loading || imageUploading}
          >
            {loading || imageUploading ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Text style={[styles.headerButtonText, editing && styles.headerButtonTextActive]}>
                {editing ? 'Save' : 'Edit'}
              </Text>
            )}
          </TouchableOpacity>
        }
      />

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
            {editing && (
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
            )}
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

        {/* Rest of your existing JSX remains the same */}
        {/* Enhanced Stats Overview */}
        <View style={styles.statsContainer}>
          <StatsCard 
            value="N/A" 
            label="Completed" 
            icon="checkmark-done" 
            color="#10B981" 
          />
          <StatsCard 
            value="N/A"  
            label="Success Rate" 
            icon="trending-up" 
            color="#6366F1" 
          />
          <StatsCard 
            value="N/A" 
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
              editing={editing}
              setProfileData={setProfileData}
            />
            <ProfileField
              label="Email"
              value={profileData.email}
              editable
              onChange={(text) => setProfileData({ ...profileData, email: text })}
              placeholder="Enter your email"
              editing={editing}
              setProfileData={setProfileData}
            />
            <ProfileField
              label="Phone"
              value={profileData.phone}
              editable
              onChange={(text) => setProfileData({ ...profileData, phone: text })}
              placeholder="Enter your phone number"
              editing={editing}
              setProfileData={setProfileData}
              profileData={profileData}
            />
            
            {/* Location Fields */}
            <LocationField
              label="City"
              field="city"
              value={profileData.location?.city}
              editable
              editing={editing}
              setProfileData={setProfileData}
              profileData={profileData}
            />
            <LocationField
              label="Region"
              field="region"
              value={profileData.location?.region}
              editable
              editing={editing}
              setProfileData={setProfileData}
              profileData={profileData}
            />
            <LocationField
              label="Town"
              field="town"
              value={profileData.location?.town}
              editable
              editing={editing}
              setProfileData={setProfileData}
              profileData={profileData}
            />
            <LocationField
              label="Street"
              field="street"
              value={profileData.location?.street}
              editable
              editing={editing}
              setProfileData={setProfileData}
              profileData={profileData}
            />
            
            <ProfileField
              label="Bio"
              value={profileData.Bio}
              editable
              onChange={(text) => setProfileData({ ...profileData, Bio: text })}
              multiline
              placeholder="Tell us about yourself and your skills..."
              editing={editing}
              setProfileData={setProfileData}
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

        {/* Work Experience Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase-outline" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {editing && (
              <TouchableOpacity 
                style={styles.addExperienceButton}
                onPress={() => openExperienceModal()}
              >
                <Ionicons name="add" size={20} color="#6366F1" />
              </TouchableOpacity>
            )}
          </View>
          
          {profileData.workExperience && profileData.workExperience.length > 0 ? (
            <View style={styles.experienceList}>
              {profileData.workExperience.map((experience, index) => (
                <View key={index} style={styles.experienceItem}>
                  <View style={styles.experienceContent}>
                    <View style={styles.experienceHeader}>
                      <Text style={styles.experienceJobTitle}>{experience.jobTitle}</Text>
                      {editing && (
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
              {editing && (
                <TouchableOpacity 
                  style={styles.addFirstExperienceButton}
                  onPress={() => openExperienceModal()}
                >
                  <Text style={styles.addFirstExperienceText}>Add First Experience</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Reviews & Ratings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
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
                <Text style={styles.availabilityStatus}>{profileData.availability || 'Not Available'}</Text>
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
            <TouchableOpacity style={styles.accountButton}  onPress={()=>navigate('EarningScreen')}>
              <Ionicons name="lock-closed-outline" size={20} color="#6366F1" />
              <Text style={styles.accountButtonText}>Earnings</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.accountButton} onPress={() => Alert.alert('Payment Method', 'Payment Method Settings feature coming soon!')}>
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

        {/* Enhanced Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Member since {formatMemberSince()}
          </Text>
        </View>
      </Animated.ScrollView>

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