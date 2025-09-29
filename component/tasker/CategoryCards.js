import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  {
    id: 'home_services',
    name: 'Home Services',
    icon: 'home-outline',
    color: '#6366F1',
    gradient: ['#6366F1', '#4F46E5']
  },
  {
    id: 'delivery_errands',
    name: 'Delivery & Errands',
    icon: 'car-outline',
    color: '#10B981',
    gradient: ['#10B981', '#059669']
  },
  {
    id: 'digital_services',
    name: 'Digital Services',
    icon: 'code-slash-outline',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706']
  },
  {
    id: 'writing_assistance',
    name: 'Writing & Assistance',
    icon: 'create-outline',
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626']
  },
  {
    id: 'learning_tutoring',
    name: 'Learning & Tutoring',
    icon: 'school-outline',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED']
  },
  {
    id: 'creative_tasks',
    name: 'Creative Tasks',
    icon: 'color-palette-outline',
    color: '#EC4899',
    gradient: ['#EC4899', '#DB2777']
  },
  {
    id: 'event_support',
    name: 'Event Support',
    icon: 'calendar-outline',
    color: '#06B6D4',
    gradient: ['#06B6D4', '#0891B2']
  },
  {
    id: 'others',
    name: 'Others',
    icon: 'ellipse-outline',
    color: '#64748B',
    gradient: ['#64748B', '#475569']
  }
];

const CategoryCards = ({ 
  selectedCategory, 
  onCategoryPress,
  showAllOption = true 
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollViewRef = useRef(null);

  const handleCategoryPress = (category) => {
    onCategoryPress(category);
  };

  const CategoryCard = ({ category, isSelected }) => (
    <TouchableOpacity
      onPress={() => handleCategoryPress(category)}
      style={styles.categoryCard}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={isSelected ? category.gradient : ['#FFFFFF', '#F8FAFC']}
        style={[
          styles.cardGradient,
          isSelected && styles.cardGradientSelected
        ]}
      >
        <View style={styles.cardContent}>
          <View style={[
            styles.iconContainer,
            isSelected && styles.iconContainerSelected
          ]}>
            <Ionicons 
              name={category.icon} 
              size={20} 
              color={isSelected ? '#FFFFFF' : category.color} 
            />
          </View>
          
          <Text style={[
            styles.categoryName,
            isSelected && styles.categoryNameSelected
          ]}>
            {category.name}
          </Text>
          
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        onScroll={(event) => setScrollOffset(event.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
      >
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={selectedCategory === category.id}
          />
        ))}
      </ScrollView>

      {/* Scroll indicator */}
      <View style={styles.scrollIndicator}>
        <View style={[
          styles.scrollTrack,
          { width: SCREEN_WIDTH - 40 }
        ]}>
          <Animated.View 
            style={[
              styles.scrollThumb,
              { 
                transform: [{
                  translateX: scrollOffset / (CATEGORIES.length * 2)
                }]
              }
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  viewAllTextActive: {
    color: '#6366F1',
    fontWeight: '700',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCard: {
    width: 120,
    height: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardGradient: {
    borderRadius: 16,
    height: '100%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardGradientSelected: {
    borderColor: 'transparent',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 16,
  },
  categoryNameSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollIndicator: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  scrollTrack: {
    height: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scrollThumb: {
    height: '100%',
    width: 60,
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
});

export default CategoryCards;