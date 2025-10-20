import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { AuthContext } from '../../context/AuthContext';
import { raiseDispute, addReportingEvidence, sendFileToS3 } from '../../api/commonApi';

// Scaling function for responsiveness
const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const scale = (size) => (width / guidelineBaseWidth) * size;
const isTablet = width > scale(600);

const ReportForm = ({ isVisible, onClose, task, onReportSubmitted }) => {
  const { user } = React.useContext(AuthContext);
  const [formData, setFormData] = useState({
    against: '',
    taskId: '',
    tasktitle: '',
    reportedBy: '',
    reason: '',
    details: '',
    evidence: null,
  });
  const [uploadProgress, setUploadProgress] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const reasonInputRef = useRef(null);

  // Keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      // Ensure TextInput retains focus
      setTimeout(() => reasonInputRef.current?.focus(), 100);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isVisible && task && user) {
      const againstUser = task.assignedTo === user._id ? task.employer?._id : task.assignedTo || task.assignedTo._id;
      setFormData({
        against: againstUser || '',
        taskId: task._id || '',
        tasktitle: task.title || '',
        reportedBy: user?.name || '',
        reason: '',
        details: '',
        evidence: null,
      });
      setErrors({});
      setUploadProgress({});
      setTimeout(() => reasonInputRef.current?.focus(), 300);
    }
  }, [isVisible, task, user]);

  const handleChange = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/jpeg',
          'image/png',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileInfo = await FileSystem.getInfo(file.uri);
        const fileSizeMB = (fileInfo.size || file.size || 0) / (1024 * 1024);

        if (fileSizeMB > 5) {
          setErrors(prev => ({
            ...prev,
            evidence: 'File size should be less than 5MB',
          }));
          setTimeout(() => {
            setErrors(prev => ({ ...prev, evidence: undefined }));
          }, 5000);
          return;
        }

        setFormData(prev => ({
          ...prev,
          evidence: {
            name: file.name,
            uri: file.uri,
            type: file.mimeType,
            size: fileInfo.size || file.size || 0,
          },
        }));
        setUploadProgress({ 0: 0 });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeDocument = () => {
    setFormData(prev => ({ ...prev, evidence: null }));
    setUploadProgress({});
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    } else if (formData.reason.trim().length < 5) {
      newErrors.reason = 'Reason should be at least 5 characters';
    }
    if (!formData.details.trim()) {
      newErrors.details = 'Details are required';
    } else if (formData.details.trim().length < 10) {
      newErrors.details = 'Details should be at least 10 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadWithSendFileToS3 = async (uploadUrl, file) => {
    return new Promise((resolve, reject) => {
      try {
        const fileToUpload = {
          ...file,
          lastModified: Date.now(),
          webkitRelativePath: '',
        };
        sendFileToS3(uploadUrl, fileToUpload, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress({ 0: 30 + Math.floor(percentCompleted * 0.7) });
          },
        })
          .then(() => {
            setUploadProgress({ 0: 100 });
            resolve();
          })
          .catch(error => {
            console.error(`Upload failed for ${file.name}:`, error);
            reject(error);
          });
      } catch (error) {
        console.error('Error in upload setup:', error);
        reject(error);
      }
    });
  };

  const uploadWithAlternativeMethod = async (uploadUrl, file) => {
    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const progressHandler = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress({ 0: 30 + Math.floor(percentCompleted * 0.7) });
        },
      };
      await sendFileToS3(uploadUrl, blob, progressHandler);
      setUploadProgress({ 0: 100 });
    } catch (error) {
      console.error('Alternative upload failed:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);
    try {
      let evidenceData = null;
      if (formData.evidence) {
        try {
          const fileInfo = {
            filename: formData.evidence.name,
            contentType: formData.evidence.type,
          };
          const evidenceResponse = await addReportingEvidence(fileInfo);
          const { publicUrl, uploadURL } = evidenceResponse.data;
          setUploadProgress({ 0: 30 });
          try {
            await uploadWithSendFileToS3(uploadURL, formData.evidence);
          } catch (s3Error) {
            console.log('sendFileToS3 failed, trying alternative method:', s3Error);
            await uploadWithAlternativeMethod(uploadURL, formData.evidence);
          }
          evidenceData = publicUrl;
        } catch (uploadError) {
          Alert.alert(
            'Upload Error',
            'Failed to upload file. Would you like to submit the report without the file?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Submit Without File',
                onPress: () => submitReport(null),
              },
            ]
          );
          return;
        }
      }
      await submitReport(evidenceData);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit report. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
      setUploadProgress({});
    }
  };

  const submitReport = async (evidenceUrl) => {
    try {
      const reportPayload = {
        against: formData.against,
        taskId: formData.taskId,
        tasktitle: formData.tasktitle,
        reportedBy: formData.reportedBy,
        reason: formData.reason,
        details: formData.details,
        evidence: evidenceUrl,
      };
      const response = await raiseDispute(reportPayload);
      if (response.status === 200) {
        Alert.alert(
          'Report Submitted',
          'Issue reported successfully. Our team will reach out soon.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onReportSubmitted) {
                  onReportSubmitted();
                }
                onClose();
              },
            },
          ]
        );
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      throw error;
    }
  };

  const handleClose = useCallback(() => {
    if (!isLoading) {
      if (formData.reason || formData.details || formData.evidence) {
        Alert.alert(
          'Discard Report?',
          'You have unsaved changes. Are you sure you want to discard this report?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: onClose },
          ]
        );
      } else {
        onClose();
      }
    }
  }, [isLoading, formData, onClose]);

  const FileCard = React.memo(({ file, index, progress, onRemove, disabled }) => (
    <View style={styles.fileCard}>
      <View style={styles.fileCardHeader}>
        <Ionicons
          name={
            file.name.split('.').pop().toLowerCase().match(/jpg|jpeg|png|gif|webp/)
              ? 'image-outline'
              : file.name.split('.').pop().toLowerCase().match(/pdf|doc|docx/)
              ? 'document-outline'
              : 'file-tray-outline'
          }
          size={scale(20)}
          color="#6366F1"
        />
        <TouchableOpacity onPress={onRemove} disabled={disabled} style={styles.fileCardRemove}>
          <Ionicons name="close" size={scale(16)} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <Text style={styles.fileCardName} numberOfLines={2}>
        {file.name}
      </Text>
      <Text style={styles.fileCardSize}>{formatFileSize(file.size)}</Text>
      {progress !== undefined && progress < 100 && progress > 0 && (
        <View style={styles.fileCardProgress}>
          <View style={[styles.fileCardProgressFill, { width: `${progress}%` }]} />
        </View>
      )}
      {progress === 100 && (
        <View style={styles.fileCardSuccess}>
          <Ionicons name="checkmark" size={scale(12)} color="#10B981" />
          <Text style={styles.fileCardSuccessText}>Uploaded</Text>
        </View>
      )}
      {progress === -1 && (
        <View style={styles.fileCardError}>
          <Ionicons name="close" size={scale(12)} color="#EF4444" />
          <Text style={styles.fileCardErrorText}>Failed</Text>
        </View>
      )}
    </View>
  ));

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" />
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            if (!keyboardVisible) {
              handleClose();
            }
          }}
        />
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.select({
            ios: 0,
            android: StatusBar.currentHeight ? StatusBar.currentHeight + scale(20) : scale(20),
          })}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Ionicons name="flag" size={scale(24)} color="#EF4444" />
                <Text style={styles.headerTitle}>Report Issue</Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isLoading}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={scale(24)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {formData.tasktitle && (
              <Text style={styles.taskInfo}>
                Reporting issue with: <Text style={styles.taskTitle}>{formData.tasktitle}</Text>
              </Text>
            )}
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{
                ...styles.scrollContentContainer,
                paddingBottom: keyboardVisible ? scale(120) : scale(30),
              }}
            >
              {/* Reason Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Reason <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Provide a brief reason for reporting
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={reasonInputRef}
                    style={[styles.textInput, errors.reason && styles.inputError]}
                    placeholder="Enter reason for reporting..."
                    placeholderTextColor="#9CA3AF"
                    value={formData.reason}
                    onChangeText={(text) => handleChange('reason', text)}
                    editable={!isLoading}
                    returnKeyType="next"
                    maxLength={100}
                    allowFontScaling={true}
                  />
                  {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}
                </View>
              </View>

              {/* Details Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Details <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Provide a detailed explanation of the issue
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.textArea, errors.details && styles.inputError]}
                    placeholder="Describe the issue in detail..."
                    placeholderTextColor="#9CA3AF"
                    value={formData.details}
                    onChangeText={(text) => handleChange('details', text)}
                    multiline={true}
                    numberOfLines={6}
                    textAlignVertical="top"
                    editable={!isLoading}
                    maxLength={1000}
                    returnKeyType="default"
                    blurOnSubmit={false}
                    allowFontScaling={true}
                  />
                  <View style={styles.charCounter}>
                    {errors.details ? (
                      <Text style={styles.errorText}>{errors.details}</Text>
                    ) : (
                      <Text style={styles.hintText}>Minimum 10 characters</Text>
                    )}
                    <Text style={styles.charCount}>{formData.details.length}/1000</Text>
                  </View>
                </View>
              </View>

              {/* Evidence Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Supporting Evidence (Optional)</Text>
                <Text style={styles.sectionSubtitle}>
                  Upload a file to support your report
                </Text>
                {!formData.evidence ? (
                  <TouchableOpacity
                    style={[styles.uploadCard, isLoading && styles.uploadCardDisabled]}
                    onPress={pickDocument}
                    disabled={isLoading}
                  >
                    <Ionicons name="cloud-upload" size={scale(32)} color="#6366F1" />
                    <Text style={styles.uploadCardTitle}>Add File</Text>
                    <Text style={styles.uploadCardSubtitle}>
                      Max {formatFileSize(5 * 1024 * 1024)} • JPG, PNG, PDF, DOC
                    </Text>
                    {errors.evidence && (
                      <Text style={styles.errorText}>{errors.evidence}</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.fileGrid}>
                    <FileCard
                      file={formData.evidence}
                      index={0}
                      progress={uploadProgress[0]}
                      onRemove={removeDocument}
                      disabled={isLoading}
                    />
                  </View>
                )}
              </View>

              {/* Error Messages */}
              {errors.evidence && (
                <View style={styles.errorContainer}>
                  <View style={styles.errorHeader}>
                    <Ionicons name="warning" size={scale(20)} color="#EF4444" />
                    <Text style={styles.errorTitle}>File Error</Text>
                  </View>
                  <Text style={styles.errorItem}>{errors.evidence}</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, isLoading && styles.buttonDisabled]}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  (isLoading || !formData.reason.trim() || !formData.details.trim() || formData.reason.trim().length < 5 || formData.details.trim().length < 10) && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isLoading || !formData.reason.trim() || !formData.details.trim() || formData.reason.trim().length < 5 || formData.details.trim().length < 10}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>
                      {uploadProgress[0] > 0 ? 'Uploading...' : 'Submitting...'}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="flag" size={scale(16)} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(16),
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    width: Math.min(width * 0.9, scale(500)),
    maxHeight: height * 0.95,
    minHeight: scale(550),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    backgroundColor: '#EF4444',
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    padding: scale(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: scale(4),
  },
  taskInfo: {
    fontSize: scale(14),
    color: '#6B7280',
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
  },
  taskTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: isTablet ? scale(30) : scale(20),
  },
  section: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: '#111827',
    marginBottom: scale(8),
  },
  sectionSubtitle: {
    fontSize: scale(14),
    color: '#6B7280',
    marginBottom: scale(16),
  },
  inputContainer: {
    marginBottom: scale(16),
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: scale(12),
    padding: scale(16),
    fontSize: scale(16),
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: scale(12),
    padding: scale(16),
    fontSize: scale(16),
    backgroundColor: '#FFFFFF',
    minHeight: scale(140),
    textAlignVertical: 'top',
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  charCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scale(8),
  },
  errorText: {
    color: '#EF4444',
    fontSize: scale(14),
  },
  hintText: {
    color: '#6B7280',
    fontSize: scale(14),
  },
  charCount: {
    color: '#6B7280',
    fontSize: scale(14),
  },
  uploadCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: scale(16),
    padding: scale(24),
    alignItems: 'center',
    marginBottom: scale(16),
  },
  uploadCardDisabled: {
    opacity: 0.5,
  },
  uploadCardTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: '#6366F1',
    marginVertical: scale(8),
  },
  uploadCardSubtitle: {
    fontSize: scale(14),
    color: '#6B7280',
    textAlign: 'center',
  },
  fileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  fileCard: {
    width: isTablet ? scale(200) : (width - scale(72)) / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
  },
  fileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  fileCardRemove: {
    padding: scale(2),
  },
  fileCardName: {
    fontSize: scale(14),
    fontWeight: '500',
    color: '#374151',
    marginBottom: scale(4),
    lineHeight: scale(18),
  },
  fileCardSize: {
    fontSize: scale(12),
    color: '#6B7280',
  },
  fileCardProgress: {
    height: scale(4),
    backgroundColor: '#E5E7EB',
    borderRadius: scale(2),
    marginTop: scale(8),
    overflow: 'hidden',
  },
  fileCardProgressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: scale(2),
  },
  fileCardSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(8),
    gap: scale(4),
  },
  fileCardSuccessText: {
    fontSize: scale(12),
    color: '#10B981',
    fontWeight: '500',
  },
  fileCardError: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(8),
    gap: scale(4),
  },
  fileCardErrorText: {
    fontSize: scale(12),
    color: '#EF4444',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: scale(8),
    padding: scale(16),
    marginBottom: scale(20),
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(8),
  },
  errorTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#991B1B',
  },
  errorItem: {
    fontSize: scale(12),
    color: '#991B1B',
    lineHeight: scale(16),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
    borderRadius: scale(12),
    gap: scale(8),
    minHeight: scale(42),
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginRight: scale(8),
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: scale(16),
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: scale(16),
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
});

export default ReportForm;