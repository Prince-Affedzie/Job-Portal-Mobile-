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
  RefreshControl,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { navigate } from '../../services/navigationService';
import { TaskerContext } from '../../context/TaskerContext';
import { getYourAppliedMiniTasks } from '../../api/miniTaskApi'

const { width } = Dimensions.get('window');

const MyApplicationsScreen = () => {
  const [activeTab, setActiveTab] = useState('applications');
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const response = await getYourAppliedMiniTasks();
      
      if (response.data) {
        setApplications(response.data.applications || []);
        setBids(response.data.bids || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadData();
  };

  const renderApplicationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigate('TaskDetails', { taskId: item._id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.employerRow}>
            <Text style={styles.employerName}>{item.employer?.name || 'Unknown Employer'}</Text>
            {item.employer?.rating && (
              <View style={styles.rating}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{item.employer.rating}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.budgetContainer}>
          <Text style={styles.budget}>₵{item.budget || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.description} numberOfLines={2}>{item.description || 'No description'}</Text>
        
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.detailText}>
              Applied {formatDate(item.appliedAt) || 'N/A'}
            </Text>
          </View>
          <View style={[styles.statusBadge, styles[item.status?.toLowerCase()]]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.category}>{item.category || 'N/A'}</Text>
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigate('TaskDetails', { taskId: item._id })}
          >
            <Ionicons name="eye-outline" size={16} color="#6366F1" />
            <Text style={styles.actionText}>View Task</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderBidItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigate('TaskDetails', { taskId: item.task._id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={1}>{item.task.title}</Text>
          <View style={styles.employerRow}>
            <Text style={styles.employerName}>{item.task.employer?.name || 'Unknown Employer'}</Text>
            {item.task.employer?.rating && (
              <View style={styles.rating}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{item.task.employer.rating}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.budgetContainer}>
          <Text style={styles.yourBid}>Your bid</Text>
          <Text style={styles.bidAmount}>₵{item.bid.amount}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.message} numberOfLines={2}>{item.bid.message || 'No message provided'}</Text>
        
        <View style={styles.bidDetails}>
          {item.bid.timeline && (
            <View style={styles.bidDetailItem}>
              <Ionicons name="calendar-outline" size={14} color="#64748B" />
              <Text style={styles.bidDetailText}>{item.bid.timeline}</Text>
            </View>
          )}
          <View style={styles.bidDetailItem}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.bidDetailText}>
              Submitted {formatDate(item.bid.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.bidStatusContainer}>
          <View style={[styles.statusBadge, styles[item.bid.status?.toLowerCase()]]}>
            <Text style={styles.statusText}>{getBidStatusText(item.bid.status)}</Text>
          </View>
          {item.bid.status === 'Accepted' && (
            <TouchableOpacity style={styles.contactButton}>
              <Ionicons name="chatbubble-ellipses" size={14} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Contact Client</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.category}>{item.task.category || 'N/A'}</Text>
      </View>
    </TouchableOpacity>
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'today';
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'Pending Review',
      'open': 'Open',
      'in-progress': 'In Progress',
      'review': 'Under Review',
      'accepted': 'Accepted',
      'rejected': 'Not Selected',
      'completed': 'Completed',
      'closed': 'Closed',
      'assigned': 'Assigned',
    };
    return statusMap[status?.toLowerCase()] || status || 'Unknown';
  };

  const getBidStatusText = (status) => {
    const statusMap = {
      'pending': 'Pending Review',
      'accepted': 'Accepted',
      'rejected': 'Rejected',
    };
    return statusMap[status?.toLowerCase()] || status || 'Unknown';
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'applications' ? "document-text-outline" : "pricetags-outline"} 
        size={64} 
        color="#CBD5E1" 
      />
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'applications' ? 'No Applications' : 'No Bids'}
      </Text>
      <Text style={styles.emptyStateText}>
        {activeTab === 'applications' 
          ? "You haven't applied to any tasks yet. Find opportunities that match your skills!"
          : "You haven't placed any bids yet. Explore open bidding tasks to get started!"
        }
      </Text>
      <TouchableOpacity 
        style={styles.findTasksButton}
        onPress={() => navigate('Available')}
      >
        <Text style={styles.findTasksText}>Find Tasks</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your activities...</Text>
      </View>
    );
  }

  const currentData = activeTab === 'applications' ? applications : bids;
  const isEmpty = currentData.length === 0;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>My Activities</Text>
            <Text style={styles.headerSubtitle}>Track your applications and bids</Text>
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applications' && styles.activeTab]}
          onPress={() => setActiveTab('applications')}
        >
          <Ionicons 
            name="document-text" 
            size={20} 
            color={activeTab === 'applications' ? '#6366F1' : '#64748B'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'applications' && styles.activeTabText
          ]}>
            Applications
          </Text>
          {applications.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{applications.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'bids' && styles.activeTab]}
          onPress={() => setActiveTab('bids')}
        >
          <Ionicons 
            name="pricetags" 
            size={20} 
            color={activeTab === 'bids' ? '#6366F1' : '#64748B'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'bids' && styles.activeTabText
          ]}>
            Bids
          </Text>
          {bids.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{bids.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isEmpty ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item._id || (item.task?._id + item.bid?._id)}
          renderItem={activeTab === 'applications' ? renderApplicationItem : renderBidItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabText: {
    color: '#6366F1',
  },
  tabBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  employerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employerName: {
    fontSize: 14,
    color: '#64748B',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#64748B',
  },
  budgetContainer: {
    alignItems: 'flex-end',
  },
  budget: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  yourBid: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  cardContent: {
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 20,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
  },
  bidDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  bidDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bidDetailText: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  pending: { backgroundColor: '#FEF3C7' },
  accepted: { backgroundColor: '#D1FAE5' },
  rejected: { backgroundColor: '#FEE2E2' },
  reviewing: { backgroundColor: '#E0E7FF' },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  bidStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  contactButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  findTasksButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  findTasksText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
});

export default MyApplicationsScreen;