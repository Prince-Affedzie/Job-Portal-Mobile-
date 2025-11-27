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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Video, ResizeMode } from 'expo-av';
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
  const [expandedMedia, setExpandedMedia] = useState(null);
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
          color: '#FFFBEB',
          textColor: '#D97706',
          icon: 'time',
          text: 'Pending Review',
        };
      case 'approved':
        return {
          color: '#ECFDF5',
          textColor: '#047857',
          icon: 'checkmark-circle',
          text: 'Approved',
        };
      case 'rejected':
        return {
          color: '#FEF2F2',
          textColor: '#DC2626',
          icon: 'close-circle',
          text: 'Rejected',
        };
      case 'revision_requested':
        return {
          color: '#EFF6FF',
          textColor: '#1D4ED8',
          icon: 'refresh',
          text: 'Revision Needed',
        };
      default:
        return {
          color: '#F8FAFC',
          textColor: '#64748B',
          icon: 'time',
          text: status,
        };
    }
  };

  const getFileTypeIcon = (fileKey) => {
    const fileName = fileKey.toLowerCase();
    
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|ico)$/i.test(fileName)) {
      return 'image';
    } else if (/\.(mp4|webm|mov|avi|wmv|mkv|flv|3gp|m4v)$/i.test(fileName)) {
      return 'videocam';
    } else if (/\.(pdf)$/i.test(fileName)) {
      return 'document-text';
    } else if (/\.(doc|docx)$/i.test(fileName)) {
      return 'document-text';
    } else if (/\.(xls|xlsx)$/i.test(fileName)) {
      return 'document-text';
    } else if (/\.(ppt|pptx)$/i.test(fileName)) {
      return 'document-text';
    } else if (/\.(zip|rar|7z|tar|gz)$/i.test(fileName)) {
      return 'archive';
    } else {
      return 'document-attach';
    }
  };

  const handleDelete = async (submissionId) => {
    Alert.alert(
      'Delete Submission',
      'Are you sure you want to delete this submission? This action cannot be undone.',
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
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const FilterChip = ({ value, label, count, isActive }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        isActive && styles.filterChipActive
      ]}
      onPress={() => setFilter(value)}
    >
      <Text style={[
        styles.filterChipText,
        isActive && styles.filterChipTextActive
      ]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
          <Text style={[styles.countText, isActive && styles.countTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const SubmissionCard = ({ submission, isSelected }) => {
    const statusDetails = getStatusDetails(submission.status);
    
    return (
      <TouchableOpacity
        style={[
          styles.submissionCard,
          isSelected && styles.submissionCardSelected
        ]}
        onPress={() => {
          setSelectedSubmission(submission);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {submission.taskId?.title?.charAt(0) || 'T'}
              </Text>
            </View>
            <View style={styles.cardTitleText}>
              <Text style={styles.taskNameCard}>
                {submission.taskId?.title || taskTitle || 'Task'}
              </Text>
              <Text style={styles.submissionTime}>{formatDate(submission.createdAt)}</Text>
            </View>
          </View>
          
          <View style={[styles.statusPill, { backgroundColor: statusDetails.color }]}>
            <Ionicons name={statusDetails.icon} size={12} color={statusDetails.textColor} />
            <Text style={[styles.statusPillText, { color: statusDetails.textColor }]}>
              {statusDetails.text}
            </Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <Ionicons name="document-text-outline" size={14} color="#6B7280" />
            <Text style={styles.metaLabel}>Submission</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="attach-outline" size={14} color="#6B7280" />
            <Text style={styles.metaLabel}>{submission.files?.length || 0} files</Text>
          </View>
        </View>

        {submission.message && (
          <Text style={styles.previewMessage} numberOfLines={2}>
            {submission.message}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const MediaPreview = ({ file, submissionStatus }) => {
    const [fileUrl, setFileUrl] = useState(null);
    const [isImage, setIsImage] = useState(false);
    const [isVideo, setIsVideo] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
      const fileName = file.fileKey.toLowerCase();
      const imageRegex = /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|ico)$/i;
      const videoRegex = /\.(mp4|webm|mov|avi|wmv|mkv|flv|3gp|m4v)$/i;
      
      setIsImage(imageRegex.test(fileName));
      setIsVideo(videoRegex.test(fileName));
      
      if (!imageRegex.test(fileName) && !videoRegex.test(fileName)) {
        setLoading(false);
      }
    }, [file.fileKey]);

    useEffect(() => {
      const fetchUrl = async () => {
        if (isImage || isVideo) {
          try {
            setError(false);
            setLoading(true);
            const url = await getFileUrl(file.fileKey, submissionStatus);
            setFileUrl(url);
          } catch (error) {
            console.error('Error fetching URL:', error);
            setError(true);
          } finally {
            setLoading(false);
          }
        }
      };
      
      if (isImage || isVideo) {
        fetchUrl();
      }
    }, [file.fileKey, submissionStatus, isImage, isVideo]);

    const handlePress = () => {
      if ((isImage || isVideo) && fileUrl) {
        setExpandedMedia({ url: fileUrl, type: isVideo ? 'video' : 'image' });
      } else {
        openFile(file, submissionStatus);
      }
    };

    const handleImageLoad = () => {
      setImageLoaded(true);
    };

    const handleImageError = () => {
      setError(true);
      setImageLoaded(false);
    };

    if (loading && (isImage || isVideo)) {
      return (
        <View style={styles.mediaPreviewContainer}>
          <View style={styles.mediaPreviewLoading}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.loadingText}>Loading preview...</Text>
          </View>
        </View>
      );
    }

    if (error && (isImage || isVideo)) {
      return (
        <TouchableOpacity 
          onPress={() => openFile(file, submissionStatus)} 
          style={styles.mediaPreviewContainer}
        >
          <View style={styles.mediaPreviewError}>
            <Ionicons name="warning-outline" size={32} color="#6B7280" />
            <Text style={styles.errorText}>Preview unavailable</Text>
            <Text style={styles.errorSubText}>Tap to open file</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (isImage && fileUrl) {
      return (
        <TouchableOpacity onPress={handlePress} style={styles.mediaPreviewContainer}>
          <View style={styles.mediaPreview}>
            {!imageLoaded && (
              <View style={styles.imagePlaceholder}>
                <ActivityIndicator size="small" color="#6366F1" />
              </View>
            )}
            <Image 
              source={{ uri: fileUrl }} 
              style={[
                styles.mediaImage,
                !imageLoaded && styles.hiddenImage
              ]}
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            <View style={styles.mediaOverlay}>
              <Ionicons name="expand-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.mediaTypeBadge}>
              <Ionicons name="image" size={14} color="#FFFFFF" />
              <Text style={styles.mediaTypeText}>IMAGE</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    if (isVideo && fileUrl) {
      return (
        <TouchableOpacity onPress={handlePress} style={styles.mediaPreviewContainer}>
          <View style={styles.mediaPreview}>
            <Video
              ref={videoRef}
              source={{ uri: fileUrl }}
              style={styles.mediaImage}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              isLooping={false}
              isMuted={true}
              useNativeControls={false}
              onError={() => setError(true)}
            />
            <View style={styles.videoOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={32} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.mediaTypeBadge}>
              <Ionicons name="videocam" size={14} color="#FFFFFF" />
              <Text style={styles.mediaTypeText}>VIDEO</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        onPress={() => openFile(file, submissionStatus)} 
        style={styles.filePreview}
        disabled={openingFile === file.fileKey}
      >
        <View style={styles.fileIconWrapper}>
          <Ionicons name={getFileTypeIcon(file.fileKey)} size={24} color="#6366F1" />
        </View>
        <View style={styles.fileDetails}>
          <Text style={styles.fileNameText} numberOfLines={1}>
            {file.fileKey.split('/').pop()}
          </Text>
          <Text style={styles.fileSize}>Tap to open</Text>
        </View>
        {openingFile === file.fileKey ? (
          <ActivityIndicator size="small" color="#6366F1" />
        ) : (
          <Ionicons name="download-outline" size={20} color="#6366F1" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="My Submissions" showBackButton={true} />
        <LoadingIndicator text={`Loading Your Submissions for ${taskTitle}...`}/>
      </SafeAreaView>
    );
  }

  const filteredSubmissions = getFilteredSubmissions();
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const revisionCount = submissions.filter(s => s.status === 'revision_requested').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="My Submissions" showBackButton={true} />
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Header */}
        <LinearGradient colors={['#1A1F3B', '#2D1B69']} style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{submissions.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{approvedCount}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
        </LinearGradient>

        {/* Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContainer}
        >
          <FilterChip value="all" label="All" count={submissions.length} isActive={filter === 'all'} />
          <FilterChip value="pending" label="Pending" count={pendingCount} isActive={filter === 'pending'} />
          <FilterChip value="approved" label="Approved" count={approvedCount} isActive={filter === 'approved'} />
          <FilterChip value="revision_requested" label="Revision" count={revisionCount} isActive={filter === 'revision_requested'} />
          <FilterChip value="rejected" label="Rejected" count={rejectedCount} isActive={filter === 'rejected'} />
        </ScrollView>

        {filteredSubmissions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No submissions yet</Text>
            <Text style={styles.emptyDescription}>
              {filter === 'all' 
                ? "Your submissions will appear here once you submit work"
                : `No ${filter} submissions at the moment`
              }
            </Text>
          </View>
        ) : (
          <>
            {/* Submissions List */}
            <View style={styles.submissionsList}>
              {filteredSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission._id}
                  submission={submission}
                  isSelected={selectedSubmission && selectedSubmission._id === submission._id}
                />
              ))}
            </View>

            {/* Selected Submission Details */}
            {selectedSubmission && (
              <View style={styles.detailsContainer}>
                <View style={styles.detailsHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {selectedSubmission.taskId?.title?.charAt(0) || 'T'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.userName}>
                        {selectedSubmission.taskId?.title || taskTitle || 'Task'}
                      </Text>
                      <Text style={styles.submissionDate}>
                        Submitted {formatDate(selectedSubmission.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusDetails(selectedSubmission.status).color }]}>
                    <Ionicons 
                      name={getStatusDetails(selectedSubmission.status).icon} 
                      size={16} 
                      color={getStatusDetails(selectedSubmission.status).textColor} 
                    />
                    <Text style={[styles.statusLabel, { color: getStatusDetails(selectedSubmission.status).textColor }]}>
                      {getStatusDetails(selectedSubmission.status).text}
                    </Text>
                  </View>
                </View>

                {/* Message */}
                {selectedSubmission.message && (
                  <View style={styles.messageCard}>
                    <View style={styles.messageHeader}>
                      <Ionicons name="chatbubble" size={18} color="#475569" />
                      <Text style={styles.messageTitle}>Your Message</Text>
                    </View>
                    <Text style={styles.messageText}>
                      {selectedSubmission.message}
                    </Text>
                  </View>
                )}

                {/* Client Feedback */}
                {selectedSubmission.feedback && (
                  <View style={styles.feedbackCard}>
                    <View style={styles.feedbackHeader}>
                      <Ionicons name="star" size={18} color="#F59E0B" />
                      <Text style={styles.feedbackTitle}>Client Feedback</Text>
                    </View>
                    <Text style={styles.feedbackText}>
                      {selectedSubmission.feedback}
                    </Text>
                  </View>
                )}

                {/* Files */}
                <View style={styles.filesCard}>
                  <View style={styles.filesHeader}>
                    <Ionicons name="folder-open" size={20} color="#475569" />
                    <Text style={styles.filesTitle}>
                      Submitted Files ({selectedSubmission.files?.length || 0})
                    </Text>
                  </View>
                  <View style={styles.mediaGrid}>
                    {selectedSubmission.files?.map((file, index) => (
                      <MediaPreview 
                        key={index} 
                        file={file}
                        submissionStatus={selectedSubmission.status}
                      />
                    ))}
                  </View>
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(selectedSubmission._id)}
                  disabled={deleteLoading === selectedSubmission._id}
                >
                  {deleteLoading === selectedSubmission._id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.deleteButtonText}>Delete Submission</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Expanded Media Modal */}
      {expandedMedia && (
        <View style={styles.mediaModal}>
          <TouchableOpacity 
            style={styles.modalClose}
            onPress={() => setExpandedMedia(null)}
          >
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>
          
          {expandedMedia.type === 'image' ? (
            <Image 
              source={{ uri: expandedMedia.url }} 
              style={styles.modalImage}
              resizeMode="contain"
            />
          ) : (
            <Video
              source={{ uri: expandedMedia.url }}
              style={styles.modalImage}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay
              isLooping
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderRadius: 24,
    marginHorizontal: 7,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#E5E7EB',
    fontWeight: '500',
  },

  // Filters
  filtersScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  countTextActive: {
    color: '#FFFFFF',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Submissions List
  submissionsList: {
    padding: 16,
    gap: 12,
  },
  submissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  submissionCardSelected: {
    borderColor: '#6366F1',
    borderWidth: 2,
    shadowColor: '#6366F1',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
  },
  cardTitleText: {
    flex: 1,
  },
  taskNameCard: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  submissionTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  previewMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  // Details Container
  detailsContainer: {
    padding: 16,
    gap: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  submissionDate: {
    fontSize: 14,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Message Card
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  messageText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },

  // Feedback Card
  feedbackCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  feedbackText: {
    fontSize: 15,
    color: '#92400E',
    lineHeight: 22,
  },

  // Files Card
  filesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  filesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  filesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  mediaGrid: {
    gap: 12,
  },

  // Media Preview Styles
  mediaPreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000000',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  hiddenImage: {
    opacity: 0,
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  mediaOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    zIndex: 2,
  },
  mediaTypeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mediaPreviewLoading: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  mediaPreviewError: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 8,
  },
  errorSubText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // File Preview
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  fileIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileDetails: {
    flex: 1,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Delete Button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Media Modal
  mediaModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 10,
  },
  modalImage: {
    width: width,
    height: '80%',
  },
});

export default SubmissionsScreen;