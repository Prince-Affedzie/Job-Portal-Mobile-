import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { AuthContext } from '../../context/AuthContext';
import { raiseDispute, addReportingEvidence, sendFileToS3 } from '../../api/commonApi';

const { height: screenHeight } = Dimensions.get('window');

const ReportForm = ({ 
  isVisible, 
  onClose, 
  task,
  onReportSubmitted 
}) => {
  const { user } = React.useContext(AuthContext);
  const [formData, setFormData] = useState({
    against: '',
    taskId: '',
    tasktitle: '',
    reportedBy: '',
    reason: '',
    details: '',
    evidence: null
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
        evidence: null
      });
      setErrors({});
      setUploadProgress(0);
    }
  }, [isVisible, task, user]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/jpeg',
          'image/png',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        copyToCacheDirectory: true
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
       
        try {
          const fileInfo = await FileSystem.getInfo(file.uri);
          const fileSizeMB = fileInfo.size / (1024 * 1024);
          
          if (fileSizeMB > 5) {
            Alert.alert('File Too Large', 'File size should be less than 5MB');
            return;
          }

          setFormData(prev => ({ 
            ...prev, 
            evidence: {
              name: file.name,
              uri: file.uri,
              type: file.mimeType,
              size: fileInfo.size || 0,
            }
          }));
        } catch (fileError) {
          console.error('Error getting file info:', fileError);
          setFormData(prev => ({ 
            ...prev, 
            evidence: {
              name: file.name,
              uri: file.uri,
              type: file.mimeType,
              size: file.size || 0,
            }
          }));
        }
      } else if (result.canceled) {
        console.log('User cancelled file selection');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeDocument = () => {
    setFormData(prev => ({ ...prev, evidence: null }));
    setUploadProgress(0);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }
    
    if (!formData.details.trim()) {
      newErrors.details = 'Details are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadWithSendFileToS3 = async (uploadUrl, file) => {
    return new Promise((resolve, reject) => {
      try {
        const fileToUpload = {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: Date.now(),
          webkitRelativePath: '',
        };

        console.log('Uploading file to S3:', fileToUpload);

        sendFileToS3(uploadUrl, fileToUpload, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log('Upload progress:', percentCompleted);
            setUploadProgress(percentCompleted);
          }
        })
        .then(() => {
          console.log('File uploaded successfully');
          setUploadProgress(100);
          resolve();
        })
        .catch(error => {
          console.error('Upload failed:', error);
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
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (uploadResponse.ok) {
        setUploadProgress(100);
        return uploadResponse;
      } else {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }
    } catch (error) {
      console.error('Alternative upload failed:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      let evidenceData = null;

      if (formData.evidence) {
        try {
          const fileInfo = {
            filename: formData.evidence.name,
            contentType: formData.evidence.type
          };

          console.log('Getting pre-signed URL for:', fileInfo);

          const evidenceResponse = await addReportingEvidence(fileInfo);
          const { publicUrl, uploadURL } = evidenceResponse.data;

          console.log('Pre-signed URL received:', uploadURL);
          setUploadProgress(30);

          try {
            await uploadWithSendFileToS3(uploadURL, formData.evidence);
          } catch (s3Error) {
            console.log('sendFileToS3 failed, trying alternative method:', s3Error);
            await uploadWithAlternativeMethod(uploadURL, formData.evidence);
          }

          evidenceData = publicUrl;
          console.log('File uploaded successfully, evidence URL:', evidenceData);
          
        } catch (uploadError) {
          console.error('Error uploading evidence:', uploadError);
          Alert.alert(
            'Upload Error', 
            'Failed to upload file. Would you like to submit the report without the file?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Submit Without File', 
                onPress: () => submitReport(null) 
              }
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
      setUploadProgress(0);
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
        evidence: evidenceUrl
      };

      console.log('Submitting report payload:', reportPayload);

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
              }
            }
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

  const handleClose = () => {
    if (!isLoading) {
      if (formData.reason || formData.details || formData.evidence) {
        Alert.alert(
          'Discard Report?',
          'You have unsaved changes. Are you sure you want to discard this report?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: onClose }
          ]
        );
      } else {
        onClose();
      }
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerContent}>
                <Ionicons name="flag" size={24} color="#EF4444" />
                <Text style={styles.modalTitle}>Report Issue</Text>
              </View>
              <TouchableOpacity 
                onPress={handleClose}
                disabled={isLoading}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
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
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContentContainer}
            >
              {/* Form fields */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Reason <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, errors.reason && styles.inputError]}
                  placeholder="Brief reason for reporting"
                  value={formData.reason}
                  onChangeText={(text) => handleChange('reason', text)}
                  editable={!isLoading}
                  returnKeyType="next"
                />
                {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Details <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textArea, errors.details && styles.inputError]}
                  placeholder="Please provide detailed explanation"
                  value={formData.details}
                  onChangeText={(text) => handleChange('details', text)}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isLoading}
                  scrollEnabled={true}
                  returnKeyType="default"
                  blurOnSubmit={false}
                />
                {errors.details && <Text style={styles.errorText}>{errors.details}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Supporting Evidence (Optional)</Text>
                
                {!formData.evidence ? (
                  <TouchableOpacity 
                    style={[styles.uploadButton, isLoading && styles.uploadButtonDisabled]}
                    onPress={pickDocument}
                    disabled={isLoading}
                  >
                    <Ionicons name="cloud-upload" size={20} color="#6366F1" />
                    <Text style={styles.uploadButtonText}>Tap to upload file</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.fileContainer}>
                    <View style={styles.fileInfo}>
                      <Ionicons name="document" size={20} color="#6366F1" />
                      <View style={styles.fileDetails}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {formData.evidence.name}
                        </Text>
                        <Text style={styles.fileSize}>
                          {Math.round(formData.evidence.size / 1024)} KB
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={removeDocument}
                      disabled={isLoading}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[styles.progressFill, { width: `${uploadProgress}%` }]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      Uploading: {uploadProgress}%
                    </Text>
                  </View>
                )}

                {uploadProgress === 100 && (
                  <View style={styles.successContainer}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.successText}>File uploaded successfully</Text>
                  </View>
                )}

                <Text style={styles.fileHint}>
                  JPG, PNG, PDF, or DOC (Max 5MB)
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, isLoading && styles.buttonDisabled]}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.submitButton, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>
                      {uploadProgress > 0 ? 'Uploading...' : 'Submitting...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: screenHeight * 0.8, // Use percentage of screen height
    minHeight: 400, // Minimum height
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  taskInfo: {
    fontSize: 14,
    color: '#64748B',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  taskTitle: {
    fontWeight: '600',
    color: '#1E293B',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 120, // Fixed height for better scrolling
    textAlignVertical: 'top',
    maxHeight: 200, // Maximum height before scrolling
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 14,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  fileDetails: {
    flex: 1,
    marginLeft: 8,
  },
  fileName: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  fileHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#EF4444',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default ReportForm;