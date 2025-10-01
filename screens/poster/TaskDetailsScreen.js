import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import { AuthContext } from '../../context/AuthContext';
import { PosterContext } from '../../context/PosterContext';
import {clientGetTaskInfo,markTaskAsDoneClient} from '../../api/miniTaskApi'
import { navigate } from '../../services/navigationService'
//import MarkDoneSwitch from '../../components/MiniTaskManagementComponents/MarkDoneButton';

const { width } = Dimensions.get('window');

const ClientTaskDetailScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('task');
  const { user } = useContext(AuthContext);
  const { getTaskDetails } = useContext(PosterContext);

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const response = await clientGetTaskInfo(taskId);
      if (response.status === 200) {
        setTask(response.data);
      } else {
        Alert.alert('Error', 'Task not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      Alert.alert('Error', 'Failed to load task details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTaskDetails();
  };

  const handleEditTask = () => {
   navigate('EditTask',{taskId:taskId,task:task})
  };

  const handleViewApplicants = () => {
    navigation.navigate('TaskApplicants', { 
      taskId: task._id,
      task: task,
      assignedTo: task.assignedTo || null
    });
  };

  const handleViewSubmissions = () => {
    navigation.navigate('TaskSubmissions', { taskId: task._id });
  };


  const handleMarkAsDone = async () => {
    try {
      Alert.alert(
        "Mark as Done",
        "Are you sure you want to mark this task as completed?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Mark as Done", 
            style: "default",
            onPress: async () => {
              const res = await markTaskAsDoneClient(taskId)
              if (res.status ===200){
              Alert.alert("Success", "Task marked as completed! ");
              loadTaskDetails();
              }
             
            }
          }
        ]
      );
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
          error.response?.data?.error || 'Error marking task as done'
          console.error(errorMessage);
          Alert.alert(errorMessage);
    }
  };
  

  const getStatusColor = (status) => {
    const colors = {
      'assigned': '#3B82F6',
      'in-progress': '#F59E0B',
      'review': '#8B5CF6',
      'completed': '#10B981',
      'closed': '#6B7280',
      'open': '#10B981',
      'pending': '#F97316'
    };
    return colors[status?.toLowerCase()] || '#6B7280';
  };

  const formatDate = (date) => {
    return moment(date).format("MMM DD, YYYY");
  };

  const formatDateTime = (date) => {
    return moment(date).format("MMM DD, YYYY [at] h:mm A");
  };

  const hasApplicants = task?.applicants && task.applicants.length > 0;
  const isAssigned = task?.assignedTo && task.status !== 'Open' && task.status !== 'Pending';
  const isTaskCompleted = task?.status?.toLowerCase() === 'completed';
  const canMarkAsDone = isAssigned && !isTaskCompleted && task?.markedDoneByEmployer === false;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Task Details" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading task details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Task Details" showBackButton={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Task not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const TabButton = ({ title, icon, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={isActive ? '#FFFFFF' : '#6B7280'} 
      />
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const InfoCard = ({ icon, title, value, color = '#6366F1' }) => (
    <View style={styles.infoCard}>
      <View style={[styles.infoIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  const ActionButton = ({ title, icon, color, onPress, disabled = false }) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: color }, disabled && styles.actionButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={20} color="#FFFFFF" />
      <Text style={styles.actionButtonText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1F3B" />
      <Header title="Task Details" showBackButton={true} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.titleContainer}>
              <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                  {task.status?.replace('-', ' ')}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditTask}
            >
              <Ionicons name="create-outline" size={20} color="#6366F1" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>Posted: {formatDate(task.createdAt)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>Deadline: {formatDate(task.deadline)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>Budget: ₵{task.budget}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{task.applicants?.length || 0} applicants</Text>
            </View>
          </View>

          {/* Completion Status Section */}
          {isAssigned && (
            <View style={styles.completionStatusSection}>
              <View style={styles.completionStatusRow}>
                <View style={styles.completionStatusItem}>
                  <Ionicons 
                    name={task.markedDoneByEmployer ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={task.markedDoneByEmployer ? "#10B981" : "#6B7280"} 
                  />
                  <Text style={[
                    styles.completionStatusText,
                    task.markedDoneByEmployer && styles.completionStatusTextDone
                  ]}>
                    You marked as done
                  </Text>
                  {task.employerDoneAt && (
                    <Text style={styles.completionTimeText}>
                      {formatDateTime(task.employerDoneAt)}
                    </Text>
                  )}
                </View>
                
                <View style={styles.completionStatusItem}>
                  <Ionicons 
                    name={task.markedDoneByTasker ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={task.markedDoneByTasker ? "#10B981" : "#6B7280"} 
                  />
                  <Text style={[
                    styles.completionStatusText,
                    task.markedDoneByTasker && styles.completionStatusTextDone
                  ]}>
                    Tasker marked as done
                  </Text>
                  {task.taskerDoneAt && (
                    <Text style={styles.completionTimeText}>
                      {formatDateTime(task.taskerDoneAt)}
                    </Text>
                  )}
                </View>
              </View>
              
              {/* Mutual Completion Status */}
              {task.markedDoneByEmployer && task.markedDoneByTasker && (
                <View style={styles.mutualCompletionBadge}>
                  <Ionicons name="checkmark-done" size={16} color="#10B981" />
                  <Text style={styles.mutualCompletionText}>
                    Task mutually completed!
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TabButton
            title="Task Details"
            icon="document-text-outline"
            isActive={activeTab === 'task'}
            onPress={() => setActiveTab('task')}
          />
          {isAssigned && (
            <TabButton
              title="Tasker"
              icon="person-outline"
              isActive={activeTab === 'tasker'}
              onPress={() => setActiveTab('tasker')}
            />
          )}
          <TabButton
            title="Requirements"
            icon="checkmark-done-outline"
            isActive={activeTab === 'requirements'}
            onPress={() => setActiveTab('requirements')}
          />
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'task' && (
            <>
              {/* Task Overview */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="information-circle-outline" size={20} color="#6366F1" />
                  <Text style={styles.sectionTitle}>Task Overview</Text>
                </View>
                <Text style={styles.taskDescription}>{task.description}</Text>

                {/* Key Information */}
                <View style={styles.infoGrid}>
                  <InfoCard
                    icon="cash-outline"
                    title="Budget"
                    value={`₵${task.budget}`}
                    color="#10B981"
                  />
                  <InfoCard
                    icon="calendar-outline"
                    title="Deadline"
                    value={formatDate(task.deadline)}
                    color="#F59E0B"
                  />
                  <InfoCard
                    icon="location-outline"
                    title="Location"
                    value={task.locationType === 'on-site' ? 'On-site' : 'Remote'}
                    color="#6366F1"
                  />
                  <InfoCard
                    icon="briefcase-outline"
                    title="Category"
                    value={task.category}
                    color="#8B5CF6"
                  />
                </View>

                {/* Location Details */}
                {task.address && task.locationType === 'on-site' && (
                  <View style={styles.locationSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="map-outline" size={20} color="#6366F1" />
                      <Text style={styles.sectionTitle}>Location Details</Text>
                    </View>
                    <View style={styles.locationGrid}>
                      <View style={styles.locationItem}>
                        <Text style={styles.locationLabel}>Region</Text>
                        <Text style={styles.locationValue}>{task.address.region || "Not specified"}</Text>
                      </View>
                      <View style={styles.locationItem}>
                        <Text style={styles.locationLabel}>City</Text>
                        <Text style={styles.locationValue}>{task.address.city || "Not specified"}</Text>
                      </View>
                      {task.address.suburb && (
                        <View style={styles.locationItem}>
                          <Text style={styles.locationLabel}>Suburb</Text>
                          <Text style={styles.locationValue}>{task.address.suburb}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* Task Timeline */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Task Timeline</Text>
                <View style={styles.timeline}>
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineLabel}>Task Created</Text>
                    <Text style={styles.timelineDate}>{formatDate(task.createdAt)}</Text>
                  </View>
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineLabel}>Deadline</Text>
                    <Text style={styles.timelineDate}>{formatDate(task.deadline)}</Text>
                  </View>
                  {/*task.assignedTo && (
                    <View style={styles.timelineItem}>
                      <Text style={styles.timelineLabel}>Assigned</Text>
                      <Text style={styles.timelineDate}>
                        {task.assignmentDate ? formatDate(task.assignmentDate) : 'N/A'}
                      </Text>
                    </View>
                  )*/}
                </View>
              </View>
            </>
          )}

          {activeTab === 'tasker' && isAssigned && task.assignedTo && (
            <TouchableOpacity onPress={()=>navigate('ApplicantProfile', { applicant:task.assignedTo, taskId })} 
            style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={20} color="#6366F1" />
                <Text style={styles.sectionTitle}>Assigned Tasker</Text>
              </View>

              {/* Tasker Header */}
              <View style={styles.taskerHeader}>
                <View style={styles.taskerAvatar}>
                  {task.assignedTo.profileImage ? (
                    <Image
                      source={{ uri: task.assignedTo.profileImage }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {task.assignedTo.name?.charAt(0)?.toUpperCase() || 'T'}
                    </Text>
                  )}
                </View>
                <View style={styles.taskerInfo}>
                  <Text style={styles.taskerName}>{task.assignedTo.name || 'Tasker'}</Text>
                  <Text style={styles.taskerEmail}>{task.assignedTo.email}</Text>
                  {task.assignedTo.phone && (
                    <Text style={styles.taskerPhone}>{task.assignedTo.phone}</Text>
                  )}
                </View>
              </View>

              {/* Tasker Stats */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{task.assignedTo.rating || 0}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{task.assignedTo.completedTasks || 0}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {task.assignedTo.completionRate ? `${task.assignedTo.completionRate}%` : 'N/A'}
                  </Text>
                  <Text style={styles.statLabel}>Success Rate</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {activeTab === 'requirements' && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkmark-done-outline" size={20} color="#6366F1" />
                <Text style={styles.sectionTitle}>Task Requirements</Text>
              </View>

              {/* Skills Required */}
              {task.skillsRequired && task.skillsRequired.length > 0 && (
                <View style={styles.skillsSection}>
                  <Text style={styles.subsectionTitle}>Required Skills</Text>
                  <View style={styles.skillsContainer}>
                    {task.skillsRequired.map((skill, index) => (
                      <View key={index} style={styles.skillTag}>
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Verification Requirements */}
              {task.verificationRequired && (
                <View style={styles.verificationNotice}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#F59E0B" />
                  <Text style={styles.verificationText}>
                    Verification required upon completion
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Quick Actions Sidebar */}
        <View style={styles.sidebar}>
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Quick Actions</Text>
            
            {hasApplicants && (
              <ActionButton
                title={`View Applicants (${task.applicants?.length || 0})`}
                icon="people-outline"
                color="#10B981"
                onPress={handleViewApplicants}
              />
            )}

            <ActionButton
              title="Edit Task"
              icon="create-outline"
              color="#6366F1"
              onPress={handleEditTask}
            />

            {task.status === "In-progress" && (
              <ActionButton
                title="View Submissions"
                icon="document-text-outline"
                color="#8B5CF6"
                onPress={handleViewSubmissions}
              />
            )}

            {/* Mark as Done Section */}
            {canMarkAsDone && (
              <View style={styles.markDoneSection}>
                <View style={styles.markDoneHeader}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                  <Text style={styles.markDoneTitle}>Completion Status</Text>
                </View>
                <View style={styles.markDoneContent}>
                  <Text style={styles.markDoneText}>
                    Mark this task as completed when the work meets your requirements
                  </Text>
                  <TouchableOpacity 
                             style={styles.markDoneButton}
                             onPress={handleMarkAsDone}
                           >
                             <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                             <Text style={styles.markDoneText}>Mark as Done</Text>
                           </TouchableOpacity>
                </View>
              </View>
            )}

            {isTaskCompleted && (
              <View style={styles.completionBadge}>
                <Ionicons name="checkmark-done" size={24} color="#10B981" />
                <Text style={styles.completionText}>Task Completed</Text>
              </View>
            )}
          </View>

          {/* Task Metrics */}
          <View style={styles.metricsCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics-outline" size={20} color="#6366F1" />
              <Text style={styles.sectionTitle}>Task Performance</Text>
            </View>
            
            <View style={styles.metricsList}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Views</Text>
                <Text style={styles.metricValue}>{task.metrics?.views || 'N/A'}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Applications</Text>
                <Text style={styles.metricValue}>{task.applicants?.length || 0}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Times Saved</Text>
                <Text style={styles.metricValue}>{task.metrics?.saves || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Recent Applicants Preview */}
          {hasApplicants && (
            <View style={styles.applicantsCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={20} color="#6366F1" />
                <Text style={styles.sectionTitle}>Recent Applicants</Text>
              </View>
              
              <View style={styles.applicantsList}>
                {task.applicants.slice(0, 3).map((applicant, index) => (
                  <View key={index} style={styles.applicantItem}>
                    <View style={styles.applicantAvatar}>
                      <Text style={styles.applicantAvatarText}>
                        {applicant.name?.charAt(0)?.toUpperCase() || 'A'}
                      </Text>
                    </View>
                    <View style={styles.applicantInfo}>
                      <Text style={styles.applicantName}>
                        {applicant.name || 'Applicant'}
                      </Text>
                      <Text style={styles.applicantStatus}>
                        Applied {applicant.appliedDate ? formatDate(applicant.appliedDate) : 'recently'}
                      </Text>
                    </View>
                  </View>
                ))}
                
                {task.applicants.length > 3 && (
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={handleViewApplicants}
                  >
                    <Text style={styles.viewAllText}>
                      View all {task.applicants.length} applicants
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#6366F1" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  metaInfo: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
  completionStatusSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  completionStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  completionStatusItem: {
    flex: 1,
    alignItems: 'center',
  },
  completionStatusText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  completionStatusTextDone: {
    color: '#10B981',
    fontWeight: '600',
  },
  completionTimeText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  mutualCompletionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
  },
  mutualCompletionText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  taskDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  locationSection: {
    marginTop: 16,
  },
  locationGrid: {
    gap: 8,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  locationLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  timeline: {
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  timelineDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  taskerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  taskerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  taskerInfo: {
    flex: 1,
  },
  taskerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  taskerEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  taskerPhone: {
    fontSize: 14,
    color: '#64748B',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  skillsSection: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  verificationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  verificationText: {
    fontSize: 14,
    color: '#92400E',
    flex: 1,
  },
  sidebar: {
    padding: 16,
    gap: 16,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
 markDoneSection: {
  backgroundColor: '#F0FDF4',
  padding: 16,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#10B981',
  marginTop: 12,
  shadowColor: '#10B981',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
},
markDoneHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  gap: 8,
},
markDoneTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#065F46',
},
markDoneContent: {
  gap: 12,
},
markDoneText: {
  fontSize: 14,
  color: '#047857',
  lineHeight: 20,
},
markDoneButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#10B981',
  paddingVertical: 16,
  paddingHorizontal: 20,
  borderRadius: 12,
  gap: 12,
  shadowColor: '#10B981',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
},
markDoneButtonText: {
  fontSize: 16,
  fontWeight: '700',
  color: '#FFFFFF',
},
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  completionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  metricsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricsList: {
    gap: 12,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  applicantsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applicantsList: {
    gap: 12,
  },
  applicantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  applicantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applicantAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  applicantStatus: {
    fontSize: 12,
    color: '#64748B',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
});

export default ClientTaskDetailScreen;