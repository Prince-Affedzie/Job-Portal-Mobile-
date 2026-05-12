// screens/tasker/TaskerTasksScreen.js - BIDS ONLY (Clean Version)
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Animated,
  ScrollView,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { TaskerContext } from '../../context/TaskerContext';
import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';
import Header from '../../component/tasker/Header';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import FilterModal from '../../component/tasker/FilterModal';
import PendingNoticeBanner from '../../component/tasker/TaskPendingNotice';

const { width } = Dimensions.get('window');

const TaskerTasksScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showPendingNotice, setShowPendingNotice] = useState(true);

  const { user } = useContext(AuthContext);
  const { bids, loading, loadMyTasks } = useContext(TaskerContext);

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
      await loadMyTasks();   // only loads bids
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => loadData();

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // ─── Data filtering & sorting (unchanged, but now only for bids) ────────
  const getFilteredData = () => {
    let data = bids || [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(item => {
        const task = item.task;
        return (
          task?.title?.toLowerCase().includes(q) ||
          task?.description?.toLowerCase().includes(q) ||
          task?.category?.toLowerCase().includes(q) ||
          task?.employer?.name?.toLowerCase().includes(q) ||
          item.bid?.message?.toLowerCase().includes(q)
        );
      });
    }

    if (selectedStatus !== 'all') {
      data = data.filter(item => {
        const st = (item.bid?.status || '').toLowerCase();
        return st === selectedStatus.toLowerCase();
      });
    }

    if (selectedCategory !== 'all') {
      data = data.filter(item => item.task?.category === selectedCategory);
    }

    data = [...data].sort((a, b) => {
      const getDate = (item) => new Date(item.bid?.createdAt || item.createdAt || 0);
      const getBudget = (item) => item.bid?.amount || 0;
      switch (sortBy) {
        case 'newest':  return getDate(b) - getDate(a);
        case 'oldest':  return getDate(a) - getDate(b);
        case 'budget-high': return getBudget(b) - getBudget(a);
        case 'budget-low':  return getBudget(a) - getBudget(b);
        default: return 0;
      }
    });

    return data;
  };

  const filteredData = getFilteredData();

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchQuery || selectedStatus !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest';

  // ─── Stats for bids ────────────────────────────────────────────────────
  const totalBids = bids?.length || 0;
  const acceptedBids = bids?.filter(b => b.bid?.status === 'accepted').length || 0;
  const pendingBids = bids?.filter(b => b.bid?.status === 'pending').length || 0;

  // ─── Card rendering ────────────────────────────────────────────────────
  const BidCard = ({ item, onPress }) => {
    const task = item.task;
    const bid = item.bid;
    const status = bid?.status || 'unknown';
    const statusColor = {
      accepted: '#10B981',
      pending: '#F59E0B',
      declined: '#EF4444',
      cancelled: '#EF4444',
      completed: '#10B981',
    }[status.toLowerCase()] || '#6B7280';

    return (
      <TouchableOpacity
        style={styles.taskCard}
        activeOpacity={0.7}
        onPress={onPress}
      >
        {/* Header */}
        <View style={styles.taskCardHeader}>
          <View style={styles.typeBadge}>
            <MaterialIcons name="handshake" size={16} color="#6366F1" />
            <Text style={styles.typeText}>Bid</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.taskContent}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task?.title || 'Untitled Task'}
          </Text>

          <View style={styles.clientRow}>
            <View style={styles.clientAvatar}>
              <MaterialIcons name="person" size={16} color="#6B7280" />
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>
                {task?.employer?.name || 'Anonymous'}
              </Text>
              <Text style={styles.taskDate}>
                {bid?.createdAt
                  ? new Date(bid.createdAt).toLocaleDateString()
                  : 'Recently'}
              </Text>
            </View>
          </View>

          {task?.description && (
            <Text style={styles.taskDescription} numberOfLines={3}>
              {task.description}
            </Text>
          )}

          <View style={styles.taskMeta}>
            <View style={styles.metaItem}>
              <MaterialIcons name="category" size={15} color="#6B7280" />
              <Text style={styles.metaText}>{task?.category || 'Uncategorized'}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="money" size={15} color="#6B7280" />
              <Text style={styles.metaText}>
                ₵ {(bid?.amount || 0).toLocaleString()}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.viewDetailsButton} onPress={onPress}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleBidPress = (item) => {
    navigate('BidDetails', { bidId: item.bid?._id });
  };

  // ─── Header section (simplified, no tabs) ─────────────────────────────
  const renderHeader = () => (
    <Animated.View style={styles.headerContainer}>
      <LinearGradient
        colors={['#1A1F3B', '#2D1B69']}
        style={[StyleSheet.absoluteFill, { borderTopLeftRadius:34,
         borderTopRightRadius:34, }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.headerContent}>
        <Text style={styles.welcomeText}>My Bids</Text>
        <Text style={styles.userName}>{user?.name || 'Tasker'}</Text>
      </View>

      {/* Stats row (bids only) */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalBids}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{acceptedBids}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{pendingBids}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Search / Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bids..."
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

  // ─── Empty state ──────────────────────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="handshake" size={80} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>No Bids Found</Text>
      <Text style={styles.emptyText}>
        {hasActiveFilters
          ? 'Try adjusting your filters or search terms'
          : "You haven't placed any bids yet"}
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

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header title="My Bids" />
        <LoadingIndicator text="Loading Bids" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <Header title="My Bids" />

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
        {renderHeader()}
        {showPendingNotice && (
          <PendingNoticeBanner onDismiss={() => setShowPendingNotice(false)} />
        )}

        <View style={styles.tasksContainer}>
          {filteredData.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                Your Bids <Text style={styles.sectionCount}>• {filteredData.length}</Text>
              </Text>
              {filteredData.map((item, index) => (
                <View key={item._id || index}>
                  <BidCard item={item} onPress={() => handleBidPress(item)} />
                  {index < filteredData.length - 1 && <View style={styles.taskDivider} />}
                </View>
              ))}
            </>
          ) : (
            renderEmpty()
          )}
        </View>
      </Animated.ScrollView>

      {/* Filter Modal (unchanged) */}
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
        activeTab="bids"  // we only have bids now
      />

      {/* FAB */}
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

// ─── Styles (kept identical, removing any unused references) ────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#4F46E5',
    overflow: 'hidden',
    marginHorizontal: 12,
    borderTopLeftRadius:34,
    borderTopRightRadius:34,
  },
  headerContent: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#E0E7FF',
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
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
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
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
    paddingHorizontal: 16,
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
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
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