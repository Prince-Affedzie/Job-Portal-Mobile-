import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GetTaskers } from '../../api/bidApi';
import { navigate } from '../../services/navigationService';

const { width } = Dimensions.get('window');

const ServiceCategoriesPreview = ({ onCategorySelect, onTaskerPress }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(0);
  const scrollX = new Animated.Value(0);

  useEffect(() => {
    fetchCategoriesWithTaskers();
  }, []);

  const fetchCategoriesWithTaskers = async () => {
    try {
      const response = await GetTaskers();
      if (response.data) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
      // Fallback to mock data
      setCategories(getMockCategories());
    } finally {
      setLoading(false);
    }
  };

  const getMockCategories = () => [
    {
      category: 'Home Services',
      icon: 'home',
      color: '#6366F1',
      taskerCount: 24,
      avgRating: 4.8,
      taskers: Array.from({ length: 8 }, (_, i) => ({
        _id: i.toString(),
        name: ['Kwame Mensah', 'Ama Serwaa', 'Kofi Anan', 'Esi Boateng', 'Yaw Asante', 'Akua Nyarko', 'Kwabena Osei', 'Adwoa Smart'][i],
        profileImage: `https://images.unsplash.com/photo-${1500000000000 + i}-1dd7228f2d?w=150`,
        rating: 4.5 + Math.random() * 0.5,
        skills: ['Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Carpentry', 'Gardening', 'Repairs', 'Installation'],
        reviewCount: Math.floor(Math.random() * 50) + 10,
        hourlyRate: Math.floor(Math.random() * 40) + 30,
        responseTime: Math.floor(Math.random() * 30) + 15,
        isVerified: Math.random() > 0.2,
      }))
    },
    {
      category: 'Professional',
      icon: 'briefcase',
      color: '#10B981',
      taskerCount: 18,
      avgRating: 4.9,
      taskers: Array.from({ length: 6 }, (_, i) => ({
        _id: (i + 8).toString(),
        name: ['Nana Yaa', 'Mike Johnson', 'Sarah Connor', 'David Smith', 'Lisa Brown', 'James Wilson'][i],
        profileImage: `https://images.unsplash.com/photo-${1500000000000 + i + 8}-1dd7228f2d?w=150`,
        rating: 4.6 + Math.random() * 0.4,
        skills: ['Consulting', 'Design', 'Writing', 'Coaching', 'Marketing', 'Development'],
        reviewCount: Math.floor(Math.random() * 40) + 15,
        hourlyRate: Math.floor(Math.random() * 80) + 50,
        responseTime: Math.floor(Math.random() * 45) + 30,
        isVerified: Math.random() > 0.1,
      }))
    },
    {
      category: 'Creative',
      icon: 'color-palette',
      color: '#8B5CF6',
      taskerCount: 12,
      avgRating: 4.7,
      taskers: Array.from({ length: 5 }, (_, i) => ({
        _id: (i + 14).toString(),
        name: ['Creative Studio', 'Design Pro', 'Photo Master', 'Video Expert', 'Art Director'][i],
        profileImage: `https://images.unsplash.com/photo-${1500000000000 + i + 14}-1dd7228f2d?w=150`,
        rating: 4.4 + Math.random() * 0.6,
        skills: ['Photography', 'Design', 'Video', 'Art', 'Creative'],
        reviewCount: Math.floor(Math.random() * 35) + 8,
        hourlyRate: Math.floor(Math.random() * 60) + 40,
        responseTime: Math.floor(Math.random() * 60) + 20,
        isVerified: Math.random() > 0.3,
      }))
    }
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Top Taskers in Ghana</Text>
          <Text style={styles.subtitle}>Verified professionals near you</Text>
        </View>
        <TouchableOpacity style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="arrow-forward" size={16} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {categories.map((category, index) => (
          <TouchableOpacity
            key={category.category}
            style={[
              styles.tab,
              activeCategory === index && styles.tabActive
            ]}
            onPress={() => setActiveCategory(index)}
          >
            <View style={[styles.tabIcon, { backgroundColor: category.color }]}>
              <Ionicons name={category.icon} size={18} color="#FFF" />
            </View>
            <Text style={[
              styles.tabText,
              activeCategory === index && styles.tabTextActive
            ]}>
              {category.category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Taskers Grid */}
      <View style={styles.taskersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {categories.map((category, categoryIndex) => (
            <View key={category.category} style={styles.categoryPage}>
              <View style={styles.taskersGrid}>
                {category.taskers.slice(0, 6).map((tasker, taskerIndex) => (
                  <TaskerCard 
                    key={tasker._id}
                    tasker={tasker}
                    index={taskerIndex}
                    onPress={onTaskerPress}
                  />
                ))}
              </View>
              
              {category.taskers.length > 6 && (
                <TouchableOpacity 
                  style={styles.viewMoreCard}
                  onPress={() => onCategorySelect?.(category.category)}
                >
                  <LinearGradient
                    colors={['#F8FAFC', '#F1F5F9']}
                    style={styles.viewMoreGradient}
                  >
                    <View style={styles.viewMoreIcon}>
                      <Ionicons name="add-circle" size={32} color="#6366F1" />
                    </View>
                    <Text style={styles.viewMoreText}>
                      View all {category.taskers.length} taskers
                    </Text>
                    <Text style={styles.viewMoreSubtext}>
                      in {category.category}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
        
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {categories.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];
            
            const dotSize = scrollX.interpolate({
              inputRange,
              outputRange: [8, 20, 8],
              extrapolate: 'clamp',
            });
            
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            
            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotSize,
                    opacity: opacity,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const TaskerCard = ({ tasker, index, onPress }) => {
  const scaleAnim = new Animated.Value(1);
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.taskerCard,
          index % 2 === 0 ? styles.taskerCardLeft : styles.taskerCardRight
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress?.(tasker)}
        activeOpacity={0.9}
      >
        {/* Header */}
        <View style={styles.taskerHeader}>
          <Image
            source={{ uri: tasker.profileImage }}
            style={styles.taskerImage}
          />
          <View style={styles.taskerBadges}>
            {tasker.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color="#FFF" />
              </View>
            )}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={10} color="#FFF" />
              <Text style={styles.ratingBadgeText}>{tasker.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={styles.taskerInfo}>
          <Text style={styles.taskerName} numberOfLines={1}>
            {tasker.name}
          </Text>
          <Text style={styles.taskerSkills} numberOfLines={1}>
            {tasker.skills[0]}
          </Text>
          
          {/* Stats */}
          <View style={styles.taskerStats}>
            <View style={styles.stat}>
              <Ionicons name="time" size={10} color="#64748B" />
              <Text style={styles.statText}>{tasker.responseTime}m</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="chatbubble" size={10} color="#64748B" />
              <Text style={styles.statText}>{tasker.reviewCount}</Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>from</Text>
            <Text style={styles.price}>GH₵{tasker.hourlyRate}/hr</Text>
          </View>
        </View>

        {/* Availability Indicator */}
        <View style={styles.availabilityDot} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const LoadingSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <View>
        <View style={[styles.skeleton, { width: 160, height: 24, marginBottom: 8 }]} />
        <View style={[styles.skeleton, { width: 200, height: 16 }]} />
      </View>
      <View style={[styles.skeleton, { width: 80, height: 32, borderRadius: 16 }]} />
    </View>
    
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[styles.skeletonTab, { marginRight: 12 }]}>
          <View style={[styles.skeleton, { width: 32, height: 32, borderRadius: 16 }]} />
          <View style={[styles.skeleton, { width: 80, height: 16, marginTop: 8 }]} />
        </View>
      ))}
    </ScrollView>
    
    <View style={styles.taskersContainer}>
      <View style={styles.taskersGrid}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <View key={i} style={[
            styles.skeletonTaskerCard,
            i % 2 === 0 ? styles.taskerCardLeft : styles.taskerCardRight
          ]}>
            <View style={[styles.skeleton, { width: 60, height: 60, borderRadius: 30 }]} />
            <View style={[styles.skeleton, { width: '80%', height: 16, marginTop: 12 }]} />
            <View style={[styles.skeleton, { width: '60%', height: 14, marginTop: 6 }]} />
            <View style={[styles.skeleton, { width: '70%', height: 12, marginTop: 8 }]} />
          </View>
        ))}
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '400',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  tabsContainer: {
    marginBottom: 24,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  tabIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFF',
  },
  taskersContainer: {
    minHeight: 320,
  },
  categoryPage: {
    width: width - 40,
    marginHorizontal: 20,
  },
  taskersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  taskerCard: {
    width: (width - 64) / 2,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
  },
  taskerCardLeft: {
    marginRight: 0,
  },
  taskerCardRight: {
    marginLeft: 0,
  },
  taskerHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  taskerImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#F1F5F9',
  },
  taskerBadges: {
    position: 'absolute',
    top: -4,
    right: -4,
    flexDirection: 'row',
    gap: 4,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  ratingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  taskerInfo: {
    alignItems: 'center',
  },
  taskerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  taskerSkills: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  taskerStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  availabilityDot: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  viewMoreCard: {
    width: '100%',
    height: 120,
  },
  viewMoreGradient: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  viewMoreIcon: {
    marginBottom: 8,
  },
  viewMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 2,
  },
  viewMoreSubtext: {
    fontSize: 13,
    color: '#64748B',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  // Skeleton styles
  skeleton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  skeletonTab: {
    alignItems: 'center',
    padding: 12,
  },
  skeletonTaskerCard: {
    width: (width - 64) / 2,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
});

export default ServiceCategoriesPreview;