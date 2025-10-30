import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getSignedUrl, sendFileToS3 } from '../../api/commonApi';
import { submitWorkForReview } from '../../api/miniTaskApi';

// Scaling function for responsiveness
const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const scale = (size) => (width / guidelineBaseWidth) * size;
const isTablet = width > scale(600);

const WorkSubmissionModal = ({
  isVisible,
  onClose,
  taskId,
  task,
  onSubmissionSuccess,
}) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const textInputRef = useRef(null);

  // Keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      // Ensure TextInput retains focus
      setTimeout(() => textInputRef.current?.focus(), 100);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Reset form when modal closes
  const resetForm = useCallback(() => {
    setMessage('');
    setFiles([]);
    setUploadProgress({});
    setErrors({});
  }, []);

  useEffect(() => {
    if (!isVisible) {
      resetForm();
    } else {
      // Focus TextInput when modal opens
      setTimeout(() => textInputRef.current?.focus(), 300);
    }
  }, [isVisible, resetForm]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_FILES = 10;

  // File handling functions
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
      if (file.size > MAX_FILE_SIZE) {
        validationErrors[file.name] = `File exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`;
        continue;
      }
      if (totalSize + file.size > 50 * 1024 * 1024) {
        validationErrors[file.name] = 'Total upload size would exceed 50MB';
        continue;
      }
      if (files.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
        validationErrors[file.name] = 'File already selected';
        continue;
      }
      validFiles.push(file);
      totalSize += file.size;
    }

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
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const fileList = await Promise.all(
          result.assets.map(async (file) => {
            try {
             const fileInfo = await FileSystem.getInfoAsync(file.uri);
              return {
                name: file.name,
                uri: file.uri,
                type: file.mimeType,
                size: fileInfo.size || 0,
              };
            } catch (fileError) {
              console.error('Error getting file info:', fileError);
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

  const uploadWithSendFileToS3 = async (uploadUrl, file, fileIndex) => {
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
            setUploadProgress(prev => ({
              ...prev,
              [fileIndex]: 30 + Math.floor(percentCompleted * 0.7),
            }));
          },
        })
          .then(() => {
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

  const uploadWithAlternativeMethod = async (uploadUrl, file, fileIndex) => {
    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const progressHandler = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(prev => ({
            ...prev,
            [fileIndex]: 30 + Math.floor(percentCompleted * 0.7),
          }));
        },
      };
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
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, [i]: 0 }));
        try {
          const { data } = await getSignedUrl({
            taskId,
            filename: file.name,
            contentType: file.type,
          });
          setUploadProgress(prev => ({ ...prev, [i]: 30 }));
          try {
            await uploadWithSendFileToS3(data.uploadURL, file, i);
          } catch (s3Error) {
            console.log('sendFileToS3 failed, trying alternative method:', s3Error);
            await uploadWithAlternativeMethod(data.uploadURL, file, i);
          }
          fileKeys.push({ fileKey: data.fileKey });
        } catch (fileError) {
          console.error(`Failed to upload ${file.name}:`, fileError);
          setUploadProgress(prev => ({ ...prev, [i]: -1 }));
          failedUploads.push(file.name);
        }
      }
      if (fileKeys.length === 0) {
        throw new Error('All file uploads failed');
      }
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

  const FileCard = React.memo(({ file, index, progress, onRemove, submitting }) => (
    <View style={styles.fileCard}>
      <View style={styles.fileCardHeader}>
        <Ionicons name={getFileIcon(file.name)} size={scale(20)} color="#6366F1" />
        <TouchableOpacity
          onPress={onRemove}
          disabled={submitting}
          style={styles.fileCardRemove}
        >
          <Ionicons name="close" size={scale(16)} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <Text style={styles.fileCardName} numberOfLines={2}>
        {file.name}
      </Text>
      <Text style={styles.fileCardSize}>
        {formatFileSize(file.size)}
      </Text>
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

  const handleMessageChange = useCallback((text) => {
    setMessage(text);
    if (errors.message) {
      setErrors(prev => ({ ...prev, message: undefined }));
    }
  }, [errors.message]);

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" />
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            if (!keyboardVisible) {
              onClose();
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
              <Text style={styles.headerTitle}>Submit Your Work</Text>
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={scale(24)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{
                ...styles.scrollContentContainer,
                paddingBottom: keyboardVisible ? scale(120) : scale(30),
              }}
            >
              {/* Description Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.sectionSubtitle}>
                  Provide details about your submission
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={textInputRef}
                    style={[styles.textArea, errors.message && styles.inputError]}
                    placeholder="Describe your submission in detail..."
                    placeholderTextColor="#9CA3AF"
                    value={message}
                    onChangeText={handleMessageChange}
                    multiline={true}
                    numberOfLines={6}
                    textAlignVertical="top"
                    editable={!submitting}
                    maxLength={1000}
                    returnKeyType="default"
                    blurOnSubmit={false}
                    allowFontScaling={true}
                    onBlur={() => console.log('TextInput blurred')}
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
              </View>

              {/* Files Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Files ({files.length}/{MAX_FILES})
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Upload screenshots, documents, or other files
                </Text>
                <TouchableOpacity
                  style={[styles.uploadCard, files.length >= MAX_FILES && styles.uploadCardDisabled]}
                  onPress={pickFiles}
                  disabled={submitting || files.length >= MAX_FILES}
                >
                  <Ionicons name="cloud-upload" size={scale(32)} color="#6366F1" />
                  <Text style={styles.uploadCardTitle}>Add Files</Text>
                  <Text style={styles.uploadCardSubtitle}>
                    Max {formatFileSize(MAX_FILE_SIZE)} per file • 50MB total
                  </Text>
                  {files.length >= MAX_FILES && (
                    <Text style={styles.uploadCardWarning}>Maximum files reached</Text>
                  )}
                  {errors.files && (
                    <Text style={styles.errorText}>{errors.files}</Text>
                  )}
                </TouchableOpacity>
                {files.length > 0 && (
                  <View style={styles.fileGrid}>
                    {files.map((file, index) => (
                      <FileCard
                        key={index}
                        file={file}
                        index={index}
                        progress={uploadProgress[index]}
                        onRemove={() => removeFile(index)}
                        submitting={submitting}
                      />
                    ))}
                  </View>
                )}
              </View>

              {/* Error Messages */}
              {Object.keys(errors).filter(key => !['message', 'files'].includes(key)).length > 0 && (
                <View style={styles.errorContainer}>
                  <View style={styles.errorHeader}>
                    <Ionicons name="warning" size={scale(20)} color="#EF4444" />
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
            <View style={styles.footer}>
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
                  (submitting || files.length === 0 || !message.trim() || message.trim().length < 10) && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting || files.length === 0 || !message.trim() || message.trim().length < 10}
              >
                {submitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={scale(16)} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Work</Text>
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
    maxHeight: height * 0.95, // Increased from 0.9 to 0.95
    minHeight: scale(550), // Increased from 400 to 450 for more content space
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    backgroundColor: '#6366F1',
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    padding: scale(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: scale(4),
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
  uploadCardWarning: {
    fontSize: scale(12),
    color: '#EF4444',
    marginTop: scale(8),
    fontWeight: '500',
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
  errorList: {
    gap: scale(4),
  },
  errorItem: {
    fontSize: scale(12),
    color: '#991B1B',
    lineHeight: scale(16),
  },
  errorFileName: {
    fontWeight: '500',
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
    paddingVertical: scale(16),
    paddingHorizontal: scale(20),
    borderRadius: scale(12),
    gap: scale(8),
    minHeight: scale(52),
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
    backgroundColor: '#6366F1',
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

export default WorkSubmissionModal;