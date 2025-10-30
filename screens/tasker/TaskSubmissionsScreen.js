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
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Header from '../../component/tasker/Header';
import { getMyWorkSubmissions, deleteWorkSubmission } from '../../api/miniTaskApi';
import { getPreviewUrl } from '../../api/commonApi';
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
  const [fileUrls, setFileUrls] = useState({});
  const scrollViewRef = useRef();

  const getFileUrl = async (fileKey, submissionStatus) => {
    const cacheKey = `${fileKey}-${submissionStatus}`;
    if (fileUrls[cacheKey]) {
      return fileUrls[cacheKey];
    }

    try {
      const res = await getPreviewUrl(fileKey, submissionStatus);
      if (res.status === 200) {
        const previewURL = res.data.previewURL;
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

  const openFile = async (file, submissionStatus) => {
    try {
      setOpeningFile(file.fileKey);
      
      const fileUrl = await getFileUrl(file.fileKey, submissionStatus);
      if (!fileUrl) {
        Alert.alert('Error', 'File URL not found');
        return;
      }

      const canOpen = await Linking.canOpenURL(fileUrl);
      
      if (canOpen) {
        await Linking.openURL(fileUrl);
      } else {
        await downloadAndShareFile(file, fileUrl);
      }
      
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file. Please try again.');
    } finally {
      setOpeningFile(null);
    }
  };

  const downloadAndShareFile = async (file, fileUrl) => {
    try {
      const fileName = file.fileKey.split('/').pop();
      const localUri = FileSystem.cacheDirectory + fileName;
      
      const downloadResult = await FileSystem.downloadAsync(fileUrl, localUri);
      
      if (downloadResult.status === 200) {
        if (await Sharing.isAvailableAsync()) {
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
          text: 'Awaiting Review',
          gradient: ['#FEF3C7', '#FDE68A']
        };
      case 'approved':
        return {
          color: '#D1FAE5',
          textColor: '#065F46',
          borderColor: '#34D399',
          icon: 'checkmark-circle-outline',
          text: 'Approved',
          gradient: ['#D1FAE5', '#A7F3D0']
        };
      case 'rejected':
        return {
          color: '#FEE2E2',
          textColor: '#991B1B',
          borderColor: '#FCA5A5',
          icon: 'close-circle-outline',
          text: 'Rejected',
          gradient: ['#FEE2E2', '#FECACA']
        };
      default:
        return {
          color: '#F3F4F6',
          textColor: '#374151',
          borderColor: '#D1D5DB',
          icon: 'time-outline',
          text: status,
          gradient: ['#F3F4F6', '#E5E7EB']
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
                
                const updatedSubmissions = submissions.filter((s) => s._id !== submissionId);
                setSubmissions(updatedSubmissions);
                
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
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }}
      >
        <LinearGradient
          colors={isSelected ? ['#EEF2FF', '#E0E7FF'] : ['#FFFFFF', '#F8FAFC']}
          style={styles.submissionGradient}
        >
          <View style={styles.submissionHeader}>
            <View style={styles.submissionInfo}>
              <View style={styles.submissionNumberContainer}>
                <Ionicons name="document-text-outline" size={16} color="#6366F1" />
                <Text style={styles.submissionNumber}>
                  Submission #{getSubmissionNumber(submission)}
                </Text>
              </View>
              <LinearGradient
                colors={statusDetails.gradient}
                style={styles.statusBadge}
              >
                <Ionicons name={statusDetails.icon} size={14} color={statusDetails.textColor} />
                <Text style={[styles.statusText, { color: statusDetails.textColor }]}>
                  {statusDetails.text}
                </Text>
              </LinearGradient>
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
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const FileItem = ({ file, submissionStatus }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [fileUrl, setFileUrl] = useState(null);
    const [isImage, setIsImage] = useState(false);
    const [isVideo, setIsVideo] = useState(false);

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
          <View style={styles.fileIconContainer}>
            <Ionicons 
              name={getFileTypeIcon(file.fileKey)} 
              size={24} 
              color="#6366F1" 
            />
          </View>
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
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={styles.openButtonGradient}
            >
              <Ionicons name="open-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
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
        {/* Hero Section */}
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            {/*<View style={styles.heroIcon}>
              <Ionicons name="document-text-outline" size={32} color="#FFFFFF" />
            </View>*/}
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Work Submissions</Text>
              <Text style={styles.heroDescription}>
                Manage and review your submitted work for this task
              </Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{submissions.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
           
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {submissions.filter(s => s.status === 'approved').length}
              </Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
          
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {submissions.filter(s => s.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </LinearGradient>

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
            <LinearGradient
              colors={['#F8FAFC', '#F1F5F9']}
              style={styles.emptyIllustration}
            >
              <Ionicons name="document-outline" size={48} color="#9CA3AF" />
            </LinearGradient>
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
                
                <LinearGradient
                  colors={['#FFFFFF', '#F8FAFC']}
                  style={styles.detailsCard}
                >
                  {/* Header */}
                  <View style={styles.detailsHeader}>
                    <View style={styles.detailsTitleSection}>
                      <View style={styles.detailsTitleRow}>
                        <View style={styles.titleIcon}>
                          <Ionicons name="document-text-outline" size={20} color="#6366F1" />
                        </View>
                        <Text style={styles.detailsTitle}>
                          Submission #{getSubmissionNumber(selectedSubmission)}
                        </Text>
                        <LinearGradient
                          colors={getStatusDetails(selectedSubmission.status).gradient}
                          style={styles.statusBadge}
                        >
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
                        </LinearGradient>
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
                    <View style={styles.infoHeader}>
                      <Ionicons name="briefcase-outline" size={18} color="#6366F1" />
                      <Text style={styles.infoLabel}>Task Information</Text>
                    </View>
                    <Text style={styles.taskTitle}>
                      {selectedSubmission.taskId?.title || taskTitle || 'Untitled Task'}
                    </Text>
                  </View>

                  {/* Message */}
                  {selectedSubmission.message && (
                    <View style={styles.messageSection}>
                      <View style={styles.messageHeader}>
                        <Ionicons name="chatbubble-outline" size={18} color="#6366F1" />
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
                        <Ionicons name="chatbubble-ellipses-outline" size={18} color="#10B981" />
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
                    <View style={styles.filesHeader}>
                      <Ionicons name="folder-outline" size={18} color="#6366F1" />
                      <Text style={styles.filesLabel}>Submitted Files</Text>
                    </View>
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
                </LinearGradient>
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
  scrollView: {
    flex: 1,
  },
  
  // Hero Section
  heroSection: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroDescription: {
    fontSize: 16,
    color: '#E0E7FF',
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Filter Section
  filterSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 100,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Content
  content: {
    padding: 16,
    gap: 20,
  },

  // Submission List
  submissionList: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  submissionItem: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  submissionGradient: {
    padding: 16,
    borderRadius: 16,
  },
  submissionItemSelected: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  submissionHeader: {
    gap: 12,
  },
  submissionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  submissionNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submissionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 14,
    color: '#64748B',
  },

  // Details Section
  detailsSection: {
    gap: 16,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailsTitleSection: {
    flex: 1,
  },
  detailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  titleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  submissionDate: {
    fontSize: 14,
    color: '#64748B',
  },
  deleteButton: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    marginLeft: 12,
  },

  // Task Info
  taskInfo: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  taskTitle: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 22,
  },

  // Message Section
  messageSection: {
    marginBottom: 20,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  messageBox: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  messageText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },

  // Feedback Section
  feedbackSection: {
    marginBottom: 20,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  feedbackBox: {
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  feedbackText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },

  // Files Section
  filesSection: {
    marginBottom: 16,
  },
  filesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  filesLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  filesList: {
    gap: 12,
  },

  // File Item
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
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
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  fileType: {
    fontSize: 14,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  previewButton: {
    padding: 4,
  },
  openButtonGradient: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SubmissionsScreen;