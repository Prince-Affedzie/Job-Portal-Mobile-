import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, FlatList, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState } from 'react'
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { height, width } = Dimensions.get('window')

// Dummy data for tasks
const dummyTasks = [
  {
    id: '1',
    title: 'Deliver a Document to Office',
    status: 'Pending',
    applicants: 0,
    assignedTo: 'Not Assigned',
    datePosted: '2023-10-15',
    description: 'Need to deliver an important document to the main office downtown.',
    priority: 'Medium'
  },
  {
    id: '2',
    title: 'Design a Logo',
    status: 'Assigned',
    applicants: 3,
    assignedTo: 'John Smith',
    datePosted: '2023-10-10',
    description: 'Create a modern logo for a new startup company.',
    priority: 'High'
  },
  {
    id: '3',
    title: 'Data Entry Task',
    status: 'In Progress',
    applicants: 1,
    assignedTo: 'Sarah Johnson',
    datePosted: '2023-10-05',
    description: 'Enter customer data into our CRM system.',
    priority: 'Low'
  },
  {
    id: '4',
    title: 'Website Testing',
    status: 'Completed',
    applicants: 5,
    assignedTo: 'Mike Wilson',
    datePosted: '2023-09-28',
    description: 'Test the new website functionality and report bugs.',
    priority: 'Medium'
  },
  {
    id: '5',
    title: 'Social Media Posts',
    status: 'Open',
    applicants: 2,
    assignedTo: 'Not Assigned',
    datePosted: '2023-10-12',
    description: 'Create and schedule social media posts for the week.',
    priority: 'Medium'
  },
];

const statusFilters = ['All', 'Open', 'Assigned', 'In Progress', 'Completed', 'Closed'];

