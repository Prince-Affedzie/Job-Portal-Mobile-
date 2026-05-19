// component/common/reportForm.js
// component/common/reportForm.js
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
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AuthContext } from '../../context/AuthContext';
import { raiseDispute, addReportingEvidence, sendFileToS3 } from '../../api/commonApi';

const { width, height } = Dimensions.get('window');
const scale = (size) => (width / 375) * size;

// ─── Theme (Pacific Indigo & Warm Gold) ──────────────────────────────────────
const C = {
  bg: '#F8FAFF',
  surface: '#FFFFFF',
  border: '#E4E8EE',
  primary: '#1E3A6E',
  primaryDark: '#152C4F',
  gold: '#D49B3F',
  goldLight: '#FCF3E1',
  red: '#DC2626',
  redLight: '#FEE2E2',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
};

/**
 * ReportForm – reusable reporting bottom sheet
 *
 * Props:
 *   isVisible          – boolean, show/hide
 *   onClose            – function, called when dismissed
 *   onReportSubmitted  – function, called after successful submission
 *
 *   Context props (all optional — fill only what's relevant):
 *   reportedUserId     – the user being reported
 *   taskId             – related task ID (can be null)
 *   taskTitle          – display name of the task (can be empty)
 */
const ReportForm = ({
  isVisible,
  onClose,
  onReportSubmitted,
  reportedUserId,
  taskId,
  taskTitle,
}) => {
  const { user } = React.useContext(AuthContext);
  const [formData, setFormData] = useState({
    reason: '',
    details: '',
    evidence: null,
  });
  const [uploadProgress, setUploadProgress] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Bottom sheet animation
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [isVisible]);

  // Reset form on open
  useEffect(() => {
    if (isVisible) {
      setFormData({ reason: '', details: '', evidence: null });
      setErrors({});
      setUploadProgress({});
    }
  }, [isVisible]);

  const handleChange = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  }, [errors]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        const fileSizeMB = (fileInfo.size || file.size || 0) / (1024 * 1024);
        if (fileSizeMB > 5) {
          Alert.alert('File too large', 'Max file size is 5MB.');
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
    if (!formData.reason.trim()) newErrors.reason = 'Reason is required';
    else if (formData.reason.trim().length < 5) newErrors.reason = 'Reason should be at least 5 characters';
    if (!formData.details.trim()) newErrors.details = 'Details are required';
    else if (formData.details.trim().length < 10) newErrors.details = 'Details should be at least 10 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      let evidenceData = null;
      if (formData.evidence) {
        try {
          const evidenceResponse = await addReportingEvidence({
            filename: formData.evidence.name,
            contentType: formData.evidence.type,
          });
          const { publicUrl, uploadURL } = evidenceResponse.data;
          setUploadProgress({ 0: 30 });
          await sendFileToS3(uploadURL, formData.evidence);
          setUploadProgress({ 0: 100 });
          evidenceData = publicUrl;
        } catch (uploadError) {
          Alert.alert('Upload Error', 'Failed to upload file. Submit without it?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Submit Without File', onPress: () => submitReport(null) },
          ]);
          return;
        }
      }
      await submitReport(evidenceData);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit report.');
    } finally {
      setIsLoading(false);
      setUploadProgress({});
    }
  };

  const submitReport = async (evidenceUrl) => {
    try {
      const reportPayload = {
        against: reportedUserId || '',
        taskId: taskId || '',
        tasktitle: taskTitle || '',
        reportedBy: user?.name || '',
        reason: formData.reason.trim(),
        details: formData.details.trim(),
        evidence: evidenceUrl,
      };
      const response = await raiseDispute(reportPayload);
      if (response.status === 200) {
        Alert.alert('Report Submitted', 'Our team will review it shortly.', [
          { text: 'OK', onPress: () => { onReportSubmitted?.(); onClose(); } },
        ]);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent onRequestClose={handleClose} statusBarTranslucent>
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" />
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="flag-outline" size={20} color={C.red} />
                </View>
                <Text style={styles.title}>Report Issue</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} disabled={isLoading}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {taskTitle ? (
              <Text style={styles.taskInfo}>
                Reporting: <Text style={{ fontWeight: '700', color: C.textPrimary }}>{taskTitle}</Text>
              </Text>
            ) : null}
          </KeyboardAvoidingView>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Reason <Text style={{ color: C.red }}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.reason && styles.inputError]}
              placeholder="Enter reason for reporting..."
              placeholderTextColor={C.textMuted}
              value={formData.reason}
              onChangeText={(text) => handleChange('reason', text)}
              editable={!isLoading}
              maxLength={100}
            />
            {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}

            <Text style={styles.label}>Details <Text style={{ color: C.red }}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.details && styles.inputError]}
              placeholder="Describe the issue in detail..."
              placeholderTextColor={C.textMuted}
              value={formData.details}
              onChangeText={(text) => handleChange('details', text)}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!isLoading}
              maxLength={1000}
            />
            <Text style={styles.charCount}>{formData.details.length}/1000</Text>
            {errors.details && <Text style={styles.errorText}>{errors.details}</Text>}

            <Text style={styles.label}>Supporting Evidence (optional)</Text>
            {!formData.evidence ? (
              <TouchableOpacity style={styles.uploadBox} onPress={pickDocument} disabled={isLoading}>
                <Ionicons name="cloud-upload-outline" size={24} color={C.primary} />
                <Text style={styles.uploadText}>Add File</Text>
                <Text style={styles.uploadSub}>Max 5MB • JPG, PNG, PDF</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.fileCard}>
                <Ionicons name="document-outline" size={20} color={C.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName} numberOfLines={1}>{formData.evidence.name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(formData.evidence.size)}</Text>
                </View>
                <TouchableOpacity onPress={removeDocument} disabled={isLoading}>
                  <Ionicons name="close-circle" size={20} color={C.red} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={isLoading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Text style={styles.submitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.9,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: C.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    fontSize: 14,
    color: C.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  scrollView: {
    maxHeight: height * 0.6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSecondary,
    letterSpacing: 0.3,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: C.textPrimary,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 13,
  },
  inputError: {
    borderColor: C.red,
    backgroundColor: C.redLight,
  },
  errorText: {
    fontSize: 12,
    color: C.red,
    marginTop: 4,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  uploadBox: {
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
  },
  uploadSub: {
    fontSize: 12,
    color: C.textMuted,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  fileSize: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    bottom:25,
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSecondary,
  },
  submitBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: C.red,
    shadowColor: C.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
  },
});

export default ReportForm;