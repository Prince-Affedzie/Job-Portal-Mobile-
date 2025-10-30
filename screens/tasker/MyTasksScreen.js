import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient'
import { navigate } from '../../services/navigationService';
import { TaskerContext } from '../../context/TaskerContext';
import { getYourAppliedMiniTasks } from '../../api/miniTaskApi';
import Header from '../../component/tasker/Header';
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { width } = Dimensions.get('window');

// Search Component
const SearchBar = ({
  activeTab,
  initialQuery = '',
  onSearch,
  onOpenFilter,
  hasActiveFilters,
  onClearFilters
}) => {
  const [localQuery, setLocalQuery] = React.useState(initialQuery);
  const searchInputRef = React.useRef(null);

  React.useEffect(() => {
    setLocalQuery(initialQuery);
  }, [initialQuery]);

  const handleSearch = () => {
    onSearch?.(localQuery.trim());
    searchInputRef.current?.blur();
  };

  const handleClearSearch = () => {
    setLocalQuery('');
    onSearch?.('');
  };

  return (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchInputWrapper}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder={`Search ${activeTab}...`}
          placeholderTextColor="#9CA3AF"
          value={localQuery}
          onChangeText={setLocalQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {localQuery ? (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity 
        style={[
          styles.filterButton,
          hasActiveFilters && styles.filterButtonActive
        ]} 
        onPress={onOpenFilter}
      >
        <Ionicons 
          name="options-outline" 
          size={22} 
          color={hasActiveFilters ? "#FFFFFF" : "#6B7280"} 
        />
        {hasActiveFilters && <View style={styles.filterDot} />}
      </TouchableOpacity>
    </View>
  );
};

const MyApplicationsScreen = () => {
  const [activeTab, setActiveTab] = useState('applications');
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const insets = useSafeAreaInsets();

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'review', label: 'Under Review' }
  ];

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

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Calculate statistics
  const calculateStats = () => {
    const data = activeTab === 'applications' ? applications : bids;
    const total = data.length;
    
    const accepted = activeTab === 'applications' 
      ? applications.filter(app => 
          app.status?.toLowerCase() === 'assigned' || 
          app.status?.toLowerCase() === 'completed' ||
          app.status?.toLowerCase() === 'in-progress'
        ).length
      : bids.filter(bid => bid.bid.status?.toLowerCase() === 'accepted').length;
    
    const pending = activeTab === 'applications'
      ? applications.filter(app => 
          app.status?.toLowerCase() === 'open' 
        ).length
      : bids.filter(bid => bid.bid.status?.toLowerCase() === 'pending').length;

    const successRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    return { total, accepted, pending, successRate };
  };

  const stats = calculateStats();

  // Filter and search logic
  const getFilteredData = () => {
    let data = activeTab === 'applications' ? applications : bids;
    
    if (searchQuery.trim()) {
      data = data.filter(item => {
        const searchableText = activeTab === 'applications' 
          ? `${item.title} ${item.description} ${item.category} ${item.employer?.name}`.toLowerCase()
          : `${item.task.title} ${item.task.description} ${item.task.category} ${item.task.employer?.name} ${item.bid.message}`.toLowerCase();
        
        return searchableText.includes(searchQuery.toLowerCase());
      });
    }

    if (selectedStatus !== 'all') {
      data = data.filter(item => {
        const status = activeTab === 'applications' ? item.status : item.bid.status;
        const normalizedDataStatus = status?.toLowerCase().replace(/-/g, '');
        const normalizedSelectedStatus = selectedStatus.toLowerCase().replace(/-/g, '');
        return normalizedDataStatus === normalizedSelectedStatus;
      });
    }

    if (selectedCategory !== 'all') {
      data = data.filter(item => {
        const category = activeTab === 'applications' ? item.category : item.task.category;
        return category === selectedCategory;
      });
    }

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

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSortBy('newest');
  }, []);

  const hasActiveFilters = searchQuery || selectedStatus !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest';

  const renderApplicationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigate('AppliedTaskDetails', { taskId: item._id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.employerInfo}>
            <Text style={styles.employerName} numberOfLines={1}>
              {item.employer?.name || 'Unknown Employer'}
            </Text>
            {item.employer?.rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {parseFloat(item.employer.rating).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.budgetBadge}>
          <Text style={styles.budgetAmount}>₵{item.budget || '0'}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description || 'No description provided'}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{item.category || 'General'}</Text>
          </View>
          <Text style={styles.timeText}>
            {formatDate(item.appliedAt)}
          </Text>
        </View>
        
        <StatusBadge status={item.status} />
      </View>
    </TouchableOpacity>
  );

  const renderBidItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigate('AppliedTaskDetails', { taskId: item.task._id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {item.task.title}
          </Text>
          <View style={styles.employerInfo}>
            <Text style={styles.employerName} numberOfLines={1}>
              {item.task.employer?.name || 'Unknown Employer'}
            </Text>
            {item.task.employer?.rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {parseFloat(item.task.employer.rating).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={[styles.budgetBadge, styles.bidBadge]}>
          <Text style={styles.bidAmount}>₵{item.bid.amount}</Text>
        </View>
      </View>

      <View style={styles.bidMessageBox}>
        <Text style={styles.bidMessageText} numberOfLines={2}>
          {item.bid.message || 'No message provided'}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{item.task.category || 'General'}</Text>
          </View>
          <Text style={styles.timeText}>
            {formatDate(item.bid.createdAt)}
          </Text>
        </View>
        
        <BidStatusBadge status={item.bid.status} />
      </View>
    </TouchableOpacity>
  );

  const StatusBadge = ({ status }) => {
    const getStatusConfig = (status) => {
      const configs = {
        'pending': { bg: '#FEF3C7', text: '#92400E', label: 'Pending', icon: 'time-outline' },
        'open': { bg: '#DBEAFE', text: '#1E40AF', label: 'Open', icon: 'lock-open-outline' },
        'in-progress': { bg: '#E0E7FF', text: '#4338CA', label: 'In Progress', icon: 'play-circle-outline' },
        'review': { bg: '#FEF3C7', text: '#92400E', label: 'Review', icon: 'eye-outline' },
        'accepted': { bg: '#D1FAE5', text: '#065F46', label: 'Accepted', icon: 'checkmark-circle' },
        'rejected': { bg: '#FEE2E2', text: '#991B1B', label: 'Not Selected', icon: 'close-circle-outline' },
        'completed': { bg: '#D1FAE5', text: '#065F46', label: 'Completed', icon: 'checkmark-done-circle' },
        'closed': { bg: '#F3F4F6', text: '#374151', label: 'Closed', icon: 'lock-closed-outline' },
        'assigned': { bg: '#E0E7FF', text: '#3730A3', label: 'Assigned', icon: 'person-circle-outline' },
      };
      
      return configs[status?.toLowerCase()] || { 
        bg: '#F3F4F6', 
        text: '#6B7280', 
        label: status || 'Unknown',
        icon: 'help-circle-outline'
      };
    };

    const config = getStatusConfig(status);

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={13} color={config.text} />
        <Text style={[styles.statusText, { color: config.text }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const BidStatusBadge = ({ status }) => {
    const getStatusConfig = (status) => {
      const configs = {
        'pending': { bg: '#FEF3C7', text: '#92400E', label: 'Pending', icon: 'time-outline' },
        'accepted': { bg: '#D1FAE5', text: '#065F46', label: 'Accepted', icon: 'checkmark-circle' },
        'rejected': { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected', icon: 'close-circle-outline' },
      };
      
      return configs[status?.toLowerCase()] || { 
        bg: '#F3F4F6', 
        text: '#6B7280', 
        label: status || 'Unknown',
        icon: 'help-circle-outline'
      };
    };

    const config = getStatusConfig(status);

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={13} color={config.text} />
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
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
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
          <View style={styles.emptyIconContainer}>
            <Ionicons name="search-outline" size={56} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyMessage}>
            Try adjusting your search or filters to find what you're looking for.
          </Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={clearAllFilters}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons 
            name={activeTab === 'applications' ? "document-text-outline" : "pricetags-outline"} 
            size={56} 
            color="#D1D5DB" 
          />
        </View>
        <Text style={styles.emptyTitle}>
          {activeTab === 'applications' ? 'No Applications Yet' : 'No Bids Placed'}
        </Text>
        <Text style={styles.emptyMessage}>
          {activeTab === 'applications' 
            ? "Explore available tasks and apply to ones that match your skills."
            : "Browse open bidding tasks and submit your proposals to get started."
          }
        </Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigate('AvailableTasks')}
        >
          <Ionicons name="compass-outline" size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Explore Tasks</Text>
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
            <Text style={styles.modalTitle}>Filters & Sort</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setFilterOpen(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterChips}>
                {statusOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      selectedStatus === option.value && styles.chipActive
                    ]}
                    onPress={() => setSelectedStatus(option.value)}
                  >
                    <Text style={[
                      styles.chipText,
                      selectedStatus === option.value && styles.chipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.filterChips}>
                {categoryOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      selectedCategory === option.value && styles.chipActive
                    ]}
                    onPress={() => setSelectedCategory(option.value)}
                  >
                    <Text style={[
                      styles.chipText,
                      selectedCategory === option.value && styles.chipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.filterChips}>
                {sortOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      sortBy === option.value && styles.chipActive
                    ]}
                    onPress={() => setSortBy(option.value)}
                  >
                    <Text style={[
                      styles.chipText,
                      sortBy === option.value && styles.chipTextActive
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
              style={styles.secondaryButton}
              onPress={clearAllFilters}
            >
              <Text style={styles.secondaryButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setFilterOpen(false)}
            >
              <Text style={styles.primaryButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <View>
      {/* Stats Section */}
  <View style={styles.statsSection}>
  <View style={styles.statsHeader}>
    <Text style={styles.statsTitle}>Overview</Text>
    <Text style={styles.statsSubtitle}>
      {activeTab === 'applications' ? 'Applications' : 'Bids'} Performance
    </Text>
  </View>

  <SearchBar
        activeTab={activeTab}
        initialQuery={searchQuery}
        onSearch={handleSearch}
        onOpenFilter={() => setFilterOpen(true)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
      />
  
  <View style={styles.statsGrid}>

    <LinearGradient
       colors={['#EFF6FF', '#DBEAFE']}
       
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }} style={[styles.statCard, styles.statCardPrimary]}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconContainer, styles.statIconPrimary]}>
          <Ionicons name="layers-outline" size={20} color="#4F46E5" />
        </View>
        <Text style={styles.statValue}>{stats.total}</Text>
      </View>
      <Text style={styles.statLabel}>Total</Text>
     {/* <View style={styles.statProgress}>
        <View style={[styles.progressBar, styles.progressBarTotal]}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${Math.min(100, (stats.total / Math.max(stats.total, 1)) * 100)}%` }
            ]} 
          />
        </View>
      </View>*/}
    </LinearGradient>
    

    <LinearGradient
       colors={['#F0FDF4', '#DCFCE7']}        
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} style={[styles.statCard, styles.statCardSuccess]}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconContainer, styles.statIconSuccess]}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
        </View>
        <Text style={styles.statValue}>{stats.accepted}</Text>
      </View>
      <Text style={styles.statLabel}>Accepted</Text>
      <View style={styles.statProgress}>
        {/*<View style={[styles.progressBar, styles.progressBarSuccess]}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0}%` }
            ]} 
          />
        </View>*/}
        <Text style={styles.statPercentage}>
          {stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0}%
        </Text>
      </View>
    </LinearGradient>

    <LinearGradient
       colors={['#FFFBEB', '#FEFCE8']}                              
       start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} style={[styles.statCard, styles.statCardWarning]}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconContainer, styles.statIconWarning]}>
          <Ionicons name="time-outline" size={18} color="#CA8A04" />
        </View>
        <Text style={styles.statValue}>{stats.pending}</Text>
      </View>
      <Text style={styles.statLabel}>Pending</Text>
      <View style={styles.statProgress}>
        {/*<View style={[styles.progressBar, styles.progressBarWarning]}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }
            ]} 
          />
        </View>*/}
        <Text style={styles.statPercentage}>
          {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%
        </Text>
      </View>
    </LinearGradient>

    <View style={[styles.statCard, styles.statCardInfo]}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconContainer, styles.statIconInfo]}>
          <Ionicons name="trending-up" size={18} color="#7C3AED" />
        </View>
        <Text style={styles.statValue}>{stats.successRate}%</Text>
      </View>
      <Text style={styles.statLabel}>Success Rate</Text>
      <View style={styles.statProgress}>
       {/* <View style={[styles.progressBar, styles.progressBarInfo]}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${stats.successRate}%` }
            ]} 
          />
        </View>*/}
        <View style={styles.rateTrend}>
          <Ionicons 
            name={stats.successRate >= 50 ? "arrow-up" : "arrow-down"} 
            size={12} 
            color={stats.successRate >= 50 ? "#16A34A" : "#DC2626"} 
          />
          <Text style={[
            styles.trendText,
            { color: stats.successRate >= 50 ? "#16A34A" : "#DC2626" }
          ]}>
            {stats.successRate >= 50 ? "Good" : "Needs work"}
          </Text>
        </View>
      </View>
    </View>
  </View>
