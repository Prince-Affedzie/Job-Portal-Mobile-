import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity, 
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Dimensions,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HeroSection = ({ 
  userName, 
  onSearchPress, 
  onFilterPress,
  taskCount = 0,
  completedTasks = 0,
  showStats = true
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleSearchPress = () => {
    searchInputRef.current?.focus();
    onSearchPress?.();
  };

  const handleFilterPress = () => {
    Keyboard.dismiss();
    onFilterPress?.();
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      Keyboard.dismiss();
      if (onSearchPress) {
        onSearchPress(searchQuery.trim());
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const completionRate = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top -12 }]}>
      <LinearGradient
        colors={['#1A1F3B', '#2D325D', '#4A4F8C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardContainer}
      >
        {/* Minimal Background Decorations */}
        <View style={styles.decorationOrb1} />
        <View style={styles.decorationOrb2} />
        
        <Animated.View 
          style={[
            styles.cardContent,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }] 
            }
          ]}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Welcome back, {userName} 👋</Text>
              <Text style={styles.subtitle}>
                {taskCount > 0 
                  ? `${taskCount} new opportunities waiting` 
                  : "Discover your next great opportunity"
                }
              </Text>
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

          {/* Enhanced Search Bar with Search Button */}
          <View style={styles.searchContainer}>
            <View style={[
              styles.searchCard,
              isSearchFocused && styles.searchCardFocused
            ]}>
              <Ionicons 
                name="search" 
                size={18} 
                color={isSearchFocused ? "#6366F1" : "#8B9CB1"} 
                style={styles.searchIcon} 
              />
              
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search tasks..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              
              {/* Dynamic Right Section */}
              <View style={styles.searchActions}>
                {searchQuery && (
                  <>
                    <TouchableOpacity 
                      onPress={handleClearSearch}
                      style={styles.searchActionButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#8B9CB1" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={handleSearchSubmit}
                      style={styles.searchSubmitButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <LinearGradient
                        colors={['#6366F1', '#4F46E5']}
                        style={styles.searchSubmitGradient}
                      >
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Progress Indicator */}
          {completionRate > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Completion Progress</Text>
                <Text style={styles.progressPercentage}>{completionRate}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${completionRate}%` }
                  ]} 
                />
              </View>
            </View>
          )}
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 10,
    paddingBottom: 16,
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    backgroundColor: '#1A1F3B',
  },
  cardContent: {
    padding: 20,
    position: 'relative',
    zIndex: 10,
  },
  // Background Decorations
  decorationOrb1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    zIndex: 1,
  },
  decorationOrb2: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    zIndex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: 140,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 6,
    minWidth: 45,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
  },
  // Enhanced Search Section
  searchContainer: {
    marginBottom: 16,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchCardFocused: {
    borderColor: 'rgba(99, 102, 241, 0.5)',
    shadowColor: '#6366F1',
    shadowOpacity: 0.2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
    padding: 0,
    margin: 0,
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchActionButton: {
    padding: 4,
  },
  searchSubmitButton: {
    padding: 2,
  },
  searchSubmitGradient: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // Progress Section
  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
});

export default HeroSection;