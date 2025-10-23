import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Header from '../../component/tasker/Header';
import { getMyWorkSubmissions, deleteWorkSubmission } from '../../api/miniTaskApi';
import { getPreviewUrl } from '../../api/commonApi'; // Import your API function
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { width } = Dimensions.get('window');

const SubmissionsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId, taskTitle } = route.params || {};
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [openingFile, setOpeningFile] = useState(null);
  const [fileUrls, setFileUrls] = useState({}); // Cache for file URLs
  const scrollViewRef = useRef();

  // Function to get file URL from API
  const getFileUrl = async (fileKey, submissionStatus) => {
    // Check if we already have the URL cached
    const cacheKey = `${fileKey}-${submissionStatus}`;
    if (fileUrls[cacheKey]) {
      return fileUrls[cacheKey];
    }

    try {
      const res = await getPreviewUrl(fileKey, submissionStatus);
      if (res.status === 200) {
        const previewURL = res.data.previewURL;
        // Cache the URL
        setFileUrls(prev => ({
          ...prev,
          [cacheKey]: previewURL
        }));
        return previewURL;
      } else {
        throw new Error('Failed to get preview URL');
      }
    } catch (error) {
      console.error('Error fetching preview URL:', error);
      throw error;
    }
  };

  // Function to open files
  const openFile = async (file, submissionStatus) => {
    try {
      setOpeningFile(file.fileKey);
      
      // Get the file URL from API
      const fileUrl = await getFileUrl(file.fileKey, submissionStatus);
      if (!fileUrl) {
        Alert.alert('Error', 'File URL not found');
        return;
      }

      // Check if we can open the URL
      const canOpen = await Linking.canOpenURL(fileUrl);
      
      if (canOpen) {
        await Linking.openURL(fileUrl);
      } else {
        // If cannot open directly, try to download and share
        await downloadAndShareFile(file, fileUrl);
      }
      
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file. Please try again.');
    } finally {
      setOpeningFile(null);
    }
  };

  // Alternative method for downloading and sharing files
  const downloadAndShareFile = async (file, fileUrl) => {
    try {
      const fileName = file.fileKey.split('/').pop();
      const localUri = FileSystem.cacheDirectory + fileName;
      
      // Download the file
      const downloadResult = await FileSystem.downloadAsync(fileUrl, localUri);
      
      if (downloadResult.status === 200) {
        // Check if sharing is available
        if (await Sharing.isAvailableAsync()) {
          // Share the file - this will open the system share sheet
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: getMimeType(file.fileKey),
            UTI: getUTI(file.fileKey)
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Error downloading/sharing file:', error);
      Alert.alert(
        'Cannot Open File', 
        'The file could not be opened directly. You can try to download it manually or contact support.'
      );
    }
  };

  // Helper function to get MIME type
  const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  // Helper function to get UTI (iOS)
  const getUTI = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const utis = {
      'jpg': 'public.jpeg',
      'jpeg': 'public.jpeg',
      'png': 'public.png',
      'gif': 'public.gif',
      'pdf': 'com.adobe.pdf',
      'doc': 'com.microsoft.word.doc',
      'docx': 'org.openxmlformats.wordprocessingml.document',
      'mp4': 'public.mpeg-4',
      'mp3': 'public.audio',
    };
    return utis[ext] || 'public.data';
  };

  const fetchSubmissions = async () => {
    try {
      const res = await getMyWorkSubmissions(taskId);
      if (res.status === 200) {
        const sortedSubmissions = res.data.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setSubmissions(sortedSubmissions);
        
        // Select the most recent submission by default
        if (sortedSubmissions.length > 0 && !selectedSubmission) {
          setSelectedSubmission(sortedSubmissions[0]);
        }
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load submissions. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [taskId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubmissions();
  };

  const getStatusDetails = (status) => {
    switch (status) {
      case 'pending':
        return {
          color: '#FEF3C7',
          textColor: '#92400E',
          borderColor: '#FCD34D',
          icon: 'time-outline',
          text: 'Awaiting Review'
        };
      case 'approved':
        return {
          color: '#D1FAE5',
          textColor: '#065F46',
          borderColor: '#34D399',
          icon: 'checkmark-circle-outline',
          text: 'Approved'
        };
      case 'rejected':
        return {
          color: '#FEE2E2',
          textColor: '#991B1B',
          borderColor: '#FCA5A5',
          icon: 'close-circle-outline',
          text: 'Rejected'
        };
      default:
        return {
          color: '#F3F4F6',
          textColor: '#374151',
          borderColor: '#D1D5DB',
          icon: 'time-outline',
          text: status
        };
    }
  };

  const getFileTypeIcon = (fileKey) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(fileKey)) {
      return 'image-outline';
    } else if (/\.(mp4|webm|mov|avi|wmv)$/i.test(fileKey)) {
      return 'videocam-outline';
    } else if (/\.(pdf)$/i.test(fileKey)) {
      return 'document-outline';
    } else if (/\.(doc|docx)$/i.test(fileKey)) {
      return 'document-text-outline';
    } else if (/\.(xls|xlsx)$/i.test(fileKey)) {
      return 'document-outline';
    } else {
      return 'document-outline';
    }
  };

  const handleDelete = async (submissionId) => {
    Alert.alert(
      'Delete Submission',
      'Are you sure you want to delete this submission?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(submissionId);
            try {
              const res = await deleteWorkSubmission(submissionId);
              if (res.status === 200) {
                Alert.alert('Success', 'Submission removed successfully');
                
                // Update submissions list
                const updatedSubmissions = submissions.filter((s) => s._id !== submissionId);
                setSubmissions(updatedSubmissions);
                
                // If we deleted the selected submission, select the next one
                if (selectedSubmission && selectedSubmission._id === submissionId) {
                  if (updatedSubmissions.length > 0) {
                    setSelectedSubmission(updatedSubmissions[0]);
                  } else {
                    setSelectedSubmission(null);
                  }
                }
              }
            } catch (error) {
              const errorMessage = error.response?.data?.message || 
                                "An unexpected error occurred. Please try again.";
              console.error('Failed to delete submission:', error);
              Alert.alert('Error', errorMessage);
            } finally {
              setDeleteLoading(null);
            }
          }
        }
      ]
    );
  };

  const getFilteredSubmissions = () => {
    if (filter === 'all') return submissions;
    return submissions.filter(sub => sub.status === filter);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubmissionNumber = (submission) => {
    const allSubmissions = [...submissions].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    const index = allSubmissions.findIndex(s => s._id === submission._id);
    return index + 1;
  };

  const FilterButton = ({ value, label, isActive }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        isActive && styles.filterButtonActive
      ]}
      onPress={() => setFilter(value)}
    >
      <Text style={[
        styles.filterButtonText,
        isActive && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const SubmissionListItem = ({ submission, isSelected }) => {
    const statusDetails = getStatusDetails(submission.status);
    
    return (
      <TouchableOpacity
        style={[
          styles.submissionItem,
          isSelected && styles.submissionItemSelected
        ]}
        onPress={() => {
          setSelectedSubmission(submission);
          // Scroll to top when selecting on mobile
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }}
      >
        <View style={styles.submissionHeader}>
          <Text style={styles.submissionNumber}>
            Submission #{getSubmissionNumber(submission)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusDetails.color }]}>
            <Ionicons name={statusDetails.icon} size={14} color={statusDetails.textColor} />
            <Text style={[styles.statusText, { color: statusDetails.textColor }]}>
              {statusDetails.text}
            </Text>
          </View>
        </View>
        
        <View style={styles.submissionMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{formatDate(submission.createdAt)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="document-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{submission.files?.length || 0} file(s)</Text>
          </View>
          {submission.message && (
            <View style={styles.metaItem}>
              <Ionicons name="chatbubble-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>Has message</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // File Item Component
  // File Item Component with Preview
const FileItem = ({ file, submissionStatus }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [isVideo, setIsVideo] = useState(false);

  // Determine file type and fetch URL on mount
  useEffect(() => {
    const checkFileType = () => {
      const fileName = file.fileKey.toLowerCase();
      const imageRegex = /\.(jpg|jpeg|png|gif|webp)$/i;
      const videoRegex = /\.(mp4|webm|mov|avi|wmv|mkv)$/i;
      
      setIsImage(imageRegex.test(fileName));
      setIsVideo(videoRegex.test(fileName));
    };

    checkFileType();
  }, [file.fileKey]);

  // Fetch file URL for preview (thumbnail only)
  useEffect(() => {
    const fetchPreviewUrl = async () => {
      if (isImage || isVideo) {
        try {
          const url = await getFileUrl(file.fileKey, submissionStatus);
          setFileUrl(url);
        } catch (error) {
          console.error('Error fetching preview URL:', error);
        }
      }
    };

    fetchPreviewUrl();
  }, [file.fileKey, submissionStatus, isImage, isVideo]);

  const handleFilePress = async () => {
    // Always open the file using the original function
    setIsLoading(true);
    try {
      await openFile(file, submissionStatus);
    } catch (error) {
      console.error('Error handling file press:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.fileItem}
      onPress={handleFilePress}
      disabled={isLoading || openingFile === file.fileKey}
    >
      {/* File Icon or Preview Thumbnail */}
      {(isImage || isVideo) && fileUrl ? (
  <View style={styles.previewThumbnail}>
    {isImage ? (
      <Image 
        source={{ uri: fileUrl }} 
        style={styles.thumbnailImage}
        resizeMode="cover"
      />
    ) : (
      <View style={styles.videoThumbnail}>
        <Image 
          source={{ uri: fileUrl }} 
          style={styles.thumbnailImage}
          resizeMode="cover"
        />
        <View style={styles.playIconContainer}>
          <Ionicons name="play-circle" size={24} color="#FFFFFF" />
        </View>
      </View>
    )}
  </View>
) : (
  <Ionicons 
    name={getFileTypeIcon(file.fileKey)} 
    size={20} 
    color="#6366F1" 
  />
)}
      
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.fileKey.split('/').pop()}
        </Text>
        <Text style={styles.fileType}>
          {getFileTypeIcon(file.fileKey).replace('-outline', '')}
          {(isImage || isVideo) && ' • Tap to open'}
        </Text>
      </View>
      
      <View style={styles.previewButton}>
        {(isLoading || openingFile === file.fileKey) ? (
          <ActivityIndicator size="small" color="#6366F1" />
        ) : (
          <Ionicons 
            name="open-outline" 
            size={18} 
            color="#6366F1" 
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Submissions" showBackButton={true} />
        <LoadingIndicator text={`Loading Your Submission for ${taskTitle}...`}/>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Submissions" showBackButton={true} />
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Submissions</Text>
          <Text style={styles.subtitle}>Manage your work submissions for this project</Text>
        </View>

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterContainer}>
              <FilterButton value="all" label="All" isActive={filter === 'all'} />
              <FilterButton value="pending" label="Awaiting Review" isActive={filter === 'pending'} />
              <FilterButton value="approved" label="Approved" isActive={filter === 'approved'} />
              <FilterButton value="rejected" label="Rejected" isActive={filter === 'rejected'} />
            </View>
          </ScrollView>
        </View>

        {getFilteredSubmissions().length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-outline" size={48} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === 'all' ? "No Submissions Found" : `No ${filter} submissions`}
            </Text>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? "You haven't submitted any work yet for this task."
                : `No submissions with status: ${filter}`
              }
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Submission List */}
            <View style={styles.submissionList}>
              <Text style={styles.sectionTitle}>Submission History</Text>
              {getFilteredSubmissions().map((submission) => (
                <SubmissionListItem
                  key={submission._id}
                  submission={submission}
                  isSelected={selectedSubmission && selectedSubmission._id === submission._id}
                />
              ))}
            </View>

            {/* Selected Submission Details */}
            {selectedSubmission && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Submission Details</Text>
                
                <View style={styles.detailsCard}>
                  {/* Header */}
                  <View style={styles.detailsHeader}>
                    <View>
                      <View style={styles.detailsTitleRow}>
                        <Text style={styles.detailsTitle}>
                          Submission #{getSubmissionNumber(selectedSubmission)}
                        </Text>
                        <View style={[styles.statusBadge, { 
                          backgroundColor: getStatusDetails(selectedSubmission.status).color 
                        }]}>
                          <Ionicons 
                            name={getStatusDetails(selectedSubmission.status).icon} 
                            size={14} 
                            color={getStatusDetails(selectedSubmission.status).textColor} 
                          />
                          <Text style={[styles.statusText, { 
                            color: getStatusDetails(selectedSubmission.status).textColor 
                          }]}>
                            {getStatusDetails(selectedSubmission.status).text}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.submissionDate}>
                        Submitted on {formatDate(selectedSubmission.createdAt)}
                      </Text>
                    </View>
                    
                    <TouchableOpacity
                      onPress={() => handleDelete(selectedSubmission._id)}
                      disabled={deleteLoading === selectedSubmission._id}
                      style={styles.deleteButton}
                    >
                      {deleteLoading === selectedSubmission._id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Task Information */}
                  <View style={styles.taskInfo}>
                    <Text style={styles.infoLabel}>Task Information</Text>
                    <Text style={styles.taskTitle}>
                      {selectedSubmission.taskId?.title || taskTitle || 'Untitled Task'}
                    </Text>
                  </View>

                  {/* Message */}
                  {selectedSubmission.message && (
                    <View style={styles.messageSection}>
                      <View style={styles.messageHeader}>
                        <Ionicons name="chatbubble-outline" size={18} color="#374151" />
                        <Text style={styles.messageLabel}>Your Message</Text>
                      </View>
                      <View style={styles.messageBox}>
                        <Text style={styles.messageText}>
                          {selectedSubmission.message}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Feedback */}
                  {selectedSubmission.feedback && (
                    <View style={styles.feedbackSection}>
                      <View style={styles.feedbackHeader}>
                        <Ionicons name="chatbubble-outline" size={18} color="#1E40AF" />
                        <Text style={styles.feedbackLabel}>Client Feedback</Text>
                      </View>
                      <View style={styles.feedbackBox}>
                        <Text style={styles.feedbackText}>
                          {selectedSubmission.feedback}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Files */}
                  <View style={styles.filesSection}>
                    <Text style={styles.filesLabel}>Submitted Files</Text>
                    <View style={styles.filesList}>
                      {selectedSubmission.files?.map((file, index) => (
                        <FileItem 
                          key={index} 
                          file={file}
                          submissionStatus={selectedSubmission.status}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  submissionList: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 12,
  },
  submissionItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  submissionItemSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  submissionNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  submissionMeta: {
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  detailsSection: {
    gap: 12,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  submissionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  taskInfo: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  messageSection: {
    marginBottom: 16,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
  },
  messageBox: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  feedbackSection: {
    marginBottom: 16,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  feedbackBox: {
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  feedbackText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  filesSection: {
    marginBottom: 16,
  },
  filesLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 12,
  },
  filesList: {
    gap: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  previewButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
  },
   previewThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  // Preview Modal Styles
  previewModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1000,
    justifyContent: 'space-between',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullPreviewImage: {
    width: '100%',
    height: '100%',
    maxWidth: 500,
    maxHeight: 500,
  },
  videoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  videoMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  playButton: {
    alignItems: 'center',
    padding: 20,
  },
  playButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#6B7280',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Optional: slight overlay for better visibility
  },

});

export default SubmissionsScreen;