</View>
      {/* Tabs */} 
<View style={styles.tabsContainer}>
  <View style={styles.tabsBackground}>
    <TouchableOpacity
      style={[
        styles.tab,
        activeTab === 'applications' && styles.tabActive
      ]}
      onPress={() => setActiveTab('applications')}
    >
      <View style={styles.tabContent}>
        <View style={[
          styles.tabIconContainer,
          activeTab === 'applications' && styles.tabIconContainerActive
        ]}>
          <Ionicons 
            name={activeTab === 'applications' ? "document-text" : "document-text-outline"} 
            size={20} 
            color={activeTab === 'applications' ? '#FFFFFF' : '#6B7280'} 
          />
        </View>
        <Text style={[
          styles.tabLabel,
          activeTab === 'applications' && styles.tabLabelActive
        ]}>
          Applications
        </Text>
        {applications.length > 0 && (
          <View style={[
            styles.tabCount,
            activeTab === 'applications' && styles.tabCountActive
          ]}>
            <Text style={[
              styles.tabCountText,
              activeTab === 'applications' && styles.tabCountTextActive
            ]}>
              {applications.length}
            </Text>
          </View>
        )}
      </View>
      {activeTab === 'applications' && <View style={styles.activeTabIndicator} />}
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.tab,
        activeTab === 'bids' && styles.tabActive
      ]}
      onPress={() => setActiveTab('bids')}
    >
      <View style={styles.tabContent}>
        <View style={[
          styles.tabIconContainer,
          activeTab === 'bids' && styles.tabIconContainerActive
        ]}>
          <Ionicons 
            name={activeTab === 'bids' ? "pricetags" : "pricetags-outline"} 
            size={20} 
            color={activeTab === 'bids' ? '#FFFFFF' : '#6B7280'} 
          />
        </View>
        <Text style={[
          styles.tabLabel,
          activeTab === 'bids' && styles.tabLabelActive
        ]}>
          Bids
        </Text>
        {bids.length > 0 && (
          <View style={[
            styles.tabCount,
            activeTab === 'bids' && styles.tabCountActive
          ]}>
            <Text style={[
              styles.tabCountText,
              activeTab === 'bids' && styles.tabCountTextActive
            ]}>
              {bids.length}
            </Text>
          </View>
        )}
      </View>
      {activeTab === 'bids' && <View style={styles.activeTabIndicator} />}
    </TouchableOpacity>
  </View>
