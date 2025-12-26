// screens/ServiceRequestFormScreen.js
// screens/ServiceRequestFormScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView as SafeArea } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Header from '../../component/tasker/Header';
import { navigate } from '../../services/navigationService';
import { taskMediaUpload } from '../../api/miniTaskApi';
import { sendFileToS3 } from '../../api/commonApi';
import { requestService } from '../../api/serviceRequestAPI/clientAPI';

const { width } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const scale = (size) => (width / guidelineBaseWidth) * size;

// Enhanced InputField (unchanged)
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
          {multiline ? `Characters: ${value.length}/1000` : '\u00A0'}
        </Text>
      )}
    </View>
  );
});

// FormSection (unchanged)
const FormSection = ({ title, description, icon, children, collapsible = false, initialCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  
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

// Updated Media Preview to handle local URIs
const MediaPreview = ({ media, index, onRemove }) => (
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
      onPress={() => onRemove(index)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="close-circle" size={scale(20)} color="#EF4444" />
    </TouchableOpacity>
  </View>
);

const ServiceRequestFormScreen = ({ route }) => {
  const { selectedTaskers, serviceType, location, notifiedTaskers = [] } = route.params;

  const getInitialLocationString = () => {
    if (!location) return '';
    const parts = [];
    if (location.suburb) parts.push(location.suburb);
    if (location.city) parts.push(location.city);
    if (location.region) parts.push(location.region);
    return parts.join(', ');
  };

  const [formData, setFormData] = useState({
    type: serviceType || '',
    description: '',
    requirements: [],
    budget: '',
    urgency: 'flexible',
    preferredDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    preferredTime: '',
    locationString: getInitialLocationString(),
    address: location || {},
    media: [] // Now stores local assets temporarily
  });

  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentRequirement, setCurrentRequirement] = useState('');

  // === LOCAL MEDIA HANDLING ONLY ===
  const pickImage = async () => {
    if (formData.media.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum 3 files allowed');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera roll permission needed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      await handleMediaSelection(result.assets[0], 'image');
    }
  };

  const pickVideo = async () => {
    if (formData.media.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum 3 files allowed');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera roll permission needed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      videoMaxDuration: 45,
    });

    if (!result.canceled && result.assets?.length > 0) {
      await handleMediaSelection(result.assets[0], 'video');
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
        tempId: Date.now(),
      };

      setFormData(prev => ({
        ...prev,
        media: [...prev.media, localMediaItem]
      }));

      Alert.alert(
        'Added!',
        `${type === 'image' ? 'Photo' : 'Video'} added. It will be uploaded when you send the request.`
      );
    } catch (error) {
      console.error('Error adding media:', error);
      Alert.alert('Error', 'Failed to add media');
    }
  };

  const removeMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  // === REQUIREMENTS (unchanged) ===
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
      const newReqs = [...prev.requirements];
      newReqs[index] = value;
      return { ...prev, requirements: newReqs };
    });
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, preferredDate: selectedDate }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.type.trim()) newErrors.type = 'Service type is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.description.length < 20) newErrors.description = 'Description should be at least 20 characters';
    if (formData.budget && parseFloat(formData.budget) < 20) newErrors.budget = 'Minimum budget is ₵20';
    if (!formData.locationString.trim()) newErrors.locationString = 'Location is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // === SUBMIT: Upload media first, then send request ===
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fix the errors in the form');
      return;
    }

    setLoading(true);
    setUploadingMedia(true);

    try {
      let finalMedia = [];

      // Upload all local media items
      for (const item of formData.media) {
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
          finalMedia.push({ url: item.url, type: item.type });
        }
      }

      // Send request with uploaded media URLs
      const response = await requestService({
        type: formData.type,
        description: formData.description,
        requirements: formData.requirements.filter(r => r.trim()),
        budget: formData.budget ? parseFloat(formData.budget) : null,
        urgency: formData.urgency,
        preferredDate: formData.preferredDate.toISOString(),
        preferredTime: formData.preferredTime,
        locationString: formData.locationString,
        address: formData.address,
        media: finalMedia,
        taskerIds: notifiedTaskers,
      });

      if (response.status === 200) {
        Alert.alert(
          'Request Sent!',
          `Your request was sent to ${selectedTaskers.length} tasker${selectedTaskers.length > 1 ? 's' : ''}.`,
          [{ text: 'View Requests', onPress: () => navigate('PostedTasks') }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to send request. Please try again.');
    } finally {
      setLoading(false);
      setUploadingMedia(false);
    }
  };

  return (
    <SafeArea style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D325D" />
      <Header title="Create Service Request" showBackButton={true} />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected Taskers */}
        <FormSection title="Selected Professionals" icon="people-outline" collapsible={true}>
          <Text style={styles.chipsLabel}>
            Sending to {selectedTaskers.length} tasker{selectedTaskers.length > 1 ? 's' : ''}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.taskersScroll}>
            {selectedTaskers.map((tasker) => (
              <View key={tasker._id} style={styles.taskerChip}>
                <Image 
                  source={{ uri: tasker.profileImage || 'https://via.placeholder.com/40' }} 
                  style={styles.taskerAvatar}
                />
                <Text style={styles.taskerName} numberOfLines={1}>{tasker.name}</Text>
              </View>
            ))}
          </ScrollView>
        </FormSection>

        {/* Service Details */}
        <FormSection title="Service Details" icon="document-text-outline" description="Tell us what you need">
          <InputField label="Service Type" value={formData.type} onChange={text => setFormData(prev => ({ ...prev, type: text }))}
            placeholder="e.g., Home Cleaning, Web Development" error={errors.type} required />
          <InputField label="Description" value={formData.description} onChange={text => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Be specific about what you need..." error={errors.description} multiline numberOfLines={6} required />
        </FormSection>

        {/* Media */}
        <FormSection title="Photos & Videos" icon="images-outline" description="Add references (optional, max 3)" collapsible={true}>
          <View style={styles.mediaLimit}>
            <Text style={styles.mediaLimitText}>
              Files added: {formData.media.length}/3 (uploaded on send)
            </Text>
          </View>

          <View style={styles.mediaButtons}>
            <TouchableOpacity 
              style={[styles.mediaButton, (formData.media.length >= 3 || uploadingMedia) && styles.mediaButtonDisabled]}
              onPress={pickImage}
              disabled={formData.media.length >= 3 || uploadingMedia}
            >
              <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.mediaButtonGradient}>
                <Ionicons name="image-outline" size={scale(20)} color="#FFF" />
                <Text style={styles.mediaButtonText}>Add Photo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.mediaButton, (formData.media.length >= 3 || uploadingMedia) && styles.mediaButtonDisabled]}
              onPress={pickVideo}
              disabled={formData.media.length >= 3 || uploadingMedia}
            >
              <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.mediaButtonGradient}>
                <Ionicons name="videocam-outline" size={scale(20)} color="#FFF" />
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

          {formData.media.length > 0 && (
            <View style={styles.mediaPreviews}>
              {formData.media.map((media, i) => (
                <MediaPreview key={media.tempId || i} media={media} index={i} onRemove={removeMedia} />
              ))}
            </View>
          )}
        </FormSection>

        {/* Requirements */}
        <FormSection title="Specific Requirements" icon="checkmark-done-outline" description="List deliverables or special needs" collapsible={true}>
          {formData.requirements.map((req, i) => (
            <View key={i} style={styles.requirementRow}>
              <Text style={styles.requirementBullet}>{i + 1}</Text>
              <TextInput
                style={styles.requirementInput}
                value={req}
                onChangeText={text => updateRequirement(i, text)}
                placeholder="Enter requirement..."
              />
              <TouchableOpacity onPress={() => removeRequirement(i)}>
                <Ionicons name="close-circle" size={scale(20)} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addRequirementRow}>
            <TextInput
              style={styles.addRequirementInput}
              value={currentRequirement}
              onChangeText={setCurrentRequirement}
              placeholder="Add new requirement..."
              onSubmitEditing={addRequirement}
            />
            <TouchableOpacity 
              style={[styles.addBtn, !currentRequirement.trim() && styles.addBtnDisabled]}
              onPress={addRequirement}
              disabled={!currentRequirement.trim()}
            >
              <Ionicons name="add" size={scale(22)} color="#FFF" />
            </TouchableOpacity>
          </View>
        </FormSection>

        {/* Budget & Timeline */}
        <FormSection title="Budget & Timeline" icon="cash-outline" collapsible={true}>
          <InputField
            label="Budget (GHS) - Optional"
            value={formData.budget}
            onChange={text => setFormData(prev => ({ ...prev, budget: text.replace(/[^0-9.]/g, '') }))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.budget}
            icon="cash-outline"
          />

          <View style={styles.urgencyContainer}>
            <Text style={styles.inputLabel}>Urgency</Text>
            <View style={styles.urgencyButtons}>
              {[{ value: 'flexible', label: 'Flexible', icon: 'calendar-outline' }, 
                { value: 'urgent', label: 'Urgent', icon: 'flash-outline' }].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.urgencyBtn, formData.urgency === o.value && styles.urgencyBtnActive]}
                  onPress={() => setFormData(prev => ({ ...prev, urgency: o.value }))}
                >
                  <Ionicons name={o.icon} size={scale(18)} color={formData.urgency === o.value ? '#FFF' : '#6366F1'} />
                  <Text style={[styles.urgencyText, formData.urgency === o.value && styles.urgencyTextActive]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.dateGradient}>
              <Ionicons name="calendar-outline" size={scale(20)} color="#FFF" />
              <Text style={styles.dateText}>Preferred: {formData.preferredDate.toLocaleDateString()}</Text>
              <Ionicons name="chevron-down" size={scale(16)} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={formData.preferredDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          <InputField
            label="Preferred Time (Optional)"
            value={formData.preferredTime}
            onChange={text => setFormData(prev => ({ ...prev, preferredTime: text }))}
            placeholder="e.g., Morning, 2-5 PM"
            icon="time-outline"
          />
        </FormSection>

        {/* Location */}
        <FormSection title="Service Location" icon="location-outline" collapsible={true}>
          <InputField
            label="Location"
            value={formData.locationString}
            onChange={text => setFormData(prev => ({ ...prev, locationString: text }))}
            placeholder="e.g., East Legon, Accra"
            error={errors.locationString}
            required
            multiline
            numberOfLines={2}
          />
        </FormSection>
     
        {/* Fixed Bottom CTA */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.submitGradient}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="send" size={scale(22)} color="#FFF" />
                  <Text style={styles.submitText}>
                    Send to {selectedTaskers.length} Tasker{selectedTaskers.length > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeArea>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D325D', },
  scrollView: { flex: 1,backgroundColor: '#F8FAFC' },
  scrollContent: { padding: scale(16), paddingBottom: scale(100) },

  // Sections
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
  sectionHeader: { padding: scale(20) },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionIcon: {
    backgroundColor: '#6366F1',
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  sectionTitleContainer: { flex: 1 },
  sectionTitle: { fontSize: scale(18), fontWeight: '700', color: '#1E293B', marginBottom: scale(4) },
  sectionDescription: { fontSize: scale(14), color: '#64748B', lineHeight: scale(20) },
  sectionContent: { paddingHorizontal: scale(20), paddingBottom: scale(20) },

  // Input
  inputContainer: { marginBottom: scale(20) },
  labelContainer: { marginBottom: scale(8) },
  inputLabel: { fontSize: scale(15), fontWeight: '600', color: '#374151' },
  required: { color: '#EF4444' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: scale(1.5),
    borderColor: '#E2E8F0',
    borderRadius: scale(12),
    backgroundColor: '#FFFFFF',
    minHeight: scale(52),
  },
  inputFocused: { borderColor: '#6366F1', backgroundColor: '#F8FAFF' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  inputIcon: { marginLeft: scale(16) },
  textInput: { flex: 1, padding: scale(16), fontSize: scale(16), color: '#1F2937' },
  textInputWithIcon: { marginLeft: scale(8) },
  textArea: { minHeight: scale(120), textAlignVertical: 'top', paddingTop: scale(16) },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: scale(6), gap: scale(6) },
  errorText: { color: '#EF4444', fontSize: scale(13), fontWeight: '500' },
  helperText: { fontSize: scale(12), color: '#9CA3AF', marginTop: scale(6), height: scale(20) },

  // Taskers
  chipsLabel: { fontSize: scale(14), fontWeight: '600', color: '#374151', marginBottom: scale(8) },
  taskersScroll: { marginHorizontal: -scale(4) },
  taskerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    borderRadius: scale(24),
    marginHorizontal: scale(4),
    gap: scale(8),
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  taskerAvatar: { width: scale(32), height: scale(32), borderRadius: scale(16) },
  taskerName: { fontSize: scale(14), fontWeight: '600', color: '#0369A1' },

  // Media
  mediaLimit: { alignItems: 'center', marginBottom: scale(16) },
  mediaLimitText: { fontSize: scale(14), fontWeight: '600', color: '#374151' },
  mediaButtons: { flexDirection: 'row', gap: scale(12), marginBottom: scale(20) },
  mediaButton: { flex: 1, borderRadius: scale(12), overflow: 'hidden' },
  mediaButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: scale(16), gap: scale(8) },
  mediaButtonText: { fontSize: scale(15), fontWeight: '600', color: '#FFF' },
  mediaButtonDisabled: { opacity: 0.6 },
  uploadingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: scale(12), backgroundColor: '#F0F9FF', borderRadius: scale(8), gap: scale(8) },
  uploadingText: { fontSize: scale(14), color: '#6366F1', fontWeight: '500' },
  mediaPreviews: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(12) },
  mediaPreview: { width: scale(80), height: scale(80), borderRadius: scale(12), overflow: 'hidden', backgroundColor: '#F3F4F6', position: 'relative' },
  mediaImage: { width: '100%', height: '100%' },
  videoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E7EB' },
  videoText: { fontSize: scale(12), color: '#6366F1', marginTop: scale(4) },
  removeMediaButton: { position: 'absolute', top: scale(4), right: scale(4), backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: scale(12), padding: scale(4) },

  // Requirements
  requirementRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(12), gap: scale(12) },
  requirementBullet: { fontSize: scale(14), fontWeight: '700', color: '#6366F1', width: scale(24) },
  requirementInput: { flex: 1, borderWidth: scale(1.5), borderColor: '#E2E8F0', borderRadius: scale(12), padding: scale(14), fontSize: scale(16), backgroundColor: '#FFF' },
  addRequirementRow: { flexDirection: 'row', gap: scale(12), marginTop: scale(8) },
  addRequirementInput: { flex: 1, borderWidth: scale(1.5), borderColor: '#E2E8F0', borderRadius: scale(12), padding: scale(14), fontSize: scale(16), backgroundColor: '#FFF' },
  addBtn: { backgroundColor: '#6366F1', width: scale(48), height: scale(48), borderRadius: scale(12), justifyContent: 'center', alignItems: 'center' },
  addBtnDisabled: { backgroundColor: '#9CA3AF' },

  // Urgency & Date
  urgencyContainer: { marginBottom: scale(20) },
  urgencyButtons: { flexDirection: 'row', gap: scale(12) },
  urgencyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: scale(14), borderRadius: scale(12), borderWidth: scale(1.5), borderColor: '#E2E8F0', backgroundColor: '#FFF', gap: scale(8) },
  urgencyBtnActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  urgencyText: { fontSize: scale(14), fontWeight: '600', color: '#374151' },
  urgencyTextActive: { color: '#FFF' },
  dateButton: { borderRadius: scale(12), overflow: 'hidden', marginBottom: scale(20) },
  dateGradient: { flexDirection: 'row', alignItems: 'center', padding: scale(16), gap: scale(12) },
  dateText: { fontSize: scale(16), fontWeight: '600', color: '#FFF', flex: 1 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(16),
    paddingBottom: scale(32),
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitButton: { borderRadius: scale(16), overflow: 'hidden', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: scale(8), elevation: 6 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(18), gap: scale(12) },
  submitText: { color: '#FFF', fontSize: scale(17), fontWeight: '700' },
});

export default ServiceRequestFormScreen;