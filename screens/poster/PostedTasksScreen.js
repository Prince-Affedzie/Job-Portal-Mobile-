// screens/tasker/AllTasksScreen.js
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Alert,
  TouchableOpacity,
  Modal,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useContext, useEffect } from 'react';
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { PosterContext } from '../../context/PosterContext';
import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';
import Header from '../../component/tasker/Header';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import TaskFilters from '../../component/client/TaskFilters';
import TaskList from '../../component/client/TaskList';
import TaskActionModal from '../../component/client/TaskActionModal';

const { width } = Dimensions.get('window');
const scale = (size) => (width / 375) * size;

// ─── Theme: Pacific Indigo & Warm Gold ──────────────────────────────────────
const C = {
  bg:           '#F9FAFC',
  surface:      '#FFFFFF',
  border:       '#E4E8EE',
  primary:      '#1E3A6E',
  primaryDark:  '#152C4F',
  primaryGlow:  '#EBF5FF',
  gold:         '#D49B3F',
  green:        '#0F766E',
  red:          '#DC2626',
  textPrimary:  '#0F172A',
  textSecondary:'#475569',
  textMuted:    '#94A3B8',
  white:        '#FFFFFF',
};

export default function AllTasksScreen() {
  const { user } = useContext(AuthContext);
  const { postedTasks, loading, loadPostedTasks, deleteTask } = useContext(PosterContext);

  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingTasks, setDeletingTasks] = useState({});
  const [deletionError, setDeletionError] = useState(null);

  useEffect(() => {
    loadPostedTasks();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPostedTasks();
    setRefreshing(false);
  };

  // ── Stats (only posted tasks) ────────────────────────────────────────────
  const calculateStats = () => {
    const tasks = postedTasks || [];
    const total = tasks.length;
    const completed = tasks.filter(t => ['Completed', 'Closed'].includes(t.status)).length;
    const inProgress = tasks.filter(t => ['In-progress', 'Assigned', 'Review'].includes(t.status)).length;
    const open = tasks.filter(t => ['Open', 'Pending'].includes(t.status)).length;
    const totalApplicants = tasks.reduce((sum, t) => sum + Math.max(t.applicants?.length || 0, t.bids?.length || 0), 0);
    const applicantsPerTask = total > 0 ? (totalApplicants / total).toFixed(1) : 0;

    return { total, completed, inProgress, open, applicants: totalApplicants, applicantsPerTask: parseFloat(applicantsPerTask) };
  };

  const stats = calculateStats();

  // ── Delete task ──────────────────────────────────────────────────────────
  const deleteATask = (taskId, taskTitle) => {
    setDeletingTasks(prev => ({ ...prev, [taskId]: true }));
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${taskTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setDeletingTasks(prev => ({ ...prev, [taskId]: false })) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(taskId);
              Alert.alert('Success', 'Task deleted.');
              onRefresh();
            } catch (error) {
              const msg = error.response?.data?.message || error.message || 'Failed to delete task.';
              Alert.alert('Delete Failed', msg);
            } finally {
              setDeletingTasks(prev => ({ ...prev, [taskId]: false }));
            }
          },
        },
      ],
    );
  };

  const handleActionPress = (task) => {
    setSelectedTask(task);
    setActionModalVisible(true);
  };

  const handleActionSelect = (action) => {
    if (!selectedTask) return;
    const task = selectedTask;
    if (action === 'View Details') {
      navigate('ClientTaskDetail', { taskId: task._id });
    } else if (action === 'Edit') {
      navigate('EditTask', { taskId: task._id, task });
    } else if (action === 'View Bids') {
      navigate('TaskApplicants', { taskId: task._id, applicants: task.applicants || [] });
    } else if (action === 'Delete') {
      deleteATask(task._id, task.title || task.description);
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
        <LoadingIndicator text="Loading your tasks..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="My Tasks" />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Hero Section with rounded top corners ── */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[C.primary, C.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.tabContainer}>
              <View style={styles.tab}>
                <View style={styles.tabContent}>
                  <Text style={styles.activeTabText}>Posted Tasks</Text>
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{stats.total}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={scale(20)} color={C.white} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tasks..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  autoCapitalize="none"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                    <Ionicons name="close-circle" size={scale(18)} color={C.white} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.filterButton, showFilters && styles.filterButtonActive, hasActiveFilters && styles.filterButtonHasFilters]}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Ionicons name="options" size={scale(20)} color={showFilters ? C.primary : C.white} />
                {hasActiveFilters && <View style={styles.filterDot} />}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* ── Filters ───────────────────────────────────────────────────── */}
        {showFilters && (
          <View style={styles.filtersSection}>
            <TaskFilters
              selectedFilter={selectedFilter}
              setSelectedFilter={setSelectedFilter}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
              taskType="posted"
            />
          </View>
        )}

        {/* ── Task List ─────────────────────────────────────────────────── */}
        <View style={styles.taskListSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Posted Tasks <Text style={styles.taskCount}>• {postedTasks?.length || 0} tasks</Text>
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearAllButton} onPress={clearFilters}>
                <Text style={styles.clearAllText}>Clear All</Text>
                <Ionicons name="close" size={scale(14)} color={C.red} />
              </TouchableOpacity>
            )}
          </View>

          <TaskList
            tasks={postedTasks}
            activeTab="posted"
            selectedFilter={selectedFilter}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            deletingTasks={deletingTasks}
            onTaskPress={(task) => navigate('ClientTaskDetail', { taskId: task._id })}
            onActionPress={handleActionPress}
            onRefresh={onRefresh}
          />
        </View>

        {/* ── Empty State ───────────────────────────────────────────────── */}
        {(!postedTasks || postedTasks.length === 0) && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={scale(80)} color={C.textMuted} />
            <Text style={styles.emptyTitle}>No Tasks Posted</Text>
            <Text style={styles.emptyDescription}>
              Start by posting your first task to find skilled taskers.
            </Text>
            <TouchableOpacity style={styles.emptyActionButton} onPress={() => navigate('CreateTask')}>
              <Ionicons name="add" size={scale(18)} color={C.white} />
              <Text style={styles.emptyActionText}>Post First Task</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={() => navigate('CreateTask')}>
        <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGradient}>
          <Entypo name="plus" size={scale(24)} color={C.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Action Modal ────────────────────────────────────────────────── */}
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
  safe: { flex: 1, backgroundColor: C.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100, marginHorizontal: 8,},

  // Hero with rounded top corners, flat bottom
  heroSection: {
    marginHorizontal: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  heroGradient: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
    paddingBottom: scale(28),
  },

  // Single tab (only Posted Tasks)
  tabContainer: {
    marginBottom: scale(20),
  },
  tab: {
    backgroundColor: C.white,
    borderRadius: scale(14),
    paddingVertical: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(16),
  },
  activeTabText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: C.primary,
  },
  tabBadge: {
    backgroundColor: C.primary,
    paddingHorizontal: scale(10),
    paddingVertical: scale(3),
    borderRadius: scale(12),
    minWidth: scale(28),
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.white,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    height: scale(52),
  },
  searchIcon: { marginRight: scale(10) },
  searchInput: {
    flex: 1,
    fontSize: scale(16),
    color: C.white,
    fontWeight: '500',
  },
  clearSearchButton: { padding: scale(4) },
  filterButton: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(16),
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: { backgroundColor: C.white, borderColor: C.white },
  filterButtonHasFilters: { borderColor: C.gold },
  filterDot: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: C.gold,
  },

  filtersSection: { marginTop: scale(16), marginBottom: scale(8) },
  taskListSection: { marginTop: scale(20) },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
    paddingHorizontal: scale(4),
  },
  sectionTitle: { fontSize: scale(18), fontWeight: '700', color: C.textPrimary },
  taskCount: { color: C.primary, fontWeight: '600' },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    gap: scale(4),
  },
  clearAllText: { fontSize: scale(12), fontWeight: '600', color: C.red },

  emptyState: { alignItems: 'center', paddingVertical: scale(60), paddingHorizontal: scale(40) },
  emptyTitle: { fontSize: scale(20), fontWeight: '700', color: C.textPrimary, marginTop: scale(20), marginBottom: scale(8) },
  emptyDescription: {
    fontSize: scale(15),
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: scale(24),
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: scale(24),
    paddingVertical: scale(14),
    borderRadius: scale(16),
    gap: scale(8),
  },
  emptyActionText: { fontSize: scale(16), fontWeight: '600', color: C.white },

  fab: {
    position: 'absolute',
    bottom: scale(24),
    right: scale(24),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: scale(8),
    elevation: 8,
  },
  fabGradient: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
});