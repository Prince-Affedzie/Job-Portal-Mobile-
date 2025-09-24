import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
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
import moment from "moment";
const { width } = Dimensions.get('window');

const AvailableTasksScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const { availableTasks, loadAvailableTasks, loading } = useContext(TaskerContext);
  const {user} = useContext(AuthContext)
  const timeAgo = (deadline) => {
       return deadline ? moment(deadline).fromNow() : "N/A";
    };

  useEffect(() => {
    loadAvailableTasks();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAvailableTasks().finally(() => setRefreshing(false));
  };

  const renderItem = ({ item, index }) => (
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
  );

  if (loading && !refreshing) {
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
      <HeroSection  userName={user.name} />
      <FlatList
        data={availableTasks}
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
            <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No tasks available</Text>
            <Text style={styles.emptyText}>
              Check back later for new opportunities
            </Text>
          </View>
        }
        contentContainerStyle={availableTasks.length === 0 ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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