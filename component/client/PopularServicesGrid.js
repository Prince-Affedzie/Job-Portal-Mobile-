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
    { name: 'Plumbing', icon: 'water' },
    { name: 'Electrical', icon: 'flash' },
    { name: 'Cleaning', icon: 'sparkles' },
    { name: 'Painting', icon: 'brush' },
    { name: 'Moving', icon: 'car' },
    { name: 'Repair', icon: 'build' },
    { name: 'Carpentry', icon: 'hammer' },
    { name: 'Gardening', icon: 'leaf' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Search</Text>
        <Text style={styles.subtitle}>
          Popular services to get started
        </Text>
      </View>
      
      <View style={styles.grid}>
        {popularServices.map((service, index) => (
          <TouchableOpacity
            key={service.name}
            style={styles.serviceChip}
            onPress={() => onServiceSelect(service.name)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={service.icon} size={20} color="#6366F1" />
            </View>
            <Text style={styles.serviceText}>{service.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
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
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    minWidth: '30%',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
});

export default PopularServicesGrid;