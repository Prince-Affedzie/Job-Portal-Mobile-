// PopularServicesGrid.js - UPDATED WITH MIXED CATEGORIES
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PopularServicesGrid = ({ onServiceSelect }) => {
  const popularServices = [

     { name: 'Plumbing', icon: 'water', category: 'home', color: '#059669' },
    { name: 'Electrical', icon: 'flash', category: 'home', color: '#059669' },
    { name: 'Cleaning', icon: 'sparkles', category: 'home', color: '#059669' },
    { name: 'Painting', icon: 'brush', category: 'home', color: '#059669' },
    { name: 'Carpentry', icon: 'hammer', category: 'home', color: '#059669' },
    { name: 'Gardening', icon: 'leaf', category: 'home', color: '#059669' },

     { name: 'Video Editing', icon: 'videocam', category: 'creative', color: '#7C3AED' },
    { name: 'Photography', icon: 'camera', category: 'creative', color: '#7C3AED' },
    { name: 'UI/UX Design', icon: 'desktop', category: 'tech', color: '#2563EB' },
    // Digital & Tech Services
    { name: 'Web Development', icon: 'code', category: 'tech', color: '#2563EB' },
    { name: 'Graphic Design', icon: 'color-palette', category: 'creative', color: '#7C3AED' },
    { name: 'Mobile App', icon: 'phone-portrait', category: 'tech', color: '#2563EB' },
    
    // Creative & Design Services
   
    
    // Home & Professional Services
   
  ];

  const getCategoryColor = (category) => {
    switch(category) {
      case 'tech': return '#2563EB'; // Blue for Digital & Tech
      case 'creative': return '#7C3AED'; // Purple for Creative & Design
      case 'home': return '#059669'; // Green for Home & Professional
      default: return '#6366F1';
    }
  };

  const getCategoryName = (category) => {
    switch(category) {
      case 'tech': return 'Tech';
      case 'creative': return 'Creative';
      case 'home': return 'Home';
      default: return 'Service';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Search</Text>
        <Text style={styles.subtitle}>
          Popular services across all categories
        </Text>
        
        {/* Category Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.legendText}>Digital & Tech</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#7C3AED' }]} />
            <Text style={styles.legendText}>Creative & Design</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
            <Text style={styles.legendText}>Home & Professional</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.grid}>
        {popularServices.map((service, index) => {
          const categoryColor = getCategoryColor(service.category);
          
          return (
            <TouchableOpacity
              key={service.name + index}
              style={[
                styles.serviceChip,
                { borderColor: categoryColor + '30' } // 30 = 20% opacity
              ]}
              onPress={() => onServiceSelect(service.name)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: categoryColor + '15' }]}>
                <Ionicons 
                  name={service.icon} 
                  size={20} 
                  color={categoryColor} 
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.serviceText}>{service.name}</Text>
                <Text style={[styles.categoryTag, { color: categoryColor }]}>
                  {getCategoryName(service.category)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    minWidth: '47%',
    flexGrow: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  serviceText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default PopularServicesGrid;