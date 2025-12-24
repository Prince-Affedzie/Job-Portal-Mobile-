// screens/tasker/TaskerTasksScreen.js - PROFESSIONAL REDESIGN (FIXED VERSION)
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Dimensions,
  Animated,
  ScrollView,
  Platform,
  StatusBar,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { TaskerContext } from '../../context/TaskerContext';
import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';
import Header from '../../component/tasker/Header'; // Using your Header component
import LoadingIndicator from '../../component/common/LoadingIndicator';
import FilterModal from '../../component/tasker/FilterModal';
import PendingNoticeBanner from '../../component/tasker/TaskPendingNotice';

const { width, height } = Dimensions.get('window');

const TABS = {
  BIDS: 'bids',
  SERVICE_REQUESTS: 'service_requests'
};

const TaskerTasksScreen = () => {
  const [activeTab, setActiveTab] = useState(TABS.BIDS);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showPendingNotice, setShowPendingNotice] = useState(true);

  const { user } = useContext(AuthContext);
  const { 
    bids, 
    loading, 
    loadMyTasks,
    serviceRequests,
    loadTaskerServiceRequests   
  } = useContext(TaskerContext);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadMyTasks(),
        loadTaskerServiceRequests()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadData();
  };

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case TABS.BIDS:
        return bids || [];
      case TABS.SERVICE_REQUESTS:
        return serviceRequests || [];
      default:
        return [];
    }
  };

  // Calculate statistics for current tab
  const calculateStats = () => {
    const data = getCurrentData();
    const total = data.length;
    
    let accepted = 0;
    let pending = 0;
    let successRate = 0;

    switch (activeTab) {
      case TABS.BIDS:
        accepted = data.filter(bid => 
          bid.bid?.status?.toLowerCase() === 'accepted'
        ).length;
        pending = data.filter(bid => 
          bid.bid?.status?.toLowerCase() === 'pending'
        ).length;
        break;
      
      case TABS.SERVICE_REQUESTS:
        accepted = data.filter(request => 
          ['booked', 'in-progress', 'completed'].includes(request.status?.toLowerCase())
        ).length;
        pending = data.filter(request => 
          ['pending', 'quoted'].includes(request.status?.toLowerCase())
        ).length;
        break;
    }

    successRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    return { total, accepted, pending, successRate };
  };

  const stats = calculateStats();

  // Filter and search logic (keep existing)
  const getFilteredData = () => {
    let data = getCurrentData();
    
    if (searchQuery.trim()) {
      data = data.filter(item => {
        const searchableText = getSearchableText(item);
        return searchableText.includes(searchQuery.toLowerCase());
      });
    }

    if (selectedStatus !== 'all') {
      data = data.filter(item => {
        const status = getItemStatus(item);
        const normalizedDataStatus = status?.toLowerCase().replace(/-/g, '');
        const normalizedSelectedStatus = selectedStatus.toLowerCase().replace(/-/g, '');
        return normalizedDataStatus === normalizedSelectedStatus;
      });
    }

    if (selectedCategory !== 'all') {
      data = data.filter(item => {
        const category = getItemCategory(item);
        return category === selectedCategory;
      });
    }

    // Sort data
    data = [...data].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(getItemDate(b)) - new Date(getItemDate(a));
        case 'oldest':
          return new Date(getItemDate(a)) - new Date(getItemDate(b));
        case 'budget-high':
          return getItemBudget(b) - getItemBudget(a);
        case 'budget-low':
          return getItemBudget(a) - getItemBudget(b);
        default:
          return 0;
      }
    });

    return data;
  };

  // Helper functions for different data types
  const getSearchableText = (item) => {
    switch (activeTab) {
      case TABS.BIDS:
        return `${item.task?.title} ${item.task?.description} ${item.task?.category} ${item.task?.employer?.name} ${item.bid?.message}`.toLowerCase();
      case TABS.SERVICE_REQUESTS:
        return `${item.type} ${item.description} ${item.client?.name} ${item.requirements?.join(' ')}`.toLowerCase();
      default:
        return '';
    }
  };

  const getItemStatus = (item) => {
    switch (activeTab) {
      case TABS.BIDS:
        return item.bid?.status;
      case TABS.SERVICE_REQUESTS:
        return item.status;
      default:
        return '';
    }
  };

  const getItemCategory = (item) => {
    switch (activeTab) {
      case TABS.BIDS:
        return item.task?.category;
      case TABS.SERVICE_REQUESTS:
        return item.type;
      default:
        return '';
    }
  };

  const getItemDate = (item) => {
    switch (activeTab) {
      case TABS.BIDS:
        return item.bid?.createdAt;
      case TABS.SERVICE_REQUESTS:
        return item.createdAt;
      default:
        return new Date();
    }
  };

  const getItemBudget = (item) => {
    switch (activeTab) {
      case TABS.BIDS:
        return item.bid?.amount || 0;
      case TABS.SERVICE_REQUESTS:
        return item.budget || 0;
      default:
        return 0;
    }
  };

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSortBy('newest');
  }, []);

  const hasActiveFilters = searchQuery || selectedStatus !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest';

  const filteredData = getFilteredData();
  const isEmpty = filteredData.length === 0;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'completed':
      case 'booked':
        return '#10B981';
      case 'pending':
      case 'quoted':
        return '#F59E0B';
      case 'in-progress':
      case 'reviewing':
        return '#3B82F6';
      case 'declined':
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Redesigned TaskCard component
  const TaskCard = ({ item, type, onPress }) => {
    const isBid = type === TABS.BIDS;
    const task = isBid ? item.task : item;
    const bid = isBid ? item.bid : null;
    const status = getItemStatus(item);
    const statusColor = getStatusColor(status);

    return (
      <TouchableOpacity 
        style={styles.taskCard}
        activeOpacity={0.7}
        onPress={onPress}
      >
        {/* Top Section with Status and Type */}
        <View style={styles.taskCardHeader}>
          <View style={styles.typeBadge}>
            <MaterialIcons 
              name={isBid ? 'handshake' : 'assignment'} 
              size={16} 
              color="#6366F1" 
            />
            <Text style={styles.typeText}>
              {isBid ? 'Bid' : 'Service Request'}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{formatStatus(status)}</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.taskContent}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task?.title || item.type || 'Untitled Task'}
          </Text>
          
          {/* Client/Employer Info */}
          <View style={styles.clientRow}>
            <View style={styles.clientAvatar}>
              <MaterialIcons name="person" size={16} color="#6B7280" />
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>
                {task?.employer?.name || item.client?.name || 'Anonymous'}
              </Text>
              <Text style={styles.taskDate}>
                {formatDate(bid?.createdAt || item.createdAt)}
              </Text>
            </View>
          </View>

          {/* Task Description */}
          {task?.description && (
            <Text style={styles.taskDescription} numberOfLines={3}>
              {task.description}
            </Text>
          )}

          {/* Category and Budget */}
          <View style={styles.taskMeta}>
            <View style={styles.metaItem}>
              <MaterialIcons name="category" size={15} color="#6B7280" />
              <Text style={styles.metaText}>
                {getItemCategory(item) || 'Uncategorized'}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <MaterialIcons name="money" size={15} color="#6B7280" />
              <Text style={styles.metaText}>
               ₵ {getItemBudget(item).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={onPress}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleItemPress = (item) => {
    switch (activeTab) {
      case TABS.BIDS:
        navigate('BidDetails', { bidId: item.bid?._id });
        break;
      case TABS.SERVICE_REQUESTS:
        navigate('ServiceRequestDetail', { requestId: item._id });
        break;
    }
  };

  const renderHeader = () => (
    <Animated.View style={styles.headerContainer}>
      <LinearGradient
        colors={['#1A1F3B', '#2D1B69']}
        style={[StyleSheet.absoluteFill, { borderRadius: 34 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.headerContent}>
        <View>
          <Text style={styles.welcomeText}>Tasks you've applied and Offers Received from clients</Text>
        </View>
      </View>


      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {Object.entries(TABS).map(([key, value]) => {
          const tabConfig = {
            [TABS.BIDS]: { label: 'Bids', icon: 'handshake', count: bids.length },
            [TABS.SERVICE_REQUESTS]: { label: 'Received Offers', icon: 'assignment', count: serviceRequests.length },
          };
          
          const config = tabConfig[value];
          
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.tabButton,
                activeTab === value && styles.tabButtonActive
              ]}
              onPress={() => setActiveTab(value)}
            >
              <MaterialIcons 
                name={config.icon} 
                size={20} 
                color={activeTab === value ? '#4F46E5' : '#6B7280'} 
              />
              <Text style={[
                styles.tabLabel,
                activeTab === value && styles.tabLabelActive
              ]}>
                {config.label}
              </Text>
              {config.count > 0 && (
                <View style={[
                  styles.tabBadge,
                  activeTab === value && styles.tabBadgeActive
                ]}>
                  <Text style={styles.tabBadgeText}>{config.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab === TABS.BIDS ? 'bids' : 'requests'}...`}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setFilterOpen(true)}>
              <Ionicons name="filter" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
            <Ionicons name="close" size={14} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="assignment" size={80} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>
        {activeTab === TABS.BIDS ? 'No Bids Found' : 'No Service Requests'}
      </Text>
      <Text style={styles.emptyText}>
        {hasActiveFilters
          ? "Try adjusting your filters or search terms"
          : activeTab === TABS.BIDS
          ? "You haven't placed any bids yet"
          : "Service requests come from clients who discover your profile. Enhance your profile to attract more direct hiring opportunities."}
      </Text>
      
      {hasActiveFilters ? (
        <TouchableOpacity style={styles.emptyActionButton} onPress={clearAllFilters}>
          <Text style={styles.emptyActionText}>Clear All Filters</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.emptyActionButton}
          onPress={() => navigate('AvailableTasks')}
        >
          <Text style={styles.emptyActionText}>Browse Available Tasks</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderItem = ({ item }) => (
    <TaskCard 
      item={item} 
      type={activeTab} 
      onPress={() => handleItemPress(item)}
    />
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header title="My Tasks" />
        <LoadingIndicator text="Loading Tasks" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      {/* Your Header Component */}
      <Header title="My Tasks" />
      
      <Animated.ScrollView
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Main Header */}
        {renderHeader()}
        {showPendingNotice && (
       <PendingNoticeBanner
       onDismiss={() => setShowPendingNotice(false)}
     />
      )}
        
        {/* Tasks List */}
        <View style={styles.tasksContainer}>
          {filteredData.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                {activeTab === TABS.BIDS ? 'Your Bids' : 'Received Offers'}
                <Text style={styles.sectionCount}> • {filteredData.length}</Text>
              </Text>
              
              {filteredData.map((item, index) => (
                <View key={item._id || index}>
                  <TaskCard 
                    item={item} 
                    type={activeTab} 
                    onPress={() => handleItemPress(item)}
                  />
                  {index < filteredData.length - 1 && (
                    <View style={styles.taskDivider} />
                  )}
                </View>
              ))}
            </>
          ) : (
            renderEmptyState()
          )}
        </View>
        
        {/* Quick Stats Footer */}
        
      </Animated.ScrollView>
      
      {/* Filter Modal */}
      <FilterModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        selectedStatus={selectedStatus}
        selectedCategory={selectedCategory}
        sortBy={sortBy}
        onStatusChange={setSelectedStatus}
        onCategoryChange={setSelectedCategory}
        onSortChange={setSortBy}
        onClearFilters={clearAllFilters}
        activeTab={activeTab}
      />
      
      {/* FAB for Quick Actions */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigate('AvailableTasks')}
      >
        <LinearGradient
          colors={['#4F46E5', '#3730A3']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#4F46E5',
    overflow:'hidden',
    marginHorizontal:12,
    borderRadius:34,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 14,
    color: '#E0E7FF',
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: '#F5F3FF',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  tabLabelActive: {
    color: '#4F46E5',
  },
  tabBadge: {
    position: 'absolute',
    top: -2,
    left: 0,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    minWidth: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: '#4F46E5',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    padding: 0,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  tasksContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 16, // Proper padding for wide cards
    minHeight: 400,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  sectionCount: {
    color: '#6B7280',
    fontWeight: '400',
  },
  taskCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  taskContent: {
    padding: 16,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    lineHeight: 24,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  taskDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  taskDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  taskMeta: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
    flex: 1,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  taskDivider: {
    height: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  emptyActionButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  footerContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  footerGradient: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  footerStats: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerStat: {
    alignItems: 'center',
    flex: 1,
  },
  footerStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  footerStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  footerDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TaskerTasksScreen;