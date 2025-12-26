import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Header from "../../component/tasker/Header";
import { PosterContext } from '../../context/PosterContext';
import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';
import { taskMediaUpload } from '../../api/miniTaskApi';
import { sendFileToS3 } from '../../api/commonApi';

const { width } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const scale = (size) => (width / guidelineBaseWidth) * size;

const categories = [
  "Home Services", "Delivery & Errands", "Digital Services",
  "Writing & Assistance", "Learning & Tutoring", "Creative Tasks",
  "Event Support", "Others"
];

const subcategories = {
  "Home Services": ["Cleaning", "Repairs", "Assembly", "Gardening", "Other"],
  "Delivery & Errands": ["Food Delivery", "Package Delivery", "Grocery Shopping", "Other"],
  "Digital Services": ["Web Development", "Graphic Design", "Social Media", "Data Entry", "Other"],
  "Writing & Assistance": ["Content Writing", "Translation", "Research", "Virtual Assistant", "Other"],
  "Learning & Tutoring": ["Academic Tutoring", "Music Lessons", "Language Teaching", "Skill Training", "Other"],
  "Creative Tasks": ["Photography", "Videography", "Art & Design", "Music Production", "Other"],
  "Event Support": ["Event Planning", "Catering", "Decoration", "Coordination", "Other"],
  "Others": ["General Tasks", "Miscellaneous"]
};

// Enhanced InputField Component (unchanged)
const InputField = React.memo(({ 
  label, value, onChange, placeholder, error, multiline = false, 
  numberOfLines = 1, required = false, icon = null, keyboardType = 'default', ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View style={styles.inputContainer}>
      <View style={styles.labelContainer}>
        <Text style={styles.inputLabel}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      </View>
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputFocused,
        error && styles.inputError,
        multiline && styles.textAreaWrapper
      ]}>
        {icon && <Ionicons name={icon} size={scale(20)} color="#6366F1" style={styles.inputIcon} />}
        <TextInput
          style={[
            styles.textInput,
            multiline && styles.textArea,
            icon && styles.textInputWithIcon
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType={multiline ? 'default' : 'next'}
          {...props}
        />
      </View>
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={scale(14)} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <Text style={styles.helperText}>
          {multiline ? `Characters: ${value.length}/500` : '\u00A0'}
        </Text>
      )}
    </View>
  );
});

// Enhanced Chip Component (unchanged)
const Chip = ({ text, onRemove, variant = 'skill' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = text.length > 20; 

  return (
    <View style={[
      styles.chip,
      variant === 'requirement' ? styles.chipRequirement : styles.chipSkill,
      { minWidth: scale(100), maxWidth: '100%' }
    ]}>
      <TouchableOpacity
        style={styles.chipContent}
        onPress={shouldTruncate ? () => setIsExpanded(!isExpanded) : null}
        activeOpacity={shouldTruncate ? 0.7 : 1}
      >
        <Text
          style={styles.chipText}
          numberOfLines={isExpanded ? undefined : 1}
          ellipsizeMode="tail"
        >
          {text}
        </Text>
        {shouldTruncate && !isExpanded && (
          <Text style={styles.chipMoreIndicator}>...</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onRemove}
        style={styles.chipRemove}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 20 }}
      >
        <Ionicons name="close-circle" size={scale(18)} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
};

// FormSection & EnhancedPicker remain unchanged
const FormSection = ({ title, description, icon, children, collapsible = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <View style={styles.section}>
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => collapsible && setIsCollapsed(!isCollapsed)}
        activeOpacity={collapsible ? 0.7 : 1}
      >
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionIcon}>
            <Ionicons name={icon} size={scale(22)} color="#FFFFFF" />
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {description && !isCollapsed && (
              <Text style={styles.sectionDescription}>{description}</Text>
            )}
          </View>
          {collapsible && (
            <Ionicons 
              name={isCollapsed ? "chevron-down" : "chevron-up"} 
              size={scale(20)} 
              color="#6B7280" 
            />
          )}
        </View>
      </TouchableOpacity>
      
      {!isCollapsed && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  );
};

