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
  Platform,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { navigate } from '../../services/navigationService';
import { TaskerContext } from '../../context/TaskerContext';
import { getYourAppliedMiniTasks } from '../../api/miniTaskApi'
import Header from '../../component/tasker/Header';
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { width } = Dimensions.get('window');

const MyApplicationsScreen = () => {
  const [activeTab, setActiveTab] = useState('applications');
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const insets = useSafeAreaInsets();

  // Status options for filtering
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'review', label: 'Under Review' }
  ];

  // Category options (you can populate this from your data)
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'Home Services', label: 'Home Services' },
    { value: 'Delivery & Errands', label: 'Delivery & Errands' },
    { value: 'Digital Services', label: 'Digital Services' },
    { value: 'Writing & Assistance', label: 'Writing & Assistance' },
    { value: 'Learning & Tutoring', label: 'Learning & Tutoring' },
    { value: 'Creative Tasks', label: 'Creative Tasks' },
    { value: 'Event Support', label: 'Event Support' },
    { value: 'Others', label: 'Others' }
  ];

  // Sort options
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'budget-high', label: 'Budget: High to Low' },
    { value: 'budget-low', label: 'Budget: Low to High' }
  ];

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

  // Filter and search logic
  const getFilteredData = () => {
    let data = activeTab === 'applications' ? applications : bids;
    
    // Apply search filter
    if (searchQuery.trim()) {
      data = data.filter(item => {
        const searchableText = activeTab === 'applications' 
          ? `${item.title} ${item.description} ${item.category} ${item.employer?.name}`.toLowerCase()
          : `${item.task.title} ${item.task.description} ${item.task.category} ${item.task.employer?.name} ${item.bid.message}`.toLowerCase();
        
        return searchableText.includes(searchQuery.toLowerCase());
      });
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
    data = data.filter(item => {
    const status = activeTab === 'applications' ? item.status : item.bid.status;
    
    // Normalize both the data status and selected status for comparison
    const normalizedDataStatus = status?.toLowerCase().replace(/-/g, '');
    const normalizedSelectedStatus = selectedStatus.toLowerCase().replace(/-/g, '');
    return normalizedDataStatus === normalizedSelectedStatus;
  });
}

    // Apply category filter
    if (selectedCategory !== 'all') {
      data = data.filter(item => {
        const category = activeTab === 'applications' ? item.category : item.task.category;
        console.log(category)
        return category === selectedCategory;
      });
    }

    // Apply sorting
    data = [...data].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          const dateA = activeTab === 'applications' ? new Date(a.appliedAt) : new Date(a.bid.createdAt);
          const dateB = activeTab === 'applications' ? new Date(b.appliedAt) : new Date(b.bid.createdAt);
          return dateB - dateA;
        
        case 'oldest':
          const dateAOld = activeTab === 'applications' ? new Date(a.appliedAt) : new Date(a.bid.createdAt);
          const dateBOld = activeTab === 'applications' ? new Date(b.appliedAt) : new Date(b.bid.createdAt);
          return dateAOld - dateBOld;
        
        case 'budget-high':
          const budgetA = activeTab === 'applications' ? a.budget : a.bid.amount;
          const budgetB = activeTab === 'applications' ? b.budget : b.bid.amount;
          return budgetB - budgetA;
        
        case 'budget-low':
          const budgetALow = activeTab === 'applications' ? a.budget : a.bid.amount;
          const budgetBLow = activeTab === 'applications' ? b.budget : b.bid.amount;
          return budgetALow - budgetBLow;
        
        default:
          return 0;
      }
    });

    return data;
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchQuery || selectedStatus !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest';
    

  const renderApplicationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigate('AppliedTaskDetails', { taskId: item._id })}
      activeOpacity={0.7}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.employerRow}>
            <View style={styles.employerContainer}>
              <View style={styles.employerAvatar}>
                <Text style={styles.employerInitial}>
                  {(item.employer?.name || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.employerName}>
                  {item.employer?.name || 'Unknown Employer'}
                </Text>
                {item.employer?.rating && (
                  <View style={styles.rating}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {parseFloat(item.employer.rating).toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.budgetContainer}>
          <Text style={styles.budgetLabel}>Budget</Text>
          <Text style={styles.budget}>₵{item.budget || '0'}</Text>
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        <Text style={styles.description} numberOfLines={3}>
          {item.description || 'No description provided'}
        </Text>
      </View>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>
              Applied {formatDate(item.appliedAt)}
            </Text>
          </View>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{item.category || 'General'}</Text>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <StatusBadge status={item.status} />
          <TouchableOpacity style={styles.viewButton}>
            <Ionicons name="arrow-forward" size={14} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderBidItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigate('AppliedTaskDetails', { taskId: item.task._id })}
      activeOpacity={0.7}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {item.task.title}
          </Text>
          <View style={styles.employerRow}>
            <View style={styles.employerContainer}>
              <View style={styles.employerAvatar}>
                <Text style={styles.employerInitial}>
                  {(item.task.employer?.name || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.employerName}>
                  {item.task.employer?.name || 'Unknown Employer'}
                </Text>
                {item.task.employer?.rating && (
                  <View style={styles.rating}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {parseFloat(item.task.employer.rating).toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.budgetContainer}>
          <Text style={styles.budgetLabel}>Your Bid</Text>
          <Text style={styles.bidAmount}>₵{item.bid.amount}</Text>
        </View>
      </View>

      {/* Bid Message */}
      <View style={styles.bidMessage}>
        <Text style={styles.bidMessageText} numberOfLines={3}>
          {item.bid.message || 'No message provided'}
        </Text>
      </View>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>
              Bid placed {formatDate(item.bid.createdAt)}
            </Text>
          </View>
          {item.bid.timeline && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{item.bid.timeline}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.statusRow}>
          <BidStatusBadge status={item.bid.status} />
          {item.bid.status === 'accepted' && (
            <TouchableOpacity style={styles.chatButton}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#4F46E5" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const StatusBadge = ({ status }) => {
    const getStatusConfig = (status) => {
      const configs = {
        'pending': { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
        'open': { bg: '#DBEAFE', text: '#1E40AF', label: 'Open' },
        'in-progress': { bg: '#E0E7FF', text: '#5B21B6', label: 'In Progress' },
        'review': { bg: '#FEF3C7', text: '#92400E', label: 'Under Review' },
        'accepted': { bg: '#D1FAE5', text: '#065F46', label: 'Accepted' },
        'rejected': { bg: '#FEE2E2', text: '#991B1B', label: 'Not Selected' },
        'completed': { bg: '#D1FAE5', text: '#065F46', label: 'Completed' },
        'closed': { bg: '#F3F4F6', text: '#374151', label: 'Closed' },
        'assigned': { bg: '#E0E7FF', text: '#3730A3', label: 'Assigned' },
      };
      
      return configs[status?.toLowerCase()] || { 
        bg: '#F3F4F6', 
        text: '#6B7280', 
        label: status || 'Unknown' 
      };
    };

    const config = getStatusConfig(status);

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Text style={[styles.statusText, { color: config.text }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const BidStatusBadge = ({ status }) => {
    const getStatusConfig = (status) => {
      const configs = {
        'pending': { bg: '#FEF3C7', text: '#92400E', label: 'Pending Review' },
        'accepted': { bg: '#D1FAE5', text: '#065F46', label: 'Accepted' },
        'rejected': { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' },
      };
      
      return configs[status?.toLowerCase()] || { 
        bg: '#F3F4F6', 
        text: '#6B7280', 
        label: status || 'Unknown' 
      };
    };

    const config = getStatusConfig(status);

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Text style={[styles.statusText, { color: config.text }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      
      if (diffHours < 1) return 'just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const renderEmptyState = () => {
    const filteredData = getFilteredData();
    const hasOriginalData = activeTab === 'applications' ? applications.length > 0 : bids.length > 0;
    
    if (hasOriginalData && filteredData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyMessage}>
            Try adjusting your search terms or filters to find what you're looking for.
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={clearAllFilters}
          >
            <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
            <Text style={styles.exploreButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons 
            name={activeTab === 'applications' ? "document-text-outline" : "pricetags-outline"} 
            size={48} 
            color="#9CA3AF" 
          />
        </View>
        <Text style={styles.emptyTitle}>
          {activeTab === 'applications' ? 'No Applications Yet' : 'No Bids Placed'}
        </Text>
        <Text style={styles.emptyMessage}>
          {activeTab === 'applications' 
            ? "Start by exploring available tasks that match your skills and interests."
            : "Browse open bidding tasks and submit your proposals to get started."
          }
        </Text>
        <TouchableOpacity 
          style={styles.exploreButton}
          onPress={() => navigate('Available')}
        >
          <Ionicons name="search-outline" size={16} color="#FFFFFF" />
          <Text style={styles.exploreButtonText}>Explore Tasks</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const FilterModal = () => (
    <Modal
      visible={filterOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setFilterOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter & Sort</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setFilterOpen(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptions}>
                {statusOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      selectedStatus === option.value && styles.filterOptionActive
                    ]}
                    onPress={() => setSelectedStatus(option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedStatus === option.value && styles.filterOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Category</Text>
              <View style={styles.filterOptions}>
                {categoryOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      selectedCategory === option.value && styles.filterOptionActive
                    ]}
                    onPress={() => setSelectedCategory(option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedCategory === option.value && styles.filterOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterOptions}>
                {sortOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      sortBy === option.value && styles.filterOptionActive
                    ]}
                    onPress={() => setSortBy(option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      sortBy === option.value && styles.filterOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearAllFilters}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setFilterOpen(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  const headerActions = () => (  
    <View style={styles.headerActions}>
      {/* Search Bar */}
      {searchOpen ? (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          <TouchableOpacity 
            style={styles.searchCloseButton}
            onPress={() => {
              setSearchOpen(false);
              setSearchQuery('');
            }}
          >
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {hasActiveFilters && (
            <TouchableOpacity 
              style={styles.activeFiltersBadge}
              onPress={clearAllFilters}
            >
              <Ionicons name="funnel" size={16} color="#FFFFFF" />
              <Text style={styles.activeFiltersText}>Filtered</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setFilterOpen(true)}
          >
            <Ionicons name="options-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => setSearchOpen(true)}
          >
            <Ionicons name="search-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  if (loading) {
    return (
      <LoadingIndicator text='Loading Tasks'/>
    );
  }

  const filteredData = getFilteredData();
  const isEmpty = filteredData.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header title="My Tasks" rightComponent={headerActions()} />
      
      {/* Filter Modal */}
      <FilterModal />
     

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            styles.tabDivider,
            activeTab === 'applications' && styles.activeTab,
            activeTab === 'applications' && styles.activeTabShadow
          ]}
          onPress={() => setActiveTab('applications')}
        >
          <View style={styles.tabContent}>
            <View style={[
              styles.tabIconContainer,
              activeTab === 'applications' && styles.activeTabIconContainer
            ]}>
              <Ionicons 
                name={activeTab === 'applications' ? "document-text" : "document-text-outline"} 
                size={22} 
                color={activeTab === 'applications' ? '#FFFFFF' : '#6B7280'} 
              />
            </View>
            <Text style={[
              styles.tabText,
              activeTab === 'applications' && styles.activeTabText
            ]}>
              Applications
            </Text>
          </View>
          {applications.length > 0 && (
            <View style={[
              styles.tabBadge,
              activeTab === 'applications' && styles.activeTabBadge
            ]}>
              <Text style={styles.tabBadgeText}>{applications.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'bids' && styles.activeTab,
            activeTab === 'bids' && styles.activeTabShadow
          ]}
          onPress={() => setActiveTab('bids')}
        >
          <View style={styles.tabContent}>
            <View style={[
              styles.tabIconContainer,
              activeTab === 'bids' && styles.activeTabIconContainer
            ]}>
              <Ionicons 
                name={activeTab === 'bids' ? "pricetags" : "pricetags-outline"} 
                size={22} 
                color={activeTab === 'bids' ? '#FFFFFF' : '#6B7280'} 
              />
            </View>
            <Text style={[
              styles.tabText,
              activeTab === 'bids' && styles.activeTabText
            ]}>
              Bids
            </Text>
          </View>
          {bids.length > 0 && (
            <View style={[
              styles.tabBadge,
              activeTab === 'bids' && styles.activeTabBadge
            ]}>
              <Text style={styles.tabBadgeText}>{bids.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.infoBanner}>
      <View style={styles.infoHeader}>
    
        <Text style={styles.infoTitle}>Task Visibility</Text>
      </View>
      <Text style={styles.infoText}>
       
        Tasks assigned to other taskers won't appear here even if you applied to...
      </Text>
    </View>

      {/* Active Filters Info */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersInfo}>
          <Text style={styles.activeFiltersInfoText}>
            Showing {filteredData.length} of {activeTab === 'applications' ? applications.length : bids.length} {activeTab}
            {searchQuery && ` for "${searchQuery}"`}
          </Text>
        </View>
      )}

      {/* Content */}
      {isEmpty ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id || (item.task?._id + item.bid?._id)}
          renderItem={activeTab === 'applications' ? renderApplicationItem : renderBidItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#1A1F3B',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 0 : 35,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop:10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFF',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  infoBanner: {
    backgroundColor: '#F8FAFF',
    marginHorizontal: 20,
    marginTop: 4,
    padding: 4,
    borderRadius: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
 tabContainer: {
  flexDirection: 'row',
  backgroundColor: 'transparent',
  marginHorizontal: 20,
  marginTop: 16,
  marginBottom: 8,
  borderRadius: 0,
  padding: 0,
  justifyContent: 'flex-start',
  gap: 10,
},
tab: {
  flex: 1,
  paddingVertical: 12,
  paddingHorizontal: 8,
  position: 'relative',
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: '#E2E8F0',
  borderRadius: 20,
},
activeTab: {
  backgroundColor: '#6366F1',
    borderColor: '#6366F1',
},
tabBackground: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
},
tabContent: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
tabText: {
  fontSize: 15,
  fontWeight: '500',
  color: '#6B7280',
  letterSpacing: -0.2,
},
activeTabText: {
  color: '#FFFF',
  fontWeight: '600',
},
tabBadge: {
  position: 'absolute',
  top: -8,
  right: -8,
  backgroundColor: '#EF4444',
  borderRadius: 10,
  minWidth: 18,
  height: 18,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 4,
  borderWidth: 1.5,
  borderColor: '#FFFFFF',
},
activeTabBadge: {
  backgroundColor: '#DC2626',
},
tabBadgeText: {
  color: '#FFFFFF',
  fontSize: 10,
  fontWeight: '700',
},
tabUnderline: {
  position: 'absolute',
  bottom: 0,
  left: '20%',
  right: '20%',
  height: 3,
  backgroundColor: 'transparent',
  borderRadius: 3,
  transform: [{ scaleX: 0 }],
  transition: 'all 0.3s ease',
},
activeTabUnderline: {
  backgroundColor: '#4F46E5',
  transform: [{ scaleX: 1 }],
},
  listContainer: {
    padding: 20,
  },
  separator: {
    height: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taskInfo: {
    flex: 1,
    marginRight: 16,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 12,
  },
  employerRow: {
    marginTop: 4,
  },
  employerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  employerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  employerInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  employerName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  budgetContainer: {
    alignItems: 'flex-end',
  },
  budgetLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  budget: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  cardContent: {
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  bidMessage: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
  },
  bidMessageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaInfo: {
    flex: 1,
    gap: 8,
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
  categoryTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  paddingHorizontal: 8,
  paddingVertical: 6,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  width: 230, // Fixed width instead of flex: 1
  maxWidth: 230, // Ensure it doesn't grow beyond this
},
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingVertical: 4,
  },
  searchCloseButton: {
    padding: 4,
  },
  activeFiltersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeFiltersText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  activeFiltersInfo: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#C7D2FE',
  },
  activeFiltersInfoText: {
    color: '#3730A3',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterOptionActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default MyApplicationsScreen;