import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Animated,
  Dimensions
} from "react-native";
import { StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { navigate } from '../../services/navigationService';
import { TaskerContext } from "../../context/TaskerContext"
import { AuthContext } from "../../context/AuthContext";
import HeroSection from "../../component/tasker/HeroSection";
import CategoryCards from "../../component/tasker/CategoryCards";
import Header from "../../component/tasker/Header";
import moment from "moment";

const { width } = Dimensions.get('window');

// Map our category IDs to backend category names
const CATEGORY_MAPPING = {
  'home_services': 'Home Services',
  'delivery_errands': 'Delivery & Errands', 
  'digital_services': 'Digital Services',
  'writing_assistance': 'Writing & Assistance',
  'learning_tutoring': 'Learning & Tutoring',
  'creative_tasks': 'Creative Tasks',
  'event_support': 'Event Support',
  'others': 'Others'
};

const AvailableTasksScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  
  const { availableTasks, loadAvailableTasks, loading } = useContext(TaskerContext);
  const { user } = useContext(AuthContext);

  const timeAgo = useCallback((deadline) => {
    return deadline ? moment(deadline).fromNow() : "N/A";
  }, []);

  useEffect(() => {
    loadAvailableTasks();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Function to load tasks with proper parameters
  const loadTasks = useCallback((search = '', Category = null) => {
    // Convert category ID to backend category name
    const category= Category ? CATEGORY_MAPPING[Category.id] : null;
    return loadAvailableTasks({search, category});
  }, [loadAvailableTasks]);

  // Handle search functionality
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setIsSearching(true);
    
    const searchTimer = setTimeout(() => {
      setListLoading(true);
      loadTasks(query.trim(), selectedCategory)
        .finally(() => {
          setListLoading(false);
          setIsSearching(false);
        });
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [loadTasks, selectedCategory]);

  // Handle category press - CORRECTED
  const handleCategoryPress = useCallback((category) => {
    setSelectedCategory(category);
    setListLoading(true);
    
    loadTasks(searchQuery, category)
      .finally(() => setListLoading(false));
  }, [searchQuery, loadTasks]);

  // Clear both search and category
  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setListLoading(true);
    loadAvailableTasks().finally(() => setListLoading(false));
  }, [loadAvailableTasks]);

  const handleFilterPress = useCallback(() => {
    console.log("Filter pressed");
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchQuery('');
    setSelectedCategory(null);
    loadAvailableTasks().finally(() => setRefreshing(false));
  }, [loadAvailableTasks]);

  // Show active filters in search status
  const hasActiveFilters = searchQuery || selectedCategory;

  const renderItem = useCallback(({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })
        }]
      }}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigate("TaskDetails", { taskId: item._id })}
        activeOpacity={0.7}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.employerInfo}>
            <View style={styles.employerAvatar}>
              <Text style={styles.avatarText}>
                {item.employer?.name?.charAt(0)?.toUpperCase() || 'C'}
              </Text>
            </View>
            <View>
              <Text style={styles.employerName}>
                {item.employer?.name || 'Client'}
              </Text>
              <Text style={styles.postedTime}>{timeAgo(item.deadline)}</Text>
            </View>
          </View>
          <View style={styles.budgetContainer}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.budgetBadge}
            >
              <Text style={styles.budgetText}>GHS {item.budget}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Task Content */}
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>

        {/* Tags */}
        <View style={styles.tagsContainer}>
          {item.category && (
            <View style={styles.tag}>
              <Ionicons name="pricetag" size={12} color="#6366F1" />
              <Text style={styles.tagText}>{item.category}</Text>
            </View>
          )}
          <View style={styles.tag}>
            <Ionicons name="time" size={12} color="#F59E0B" />
            <Text style={styles.tagText}>Urgent</Text>
          </View>
        </View>

        {/* Location & Action */}
        <View style={styles.cardFooter}>
          <View style={styles.location}>
            <Ionicons name="location-outline" size={16} color="#64748B" />
            <Text style={styles.locationText}>{item.address?.region || "Nationwide"}</Text>
          </View>
          <View style={styles.actionButton}>
            <Text style={styles.actionText}>View</Text>
            <Ionicons name="arrow-forward" size={16} color="#6366F1" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [fadeAnim, timeAgo]);

  // Show full screen loading only on initial load
  if (loading && !refreshing && availableTasks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Finding available tasks...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar/>
      <Header title="Available Tasks" />
      
      <HeroSection 
        userName={user.name} 
        onSearchPress={handleSearch}
        onFilterPress={handleFilterPress}
        showStats={false}
      />
      
      {/* Enhanced Filter Status Indicator */}
      {hasActiveFilters && (
        <View style={styles.filterStatus}>
          <View style={styles.filterStatusContent}>
            <Ionicons name="filter" size={16} color="#6366F1" />
            <Text style={styles.filterStatusText}>
              Active filters: 
              {searchQuery && ` Search: "${searchQuery}"`}
              {searchQuery && selectedCategory && ' • '}
              {selectedCategory && ` Category: ${selectedCategory.name}`}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleClearAll}
            style={styles.clearAllButton}
          >
            <Ionicons name="close-circle" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      <CategoryCards 
        selectedCategory={selectedCategory?.id}
        onCategoryPress={handleCategoryPress}
      />

      <View style={styles.listContainer}>
        {listLoading ? (
          <View style={styles.listLoadingContainer}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.listLoadingText}>
              {searchQuery || selectedCategory ? 'Filtering tasks...' : 'Updating tasks...'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={availableTasks} // Use availableTasks directly since backend filters
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#6366F1']}
                tintColor="#6366F1"
              />
            }
            ListEmptyComponent={
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
                        : `No tasks in ${selectedCategory?.name}`
                      }
                    </Text>
                    <TouchableOpacity 
                      style={styles.clearSearchButtonLarge}
                      onPress={handleClearAll}
                    >
                      <Text style={styles.clearSearchText}>Clear filters</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>No tasks available</Text>
                    <Text style={styles.emptyText}>
                      Check back later for new opportunities
                    </Text>
                  </>
                )}
              </View>
            }
            contentContainerStyle={availableTasks.length === 0 ? styles.emptyContainer : styles.listContentContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  listContainer: {
    flex: 1,
  },
  listContentContainer: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Enhanced Filter Status
  filterStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom:8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterStatusText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  clearAllButton: {
    padding: 4,
    marginLeft: 8,
  },
  // List-specific loading (not full screen)
  listLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  listLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  clearSearchButtonLarge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  clearSearchText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // Card Styles
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    fontWeight: "600",
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 70,
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
  tagText: {
    fontSize: 12,
    fontWeight: "500",
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
  },
  locationText: {
    fontSize: 13,
    color: "#64748B",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
});

export default AvailableTasksScreen;