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
import  StatsOverview from '../../component/client/StatsOverView';
import TaskFilters from '../../component/client/TaskFilters';
import TaskList from '../../component/client/TaskList';
import TaskActionModal from '../../component/client/TaskActionModal';

const { height, width } = Dimensions.get('window')

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
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === TABS.POSTED && styles.activeTab]}
          onPress={() => setActiveTab(TABS.POSTED)}
        >
          <Text style={[styles.tabText, activeTab === TABS.POSTED && styles.activeTabText]}>
            Posted Tasks ({stats.posted})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === TABS.REQUESTED && styles.activeTab]}
          onPress={() => setActiveTab(TABS.REQUESTED)}
        >
          <Text style={[styles.tabText, activeTab === TABS.REQUESTED && styles.activeTabText]}>
            Requested ({stats.requested})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab === TABS.POSTED ? 'posted tasks' : 'service requests'}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity 
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons 
              name="filter" 
              size={20} 
              color={showFilters ? "#6366F1" : "#666"} 
            />
            {hasActiveFilters && (
              <View style={styles.filterIndicator} />
            )}
          </TouchableOpacity>
        </View>

        {/* Statistics Section */}
        <StatsOverview stats={stats} />

        {/* Filters */}
        {showFilters && (
          <TaskFilters
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
            taskType={activeTab}
          />
        )}

        {/* Task List */}
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
      </ScrollView>
      
      {/* Add Button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          if (activeTab === TABS.POSTED) {
            navigate('CreateTask');
          } else {
            navigate('Taskers');
          }
        }}
      >
        <Entypo name="plus" size={30} color="white" />
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  filterToggle: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  filterIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#6366F1',
    padding: 15,
    borderRadius: 50,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});