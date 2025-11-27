// screens/tasker/TaskerTasksScreen.js
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { TaskerContext } from '../../context/TaskerContext';
//import { ServiceRequestContext } from '../../context/ServiceRequestContext';
import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';
import Header from '../../component/tasker/Header';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import SearchBar from '../../component/tasker/SearchBar';
import StatsOverview from '../../component/tasker/StatsOverView';
import TabNavigation from '../../component/tasker/TabNavigation';
import FilterModal from '../../component/tasker/FilterModal';
import TaskCard from '../../component/tasker/TaskCard';
import EmptyState from '../../component/tasker/EmptyState';
import InfoBanner from '../../component/tasker/InfoBanner';

const { width } = Dimensions.get('window');

const TABS = {
  APPLICATIONS: 'applications',
  BIDS: 'bids',
  SERVICE_REQUESTS: 'service_requests'
};

const TaskerTasksScreen = () => {
  const [activeTab, setActiveTab] = useState(TABS.APPLICATIONS);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const { user } = useContext(AuthContext);
  const { 
    applications, 
    bids, 
    loading, 
    loadMyTasks,
    serviceRequests,
    loadTaskerServiceRequests   
  } = useContext(TaskerContext);
  
  

 

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
      case TABS.APPLICATIONS:
        return applications || [];
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
      case TABS.APPLICATIONS:
        accepted = data.filter(app => 
          ['assigned', 'completed', 'in-progress'].includes(app.status?.toLowerCase())
        ).length;
        pending = data.filter(app => 
          app.status?.toLowerCase() === 'open'
        ).length;
        break;
      
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

  // Filter and search logic
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
      case TABS.APPLICATIONS:
        return `${item.title} ${item.description} ${item.category} ${item.employer?.name}`.toLowerCase();
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
      case TABS.APPLICATIONS:
        return item.status;
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
      case TABS.APPLICATIONS:
        return item.category;
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
      case TABS.APPLICATIONS:
        return item.appliedAt;
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
      case TABS.APPLICATIONS:
        return item.budget || 0;
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

  const renderItem = ({ item }) => (
    <TaskCard 
      item={item} 
      type={activeTab} 
      onPress={() => handleItemPress(item)}
    />
  );

  const handleItemPress = (item) => {
    switch (activeTab) {
      case TABS.APPLICATIONS:
        navigate('AppliedTaskDetails', { taskId: item._id });
        break;
      case TABS.BIDS:
        navigate('AppliedTaskDetails', { taskId: item.task?._id });
        break;
      case TABS.SERVICE_REQUESTS:
        navigate('ServiceRequestDetail', { requestId: item._id });
        break;
    }
  };

  const renderHeader = () => (
    <View>

      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={TABS}
        counts={{
          [TABS.APPLICATIONS]: applications.length,
          [TABS.BIDS]: bids.length,
          [TABS.SERVICE_REQUESTS]: serviceRequests.length
        }}
      />

       <SearchBar
        activeTab={activeTab}
        initialQuery={searchQuery}
        onSearch={handleSearch}
        onOpenFilter={() => setFilterOpen(true)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
      />
      <StatsOverview stats={stats} activeTab={activeTab} />
      
     

      

      <InfoBanner 
        activeTab={activeTab}
        hasActiveFilters={hasActiveFilters}
        filteredCount={filteredData.length}
        totalCount={getCurrentData().length}
        onClearFilters={clearAllFilters}
      />
    </View>
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
    <View style={styles.container}>
      <Header title="My Tasks" />
      <FlatList
        data={isEmpty ? [] : filteredData}
        keyExtractor={(item) => item._id || (item.task?._id + item.bid?._id)}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
        ListEmptyComponent={
          <EmptyState
            activeTab={activeTab}
            hasOriginalData={getCurrentData().length > 0}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearAllFilters}
            onExploreTasks={() => navigate('AvailableTasks')}
          />
        }
        contentContainerStyle={[
          styles.listContainer,
          isEmpty && styles.listContainerEmpty
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
      />
      
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContainer: {
    paddingBottom: 20,
  },
  listContainerEmpty: {
    flexGrow: 1,
  },
  cardSeparator: {
    height: 12,
  },
});

export default TaskerTasksScreen;