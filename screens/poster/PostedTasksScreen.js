import { View, Text, StyleSheet, ScrollView, Dimensions,Alert, TouchableOpacity, FlatList, Modal, RefreshControl, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState, useContext, useEffect } from 'react'
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PosterContext } from '../../context/PosterContext';
import { AuthContext } from "../../context/AuthContext";
import { navigate } from '../../services/navigationService'
import Header from "../../component/tasker/Header";
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { height, width } = Dimensions.get('window')

const statusFilters = ['All', 'Open', 'Assigned', 'In Progress', 'Review', 'Completed'];
const categoryFilters = ['All', 'Home Services', 'Delivery & Errands', 'Digital Services', 'Writing & Assistance', 'Learning & Tutoring', 'Creative Tasks', 'Event Support', 'Others'];

export default function PostedTasksScreen() {
  const { user } = useContext(AuthContext);
  const { postedTasks, loading, loadPostedTasks,deleteTask } = useContext(PosterContext);
  
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Deletion status tracking
  const [deletingTasks, setDeletingTasks] = useState({}); // Track deleting tasks by ID
  const [deletionError, setDeletionError] = useState(null);

  // Load tasks on component mount
  useEffect(() => {
    loadPostedTasks();
  }, []);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPostedTasks();
    setRefreshing(false);
  };

  // Clear deletion error when modal closes or component unmounts
  useEffect(() => {
    if (!actionModalVisible) {
      setDeletionError(null);
    }
  }, [actionModalVisible]);

  const deleteATask = async (taskId, taskTitle) => {
    // Set deleting status for this specific task
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
                const res = await deleteTask(taskId);
                if (res.status === 200) {
                  Alert.alert("Success", "Task deleted successfully!", [{ text: "OK" }]);
                  resolve({ success: true, data: res.data });
                  
                  // Refresh the task list
                  await loadPostedTasks();
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
                // Clear deleting status regardless of outcome
                setDeletingTasks(prev => ({ ...prev, [taskId]: false }));
              }
            }
          }
        ]
      );
    });
  };

  // Filter tasks based on selected filters and search
  const filteredTasks = (postedTasks || []).filter(task => {
    // Status filter
    if (selectedFilter !== 'All') {
      if (selectedFilter === 'Open' && !['Open', 'Pending'].includes(task.status)) return false;
      if (selectedFilter === 'Assigned' && task.status !== 'Assigned') return false;
      if (selectedFilter === 'In Progress' && task.status !== 'In-progress') return false;
      if (selectedFilter === 'Review' && task.status !== 'Review') return false;
      if (selectedFilter === 'Completed' && !['Completed', 'Closed'].includes(task.status)) return false;
    }

    // Category filter
    if (selectedCategory !== 'All' && task.category !== selectedCategory) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = task.title?.toLowerCase().includes(query);
      const matchesDescription = task.description?.toLowerCase().includes(query);
      const matchesCategory = task.category?.toLowerCase().includes(query);
      const matchesSkills = task.skillsRequired?.some(skill => 
        skill.toLowerCase().includes(query)
      );
      
      if (!matchesTitle && !matchesDescription && !matchesCategory && !matchesSkills) {
        return false;
      }
    }

    return true;
  });

  const handleActionPress = (task) => {
    setSelectedTask(task);
    setActionModalVisible(true);
  };

  const handleActionSelect = async (action) => {
    if (!selectedTask) return;
    
    if (action === 'View Details') {
      navigate('ClientTaskDetail', { taskId: selectedTask._id });
    } else if (action === 'Edit') {
      navigate('EditTask', { taskId: selectedTask._id, task: selectedTask });
    } else if (action === 'View Applicants') {
      navigate('TaskApplicants', { 
        taskId: selectedTask._id,
        applicants: selectedTask.applicants || []
      });
    } else if (action === 'Delete') {
      const result = await deleteATask(selectedTask._id, selectedTask.title);
      
      if (result.success) {
        loadPostedTasks(); 
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

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get priority based on deadline or other factors
  const getTaskPriority = (task) => {
    if (!task.deadline) return 'Medium';
    
    const deadline = new Date(task.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 2) return 'High';
    if (daysUntilDeadline < 7) return 'Medium';
    return 'Low';
  };

  const renderTaskItem = ({ item }) => {
    // Check if this task is currently being deleted
    const isDeleting = deletingTasks[item._id];
    
    // Map your actual statuses to display names and colors
    const getStatusDisplay = (status) => {
      switch(status) {
        case 'Completed':
          return { display: 'Completed', color: '#4CAF50' };
        case 'Closed':
          return { display: 'Closed', color: '#666' };
        case 'In-progress':
          return { display: 'In Progress', color: '#2196F3' };
        case 'Assigned':
          return { display: 'Assigned', color: '#FF9800' };
        case 'Review':
          return { display: 'Review', color: '#9C27B0' };
        case 'Open':
          return { display: 'Open', color: '#4CAF50' };
        case 'Pending':
          return { display: 'Pending', color: '#F44336' };
        default:
          return { display: status, color: '#666' };
      }
    };

    const statusDisplay = getStatusDisplay(item.status);
    const priority = getTaskPriority(item);

    // Get icon and background color based on status
    const getStatusStyles = (status) => {
      switch(status) {
        case 'Completed':
        case 'Closed':
          return { 
            iconBg: '#e8f5e8', 
            iconName: 'checkmark-circle',
            iconColor: '#4CAF50'
          };
        case 'In-progress':
          return { 
            iconBg: '#e8f4fd', 
            iconName: 'play-circle',
            iconColor: '#2196F3'
          };
        case 'Assigned':
          return { 
            iconBg: '#fff3e0', 
            iconName: 'person-circle',
            iconColor: '#FF9800'
          };
        case 'Review':
          return { 
            iconBg: '#f3e5f5', 
            iconName: 'alert-circle',
            iconColor: '#9C27B0'
          };
        case 'Open':
          return { 
            iconBg: '#e8f5e8', 
            iconName: 'briefcase',
            iconColor: '#4CAF50'
          };
        case 'Pending':
          return { 
            iconBg: '#ffebee', 
            iconName: 'time-outline',
            iconColor: '#F44336'
          };
        default:
          return { 
            iconBg: '#f0f0f0', 
            iconName: 'briefcase',
            iconColor: '#666'
          };
      }
    };

    const statusStyles = getStatusStyles(item.status);

    // Get assigned tasker name
    const getAssignedTo = (task) => {
      if (!task.assignedTo) return 'Not Assigned';
      
      if (typeof task.assignedTo === 'object' && task.assignedTo.name) {
        return task.assignedTo.name;
      }
      
      return 'Assigned';
    };

    // Get applicant count
    const getApplicantCount = (task) => {
      const applicantsCount = task.applicants?.length || 0;
      const bidsCount = task.bids?.length || 0;
      return Math.max(applicantsCount, bidsCount);
    };

    return (
      <TouchableOpacity 
        style={[
          styles.taskCard,
          isDeleting && styles.deletingTaskCard
        ]}
        onPress={() => !isDeleting && navigate('ClientTaskDetail', { taskId: item._id })}
        disabled={isDeleting}
      >
        {isDeleting && (
          <View style={styles.deletingOverlay}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.deletingText}>Deleting...</Text>
          </View>
        )}
        
        <View style={styles.taskHeader}>
          <View style={styles.titleContainer}>
            <View style={[styles.iconCircle, { backgroundColor: statusStyles.iconBg }]}>
              <Ionicons 
                name={statusStyles.iconName} 
                size={20} 
                color={statusStyles.iconColor} 
              />
            </View>
            <Text style={[
              styles.taskTitle,
              isDeleting && styles.deletingText
            ]}>{item.title}</Text>
          </View>

          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => !isDeleting && handleActionPress(item)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Entypo name="dots-three-vertical" size={18} color="#666" />
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.taskDetails}>
          <View style={styles.detailRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color }]}>
              <Text style={styles.statusText}>{statusDisplay.display}</Text>
            </View>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>{priority} Priority</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{getApplicantCount(item)} applicant(s)</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={16} color="#666" />
              <Text style={styles.detailText}>Assigned to: {getAssignedTo(item)}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.descriptionText} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                Posted: {formatDate(item.createdAt)}
                {item.deadline && ` • Due: ${formatDate(item.deadline)}`}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                {item.locationType === 'remote' ? 'Remote' : 'On-site'} • {item.category}
              </Text>
            </View>
          </View>

          {item.budget && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={16} color="#666" />
                <Text style={styles.detailText}>Budget: GHS {item.budget}</Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
              placeholder="Search tasks by title, description, skills..."
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

        {/* Expanded Filters */}
        {showFilters && (
          <View style={styles.filtersExpanded}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterChips}>
                  {statusFilters.map((filter) => (
                    <TouchableOpacity 
                      key={filter}
                      style={[
                        styles.filterChip,
                        selectedFilter === filter && styles.filterChipActive
                      ]}
                      onPress={() => setSelectedFilter(filter)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedFilter === filter && styles.filterChipTextActive
                      ]}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterChips}>
                  {categoryFilters.map((category) => (
                    <TouchableOpacity 
                      key={category}
                      style={[
                        styles.filterChip,
                        selectedCategory === category && styles.filterChipActive
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedCategory === category && styles.filterChipTextActive
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Ionicons name="close" size={16} color="#6366F1" />
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Results Header */}
       <View style={styles.resultsHeader}>
  <Text style={styles.resultsTitle}>
    {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'} Found
  </Text>
  {hasActiveFilters && (
    <View style={styles.filtersContainer}>
      <Text style={styles.resultsSubtitle}>
        {selectedFilter !== 'All' ? `• ${selectedFilter} ` : ''}
        {selectedCategory !== 'All' ? `• ${selectedCategory} ` : ''}
        {searchQuery ? `• "${searchQuery}"` : ''}
      </Text>
    </View>
  )}
</View>

        {/* Tasks List */}
        <View style={styles.tasksSection}>
          {filteredTasks.length > 0 ? (
            <FlatList
              data={filteredTasks}
              renderItem={renderTaskItem}
              keyExtractor={item => item._id || item.id}
              scrollEnabled={false}
              style={styles.tasksList}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>
                {postedTasks?.length === 0 ? 'No tasks posted yet' : 'No tasks match your search'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {postedTasks?.length === 0 ? 'Create your first task to get started!' : 'Try adjusting your filters or search terms'}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity style={styles.clearEmptyFilters} onPress={clearFilters}>
                  <Text style={styles.clearEmptyFiltersText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Add Button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigate('CreateTask')}
      >
        <Entypo name="plus" size={30} color="white" />
      </TouchableOpacity>
      
      {/* Action Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={actionModalVisible}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Task Actions</Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {/* Show deletion error if any */}
            {deletionError && (
              <View style={styles.errorBanner}>
                <Ionicons name="warning-outline" size={18} color="#FFF" />
                <Text style={styles.errorText}>Deletion failed: {deletionError}</Text>
              </View>
            )}
            
            <View style={styles.actionList}>
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => handleActionSelect('View Details')}
              >
                <Ionicons name="eye-outline" size={22} color="#2196F3" />
                <Text style={styles.actionText}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() =>navigate('EditTask',{taskId:selectedTask._id,task:selectedTask})}
              >
                <Ionicons name="create-outline" size={22} color="#FF9800" />
                <Text style={styles.actionText}>Edit Task</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => handleActionSelect('View Applicants')}
              >
                <Ionicons name="people-outline" size={22} color="#9C27B0" />
                <Text style={styles.actionText}>View Applicants</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.actionItem,
                  deletingTasks[selectedTask?._id] && styles.disabledAction
                ]}
                onPress={() => handleActionSelect('Delete')}
                disabled={deletingTasks[selectedTask?._id]}
              >
                {deletingTasks[selectedTask?._id] ? (
                  <ActivityIndicator size="small" color="#F44336" />
                ) : (
                  <Ionicons name="trash-outline" size={22} color="#F44336" />
                )}
                <Text style={[styles.actionText, styles.deleteText]}>
                  {deletingTasks[selectedTask?._id] ? 'Deleting...' : 'Delete Task'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
// Updated styles with search and filter components
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    marginBottom:10,
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
  filtersExpanded: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  resultsHeader: {
  marginBottom: 24,
  padding: 16,
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
  borderLeftWidth: 4,
  borderLeftColor: '#6366F1',
},
resultsTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: '#1E293B',
  marginBottom: 6,
  letterSpacing: -0.3,
},
filtersContainer: {
  paddingTop: 8,
  borderTopWidth: 1,
  borderTopColor: '#F1F5F9',
},
resultsSubtitle: {
  fontSize: 14,
  color: '#64748B',
  fontWeight: '500',
  lineHeight: 18,
},
  tasksSection: {
    flex: 1,
    marginBottom: 20,
  },
  tasksList: {
    flex: 1,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    flexWrap: 'wrap',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuButton: {
    padding: 4,
  },
  taskDetails: {
    // Details container
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  priorityText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  clearEmptyFilters: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  clearEmptyFiltersText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
 modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'flex-end',
},
modalContent: {
  backgroundColor: 'white',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
  maxHeight: height * 0.6,
  // Add shadow for depth
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: -2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
  // Smooth entrance animation
  transform: [{ translateY: 0 }],
},
modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
  paddingBottom: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
modalTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#333',
},
  actionList: {
    // Action list container
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  deleteText: {
    color: '#F44336',
  },
  deletingTaskCard: {
    opacity: 0.6,
  },
  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 10,
  },
  deletingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  disabledAction: {
    opacity: 0.5,
  },
  errorBanner: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});