</View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color="#0EA5E9" />
        <Text style={styles.infoText}>
          Tasks assigned to others won't appear here even if you applied
        </Text>
      </View>

      {/* Active Filters Info */}
      {hasActiveFilters && (
        <View style={styles.filterInfoBanner}>
          <Text style={styles.filterInfoText}>
            Showing {getFilteredData().length} of {activeTab === 'applications' ? applications.length : bids.length}
          </Text>
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="My Tasks" />
        <LoadingIndicator text="Loading Tasks" />
      </View>
    );
  }

  const filteredData = getFilteredData();
  const isEmpty = filteredData.length === 0;

  return (
    <View style={styles.container}>
      <Header title="My Tasks" />
      <FlatList
        data={isEmpty ? [] : filteredData}
        keyExtractor={(item) => item._id || (item.task?._id + item.bid?._id)}
        renderItem={activeTab === 'applications' ? renderApplicationItem : renderBidItem}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
        ListEmptyComponent={isEmpty ? renderEmptyState() : null}
        contentContainerStyle={[
          styles.listContainer,
          isEmpty && styles.listContainerEmpty
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
      />
      <FilterModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 1,
    marginVertical:10,
    backgroundColor: '#FFFFFF',
    gap: 10,
    borderColor:'#F3F4F6',
    marginHorizontal:6,
    borderRadius:12,
    borderBottomWidth: 4,
    borderBottomColor: '#F3F4F6',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: '#111827',
  },
  clearSearchButton: {
    padding: 4,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#4F46E5',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Stats Section
 // Enhanced Stats Section Styles
statsSection: {
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 16,
  paddingVertical: 20,
  borderBottomWidth: 1,
  borderBottomColor: '#F3F4F6',
},
statsHeader: {
  marginBottom: 16,
},
statsTitle: {
  fontSize: 24,
  fontWeight: '800',
  color: '#111827',
  marginBottom: 4,
},
statsSubtitle: {
  fontSize: 14,
  color: '#6B7280',
  fontWeight: '500',
},
statsGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
},
statCard: {
  flex: 1,
  minWidth: '47%',
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
  borderWidth: 1,
  borderColor: '#F3F4F6',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 3,
},
statCardPrimary: {
  borderLeftWidth: 4,
  borderLeftColor: '#4F46E5',
},
statCardSuccess: {
  borderLeftWidth: 4,
  borderLeftColor: '#16A34A',
},
statCardWarning: {
  borderLeftWidth: 4,
  borderLeftColor: '#CA8A04',
},
statCardInfo: {
  borderLeftWidth: 4,
  borderLeftColor: '#7C3AED',
},
statTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 8,
},
statIconContainer: {
  width: 40,
  height: 40,
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
},
statIconPrimary: {
  backgroundColor: '#EEF2FF',
},
statIconSuccess: {
  backgroundColor: '#DCFCE7',
},
statIconWarning: {
  backgroundColor: '#FEF9C3',
},
statIconInfo: {
  backgroundColor: '#F3E8FF',
},
statValue: {
  fontSize: 24,
  fontWeight: '800',
  color: '#111827',
  textAlign: 'right',
},
statLabel: {
  fontSize: 13,
  color: '#6B7280',
  fontWeight: '600',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
statProgress: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
progressBar: {
  flex: 1,
  height: 6,
  backgroundColor: '#F3F4F6',
  borderRadius: 3,
  overflow: 'hidden',
},
progressBarTotal: {
  backgroundColor: '#E5E7EB',
},
progressBarSuccess: {
  backgroundColor: '#D1FAE5',
},
progressBarWarning: {
  backgroundColor: '#FEF3C7',
},
progressBarInfo: {
  backgroundColor: '#EDE9FE',
},
progressFill: {
  height: '100%',
  borderRadius: 3,
  backgroundColor: '#4F46E5',
},
statPercentage: {
  fontSize: 11,
  fontWeight: '700',
  color: '#374151',
  minWidth: 30,
  textAlign: 'right',
},
rateTrend: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
},
trendText: {
  fontSize: 11,
  fontWeight: '600',
},
  // Tabs
 // Enhanced Tabs Styles
tabsContainer: {
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 16,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#F3F4F6',
},
tabsBackground: {
  flexDirection: 'row',
  backgroundColor: '#F8FAFC',
  borderRadius: 16,
  padding: 6,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
},
tab: {
  flex: 1,
  paddingVertical: 12,
  paddingHorizontal: 8,
  borderRadius: 12,
  position: 'relative',
  backgroundColor: 'transparent',
  borderWidth: 2,
  borderColor: 'transparent',
},
tabActive: {
  backgroundColor: '#FFFFFF',
  borderColor: '#4F46E5',
  shadowColor: '#4F46E5',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 5,
},
tabContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},
tabIconContainer: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: 'rgba(107, 114, 128, 0.1)',
  justifyContent: 'center',
  alignItems: 'center',
},
tabIconContainerActive: {
  backgroundColor: '#4F46E5',
},
tabLabel: {
  fontSize: 15,
  fontWeight: '700',
  color: '#6B7280',
  letterSpacing: -0.2,
},
tabLabelActive: {
  color: '#4F46E5',
  fontWeight: '800',
},
tabCount: {
  backgroundColor: '#E5E7EB',
  borderRadius: 12,
  paddingHorizontal: 8,
  paddingVertical: 4,
  minWidth: 24,
  height: 24,
  justifyContent: 'center',
  alignItems: 'center',
},
tabCountActive: {
  backgroundColor: '#4F46E5',
},
tabCountText: {
  fontSize: 12,
  fontWeight: '800',
  color: '#374151',
},
tabCountTextActive: {
  color: '#FFFFFF',
},
activeTabIndicator: {
  position: 'absolute',
  bottom: -6,
  left: '50%',
  marginLeft: -4,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#4F46E5',
},

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#0369A1',
    lineHeight: 18,
  },

  // Filter Info Banner
  filterInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterInfoText: {
    fontSize: 13,
    color: '#4338CA',
    fontWeight: '500',
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },

  // List
  listContainer: {
    paddingBottom: 20,
  },
  listContainerEmpty: {
    flexGrow: 1,
  },
  cardSeparator: {
    height: 12,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
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
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 6,
  },
  employerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  employerName: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  budgetBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  bidBadge: {
    backgroundColor: '#EEF2FF',
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  bidMessageBox: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  bidMessageText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    marginBottom:25,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default MyApplicationsScreen;