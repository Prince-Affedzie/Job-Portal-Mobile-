import React, { useState, useEffect, useRef } from 'react';
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
  Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from "expo-file-system";
import { getSignedUrl, sendFileToS3 } from '../../api/commonApi';
import { submitWorkForReview } from '../../api/miniTaskApi';

const { width, height: screenHeight } = Dimensions.get('window');

const WorkSubmissionModal = ({ 
  isVisible, 
  onClose, 
  taskId, 
  task,
  onSubmissionSuccess 
}) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // File size limit (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_FILES = 10;

  useEffect(() => {
    if (!isVisible) {
      // Reset form when modal closes
      setMessage('');
      setFiles([]);
      setUploadProgress({});
      setErrors({});
    }
  }, [isVisible]);

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'image-outline';
    } else if (['mp4', 'mov', 'avi', 'mkv'].includes(extension)) {
      return 'videocam-outline';
    } else {
      return 'document-outline';
    }
  };

  const validateFiles = (fileList) => {
    const validationErrors = {};
    const validFiles = [];
    let totalSize = files.reduce((sum, file) => sum + file.size, 0);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        validationErrors[file.name] = `File exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`;
        continue;
      }

      // Check total size won't exceed 50MB
      if (totalSize + file.size > 50 * 1024 * 1024) {
        validationErrors[file.name] = 'Total upload size would exceed 50MB';
        continue;
      }

      // Check for duplicates
      if (files.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
        validationErrors[file.name] = 'File already selected';
        continue;
      }

      validFiles.push(file);
      totalSize += file.size;
    }

    // Check total file count
    if (files.length + validFiles.length > MAX_FILES) {
      Alert.alert('Limit Reached', `Maximum ${MAX_FILES} files allowed`);
      return { validFiles: validFiles.slice(0, MAX_FILES - files.length), errors: validationErrors };
    }

    return { validFiles, errors: validationErrors };
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/*',
          'video/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        multiple: true,
        copyToCacheDirectory: true
      });

      console.log('Document picker result:', result);

      if (result.assets && result.assets.length > 0) {
        const fileList = await Promise.all(
          result.assets.map(async (file) => {
            try {
              // Use the new FileSystem API to get file info
              const fileInfo = await FileSystem.getInfo(file.uri);
              console.log('File info:', fileInfo);
              
              return {
                name: file.name,
                uri: file.uri,
                type: file.mimeType,
                size: fileInfo.size || 0,
              };
            } catch (fileError) {
              console.error('Error getting file info:', fileError);
              // Fallback: use the size from DocumentPicker if available
              return {
                name: file.name,
                uri: file.uri,
                type: file.mimeType,
                size: file.size || 0,
              };
            }
          })
        );

        const { validFiles, errors: validationErrors } = validateFiles(fileList);

        if (Object.keys(validationErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...validationErrors }));
          // Clear errors after 5 seconds
          setTimeout(() => {
            setErrors(prev => {
              const newErrors = { ...prev };
              Object.keys(validationErrors).forEach(key => delete newErrors[key]);
              return newErrors;
            });
          }, 5000);
        }

        if (validFiles.length > 0) {
          setFiles(prev => [...prev, ...validFiles]);
          Alert.alert('Success', `Added ${validFiles.length} file(s)`);
        }
      } else if (result.canceled) {
        console.log('User cancelled file selection');
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Failed to select files');
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[indexToRemove];
      return newProgress;
    });
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
    
    if (!message.trim()) {
      newErrors.message = 'Please describe your submission';
    } else if (message.trim().length < 10) {
      newErrors.message = 'Description should be at least 10 characters';
    }
    
    if (files.length === 0) {
      newErrors.files = 'Please add at least one file';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const prepareFileForUpload = async (file) => {
    try {
      // Create a file-like object for sendFileToS3
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Create a file-like object that matches what sendFileToS3 expects
      const fileObject = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: Date.now(),
        // Add blob for the upload
        blob: blob,
      };
      
      return fileObject;
    } catch (error) {
      console.error('Error preparing file:', error);
      throw error;
    }
  };

  // Use your sendFileToS3 API with progress tracking
  const uploadWithSendFileToS3 = async (uploadUrl, file, fileIndex) => {
    return new Promise((resolve, reject) => {
      try {
        // Prepare the file for upload
        const fileToUpload = {
          ...file,
          // Ensure we have the necessary properties for sendFileToS3
          lastModified: Date.now(),
          webkitRelativePath: '',
        };

        // Use your sendFileToS3 API with progress tracking
        sendFileToS3(uploadUrl, fileToUpload, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload progress for ${file.name}: ${percentCompleted}%`);
            
            // Update progress state
            setUploadProgress(prev => ({ 
              ...prev, 
              [fileIndex]: 30 + Math.floor(percentCompleted * 0.7) 
            }));
          }
        })
        .then(() => {
          console.log(`Upload completed for ${file.name}`);
          setUploadProgress(prev => ({ ...prev, [fileIndex]: 100 }));
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

  // Alternative approach if sendFileToS3 doesn't work with React Native files
  const uploadWithAlternativeMethod = async (uploadUrl, file, fileIndex) => {
    try {
      // Convert React Native file to a format that can be uploaded
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Create a synthetic progress event for compatibility
      const progressHandler = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(prev => ({ 
            ...prev, 
            [fileIndex]: 30 + Math.floor(percentCompleted * 0.7) 
          }));
        }
      };

      // Call sendFileToS3 with the blob
      await sendFileToS3(uploadUrl, blob, progressHandler);
      setUploadProgress(prev => ({ ...prev, [fileIndex]: 100 }));
      
    } catch (error) {
      console.error('Alternative upload failed:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const fileKeys = [];
      const failedUploads = [];

      // Upload files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, [i]: 0 }));

        try {
          // Get signed URL
          const { data } = await getSignedUrl({
            taskId,
            filename: file.name,
            contentType: file.type,
          });
          
          setUploadProgress(prev => ({ ...prev, [i]: 30 }));
          console.log('Got signed URL for:', file.name);

          try {
            // Try using your sendFileToS3 API first
            await uploadWithSendFileToS3(data.uploadURL, file, i);
          } catch (s3Error) {
            console.log('sendFileToS3 failed, trying alternative method:', s3Error);
            // Fallback to alternative method
            await uploadWithAlternativeMethod(data.uploadURL, file, i);
          }

          fileKeys.push({ fileKey: data.fileKey });
          console.log('File uploaded successfully:', file.name);
          
        } catch (fileError) {
          console.error(`Failed to upload ${file.name}:`, fileError);
          setUploadProgress(prev => ({ ...prev, [i]: -1 }));
          failedUploads.push(file.name);
        }
      }

      // Check if we have any successfully uploaded files
      if (fileKeys.length === 0) {
        throw new Error('All file uploads failed');
      }

      // Submit work with successful uploads
      await submitWorkForReview(taskId, {
        message: message.trim(),
        fileKeys,
      });

      if (failedUploads.length > 0) {
        Alert.alert(
          'Submission Complete',
          `Submitted with ${fileKeys.length} files (${failedUploads.length} failed)`
        );
      } else {
        Alert.alert('Success', 'Work submitted successfully!');
        if (onSubmissionSuccess) {
          onSubmissionSuccess();
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Submission error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Submission failed. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const FileItem = ({ file, index, progress }) => (
    <View style={[
      styles.fileItem,
      progress === -1 && styles.fileItemError,
      progress === 100 && styles.fileItemSuccess
    ]}>
      <View style={styles.fileInfo}>
        <Ionicons 
          name={getFileIcon(file.name)} 
          size={20} 
          color={progress === -1 ? '#EF4444' : progress === 100 ? '#10B981' : '#6B7280'} 
        />
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
          <View style={styles.fileMeta}>
            <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
            {progress !== undefined && (
              <Text style={[
                styles.fileProgress,
                progress === -1 && styles.fileProgressError,
                progress === 100 && styles.fileProgressSuccess
              ]}>
                {progress === -1 ? 'Failed' : progress === 100 ? 'Uploaded' : `${progress}%`}
              </Text>
            )}
          </View>
          {progress > 0 && progress < 100 && (
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${progress}%` }]} 
              />
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => removeFile(index)}
        disabled={submitting}
        style={styles.removeButton}
      >
        <Ionicons name="trash-outline" size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            keyboardVisible && styles.modalContainerKeyboardOpen
          ]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerGradient}>
                <View style={styles.headerContent}>
                  <View style={styles.titleContainer}>
                    <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
                    <Text style={styles.modalTitle}>Submit Your Work</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={onClose}
                    disabled={submitting}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.headerSubtitle}>
                  Upload your completed files and provide details
                </Text>
              </View>
            </View>

            <ScrollView 
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContentContainer}
            >
              {/* Message Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Description <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    errors.message && styles.inputError
                  ]}
                  placeholder="Describe what you're submitting..."
                  value={message}
                  onChangeText={(text) => {
                    setMessage(text);
                    if (errors.message) {
                      setErrors(prev => ({ ...prev, message: undefined }));
                    }
                  }}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!submitting}
                  maxLength={1000}
                  scrollEnabled={true}
                  blurOnSubmit={false}
                />
                <View style={styles.charCounter}>
                  {errors.message ? (
                    <Text style={styles.errorText}>{errors.message}</Text>
                  ) : (
                    <Text style={styles.hintText}>Minimum 10 characters</Text>
                  )}
                  <Text style={styles.charCount}>{message.length}/1000</Text>
                </View>
              </View>

              {/* File Upload Area */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Files <Text style={styles.required}>*</Text> 
                  <Text style={styles.fileCount}>({files.length}/{MAX_FILES})</Text>
                </Text>
                
                <TouchableOpacity 
                  style={[
                    styles.uploadArea,
                    errors.files && styles.uploadAreaError,
                    dragActive && styles.uploadAreaActive
                  ]}
                  onPress={pickFiles}
                  disabled={submitting}
                >
                  <View style={styles.uploadIcon}>
                    <Ionicons name="cloud-upload" size={32} color="#6366F1" />
                  </View>
                  <View style={styles.uploadText}>
                    <Text style={styles.uploadTitle}>Tap to upload</Text>
                    <Text style={styles.uploadSubtitle}>
                      Max {formatFileSize(MAX_FILE_SIZE)} per file • 50MB total
                    </Text>
                  </View>
                </TouchableOpacity>

                {errors.files && (
                  <Text style={styles.errorText}>{errors.files}</Text>
                )}
              </View>

              {/* File List */}
              {files.length > 0 && (
                <View style={styles.fileListContainer}>
                  <Text style={styles.fileListTitle}>Selected Files</Text>
                  <View style={styles.fileList}>
                    {files.map((file, index) => (
                      <FileItem 
                        key={index}
                        file={file}
                        index={index}
                        progress={uploadProgress[index]}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Error Messages */}
              {Object.keys(errors).filter(key => !['message', 'files'].includes(key)).length > 0 && (
                <View style={styles.errorContainer}>
                  <View style={styles.errorHeader}>
                    <Ionicons name="warning" size={20} color="#EF4444" />
                    <Text style={styles.errorTitle}>Some files couldn't be added</Text>
                  </View>
                  <View style={styles.errorList}>
                    {Object.entries(errors)
                      .filter(([key]) => !['message', 'files'].includes(key))
                      .map(([fileName, error]) => (
                        <Text key={fileName} style={styles.errorItem}>
                          <Text style={styles.errorFileName}>{fileName}:</Text> {error}
                        </Text>
                      ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.submitButton,
                  (submitting || files.length === 0) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={submitting || files.length === 0}
              >
                {submitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Uploading...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Work</Text>
                  </>
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
    maxHeight: screenHeight * 0.85, // Use percentage of screen height
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContainerKeyboardOpen: {
    maxHeight: screenHeight * 0.9, // Allow more height when keyboard is open
  },
  modalHeader: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  headerGradient: {
    backgroundColor: '#6366F1',
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
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
  fileCount: {
    color: '#6B7280',
    fontWeight: '400',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 120,
    maxHeight: 200, // Maximum height before scrolling
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  charCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  hintText: {
    color: '#6B7280',
    fontSize: 12,
  },
  charCount: {
    color: '#6B7280',
    fontSize: 12,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  uploadAreaError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  uploadAreaActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  uploadIcon: {
    marginBottom: 12,
  },
  uploadText: {
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  fileListContainer: {
    marginBottom: 20,
  },
  fileListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  fileList: {
    gap: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fileItemError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  fileItemSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  fileMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  fileProgress: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366F1',
  },
  fileProgressError: {
    color: '#EF4444',
  },
  fileProgressSuccess: {
    color: '#10B981',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  removeButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
  },
  errorList: {
    gap: 4,
  },
  errorItem: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
  errorFileName: {
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
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
    backgroundColor: '#6366F1',
  },
  submitButtonDisabled: {
    opacity: 0.5,
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
});

export default WorkSubmissionModal;