export default function PostedTasksScreen() {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [tasks, setTasks] = useState(dummyTasks);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Filter tasks based on selected filter
  const filteredTasks = selectedFilter === 'All' 
    ? tasks 
    : tasks.filter(task => {
        if (selectedFilter === 'Open') return task.status === 'Open' || task.status === 'Pending';
        if (selectedFilter === 'Assigned') return task.status === 'Assigned';
        if (selectedFilter === 'In Progress') return task.status === 'In Progress';
        if (selectedFilter === 'Completed') return task.status === 'Completed';
        if (selectedFilter === 'Closed') return task.status === 'Closed';
        return true;
      });

  // Count tasks by status
  const totalPosted = tasks.length;
  const openTasks = tasks.filter(task => task.status === 'Open' || task.status === 'Pending').length;
  const assignedTasks = tasks.filter(task => task.status === 'Assigned').length;
  const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
  const completedTasks = tasks.filter(task => task.status === 'Completed').length;
  const closedTasks = tasks.filter(task => task.status === 'Closed').length;

  const handleActionPress = (task) => {
    setSelectedTask(task);
    setActionModalVisible(true);
  };

  const handleActionSelect = (action) => {
    console.log(`Selected action: ${action} for task: ${selectedTask.title}`);
    // Implement the actual functionality for each action
    setActionModalVisible(false);
  };

const renderTaskItem = ({ item }) => {
  // Map status to colors
  const statusColor = 
    item.status === 'Completed' ? '#4CAF50' :
    item.status === 'In Progress' ? '#2196F3' :
    item.status === 'Assigned' ? '#FF9800' :
    item.status === 'Open' ? '#9C27B0' : '#F44336';

  // Get icon and background color based on status
  const getStatusStyles = (status) => {
    switch(status) {
      case 'Completed':
        return { 
          iconBg: '#e8f5e8', 
          iconName: 'checkmark-circle',
          iconColor: '#4CAF50'
        };
      case 'In Progress':
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
      case 'Open':
        return { 
          iconBg: '#f3e5f5', 
          iconName: 'briefcase',
          iconColor: '#9C27B0'
        };
      case 'Pending':
        return { 
          iconBg: '#ffebee', 
          iconName: 'alert-sharp',
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

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.titleContainer}>
          <View style={[styles.iconCircle, { backgroundColor: statusStyles.iconBg }]}>
            <Ionicons 
              name={statusStyles.iconName} 
              size={20} 
              color={statusStyles.iconColor} 
            />
          </View>
          <Text style={styles.taskTitle}>{item.title}</Text>
        </View>

        <TouchableOpacity style={{marginTop:10}} onPress={() => handleActionPress(item)}>
          <Entypo name="dots-three-vertical" size={18} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.taskDetails}>
        <View style={styles.detailRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>{item.priority} Priority</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.applicants} applicant(s)</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Assigned to: {item.assignedTo}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Posted: {item.datePosted}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};


  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerText}>My Micro Tasks</Text>
        </View>
        
        {/* Stats Tiles - Grid Layout */}
        <View style={styles.tileContainer}>
          <View style={styles.tileRowGroup}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Total Posted</Text>
              <Text style={styles.tileValue}>{totalPosted}</Text>
            </View>
            <View style={styles.tileSpacer} />
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Open</Text>
              <Text style={styles.openValue}>{openTasks}</Text>
            </View>
          </View>
          
          <View style={styles.tileRowGroup}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Assigned</Text>
              <Text style={styles.assignedValue}>{assignedTasks}</Text>
            </View>
            <View style={styles.tileSpacer} />
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>In Progress</Text>
              <Text style={styles.progressValue}>{inProgressTasks}</Text>
            </View>
          </View>
          
          <View style={styles.tileRowGroup}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Completed</Text>
              <Text style={styles.completedValue}>{completedTasks}</Text>
            </View>
            <View style={styles.tileSpacer} />
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Closed</Text>
              <Text style={styles.closedValue}>{closedTasks}</Text>
            </View>
          </View>
        </View>
        
        {/* Filter Section */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Filter Tasks</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
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
          </ScrollView>
        </View>
        
        {/* Tasks List */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>
            {selectedFilter} Tasks ({filteredTasks.length})
          </Text>
          {filteredTasks.length > 0 ? (
            <FlatList
              data={filteredTasks}
              renderItem={renderTaskItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              style={styles.tasksList}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>No tasks found</Text>
              <Text style={styles.emptyStateSubtext}>Try selecting a different filter</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Add Button */}
      <TouchableOpacity style={styles.addButton}>
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
              <Text style={styles.modalTitle}>Choose Action</Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
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
                onPress={() => handleActionSelect('Edit')}
              >
                <Ionicons name="create-outline" size={22} color="#FF9800" />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => handleActionSelect('Change Status')}
              >
                <MaterialIcons name="swap-vert" size={22} color="#9C27B0" />
                <Text style={styles.actionText}>Change Status</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => handleActionSelect('Delete')}
              >
                <Ionicons name="trash-outline" size={22} color="#F44336" />
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    //margin:10,
    flex: 1,
    //backgroundColor: '#f8f9fa',
  },
  scrollView: {
    margin:10,
    flex: 1,
    marginBottom:-35
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    //backgroundColor: 'white',
    //borderBottomWidth: 1,
    //borderBottomColor: '#eaeaea',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  tileContainer: {
    padding: 15,
  },
  tileRowGroup: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  tile: {
    flex: 1,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSpacer: {
    width: 16,
  },
  tileLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  tileValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  openValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#9C27B0',
    textAlign: 'center',
  },
  assignedValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF9800',
    textAlign: 'center',
  },
  progressValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2196F3',
    textAlign: 'center',
  },
  completedValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4CAF50',
    textAlign: 'center',
  },
  closedValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F44336',
    textAlign: 'center',
  },
  filterSection: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  filterScroll: {
    marginBottom: 5,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#0278ff',
    borderColor: '#0278ff',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  tasksSection: {
    flex: 1,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  tasksList: {
    flex: 1,
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    elevation:3,
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2.84,
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
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#0278ff',
    padding: 15,
    borderRadius: 50,
    elevation: 5,
    shadowColor: '#0278ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
});