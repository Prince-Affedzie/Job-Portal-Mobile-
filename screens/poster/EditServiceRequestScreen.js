// screens/EditServiceRequestScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Header from '../../component/tasker/Header';
import { navigate } from '../../services/navigationService';
import { taskMediaUpload } from '../../api/miniTaskApi';
import { sendFileToS3 } from '../../api/commonApi';
import { updateRequest } from '../../api/serviceRequestAPI/clientAPI';

const { width } = Dimensions.get('window');

// Reuse the same components from the create form
const InputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  error, 
  multiline = false, 
  numberOfLines = 1, 
  required = false,
  icon = null,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputFocused,
        error && styles.inputError,
        multiline && styles.textAreaWrapper
      ]}>
        {icon && <Ionicons name={icon} size={20} color="#6366F1" style={styles.inputIcon} />}
        <TextInput
          style={[
            styles.textInput,
            multiline && styles.textArea,
            icon && styles.textInputWithIcon
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#9CA3AF"
          {...props}
        />
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const FormSection = ({ title, description, icon, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={22} color="#6366F1" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {description && <Text style={styles.sectionDescription}>{description}</Text>}
    </View>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

const MediaPreview = ({ media, index, onRemove }) => (
  <View style={styles.mediaPreview}>
    {media.type === 'image' ? (
      <Image source={{ uri: media.url }} style={styles.mediaImage} />
    ) : (
      <View style={styles.videoPlaceholder}>
        <Ionicons name="videocam" size={24} color="#6366F1" />
        <Text style={styles.videoText}>Video</Text>
      </View>
    )}
    <TouchableOpacity 
      style={styles.removeMediaButton}
      onPress={() => onRemove(index)}
    >
      <Ionicons name="close-circle" size={20} color="#EF4444" />
    </TouchableOpacity>
  </View>
);

const RequirementItem = ({ requirement, index, onUpdate, onRemove }) => (
  <View style={styles.requirementItem}>
    <View style={styles.requirementBullet}>
      <Text style={styles.requirementNumber}>{index + 1}</Text>
    </View>
    <TextInput
      style={styles.requirementInput}
      value={requirement}
      onChangeText={(text) => onUpdate(index, text)}
      placeholder={`Requirement ${index + 1}`}
      placeholderTextColor="#9CA3AF"
    />
    <TouchableOpacity 
      style={styles.removeRequirementButton}
      onPress={() => onRemove(index)}
    >
      <Ionicons name="close-circle" size={20} color="#EF4444" />
    </TouchableOpacity>
  </View>
);

const EditServiceRequestScreen = ({ route }) => {
  // Get the existing service request data to edit
  const { serviceRequest } = route.params;
  
  // Helper function to get initial address values
  const getInitialAddress = () => {
    if (serviceRequest.address) {
      return {
        region: serviceRequest.address.region || '',
        city: serviceRequest.address.city || '',
        suburb: serviceRequest.address.suburb || '',
      };
    }
    return { region: '', city: '', suburb: '' };
  };

  // Initialize form data with existing service request data
  const [formData, setFormData] = useState({
    type: serviceRequest.type || '',
    description: serviceRequest.description || '',
    requirements: serviceRequest.requirements || [],
    budget: serviceRequest.budget?.toString() || '',
    urgency: serviceRequest.urgency || 'flexible',
    preferredDate: serviceRequest.preferredDate ? new Date(serviceRequest.preferredDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
    preferredTime: serviceRequest.preferredTime || '',
    locationString: serviceRequest.locationString || '',
    address: getInitialAddress(),
    media: serviceRequest.media || []
  });

  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentRequirement, setCurrentRequirement] = useState('');

  // Handle address field changes
  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  // Update location string when address fields change
  useEffect(() => {
    const { region, city, suburb } = formData.address;
    const locationParts = [suburb, city, region].filter(part => part && part.trim());
    const newLocationString = locationParts.join(', ');
    
    setFormData(prev => ({
      ...prev,
      locationString: newLocationString
    }));
  }, [formData.address.region, formData.address.city, formData.address.suburb]);

  // Media Upload Functions (same as create form)
  const pickImage = async () => {
    if (formData.media.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum 3 files allowed');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to upload images.');
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
    if (formData.media.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum 3 files allowed');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to upload videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        videoMaxDuration: 45,
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

      setUploadingMedia(true);
      
      const file = {
        name: asset.fileName || `media_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
        uri: asset.uri,
        type: type === 'image' ? 'image/jpeg' : 'video/mp4',
        size: fileInfo.size || asset.fileSize || 0,
      };

      const fileInfoPayload = {
        filename: file.name,
        contentType: file.type,
      };

      const uploadResponse = await taskMediaUpload(fileInfoPayload);
      if(uploadResponse.status === 200){
        const { publicUrl, fileUrl } = uploadResponse.data;
        
        await sendFileToS3(fileUrl, file);

        const newMedia = {
          url: publicUrl,
          type: type
        };

        setFormData(prev => ({
          ...prev,
          media: [...prev.media, newMedia]
        }));

        Alert.alert('Success', `${type === 'image' ? 'Image' : 'Video'} uploaded successfully!`);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert('Upload Error', 'Failed to upload media. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  // Requirements Management
  const addRequirement = () => {
    if (currentRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, currentRequirement.trim()]
      }));
      setCurrentRequirement('');
    }
  };

  const removeRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const updateRequirement = (index, value) => {
    setFormData(prev => {
      const newRequirements = [...prev.requirements];
      newRequirements[index] = value;
      return { ...prev, requirements: newRequirements };
    });
  };

  // Date Picker
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, preferredDate: selectedDate }));
    }
  };

  // Form Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.type.trim()) newErrors.type = 'Service type is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.description.length < 20) newErrors.description = 'Description should be at least 20 characters';
    /*if (!formData.budget || isNaN(formData.budget) || parseFloat(formData.budget) <= 0) {
      newErrors.budget = 'Valid budget is required';
    }*/
    if (formData.budget && parseFloat(formData.budget) < 20) {
      newErrors.budget = 'Minimum budget is ₵20';
    }
    if (!formData.address.suburb.trim()) {
      newErrors.suburb = 'Suburb is required';
    }
    if (!formData.address.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.address.region.trim()) {
      newErrors.region = 'Region is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submission - Update instead of Create
  const handleUpdate = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        type: formData.type,
        description: formData.description,
        requirements: formData.requirements.filter(req => req.trim()),
        budget: parseInt(formData.budget),
        urgency: formData.urgency,
        preferredDate: formData.preferredDate.toISOString(),
        preferredTime: formData.preferredTime,
        locationString: formData.locationString,
        address: formData.address,
        media: formData.media,
      };

      const response = await updateRequest(serviceRequest._id, updateData);

      if (response.status === 200) {
        Alert.alert(
          '✅ Request Updated Successfully!',
          'Your service request has been updated successfully.',
          [
            { 
              text: 'OK', 
              onPress: () => navigate('ServiceRequestDetail', { requestId: serviceRequest._id })
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to update service request');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update service request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if form has changes
  const hasChanges = () => {
    const originalData = {
      type: serviceRequest.type,
      description: serviceRequest.description,
      requirements: serviceRequest.requirements,
      budget: serviceRequest.budget?.toString(),
      urgency: serviceRequest.urgency,
      preferredDate: serviceRequest.preferredDate,
      preferredTime: serviceRequest.preferredTime,
      locationString: serviceRequest.locationString,
      address: serviceRequest.address || {},
      media: serviceRequest.media
    };

    const currentData = {
      type: formData.type,
      description: formData.description,
      requirements: formData.requirements,
      budget: formData.budget,
      urgency: formData.urgency,
      preferredDate: formData.preferredDate.toISOString(),
      preferredTime: formData.preferredTime,
      locationString: formData.locationString,
      address: formData.address,
      media: formData.media
    };

    return JSON.stringify(originalData) !== JSON.stringify(currentData);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Edit Service Request" 
        showBackButton 
        rightComponent={
          <TouchableOpacity 
            style={[styles.saveButton, (!hasChanges() || loading) && styles.saveButtonDisabled]}
            onPress={handleUpdate}
            disabled={!hasChanges() || loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        }
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Changes Indicator */}
        {hasChanges() && (
          <View style={styles.changesIndicator}>
            <Ionicons name="information-circle" size={18} color="#6366F1" />
            <Text style={styles.changesText}>You have unsaved changes</Text>
          </View>
        )}

        {/* Service Details */}
        <FormSection 
          title="Service Details" 
          icon="document-text-outline"
          description="Update your service requirements"
        >
          <InputField
            label="Service Type"
            value={formData.type}
            onChange={(text) => setFormData(prev => ({ ...prev, type: text }))}
            placeholder="e.g., Home Cleaning, Web Development"
            error={errors.type}
            required={true}
            //icon="construct-outline"
          />

          <InputField
            label="Description"
            value={formData.description}
            onChange={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Describe in detail what you need done. Be specific about requirements, expectations, and any special instructions..."
            error={errors.description}
            multiline={true}
            numberOfLines={6}
            required={true}
            //icon="create-outline"
          />
        </FormSection>

        {/* Media Upload 
        <FormSection 
          title="Photos & Videos" 
          icon="images-outline"
          description="Update reference images or videos (optional)"
        >
          <View style={styles.mediaHeader}>
            <Text style={styles.mediaLimitText}>{formData.media.length}/3 files</Text>
            <Text style={styles.mediaSubtext}>Max 10MB per file</Text>
          </View>
          
          <View style={styles.mediaButtons}>
            <TouchableOpacity 
              style={[
                styles.mediaButton,
                (formData.media.length >= 3 || uploadingMedia) && styles.mediaButtonDisabled
              ]}
              onPress={pickImage}
              disabled={formData.media.length >= 3 || uploadingMedia}
            >
              <Ionicons name="image-outline" size={24} color="#6366F1" />
              <Text style={styles.mediaButtonText}>Add Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.mediaButton,
                (formData.media.length >= 3 || uploadingMedia) && styles.mediaButtonDisabled
              ]}
              onPress={pickVideo}
              disabled={formData.media.length >= 3 || uploadingMedia}
            >
              <Ionicons name="videocam-outline" size={24} color="#6366F1" />
              <Text style={styles.mediaButtonText}>Add Video</Text>
            </TouchableOpacity>
          </View>

          {uploadingMedia && (
            <View style={styles.uploadingIndicator}>
              <ActivityIndicator size="small" color="#6366F1" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}

          {formData.media.length > 0 && (
            <View style={styles.mediaPreviews}>
              {formData.media.map((media, index) => (
                <MediaPreview 
                  key={index} 
                  media={media} 
                  index={index}
                  onRemove={removeMedia}
                />
              ))}
            </View>
          )}
        </FormSection>*/}

        {/* Requirements */}
        <FormSection 
          title="Specific Requirements" 
          icon="checkmark-done-outline"
          description="Update specific deliverables or requirements"
        >
          {formData.requirements.map((requirement, index) => (
            <RequirementItem 
              key={index}
              requirement={requirement}
              index={index}
              onUpdate={updateRequirement}
              onRemove={removeRequirement}
            />
          ))}
          
          <View style={styles.addRequirementContainer}>
            <TextInput
              style={styles.addRequirementInput}
              value={currentRequirement}
              onChangeText={setCurrentRequirement}
              placeholder="Add a new requirement..."
              onSubmitEditing={addRequirement}
              returnKeyType="done"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity 
              style={[
                styles.addRequirementButton,
                !currentRequirement.trim() && styles.addRequirementButtonDisabled
              ]}
              onPress={addRequirement}
              disabled={!currentRequirement.trim()}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </FormSection>

        {/* Budget & Timeline */}
        <FormSection 
          title="Budget & Timeline" 
          icon="cash-outline"
          description="Update your budget and preferred timeline"
        >
          <InputField
            label="Budget (GHS)"
            value={formData.budget}
            onChange={(text) => setFormData(prev => ({ ...prev, budget: text }))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.budget}
            //required={true}
            icon="cash-outline"
          />

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Urgency</Text>
            <View style={styles.urgencyButtons}>
              {[
                { value: 'flexible', label: 'Flexible', icon: 'calendar-outline' },
                { value: 'urgent', label: 'Urgent', icon: 'flash-outline' },
                /*{ value: 'scheduled', label: 'Scheduled', icon: 'time-outline' }*/
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.urgencyButton,
                    formData.urgency === option.value && styles.urgencyButtonSelected
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, urgency: option.value }))}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={18} 
                    color={formData.urgency === option.value ? '#FFFFFF' : '#6366F1'} 
                  />
                  <Text style={[
                    styles.urgencyButtonText,
                    formData.urgency === option.value && styles.urgencyButtonTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#6366F1" />
            <Text style={styles.dateText}>
              Preferred Date: {formData.preferredDate.toLocaleDateString()}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6366F1" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={formData.preferredDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          <InputField
            label="Preferred Time (Optional)"
            value={formData.preferredTime}
            onChange={(text) => setFormData(prev => ({ ...prev, preferredTime: text }))}
            placeholder="e.g., Morning, Afternoon, or specific time"
            icon="time-outline"
          />

          <View style={styles.tipBox}>
            <Ionicons name="information-circle-outline" size={18} color="#6366F1" />
            <Text style={styles.tipText}>
              Higher budgets and clear timelines attract more qualified taskers and faster responses.
            </Text>
          </View>
        </FormSection>

        {/* Location */}
        <FormSection 
          title="Service Location" 
          icon="location-outline"
          description="Update where the service should be performed"
        >
          {/* Auto-generated location string preview */}
          <View style={styles.locationPreview}>
            <Text style={styles.locationPreviewLabel}>Location Preview</Text>
            <Text style={styles.locationPreviewText}>
              {formData.locationString || 'Enter address details below...'}
            </Text>
          </View>

          <InputField
            label="Suburb"
            value={formData.address.suburb}
            onChange={(text) => handleAddressChange('suburb', text)}
            placeholder="e.g., East Legon, Osu, Cantonments"
            error={errors.suburb}
            required={true}
            icon="home-outline"
          />

          <InputField
            label="City"
            value={formData.address.city}
            onChange={(text) => handleAddressChange('city', text)}
            placeholder="e.g., Accra, Kumasi, Takoradi"
            error={errors.city}
            required={true}
            icon="business-outline"
          />

          <InputField
            label="Region"
            value={formData.address.region}
            onChange={(text) => handleAddressChange('region', text)}
            placeholder="e.g., Greater Accra, Ashanti, Western"
            error={errors.region}
            required={true}
            icon="map-outline"
          />
          
          <View style={styles.locationNote}>
            <Ionicons name="information-circle-outline" size={16} color="#6366F1" />
            <Text style={styles.locationNoteText}>
              The complete address will be automatically generated from the details you provide above.
            </Text>
          </View>
        </FormSection>

        {/* Update Button */}
        <TouchableOpacity
          style={[styles.updateButton, (!hasChanges() || loading) && styles.updateButtonDisabled]}
          onPress={handleUpdate}
          disabled={!hasChanges() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#FFFFFF" />
              <Text style={styles.updateButtonText}>
                Update Request
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
          <Text style={styles.footerText}>
            Your information is secure and protected by our Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Add these new styles for the edit screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  // Header Save Button
  saveButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Changes Indicator
  changesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  changesText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  // Update Button
  updateButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  // Location Preview
  locationPreview: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  locationPreviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 4,
  },
  locationPreviewText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  // Reuse all other styles from the create form
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  sectionContent: {
    padding: 20,
  },
  // Input Fields
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#6366F1',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginLeft: 16,
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  textInputWithIcon: {
    marginLeft: 12,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  // Media Styles
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mediaLimitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  mediaSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  mediaButtonDisabled: {
    opacity: 0.5,
  },
  mediaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
  },
  uploadingText: {
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '500',
  },
  mediaPreviews: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
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
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
    marginTop: 4,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 4,
  },
  // Requirements
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  requirementBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  requirementInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    fontWeight: '500',
  },
  removeRequirementButton: {
    padding: 8,
  },
  addRequirementContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  addRequirementInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    fontWeight: '500',
  },
  addRequirementButton: {
    backgroundColor: '#6366F1',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addRequirementButtonDisabled: {
    opacity: 0.5,
  },
  // Urgency Buttons
  urgencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  urgencyButtonSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  urgencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  urgencyButtonTextSelected: {
    color: '#FFFFFF',
  },
  // Date Picker
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    fontWeight: '500',
  },
  // Location
  locationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  locationNoteText: {
    fontSize: 14,
    color: '#0369A1',
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  // Tips
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    alignItems: 'flex-start',
  },
  tipText: {
    fontSize: 14,
    color: '#0369A1',
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
});

export default EditServiceRequestScreen;