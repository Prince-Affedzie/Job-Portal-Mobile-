import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView ,
  RefreshControl,
  Dimensions,
  TextInput,
  Linking,
} from 'react-native';
//import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../component/tasker/Header';
import { clientGetTaskSubmissions, reviewSubmission } from '../../api/miniTaskApi';
import { getPreviewUrl } from '../../api/commonApi';

const { width } = Dimensions.get('window');

export default function ClientViewSubmissionsScreen({ route }) {
  const { taskId, taskTitle } = route.params || {};
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(null);
  const [feedbacks, setFeedbacks] = useState({});
  const [statuses, setStatuses] = useState({});
  const [openingFile, setOpeningFile] = useState(null);
  const [fileUrls, setFileUrls] = useState({});
  const scrollViewRef = useRef();

  // Get file URL from API
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

  // Open file
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
            } 
            
      
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file. Please try again.');
    } finally {
      setOpeningFile(null);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await clientGetTaskSubmissions(taskId);
      if (res.status === 200) {
        const sortedSubmissions = res.data.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setSubmissions(sortedSubmissions);
        
        // Initialize feedback and status states
        const initialFeedbacks = {};
        const initialStatuses = {};
        sortedSubmissions.forEach((sub) => {
          initialFeedbacks[sub._id] = sub.feedback || '';
          initialStatuses[sub._id] = sub.status;
        });
        setFeedbacks(initialFeedbacks);
        setStatuses(initialStatuses);
        
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

  const handleReviewSubmit = async (submissionId) => {
    const status = statuses[submissionId];
    const feedback = feedbacks[submissionId];

    setReviewLoading(submissionId);
    try {
      const res = await reviewSubmission(submissionId, { status, feedback });
      if (res.status === 200) {
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub._id === submissionId ? { ...sub, status, feedback } : sub
          )
        );
        
        // Update the selected submission if it's the one being reviewed
        if (selectedSubmission && selectedSubmission._id === submissionId) {
          setSelectedSubmission({...selectedSubmission, status, feedback});
        }
        
        Alert.alert('Success', 'Review submitted successfully.');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            "An unexpected error occurred. Please try again.";
      console.error('Failed to submit review:', error);
      Alert.alert('Error', errorMessage);
    } finally {
      setReviewLoading(null);
    }
  };

  const getStatusDetails = (status) => {
    switch (status) {
      case 'pending':
        return {
          color: '#FEF3C7',
          textColor: '#92400E',
          borderColor: '#FCD34D',
          icon: 'time-outline',
          text: 'Pending Review'
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
      case 'revision_requested':
        return {
          color: '#FFEDD5',
          textColor: '#9A3412',
          borderColor: '#FDBA74',
          icon: 'refresh-outline',
          text: 'Revision Requested'
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
    } else {
      return 'document-outline';
    }
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
  const FileItem = ({ file, submissionStatus }) => {
    const [isLoading, setIsLoading] = useState(false);
    
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
        <Ionicons 
          name={getFileTypeIcon(file.fileKey)} 
          size={20} 
          color="#6366F1" 
        />
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.fileKey.split('/').pop()}
          </Text>
          <Text style={styles.fileType}>
            {getFileTypeIcon(file.fileKey).replace('-outline', '')}
          </Text>
        </View>
        <View style={styles.previewButton}>
          {(isLoading || openingFile === file.fileKey) ? (
            <ActivityIndicator size="small" color="#6366F1" />
          ) : (
            <Ionicons name="eye-outline" size={18} color="#6366F1" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getReviewButtonStyle = (status) => {
    switch (status) {
      case 'approved':
        return styles.approveButton;
      case 'rejected':
        return styles.rejectButton;
      case 'revision_requested':
        return styles.revisionButton;
      default:
        return styles.reviewButton;
    }
  };

  const getReviewButtonText = (status) => {
    switch (status) {
      case 'approved':
        return 'Approve Submission';
      case 'rejected':
        return 'Reject Submission';
      case 'revision_requested':
        return 'Request Changes';
      default:
        return 'Submit Review';
    }
  };

  const getReviewButtonIcon = (status) => {
    switch (status) {
      case 'approved':
        return 'checkmark-circle-outline';
      case 'rejected':
        return 'close-circle-outline';
      case 'revision_requested':
        return 'refresh-outline';
      default:
        return 'send-outline';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Review Submissions" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading submissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header title="Review Submissions1" showBackButton={true} />
      
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
          <Text style={styles.title}>Review Submissions</Text>
          <Text style={styles.subtitle}>
            {taskTitle || 'Task Submissions'}
          </Text>
        </View>

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterContainer}>
              <FilterButton value="all" label="All" isActive={filter === 'all'} />
              <FilterButton value="pending" label="Pending Review" isActive={filter === 'pending'} />
              <FilterButton value="approved" label="Approved" isActive={filter === 'approved'} />
              <FilterButton value="revision_requested" label="Revision" isActive={filter === 'revision_requested'} />
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
                ? "Taskers haven't submitted any work yet for this task."
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
                      <Text style={styles.taskerName}>
                        by {selectedSubmission.freelancerId?.name || 'Unknown Tasker'}
                      </Text>
                    </View>
                  </View>

                  {/* Task Information */}
                  <View style={styles.taskInfo}>
                    <Text style={styles.infoLabel}>Task Information</Text>
                    <Text style={styles.taskTitle}>
                      {selectedSubmission.taskId?.title || taskTitle || 'Untitled Task'}
                    </Text>
                  </View>

                  {/* Tasker's Message */}
                  {selectedSubmission.message && (
                    <View style={styles.messageSection}>
                      <View style={styles.messageHeader}>
                        <Ionicons name="chatbubble-outline" size={18} color="#374151" />
                        <Text style={styles.messageLabel}>Tasker's Message</Text>
                      </View>
                      <View style={styles.messageBox}>
                        <Text style={styles.messageText}>
                          {selectedSubmission.message}
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

                  {/* Review Section */}
                  <View style={styles.reviewSection}>
                    <Text style={styles.reviewTitle}>Your Review</Text>
                    
                    {/* Status Selection */}
                    <View style={styles.statusSelection}>
                      <Text style={styles.statusLabel}>Decision</Text>
                      <View style={styles.statusButtons}>
                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            statuses[selectedSubmission._id] === 'approved' && styles.statusButtonActive
                          ]}
                          onPress={() => setStatuses({ ...statuses, [selectedSubmission._id]: 'approved' })}
                        >
                          <Ionicons 
                            name="checkmark-circle-outline" 
                            size={16} 
                            color={statuses[selectedSubmission._id] === 'approved' ? '#FFFFFF' : '#10B981'} 
                          />
                          <Text style={[
                            styles.statusButtonText,
                            statuses[selectedSubmission._id] === 'approved' && styles.statusButtonTextActive
                          ]}>
                            Approve
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            statuses[selectedSubmission._id] === 'revision_requested' && styles.statusButtonActiveWarning
                          ]}
                          onPress={() => setStatuses({ ...statuses, [selectedSubmission._id]: 'revision_requested' })}
                        >
                          <Ionicons 
                            name="refresh-outline" 
                            size={16} 
                            color={statuses[selectedSubmission._id] === 'revision_requested' ? '#FFFFFF' : '#F59E0B'} 
                          />
                          <Text style={[
                            styles.statusButtonText,
                            statuses[selectedSubmission._id] === 'revision_requested' && styles.statusButtonTextActive
                          ]}>
                            Request Changes
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            statuses[selectedSubmission._id] === 'rejected' && styles.statusButtonActiveDanger
                          ]}
                          onPress={() => setStatuses({ ...statuses, [selectedSubmission._id]: 'rejected' })}
                        >
                          <Ionicons 
                            name="close-circle-outline" 
                            size={16} 
                            color={statuses[selectedSubmission._id] === 'rejected' ? '#FFFFFF' : '#EF4444'} 
                          />
                          <Text style={[
                            styles.statusButtonText,
                            statuses[selectedSubmission._id] === 'rejected' && styles.statusButtonTextActive
                          ]}>
                            Reject
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Feedback Input */}
                    <View style={styles.feedbackSection}>
                      <Text style={styles.feedbackLabel}>Feedback</Text>
                      <TextInput
                        style={styles.feedbackInput}
                        value={feedbacks[selectedSubmission._id]}
                        onChangeText={(text) => setFeedbacks({ ...feedbacks, [selectedSubmission._id]: text })}
                        placeholder={
                          statuses[selectedSubmission._id] === 'approved' 
                            ? "Share positive feedback about this work..." 
                            : statuses[selectedSubmission._id] === 'revision_requested'
                            ? "Explain what needs to be revised..."
                            : statuses[selectedSubmission._id] === 'rejected'
                            ? "Provide constructive feedback..."
                            : "Share your feedback..."
                        }
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        getReviewButtonStyle(statuses[selectedSubmission._id])
                      ]}
                      onPress={() => handleReviewSubmit(selectedSubmission._id)}
                      disabled={reviewLoading === selectedSubmission._id}
                    >
                      {reviewLoading === selectedSubmission._id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons 
                            name={getReviewButtonIcon(statuses[selectedSubmission._id])} 
                            size={20} 
                            color="#FFFFFF" 
                          />
                          <Text style={styles.submitButtonText}>
                            {getReviewButtonText(statuses[selectedSubmission._id])}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
    fontWeight: '600',
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
    fontWeight: '600',
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
    marginBottom: 2,
  },
  taskerName: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  taskInfo: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '600',
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
  filesSection: {
    marginBottom: 20,
  },
  filesLabel: {
    fontSize: 14,
    fontWeight: '600',
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
  reviewSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  statusSelection: {
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  statusButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  statusButtonActiveWarning: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  statusButtonActiveDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },
  feedbackSection: {
    marginBottom: 20,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  reviewButton: {
    backgroundColor: '#6366F1',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  revisionButton: {
    backgroundColor: '#F59E0B',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

