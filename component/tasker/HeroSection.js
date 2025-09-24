import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  ScrollView, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HeroSection = ({ 
  userName, 
  onSearchPress, 
  onFilterPress,
  taskCount = 0,
  completedTasks = 0,
  showStats = true
}) => {
  const insets = useSafeAreaInsets();

  const handleSearchPress = () => {
    Keyboard.dismiss();
    onSearchPress?.();
  };

  const handleFilterPress = () => {
    Keyboard.dismiss();
    onFilterPress?.();
  };

  const categories = [
    { icon: "flash", label: "Urgent", active: true },
    { icon: "location", label: "Nearby" },
    { icon: "cash", label: "High Pay" },
    { icon: "time", label: "Quick" },
    { icon: "star", label: "Featured" },
    { icon: "trending-up", label: "Popular" }
  ];

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 16 }]}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardContainer}
      >
        {/* Background Decorations */}
        <View style={styles.decorationCircle1} />
        <View style={styles.decorationCircle2} />
        <View style={styles.decorationBlob1} />
        <View style={styles.decorationBlob2} />
        
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hello, {userName}!</Text>
              <Text style={styles.subtitle}>Ready to find your next gig?</Text>
            </View>
            
            {showStats && taskCount > 0 && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{taskCount}</Text>
                  <Text style={styles.statLabel}>Available</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{completedTasks}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
              </View>
            )}
          </View>

          {/* Search Bar */}
          <TouchableWithoutFeedback onPress={handleSearchPress}>
            <View style={styles.searchContainer}>
              <View style={styles.searchCard}>
                <Ionicons name="search" size={20} color="#6366F1" style={styles.searchIcon} />
                <View style={styles.searchTextContainer}>
                  <Text style={styles.searchPlaceholder}>Search tasks, categories...</Text>
                  <Text style={styles.searchHint}>Tap to explore opportunities</Text>
                </View>
                <TouchableOpacity 
                  onPress={handleFilterPress}
                  style={styles.filterButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <LinearGradient
                    colors={['#6366F1', '#4F46E5']}
                    style={styles.filterGradient}
                  >
                    <Ionicons name="options" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>

          {/* Quick Categories */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  styles.categoryButton,
                  category.active && styles.categoryButtonActive
                ]}
              >
                <Ionicons 
                  name={category.icon} 
                  size={16} 
                  color={category.active ? "#6366F1" : "#64748B"} 
                />
                <Text style={[
                  styles.categoryText,
                  category.active && styles.categoryTextActive
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cardContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  cardContent: {
    padding: 24,
    position: 'relative',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 18,
    borderRadius: 20,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(20px)',
  },
  searchIcon: {
    marginRight: 14,
  },
  searchTextContainer: {
    flex: 1,
  },
  searchPlaceholder: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 3,
  },
  searchHint: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  filterButton: {
    marginLeft: 12,
  },
  filterGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  categoriesContainer: {
    marginHorizontal: -4,
  },
  categoriesContent: {
    paddingHorizontal: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    shadowColor: '#6366F1',
    shadowOpacity: 0.2,
  },
  categoryText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 8,
  },
  categoryTextActive: {
    color: '#6366F1',
  },
  // Background decorations
  decorationCircle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 1,
  },
  decorationCircle2: {
    position: 'absolute',
    top: 60,
    right: -60,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 1,
  },
  decorationBlob1: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    zIndex: 1,
  },
  decorationBlob2: {
    position: 'absolute',
    bottom: 20,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    zIndex: 1,
  },
});

export default HeroSection;