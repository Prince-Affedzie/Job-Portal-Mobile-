// component/tasker/TaskList.js
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Entypo from '@expo/vector-icons/Entypo';
import { navigate } from '../../services/navigationService';

const TaskList = ({
  tasks,
  activeTab,
  selectedFilter,
  selectedCategory,
  searchQuery,
  deletingTasks,
  onTaskPress,
  onActionPress,
  onRefresh
}) => {
  const filterTasks = (taskList) => {
    return taskList.filter(task => {
      // Status filter
      if (selectedFilter !== 'All') {
        if (activeTab === 'posted') {
          if (selectedFilter === 'Open' && !['Open', 'Pending'].includes(task.status)) return false;
          if (selectedFilter === 'Assigned' && task.status !== 'Assigned') return false;
          if (selectedFilter === 'In Progress' && task.status !== 'In-progress') return false;
          if (selectedFilter === 'Review' && task.status !== 'Review') return false;
          if (selectedFilter === 'Completed' && !['Completed', 'Closed'].includes(task.status)) return false;
        } else {
          if (selectedFilter !== 'All' && task.status !== selectedFilter) return false;
        }
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
        const matchesType = task.type?.toLowerCase().includes(query);
        const matchesRequirements = task.requirements?.some(req => 
          req.toLowerCase().includes(query)
        );
        
        if (!matchesTitle && !matchesDescription && !matchesCategory && !matchesType && !matchesRequirements) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredTasks = filterTasks(tasks || []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTaskPriority = (task) => {
    if (!task.deadline && !task.preferredDate) return 'Medium';
    
    const deadline = new Date(task.deadline || task.preferredDate);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 2) return 'High';
    if (daysUntilDeadline < 7) return 'Medium';
    return 'Low';
  };

  const getStatusDisplay = (status, isRequested = false) => {
    if (isRequested) {
      switch(status) {
        case 'Completed':
          return { display: 'Completed', color: '#4CAF50' };
        case 'Closed':
          return { display: 'Closed', color: '#666' };
        case 'In-progress':
          return { display: 'In Progress', color: '#2196F3' };
        case 'Booked':
          return { display: 'Booked', color: '#FF9800' };
        case 'Review':
          return { display: 'Review', color: '#9C27B0' };
        case 'Quoted':
          return { display: 'Quoted', color: '#607D8B' };
        case 'Pending':
          return { display: 'Pending', color: '#F44336' };
        case 'Canceled':
          return { display: 'Canceled', color: '#9E9E9E' };
        default:
          return { display: status, color: '#666' };
      }
    } else {
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
    }
  };

  const getStatusStyles = (status, isRequested = false) => {
    if (isRequested) {
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
        case 'Booked':
          return { 
            iconBg: '#fff3e0', 
            iconName: 'bookmark',
            iconColor: '#FF9800'
          };
        case 'Review':
          return { 
            iconBg: '#f3e5f5', 
            iconName: 'alert-circle',
            iconColor: '#9C27B0'
          };
        case 'Quoted':
          return { 
            iconBg: '#eceff1', 
            iconName: 'chatbubble',
            iconColor: '#607D8B'
          };
        case 'Pending':
          return { 
            iconBg: '#ffebee', 
            iconName: 'time-outline',
            iconColor: '#F44336'
          };
        case 'Canceled':
          return { 
            iconBg: '#f5f5f5', 
            iconName: 'close-circle',
            iconColor: '#9E9E9E'
          };
        default:
          return { 
            iconBg: '#f0f0f0', 
            iconName: 'document-text',
            iconColor: '#666'
          };
      }
    } else {
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
    }
  };

  const getResponseCount = (task, isRequested = false) => {
    if (isRequested) {
      return task.offers?.length || 0;
    } else {
      const applicantsCount = task.applicants?.length || 0;
      const bidsCount = task.bids?.length || 0;
      return Math.max(applicantsCount, bidsCount);
    }
  };

  const getAssignedTo = (task, isRequested = false) => {
    if (isRequested) {
      if (!task.assignedTasker) return 'Not Assigned';
      
      if (typeof task.assignedTasker === 'object' && task.assignedTasker.name) {
        return task.assignedTasker.name;
      }
      
      return 'Assigned';
    } else {
      if (!task.assignedTo) return 'Not Assigned';
      
      if (typeof task.assignedTo === 'object' && task.assignedTo.name) {
        return task.assignedTo.name;
      }
      
      return 'Assigned';
    }
  };

  const renderTaskItem = ({ item }) => {
    const isRequested = activeTab === 'requested';
    const isDeleting = deletingTasks[item._id];
    const statusDisplay = getStatusDisplay(item.status, isRequested);
    const statusStyles = getStatusStyles(item.status, isRequested);
    const priority = getTaskPriority(item);
    const responseCount = getResponseCount(item, isRequested);
    const assignedTo = getAssignedTo(item, isRequested);

    return (
      <TouchableOpacity 
        style={[
          styles.taskCard,
          isDeleting && styles.deletingTaskCard
        ]}
        onPress={() => !isDeleting && onTaskPress(item)}
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
            <View style={styles.titleColumn}>
              <Text style={[
                styles.taskTitle,
                isDeleting && styles.deletingText
              ]}>
                {isRequested ? item.type : item.title}
              </Text>
              {isRequested && (
                <Text style={styles.taskType}>Service Request</Text>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => !isDeleting && onActionPress(item)}
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
              <Text style={styles.detailText}>
                {isRequested ? `${responseCount} offer(s)` : `${responseCount} Bid(s) received`}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={16} color="#666" />
              <Text style={styles.detailText}>Assigned to: {assignedTo}</Text>
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
                {(item.deadline || item.preferredDate) && ` • Due: ${formatDate(item.deadline || item.preferredDate)}`}
              </Text>
            </View>
          </View>

          {!isRequested && item.locationType && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {item.locationType === 'remote' ? 'Remote' : 'On-site'} • {item.category}
                </Text>
              </View>
            </View>
          )}

          {isRequested && item.address && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {item.address.city || item.address.region || 'Location specified'}
                </Text>
              </View>
            </View>
          )}

          {(item.budget || item.finalCost) ? (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {isRequested && item.finalCost ? `Final Cost: GHS ${item.finalCost}` : `Budget: GHS ${item.budget}`}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
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
          <Ionicons 
            name={activeTab === 'posted' ? "document-text-outline" : "send-outline"} 
            size={60} 
            color="#ccc" 
          />
          <Text style={styles.emptyStateText}>
            {tasks?.length === 0 
              ? `No ${activeTab === 'posted' ? 'tasks posted' : 'service requests'} yet` 
              : 'No tasks match your search'
            }
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {tasks?.length === 0 
              ? `Create your first ${activeTab === 'posted' ? 'public task' : 'service request'} to get started!` 
              : 'Try adjusting your filters or search terms'
            }
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tasksSection: {
    flex: 1,
    marginBottom: 20,
  },
  resultsHeader: {
    marginBottom: 16,
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
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  resultsSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
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
    position: 'relative',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 10,
  },
  titleColumn: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flexWrap: 'wrap',
  },
  taskType: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 2,
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
});

export default TaskList;