const EnhancedPicker = ({ label, selectedValue, onValueChange, items, enabled = true, required = false }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <View style={[
      styles.pickerContainer,
      !enabled && styles.pickerDisabled
    ]}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        enabled={enabled}
        dropdownIconColor="#6366F1"
        style={styles.picker}
      >
        <Picker.Item label={`Select ${label.toLowerCase()}`} value="" color="#9CA3AF" />
        {items.map((item, index) => (
          <Picker.Item key={index} label={item} value={item} color="#1F2937" />
        ))}
      </Picker>
    </View>
  </View>
);

const CreateTaskScreen = ({ navigation }) => {
  const { addTask, loading } = useContext(PosterContext);
  const { user } = useContext(AuthContext);

  const [task, setTask] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    biddingType: 'open-bid',
    budget: '',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    locationType: 'remote',
    skillsRequired: [],
    requirements: [],
    address: { region: '', city: '', suburb: '' },
    media: [] // Now stores local + uploaded media
  });

  const [currentSkill, setCurrentSkill] = useState('');
  const [currentRequirement, setCurrentRequirement] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // === MEDIA HANDLING: Local storage only ===
  const pickImage = async () => {
    if (task.media.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum 3 files allowed');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleMediaSelection(result.assets[0], 'image');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickVideo = async () => {
    if (task.media.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum 3 files allowed');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleMediaSelection(result.assets[0], 'video');
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const handleMediaSelection = async (asset, type) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      const fileSizeMB = (fileInfo.size || asset.fileSize || 0) / (1024 * 1024);

      if (fileSizeMB > 10) {
        Alert.alert('File too large', 'Please select a file smaller than 10MB');
        return;
      }

      const localMediaItem = {
        uri: asset.uri,
        type,
        name: asset.fileName || `media_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
        tempId: Date.now(), // for stable key in list
      };

      setTask(prev => ({
        ...prev,
        media: [...prev.media, localMediaItem]
      }));

      Alert.alert(
        'Added!',
        `${type === 'image' ? 'Photo' : 'Video'} added. It will be uploaded when you post the task.`
      );
    } catch (error) {
      console.error('Error adding media:', error);
      Alert.alert('Error', 'Failed to add media');
    }
  };

  const removeMedia = (index) => {
    setTask(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  // === MEDIA PREVIEW: Handles both local URI and uploaded URL ===
  const MediaPreview = ({ media, index }) => (
    <View style={styles.mediaPreview}>
      {media.type === 'image' ? (
        <Image source={{ uri: media.uri || media.url }} style={styles.mediaImage} />
      ) : (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam" size={scale(24)} color="#6366F1" />
          <Text style={styles.videoText}>Video</Text>
        </View>
      )}
      <TouchableOpacity 
        style={styles.removeMediaButton}
        onPress={() => removeMedia(index)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close-circle" size={scale(20)} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  // === FORM VALIDATION (unchanged) ===
  const validateForm = () => {
    const newErrors = {};

    if (!task.title.trim()) newErrors.title = 'Title is required';
    if (task.title.length < 5) newErrors.title = 'Title should be at least 5 characters';
    
    if (!task.description.trim()) newErrors.description = 'Description is required';
    if (task.description.length < 20) newErrors.description = 'Description should be at least 20 characters';
    
    if (!task.category) newErrors.category = 'Category is required';
    
    if (task.budget && parseFloat(task.budget) < 20) {
      newErrors.budget = 'Minimum budget is ₵20';
    }
    
    if (task.deadline < new Date()) newErrors.deadline = 'Deadline must be in the future';
    
    if (task.locationType === 'on-site' && (!task.address.region || !task.address.city)) {
      newErrors.address = 'Region and city are required for on-site tasks';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // === SUBMIT: Upload media first, then post task ===
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    setUploadingMedia(true);

    try {
      let finalMedia = [];

      // Upload any local (not uploaded) media items
      for (const item of task.media) {
        if (item.uri) { // local file
          const file = {
            uri: item.uri,
            name: item.name,
            type: item.type === 'image' ? 'image/jpeg' : 'video/mp4',
          };

          const fileInfoPayload = {
            filename: file.name,
            contentType: file.type,
          };

          const uploadResponse = await taskMediaUpload(fileInfoPayload);
          if (uploadResponse.status !== 200) {
            throw new Error('Failed to prepare media upload');
          }

          const { publicUrl, fileUrl } = uploadResponse.data;
          await sendFileToS3(fileUrl, file);

          finalMedia.push({ url: publicUrl, type: item.type });
        } else {
          // Already uploaded (in case of future edits)
          finalMedia.push({ url: item.url, type: item.type });
        }
      }

      // Prepare final task data
      const taskData = {
        ...task,
        media: finalMedia,
        budget: task.budget ? parseFloat(task.budget) : null,
        deadline: task.deadline.toISOString(),
      };

      if (task.locationType === 'remote') {
        delete taskData.address;
      }

      const result = await addTask(taskData);
      
      if (result.status === 200) {
        Alert.alert(
          '🎉 Task Posted Successfully!',
          'Your task is now under review and will be live shortly.',
          [{ text: 'Got It', onPress: () => navigate('MainTabs', { screen: 'PostedTasks' }) }]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to post task');
      }
    } catch (error) {
      console.error('Error posting task:', error);
      Alert.alert('Error', 'Failed to post task. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadingMedia(false);
    }
  };

  // === SKILLS & REQUIREMENTS (unchanged) ===
  const addSkill = () => {
    if (currentSkill.trim() && !task.skillsRequired.includes(currentSkill.trim())) {
      setTask(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, currentSkill.trim()]
      }));
      setCurrentSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setTask(prev => ({
      ...prev,
      skillsRequired: prev.skillsRequired.filter(skill => skill !== skillToRemove)
    }));
  };

  const addRequirement = () => {
    if (currentRequirement.trim() && !task.requirements.includes(currentRequirement.trim())) {
      setTask(prev => ({
        ...prev,
        requirements: [...prev.requirements, currentRequirement.trim()]
      }));
      setCurrentRequirement('');
    }
  };

  const removeRequirement = (requirementToRemove) => {
    setTask(prev => ({
      ...prev,
      requirements: prev.requirements.filter(req => req !== requirementToRemove)
    }));
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTask(prev => ({ ...prev, deadline: selectedDate }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D325D" />
      <Header title="Create New Task" showBackButton={true} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Task Details */}
        <FormSection title="Task Details" icon="document-text-outline" description="Tell us what you need help with">
          <InputField label="Task Title" value={task.title} onChange={text => setTask(prev => ({ ...prev, title: text }))}
            placeholder="e.g., Website Design, Home Cleaning" error={errors.title}  />
          <InputField label="Description" value={task.description} onChange={text => setTask(prev => ({ ...prev, description: text }))}
            placeholder="Describe what needs to be done..." error={errors.description} multiline numberOfLines={4} required  />
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: scale(8) }}>
              <EnhancedPicker label="Category" selectedValue={task.category} onValueChange={value => setTask(prev => ({ ...prev, category: value, subcategory: '' }))}
                items={categories} required />
            </View>
            <View style={{ flex: 1, marginLeft: scale(8) }}>
              <EnhancedPicker label="Subcategory" selectedValue={task.subcategory} onValueChange={value => setTask(prev => ({ ...prev, subcategory: value }))}
                items={task.category ? subcategories[task.category] || [] : []} enabled={!!task.category} />
            </View>
          </View>
        </FormSection>

        {/* Media Upload */}
        <FormSection title="Photos & Videos" icon="images-outline" description="Add visual references (optional, max 3 files)" collapsible={true}>
          <View style={styles.mediaLimit}>
            <Text style={styles.mediaLimitText}>
              <Ionicons name="information-circle" size={scale(14)} color="#6366F1" />
              {' '}Files added: {task.media.length}/3 (uploaded on post)
            </Text>
          </View>
          
          <View style={styles.mediaButtons}>
            <TouchableOpacity style={[styles.mediaButton, (task.media.length >= 3 || uploadingMedia) && styles.mediaButtonDisabled]}
              onPress={pickImage} disabled={task.media.length >= 3 || uploadingMedia}>
              <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.mediaButtonGradient}>
                <Ionicons name="image-outline" size={scale(20)} color="#FFFFFF" />
                <Text style={styles.mediaButtonText}>Add Photo</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.mediaButton, (task.media.length >= 3 || uploadingMedia) && styles.mediaButtonDisabled]}
              onPress={pickVideo} disabled={task.media.length >= 3 || uploadingMedia}>
              <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.mediaButtonGradient}>
                <Ionicons name="videocam-outline" size={scale(20)} color="#FFFFFF" />
                <Text style={styles.mediaButtonText}>Add Video</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {uploadingMedia && (
            <View style={styles.uploadingIndicator}>
              <ActivityIndicator size="small" color="#6366F1" />
              <Text style={styles.uploadingText}>Preparing media for upload...</Text>
            </View>
          )}

          {task.media.length > 0 && (
            <View style={styles.mediaPreviews}>
              {task.media.map((media, index) => (
                <MediaPreview key={media.tempId || index} media={media} index={index} />
              ))}
            </View>
          )}

          <View style={styles.mediaTip}>
            <Ionicons name="bulb-outline" size={scale(16)} color="#F59E0B" />
            <Text style={styles.mediaTipText}>
              Clear photos/videos help taskers understand your requirements better
            </Text>
          </View>
        </FormSection>

        {/* Skills & Requirements */}
        <FormSection title="Requirements & Skills" icon="checkmark-done-outline" description="Specify what skills and deliverables are needed" collapsible={true}>
          {/* Skills */}
          <View style={styles.chipInputWrapper}>
            <Text style={styles.chipSectionLabel}>Required Skills</Text>
            <Text style={styles.chipSectionDescription}>Add skills that taskers need to have (e.g., Web Design, Photography)</Text>
            
            <View style={styles.chipInputStackedContainer}>
              <TextInput style={styles.chipInputStacked} value={currentSkill} onChangeText={setCurrentSkill}
                placeholder="Type a skill and press Add..." onSubmitEditing={addSkill} returnKeyType="done" blurOnSubmit={false} />
              <TouchableOpacity style={[styles.addChipButtonStacked, !currentSkill.trim() && styles.addChipButtonDisabled]}
                onPress={addSkill} disabled={!currentSkill.trim()}>
                <Ionicons name="add-circle" size={scale(22)} color="#FFFFFF" />
                <Text style={styles.addChipButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            {task.skillsRequired.length > 0 && (
              <View style={styles.chipsContainer}>
                <Text style={styles.chipsLabel}>Skills Added ({task.skillsRequired.length}):</Text>
                <View style={styles.chipsGrid}>
                  {task.skillsRequired.map((skill, index) => (
                    <Chip key={index} text={skill} onRemove={() => removeSkill(skill)} variant="skill" />
                  ))}
                </View>
              </View>
            )}
            <View style={styles.sectionSeparator} />
          </View>

          {/* Requirements */}
          <View style={styles.chipInputWrapper}>
            <Text style={styles.chipSectionLabel}>Deliverables & Requirements</Text>
            <Text style={styles.chipSectionDescription}>Specify what needs to be delivered (e.g., Source files, Documentation)</Text>
            
            <View style={styles.chipInputStackedContainer}>
              <TextInput style={styles.chipInputStacked} value={currentRequirement} onChangeText={setCurrentRequirement}
                placeholder="Type a requirement and press Add..." onSubmitEditing={addRequirement} returnKeyType="done" blurOnSubmit={false} />
              <TouchableOpacity style={[styles.addChipButtonStacked, !currentRequirement.trim() && styles.addChipButtonDisabled]}
                onPress={addRequirement} disabled={!currentRequirement.trim()}>
                <Ionicons name="add-circle" size={scale(22)} color="#FFFFFF" />
                <Text style={styles.addChipButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            {task.requirements.length > 0 && (
              <View style={styles.chipsContainer}>
                <Text style={styles.chipsLabel}>Deliverables ({task.requirements.length}):</Text>
                <View style={styles.chipsGrid}>
                  {task.requirements.map((req, index) => (
                    <Chip key={index} text={req} onRemove={() => removeRequirement(req)} variant="requirement" />
                  ))}
                </View>
              </View>
            )}
          </View>
        </FormSection>

        {/* Budget Section */}
        <FormSection 
          title="Budget" 
          icon="cash-outline"
          description="Set your budget for this task (optional)"
          collapsible={true}
        >
          <View style={styles.budgetContainer}>
            <InputField
              label="Amount (GHS)"
              value={task.budget}
              onChange={(text) => setTask(prev => ({ ...prev, budget: text.replace(/[^0-9.]/g, '') }))}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.budget}
              icon="cash-outline"
            />
            
            <View style={styles.budgetTip}>
              <View style={styles.tipHeader}>
                <Ionicons name="information-circle" size={scale(16)} color="#6366F1" />
                <Text style={styles.tipTitle}>Budget Tips</Text>
              </View>
              <View style={styles.tipList}>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark" size={scale(14)} color="#10B981" />
                  <Text style={styles.tipText}>Minimum: ₵20</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark" size={scale(14)} color="#10B981" />
                  <Text style={styles.tipText}>Higher budgets attract experienced taskers</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark" size={scale(14)} color="#10B981" />
                  <Text style={styles.tipText}>Consider task complexity when setting budget</Text>
                </View>
              </View>
            </View>
          </View>
        </FormSection>

        {/* Timeline & Location */}
        <FormSection 
          title="When & Where" 
          icon="location-outline"
          description="Set deadline and location preferences"
          collapsible={true}
        >
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={styles.dateButtonGradient}
            >
              <Ionicons name="calendar-outline" size={scale(20)} color="#FFFFFF" />
              <Text style={styles.dateText}>
                Deadline: {task.deadline.toLocaleDateString()}
              </Text>
              <Ionicons name="chevron-down" size={scale(16)} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={task.deadline}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          <View style={styles.locationContainer}>
            <Text style={styles.locationTitle}>Location Type</Text>
            <View style={styles.locationOptions}>
              {[
                { id: 'remote', label: 'Remote Work', icon: 'laptop-outline' },
                { id: 'on-site', label: 'On-site Work', icon: 'location-outline' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.locationOption,
                    task.locationType === option.id && styles.locationOptionActive
                  ]}
                  onPress={() => setTask(prev => ({ ...prev, locationType: option.id }))}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={scale(24)} 
                    color={task.locationType === option.id ? '#6366F1' : '#9CA3AF'} 
                  />
                  <Text style={[
                    styles.locationLabel,
                    task.locationType === option.id && styles.locationLabelActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {task.locationType === 'on-site' && (
              <View style={styles.addressContainer}>
                <Text style={styles.addressTitle}>Address Details</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: scale(8) }}>
                    <InputField
                      label="Region"
                      value={task.address.region}
                      onChange={(text) => setTask(prev => ({
                        ...prev,
                        address: { ...prev.address, region: text }
                      }))}
                      placeholder="Greater Accra"
                      icon="navigate-outline"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: scale(8) }}>
                    <InputField
                      label="City"
                      value={task.address.city}
                      onChange={(text) => setTask(prev => ({
                        ...prev,
                        address: { ...prev.address, city: text }
                      }))}
                      placeholder="Accra"
                      icon="business-outline"
                    />
                  </View>
                </View>
                <InputField
                  label="Suburb/Street"
                  value={task.address.suburb}
                  onChange={(text) => setTask(prev => ({
                    ...prev,
                    address: { ...prev.address, suburb: text }
                  }))}
                  placeholder="e.g., East Legon"
                  icon="home-outline"
                />
              </View>
            )}
          </View>
        </FormSection>

        {/* Summary Preview */}
        <FormSection 
          title="Summary" 
          icon="eye-outline"
          description="Preview your task before posting"
          collapsible={true}
        >
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Task Title:</Text>
              <Text style={styles.summaryValue}>{task.title || 'Not set'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Category:</Text>
              <Text style={styles.summaryValue}>
                {task.category ? `${task.category}${task.subcategory ? ` › ${task.subcategory}` : ''}` : 'Not set'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Budget:</Text>
              <Text style={styles.summaryValue}>
                {task.budget ? `₵${parseFloat(task.budget).toFixed(2)}` : 'Not specified'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Deadline:</Text>
              <Text style={styles.summaryValue}>
                {task.deadline ? task.deadline.toLocaleDateString() : 'Not set'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Location:</Text>
              <Text style={styles.summaryValue}>
                {task.locationType === 'remote' ? 'Remote' : 
                 task.address.city ? `${task.address.city}, ${task.address.region}` : 'Not specified'}
              </Text>
            </View>
          </View>
        </FormSection>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.submitGradient}>
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Posting Task...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={scale(22)} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Post Task</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By posting, you agree to our{' '}
            <Text style={styles.footerLink}>Terms</Text> and{' '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
          <Text style={styles.footerNote}>
            Your task will be reviewed before going live
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D325D',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(32),
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    marginBottom: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: scale(20),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    backgroundColor: '#6366F1',
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: scale(4),
  },
  sectionDescription: {
    fontSize: scale(14),
    color: '#64748B',
    lineHeight: scale(20),
  },
  sectionContent: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(20),
  },
  // Input Styles
  inputContainer: {
    marginBottom: scale(20),
  },
  labelContainer: {
    marginBottom: scale(8),
  },
  inputLabel: {
    fontSize: scale(15),
    fontWeight: '600',
    color: '#374151',
  },
  required: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: scale(1.5),
    borderColor: '#E2E8F0',
    borderRadius: scale(12),
    backgroundColor: '#FFFFFF',
    minHeight: scale(52),
  },
  inputFocused: {
    borderColor: '#6366F1',
    backgroundColor: '#F8FAFF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: scale(6),
    elevation: 3,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginLeft: scale(16),
  },
  textInput: {
    flex: 1,
    padding: scale(16),
    fontSize: scale(16),
    color: '#1F2937',
    minHeight: scale(52),
  },
  textInputWithIcon: {
    marginLeft: scale(8),
  },
  textArea: {
    minHeight: scale(120),
    textAlignVertical: 'top',
    paddingTop: scale(16),
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(6),
    gap: scale(6),
  },
  errorText: {
    color: '#EF4444',
    fontSize: scale(13),
    fontWeight: '500',
  },
  helperText: {
    fontSize: scale(12),
    color: '#9CA3AF',
    marginTop: scale(6),
    height: scale(20),
  },
  row: {
    flexDirection: 'row',
    gap: scale(12),
  },
  // Picker Styles
  pickerContainer: {
    borderWidth: scale(1.5),
    borderColor: '#E2E8F0',
    borderRadius: scale(12),
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  pickerDisabled: {
    opacity: 0.6,
  },
  picker: {
    height: scale(52),
  },
  // Media Styles
  mediaLimit: {
    backgroundColor: '#F8FAFC',
    padding: scale(12),
    borderRadius: scale(8),
    marginBottom: scale(20),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  mediaLimitText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: scale(20),
  },
  mediaButton: {
    flex: 1,
    borderRadius: scale(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 2,
  },
  mediaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(16),
    gap: scale(8),
  },
  mediaButtonDisabled: {
    opacity: 0.6,
  },
  mediaButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(12),
    gap: scale(8),
    marginBottom: scale(20),
    backgroundColor: '#F8FAFC',
    borderRadius: scale(8),
  },
  uploadingText: {
    fontSize: scale(14),
    color: '#6366F1',
    fontWeight: '500',
  },
  mediaPreviews: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
    marginBottom: scale(20),
  },
  mediaPreview: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(12),
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  videoText: {
    fontSize: scale(12),
    color: '#6366F1',
    fontWeight: '500',
    marginTop: scale(4),
  },
  removeMediaButton: {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: scale(12),
    padding: scale(4),
  },
  mediaTip: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: scale(12),
    borderRadius: scale(8),
    gap: scale(8),
    alignItems: 'flex-start',
  },
  mediaTipText: {
    fontSize: scale(13),
    color: '#92400E',
    flex: 1,
    lineHeight: scale(18),
  },
  // Chip Styles
  chipInputWrapper: {
    marginBottom: scale(20),
  },
  chipInputContainer: {
    flexDirection: 'row',
    gap: scale(8),
  },
  chipInput: {
    flex: 1,
    borderWidth: scale(1.5),
    borderColor: '#E2E8F0',
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    fontSize: scale(16),
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    minHeight: scale(48),
  },
  addChipButton: {
    backgroundColor: '#6366F1',
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  addChipButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  chipsContainer: {
    marginTop: scale(12),
  },
  chipsLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: scale(8),
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  chip: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: scale(12),
  paddingVertical: scale(10),
  borderRadius: scale(24),
  backgroundColor: '#EEF2FF', 
  gap: scale(8),
  alignSelf: 'flex-start',     
  marginBottom: scale(8),      
},
  chipSkill: {
    backgroundColor: '#EEF2FF',
  },
  chipRequirement: {
    backgroundColor: '#F0FDF4',
  },
  chipLocation: {
    backgroundColor: '#F0F9FF',
  },
  chipText: {
    fontSize: scale(13),
    color: '#1E293B',
    fontWeight: '500',
  },
  chipRemove: {
    padding: scale(2),
  },
  // Budget Styles
  budgetContainer: {
    marginTop: scale(8),
  },
  budgetTip: {
    backgroundColor: '#F8FAFC',
    padding: scale(16),
    borderRadius: scale(12),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    marginTop: scale(8),
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
    gap: scale(8),
  },
  tipTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: '#374151',
  },
  tipList: {
    gap: scale(8),
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  tipText: {
    fontSize: scale(13),
    color: '#6B7280',
    flex: 1,
  },
  // Date Styles
  dateButton: {
    borderRadius: scale(12),
    overflow: 'hidden',
    marginBottom: scale(20),
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 2,
  },
  dateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    gap: scale(12),
  },
  dateText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  // Location Styles
  locationContainer: {
    marginTop: scale(8),
  },
  locationTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: '#374151',
    marginBottom: scale(12),
  },
  locationOptions: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: scale(20),
  },
  locationOption: {
    flex: 1,
    alignItems: 'center',
    padding: scale(16),
    borderRadius: scale(12),
    borderWidth: scale(1.5),
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: scale(8),
  },
  locationOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#F8FAFF',
  },
  locationLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#6B7280',
  },
  locationLabelActive: {
    color: '#6366F1',
  },
  addressContainer: {
    marginTop: scale(20),
  },
  addressTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: '#374151',
    marginBottom: scale(16),
  },
  // Summary Styles
  summaryContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  summaryItem: {
    flexDirection: 'row',
    marginBottom: scale(12),
  },
  summaryLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#6B7280',
    width: scale(90),
  },
  summaryValue: {
    fontSize: scale(14),
    color: '#1F2937',
    flex: 1,
    fontWeight: '500',
  },
  // Submit Button
  submitButton: {
    borderRadius: scale(16),
    overflow: 'hidden',
    marginBottom: scale(16),
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: scale(8),
    elevation: 6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(18),
    gap: scale(12),
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: scale(17),
    fontWeight: '700',
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  footerText: {
    fontSize: scale(13),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: scale(18),
    marginBottom: scale(8),
  },
  footerLink: {
    color: '#6366F1',
    fontWeight: '600',
  },
  footerNote: {
    fontSize: scale(12),
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  chipInputWrapper: {
  marginBottom: scale(24),
},
chipSectionLabel: {
  fontSize: scale(15),
  fontWeight: '700',
  color: '#374151',
  marginBottom: scale(4),
},
chipSectionDescription: {
  fontSize: scale(13),
  color: '#6B7280',
  marginBottom: scale(12),
  lineHeight: scale(18),
},
chipInputStackedContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: scale(12),
  marginBottom: scale(12),
},
chipInputStacked: {
  flex: 1,
  borderWidth: scale(1.5),
  borderColor: '#E2E8F0',
  borderRadius: scale(12),
  paddingHorizontal: scale(16),
  paddingVertical: scale(12),
  fontSize: scale(16),
  backgroundColor: '#FFFFFF',
  color: '#1F2937',
  minHeight: scale(48),
},
addChipButtonStacked: {
  backgroundColor: '#6366F1',
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: scale(16),
  paddingVertical: scale(12),
  borderRadius: scale(12),
  gap: scale(6),
  minHeight: scale(48),
},
addChipButtonDisabled: {
  backgroundColor: '#9CA3AF',
},
addChipButtonText: {
  fontSize: scale(14),
  fontWeight: '600',
  color: '#FFFFFF',
},
chipsContainer: {
  marginTop: scale(8),
},
chipsLabel: {
  fontSize: scale(14),
  fontWeight: '600',
  color: '#374151',
  marginBottom: scale(8),
},
chipsGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: scale(8),
},
sectionSeparator: {
  height: scale(1),
  backgroundColor: '#F1F5F9',
  marginVertical: scale(16),
  marginHorizontal: scale(-16),
},
});

export default CreateTaskScreen;