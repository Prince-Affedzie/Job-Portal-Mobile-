import React, { useEffect, useState, useContext, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Animated,
  Dimensions,
  SafeAreaView,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { navigate } from "../../services/navigationService";
import { TaskerContext } from "../../context/TaskerContext";
import { AuthContext } from "../../context/AuthContext";
import HeroSection from "../../component/tasker/HeroSection";
import CategoryCards from "../../component/tasker/CategoryCards";
import Header from "../../component/tasker/Header";
import moment from "moment";
import LoadingIndicator from "../../component/common/LoadingIndicator";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

// Map our category IDs to backend category names
const CATEGORY_MAPPING = {
  home_services: "Home Services",
  delivery_errands: "Delivery & Errands",
  digital_services: "Digital Services",
  writing_assistance: "Writing & Assistance",
  learning_tutoring: "Learning & Tutoring",
  creative_tasks: "Creative Tasks",
  event_support: "Event Support",
  others: "Others",
};

// Tab types
const TAB_TYPES = {
  AVAILABLE: 'available',
  NEARBY: 'nearby'
};

const formatFullAddress = (address) => {
  if (!address || (!address.region && !address.city && !address.suburb)) {
    return "Remote";
  }
  
  const parts = [
    address.region,
    address.city, 
    address.suburb
  ].filter(part => part && part.trim() !== '');
  
  return parts.join(', ');
};

const AvailableTasksScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_TYPES.AVAILABLE);
  
  // Use ref to track search timer
  const searchTimerRef = useRef(null);
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const { availableTasks, tasksNearby, loadAvailableTasks, loadNearbyTasks, loading } = useContext(TaskerContext);
  const { user } = useContext(AuthContext);

  const timeAgo = useCallback((deadline) => {
    return deadline ? moment(deadline).fromNow() : "N/A";
  }, []);

  useEffect(() => {
    loadAvailableTasks();
    loadNearbyTasks();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const loadTasks = useCallback(
    (search = "", category = null) => {
      const categoryName = category ? CATEGORY_MAPPING[category.id] : null;
      
      if (activeTab === TAB_TYPES.AVAILABLE) {
        return loadAvailableTasks({ search, category: categoryName });
      } else {
        return loadNearbyTasks({ search, category: categoryName });
      }
    },
    [loadAvailableTasks, loadNearbyTasks, activeTab]
  );

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      setIsSearching(true);

      // Clear existing timer
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }

      // Set new timer
      searchTimerRef.current = setTimeout(() => {
        setListLoading(true);
        loadTasks(query.trim(), selectedCategory).finally(() => {
          setListLoading(false);
          setIsSearching(false);
        });
      }, 500);
    },
    [loadTasks, selectedCategory]
  );

  const handleCategoryPress = useCallback(
    (category) => {
      // Toggle category if same category is pressed
      const newCategory = selectedCategory?.id === category.id ? null : category;
      setSelectedCategory(newCategory);
      setListLoading(true);

      // Animate the change
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      loadTasks(searchQuery, newCategory).finally(() => setListLoading(false));
    },
    [searchQuery, loadTasks, selectedCategory]
  );

  const handleClearAll = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory(null);
    setListLoading(true);
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (activeTab === TAB_TYPES.AVAILABLE) {
      loadAvailableTasks().finally(() => setListLoading(false));
    } else {
      loadNearbyTasks().finally(() => setListLoading(false));
    }
  }, [loadAvailableTasks, loadNearbyTasks, activeTab]);

  const handleFilterPress = useCallback(() => {
    console.log("Filter pressed");
    // TODO: Implement advanced filter modal
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchQuery("");
    setSelectedCategory(null);
    
    if (activeTab === TAB_TYPES.AVAILABLE) {
      loadAvailableTasks().finally(() => setRefreshing(false));
    } else {
      loadNearbyTasks().finally(() => setRefreshing(false));
    }
  }, [loadAvailableTasks, loadNearbyTasks, activeTab]);

  const handleTabPress = useCallback((tab) => {
    if (tab === activeTab) return; // Prevent unnecessary operations
    
    // Animate tab indicator
    Animated.spring(tabIndicatorAnim, {
      toValue: tab === TAB_TYPES.AVAILABLE ? 0 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    setActiveTab(tab);
    setSearchQuery("");
    setSelectedCategory(null);
    setListLoading(true);
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (tab === TAB_TYPES.AVAILABLE) {
      loadAvailableTasks().finally(() => setListLoading(false));
    } else {
      loadNearbyTasks().finally(() => setListLoading(false));
    }
  }, [loadAvailableTasks, loadNearbyTasks, activeTab, tabIndicatorAnim]);

  const hasActiveFilters = searchQuery || selectedCategory;

  // Memoized values for better performance
  const currentTasks = useMemo(() => {
    return activeTab === TAB_TYPES.AVAILABLE ? availableTasks : tasksNearby;
  }, [activeTab, availableTasks, tasksNearby]);

  const taskCount = useMemo(() => currentTasks.length, [currentTasks]);

  const tabTitle = useMemo(() => {
    return activeTab === TAB_TYPES.AVAILABLE ? "Available Tasks" : "Tasks Nearby";
  }, [activeTab]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigate("TaskDetails", { taskId: item._id })}
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel={`Task: ${item.title}`}
          accessibilityHint="Double tap to view task details"
        >
          <View style={styles.cardHeader}>
            <View style={styles.employerInfo}>
              <View style={styles.employerAvatar}>
                <Text style={styles.avatarText}>
                  {item.employer?.name?.charAt(0)?.toUpperCase() || "C"}
                </Text>
              </View>
              <View>
                <Text style={styles.employerName}>
                  {item.employer?.name || "Client"}
                </Text>
                <Text style={styles.postedTime}>{timeAgo(item.deadline)}</Text>
              </View>
            </View>
            <View style={styles.budgetContainer}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.budgetBadge}
              >
                <Text style={styles.budgetText}>GHS {item.budget}</Text>
              </LinearGradient>
            </View>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
          <View style={styles.tagsContainer}>
            {item.category && (
              <View style={styles.tag}>
                <Ionicons name="pricetag" size={12} color="#6366F1" />
                <Text style={styles.tagText}>{item.category}</Text>
              </View>
            )}
            {activeTab === TAB_TYPES.NEARBY && item.distance && (
              <View style={[styles.tag, styles.distanceTag]}>
                <Ionicons name="location" size={12} color="#EF4444" />
                <Text style={styles.tagText}>{item.distance} km</Text>
              </View>
            )}
            {item.isUrgent && (
              <View style={styles.tag}>
                <Ionicons name="time" size={12} color="#F59E0B" />
                <Text style={styles.tagText}>Urgent</Text>
              </View>
            )}
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.location}>
              <Ionicons name="location-outline" size={16} color="#64748B" />
              <Text style={styles.locationText} numberOfLines={1}>
                {formatFullAddress(item.address)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    ),
    [fadeAnim, timeAgo, activeTab]
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === TAB_TYPES.AVAILABLE && styles.activeTab
        ]}
        onPress={() => handleTabPress(TAB_TYPES.AVAILABLE)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === TAB_TYPES.AVAILABLE }}
      >
        <Text style={[
          styles.tabText,
          activeTab === TAB_TYPES.AVAILABLE && styles.activeTabText
        ]}>
          Available Tasks
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === TAB_TYPES.NEARBY && styles.activeTab
        ]}
        onPress={() => handleTabPress(TAB_TYPES.NEARBY)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === TAB_TYPES.NEARBY }}
      >
        <Text style={[
          styles.tabText,
          activeTab === TAB_TYPES.NEARBY && styles.activeTabText
        ]}>
          Nearby Tasks
        </Text>
      </TouchableOpacity>
      
      {/* Animated Tab Indicator */}
      <Animated.View
        style={[
          styles.tabIndicator,
          {
            transform: [{
              translateX: tabIndicatorAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [width / 4 - 40, (width * 3) / 4 - 40],
              }),
            }],
          },
        ]}
      />
    </View>
  );

  const renderHeader = () => (
    <View>
      <HeroSection
        userName={user?.name}
        onSearchPress={handleSearch}
        onFilterPress={handleFilterPress}
        showStats={false}
      />
      
      {renderTabs()}
      
      {hasActiveFilters && (
        <View style={styles.filterStatus}>
          <View style={styles.filterStatusContent}>
            <Ionicons name="filter" size={16} color="#6366F1" />
            <Text style={styles.filterStatusText}>
              {searchQuery && selectedCategory
                ? `"${searchQuery}" in ${selectedCategory.name}`
                : searchQuery
                ? `Searching: "${searchQuery}"`
                : `Category: ${selectedCategory.name}`}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleClearAll} 
            style={styles.clearAllButton}
            accessible={true}
            accessibilityLabel="Clear all filters"
          >
            <Ionicons name="close-circle" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}
      
      <CategoryCards
        selectedCategory={selectedCategory?.id}
        onCategoryPress={handleCategoryPress}
      />
      
      {/* Tasks Header */}
      <View style={styles.tasksHeader}>
        <Text style={styles.tasksTitle}>{tabTitle}</Text>
        <View style={styles.tasksBadge}>
          <Text style={styles.tasksCount}>{taskCount}</Text>
        </View>
      </View>
    </View>
  );

  // Show empty state message
  const renderEmptyState = () => {
    if (listLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.listLoadingText}>
            {searchQuery || selectedCategory ? "Filtering tasks..." : "Loading tasks..."}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        {hasActiveFilters ? (
          <>
            <Ionicons name="search-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No tasks found</Text>
            <Text style={styles.emptyText}>
              {searchQuery && selectedCategory
                ? `No results for "${searchQuery}" in ${selectedCategory.name}`
                : searchQuery
                ? `No results for "${searchQuery}"`
                : `No tasks in ${selectedCategory?.name}`}
            </Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleClearAll}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>
              {activeTab === TAB_TYPES.AVAILABLE 
                ? "No tasks available" 
                : "No nearby tasks"}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === TAB_TYPES.AVAILABLE
                ? "Check back later for new opportunities"
                : "No tasks found in your area"}
            </Text>
            {activeTab === TAB_TYPES.NEARBY && (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => handleTabPress(TAB_TYPES.AVAILABLE)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>View All Tasks</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  // Show initial loading
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <Header title="Available Tasks" />
          <LoadingIndicator text='Loading Tasks...' logoStyle="glow" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <Header title="Available Tasks" />
      <FlatList
        data={currentTasks}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6366F1"]}
            tintColor="#6366F1"
            progressViewOffset={0}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          currentTasks.length === 0 
            ? styles.emptyContainer 
            : styles.listContentContainer
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  activeTab: {
    // Additional active styles if needed
  },
  tabText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: '#6366F1',
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -2,
    height: 3,
    width: 80,
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  // Tasks Header
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  tasksTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  tasksBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tasksCount: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '700',
  },
  filterStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  filterStatusContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  filterStatusText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  clearAllButton: {
    padding: 4,
    marginLeft: 8,
  },
  listLoadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#64748B",
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
    minWidth: 160,
    alignItems: 'center',
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  employerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  employerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  employerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  postedTime: {
    fontSize: 12,
    color: "#64748B",
  },
  budgetContainer: {
    marginLeft: 12,
  },
  budgetBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 75,
    alignItems: "center",
  },
  budgetText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  distanceTag: {
    backgroundColor: "#FEF2F2",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
});

export default AvailableTasksScreen;