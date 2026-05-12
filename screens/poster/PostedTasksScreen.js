// screens/tasker/AllTasksScreen.js
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Dimensions, Alert, TouchableOpacity, FlatList, Modal, RefreshControl, TextInput, ActivityIndicator } from 'react-native'
import React, { useState, useContext, useEffect } from 'react'
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient'
import { PosterContext } from '../../context/PosterContext';
import { ServiceRequestContext } from '../../context/ServiceRequestContext';
import { AuthContext } from "../../context/AuthContext";
import { navigate } from '../../services/navigationService'
import Header from "../../component/tasker/Header";
import LoadingIndicator from '../../component/common/LoadingIndicator';
import StatsOverview from '../../component/client/StatsOverView';
import TaskFilters from '../../component/client/TaskFilters';
import TaskList from '../../component/client/TaskList';
import TaskActionModal from '../../component/client/TaskActionModal';

const { height, width } = Dimensions.get('window')
const guidelineBaseWidth = 375;
const scale = (size) => (width / guidelineBaseWidth) * size;

const TABS = {
  POSTED: 'posted',
  REQUESTED: 'requested'
};

export default function AllTasksScreen() {
  const { user } = useContext(AuthContext);
  const { postedTasks, loading: postedLoading, loadPostedTasks, deleteTask } = useContext(PosterContext);
  const { serviceRequests, loading: requestsLoading, loadServiceRequests, deleteServiceRequest } = useContext(ServiceRequestContext);
  
  const [activeTab, setActiveTab] = useState(TABS.POSTED);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingTasks, setDeletingTasks] = useState({});
  const [deletionError, setDeletionError] = useState(null);

  const loading = activeTab === TABS.POSTED ? postedLoading : requestsLoading;
  const currentTasks = activeTab === TABS.POSTED ? postedTasks : serviceRequests;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await loadPostedTasks();
    await loadServiceRequests();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const calculateStats = () => {
    const postedTasksData = postedTasks || [];
    const requestedTasksData = serviceRequests || [];
    
    const totalPosted = postedTasksData.length;
    const totalRequested = requestedTasksData.length;
    const total = totalPosted + totalRequested;
    
    const completedPosted = postedTasksData.filter(task => 
      ['Completed', 'Closed'].includes(task.status)
    ).length;
    
    const completedRequested = requestedTasksData.filter(task => 
      ['Completed', 'Closed'].includes(task.status)
    ).length;
    
    const completed = completedPosted + completedRequested;
    
    const inProgressPosted = postedTasksData.filter(task => 
      ['In-progress', 'Assigned', 'Review'].includes(task.status)
    ).length;
    
    const inProgressRequested = requestedTasksData.filter(task => 
      ['In-progress', 'Assigned', 'Review', 'Booked'].includes(task.status)
    ).length;
    
    const inProgress = inProgressPosted + inProgressRequested;

    const openPosted = postedTasksData.filter(task => 
      ['Open', 'Pending'].includes(task.status)
    ).length;
    
    const openRequested = requestedTasksData.filter(task => 
      ['Pending', 'Quoted'].includes(task.status)
    ).length;
    
    const open = openPosted + openRequested;

    // Calculate total applicants/offers
    const postedApplicants = postedTasksData.reduce((sum, task) => {
      const applicantsCount = task.applicants?.length || 0;
      const bidsCount = task.bids?.length || 0;
      return sum + Math.max(applicantsCount, bidsCount);
    }, 0);

    const requestedOffers = requestedTasksData.reduce((sum, task) => {
      return sum + (task.offers?.length || 0);
    }, 0);

    const totalApplicants = postedApplicants + requestedOffers;
    const applicantsPerTask = total > 0 ? (totalApplicants / total).toFixed(1) : 0;

    return { 
      total, 
      completed, 
      inProgress, 
      open,
      applicants: totalApplicants,
      applicantsPerTask: parseFloat(applicantsPerTask),
      posted: totalPosted,
      requested: totalRequested
    };
  };

  const stats = calculateStats();

  const deleteATask = async (taskId, taskTitle, isRequested = false) => {
    setDeletingTasks(prev => ({ ...prev, [taskId]: true }));
    setDeletionError(null);

    return new Promise((resolve) => {
      Alert.alert(
        "Delete Task",
        `Are you sure you want to delete "${taskTitle}"? This action cannot be undone.`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setDeletingTasks(prev => ({ ...prev, [taskId]: false }));
              resolve({ success: false, cancelled: true });
            }
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                let res;
                if (isRequested) {
                  res = await deleteServiceRequest(taskId);
                } else {
                  res = await deleteTask(taskId);
                }
                
                if (res.status === 200) {
                  Alert.alert("Success", "Task deleted successfully!", [{ text: "OK" }]);
                  resolve({ success: true, data: res.data });
                  await loadData();
                } else {
                  throw new Error(res.data?.message || 'Failed to delete task');
                }
              } catch (error) {
                const errorMessage = error.response?.data?.message ||
                                   error.response?.data?.error ||
                                   error.message ||
                                   "An unexpected error occurred while deleting the task.";
                
                setDeletionError(errorMessage);
                Alert.alert("Delete Failed", errorMessage, [{ text: "OK" }]);
                resolve({ success: false, error: errorMessage });
              } finally {
                setDeletingTasks(prev => ({ ...prev, [taskId]: false }));
              }
            }
          }
        ]
      );
    });
  };

  const handleActionPress = (task, isRequested = false) => {
    setSelectedTask({ ...task, isRequested });
    setActionModalVisible(true);
  };

  const handleActionSelect = async (action) => {
    if (!selectedTask) return;
    
    const { isRequested, ...task } = selectedTask;
    
    if (action === 'View Details') {
      if (isRequested) {
        navigate('ServiceRequestDetail', { requestId: task._id });
      } else {
        navigate('ClientTaskDetail', { taskId: task._id });
      }
    } else if (action === 'Edit') {
      if (isRequested) {
        navigate('EditServiceRequest', { requestId: task._id, request: task });
      } else {
        navigate('EditTask', { taskId: task._id, task: task });
      }
    } else if (action === 'View Applicants') {
      if (isRequested) {
        navigate('ServiceRequestOffers', {
              requestId: task._id,
              offers: task.offers || [],
              request: task
            });
      } else {
        navigate('TaskApplicants', { 
          taskId: task._id,
          applicants: task.applicants || []
        });
      }
    } else if (action === 'Delete') {
      const result = await deleteATask(task._id, task.title || task.description, isRequested);
      if (result.success) {
        loadData();
      }
    }
    
    setActionModalVisible(false);
  };

  const clearFilters = () => {
    setSelectedFilter('All');
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedFilter !== 'All' || selectedCategory !== 'All' || searchQuery.trim();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="My Tasks" />
        <LoadingIndicator text='Loading your Tasks...'/>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="My Tasks" />
      
      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
        <LinearGradient
          colors={['#1A1A1B', '#1A1A1B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBackground}
        >
          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === TABS.POSTED && styles.activeTab]}
              onPress={() => setActiveTab(TABS.POSTED)}
            >
              <View style={styles.tabContent}>
                {/*<Ionicons 
                  name="document-text" 
                  size={scale(18)} 
                  color={activeTab === TABS.POSTED ? '#FFFFFF' : '#E0E7FF'} 
                />*/}
                <Text style={[styles.tabText, activeTab === TABS.POSTED && styles.activeTabText]}>
                  Posted Tasks
                </Text>
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{stats.posted}</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === TABS.REQUESTED && styles.activeTab]}
              onPress={() => setActiveTab(TABS.REQUESTED)}
            >
              <View style={styles.tabContent}>
                {/*<Ionicons 
                  name="briefcase" 
                  size={scale(18)} 
                  color={activeTab === TABS.REQUESTED ? '#FFFFFF' : '#E0E7FF'} 
                />*/}
                <Text style={[styles.tabText, activeTab === TABS.REQUESTED && styles.activeTabText]}>
                  Service Requests
                </Text>
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{stats.requested}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={scale(20)} color="#FFFFFF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${activeTab === TABS.POSTED ? 'posted tasks' : 'service requests'}...`}
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery ? (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchButton}
                >
                  <Ionicons name="close-circle" size={scale(18)} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity 
              style={[
                styles.filterButton,
                showFilters && styles.filterButtonActive,
                hasActiveFilters && styles.filterButtonHasFilters
              ]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons 
                name="options" 
                size={scale(20)} 
                color={showFilters ? '#6366F1' : '#FFFFFF'} 
              />
              {hasActiveFilters && (
                <View style={styles.filterIndicator}>
                  <Text style={styles.filterIndicatorText}>
                    {hasActiveFilters ? '•' : ''}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

        {/* Statistics Overview 
        <View style={styles.statsSection}>
          <StatsOverview stats={stats} />
        </View>*/}

        {/* Filters Section */}
        {showFilters && (
          <View style={styles.filtersSection}>
            <TaskFilters
              selectedFilter={selectedFilter}
              setSelectedFilter={setSelectedFilter}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
              taskType={activeTab}
            />
          </View>
        )}

        {/* Task List */}
        <View style={styles.taskListSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === TABS.POSTED ? 'Posted Tasks' : 'Service Requests'}
              <Text style={styles.taskCount}> • {currentTasks?.length || 0} tasks</Text>
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity 
                style={styles.clearAllButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearAllText}>Clear All</Text>
                <Ionicons name="close" size={scale(14)} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
          
          <TaskList
            tasks={currentTasks}
            activeTab={activeTab}
            selectedFilter={selectedFilter}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            deletingTasks={deletingTasks}
            onTaskPress={(task) => {
              if (activeTab === TABS.POSTED) {
                navigate('ClientTaskDetail', { taskId: task._id });
              } else {
                navigate('ServiceRequestDetail', { requestId: task._id });
              }
            }}
            onActionPress={(task) => handleActionPress(task, activeTab === TABS.REQUESTED)}
            onRefresh={loadData}
          />
        </View>

        {/* Empty State if needed */}
        {(!currentTasks || currentTasks.length === 0) && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={scale(80)} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>
              No {activeTab === TABS.POSTED ? 'Posted Tasks' : 'Service Requests'}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeTab === TABS.POSTED 
                ? 'Start by posting your first task to find skilled taskers.'
                : 'Create a service request to get quotes from professionals.'
              }
            </Text>
            <TouchableOpacity 
              style={styles.emptyActionButton}
              onPress={() => {
                if (activeTab === TABS.POSTED) {
                  navigate('CreateTask');
                } else {
                  navigate('Taskers');
                }
              }}
            >
              <Ionicons name="add" size={scale(18)} color="#FFFFFF" />
              <Text style={styles.emptyActionText}>
                {activeTab === TABS.POSTED ? 'Post First Task' : 'Create Request'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          if (activeTab === TABS.POSTED) {
            navigate('CreateTask');
          } else {
            navigate('Taskers');
          }
        }}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Entypo name="plus" size={scale(24)} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Action Modal */}
      <TaskActionModal
        visible={actionModalVisible}
        onClose={() => setActionModalVisible(false)}
        task={selectedTask}
        onActionSelect={handleActionSelect}
        deletionError={deletionError}
        deletingTasks={deletingTasks}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroSection: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
   // marginHorizontal:12,
  },
  heroBackground: {
    borderRadius:24,
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(24),
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: scale(16),
    padding: scale(4),
    marginBottom: scale(20),
  },
  tab: {
    flex: 1,
    borderRadius: scale(12),
    paddingVertical: scale(12),
  },
  activeTab: {
    backgroundColor: '#FFFFFF' ,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
  },
  tabText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#E0E7FF',
  },
  activeTabText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(12),
    minWidth: scale(24),
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    borderWidth: scale(1),
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchIcon: {
    marginRight: scale(12),
  },
  searchInput: {
    flex: 1,
    paddingVertical: scale(14),
    fontSize: scale(16),
    color: '#FFFFFF',
    fontWeight: '500',
  },
  clearSearchButton: {
    padding: scale(4),
  },
  filterButton: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(16),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: scale(1),
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterButtonHasFilters: {
    borderColor: '#F59E0B',
  },
  filterIndicator: {
    position: 'absolute',
    top: scale(10),
    right: scale(10),
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#F59E0B',
  },
  filterIndicatorText: {
    fontSize: scale(12),
    color: '#F59E0B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(100),
  },
  statsSection: {
    marginTop: scale(20),
    marginBottom: scale(16),
  },
  filtersSection: {
    marginBottom: scale(20),
  },
  taskListSection: {
    marginTop: scale(8),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: '#1E293B',
  },
  taskCount: {
    color: '#6366F1',
    fontWeight: '600',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    gap: scale(4),
  },
  clearAllText: {
    fontSize: scale(12),
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scale(60),
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: '#1E293B',
    marginTop: scale(20),
    marginBottom: scale(8),
  },
  emptyDescription: {
    fontSize: scale(15),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: scale(24),
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: scale(24),
    paddingVertical: scale(14),
    borderRadius: scale(16),
    gap: scale(8),
  },
  emptyActionText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: scale(24),
    right: scale(24),
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: scale(8),
    elevation: 8,
    zIndex: 20,
  },
  fabGradient: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
});