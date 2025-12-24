// components/client/ServiceSuggestionsDropdown.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SERVICE_SUGGESTIONS = [
  'Plumbing', 'Electrical Repairs', 'Carpentry', 'Painting', 'Cleaning Services',
  'Graphic Design', 'Video Editing', 'Photo Editing', 'Digital Marketing',
  'Video Production', 'Interior Design',
  'Web Development', 'Animation', 'Motion Graphics',
  'Video Production',
  'Software Engineering', 'Mobile App Development', 'UI/UX Design',
  'SEO/SEM', 'Social Media Management', 'Data Analysis', 'AI/ML',
  'Cybersecurity', 'Network Administration', 'IT Support', 'Cloud Computing',
  'Logo Design', 'Brand Identity', 'Interior Decor', 'Interior Design',
  'Architectural Design', '3D Modeling', 'Animation', 'Motion Graphics',
  'Video Production', 'Photography', 'Illustration', 'Fashion Design',
  'Product Design', 'Creative Writing',
  'Gardening', 'Landscaping', 'Moving & Packing', 'Home Appliance Repair',
  'HVAC Installation', 'CCTV Installation', 'Home Security', 'Home Renovation',
  'Event Planning', 'Catering', 'Personal Training', 'Tutoring',
  'Language Translation', 'Virtual Assistance', 'Accounting',
];

const ServiceSuggestionsDropdown = ({ searchQuery, onSelect }) => {
  if (!searchQuery.trim() || searchQuery.trim().length === 0) {
    return null;
  }

  const query = searchQuery.toLowerCase();
  const filtered = SERVICE_SUGGESTIONS
    .filter(service => 
      service.toLowerCase().includes(query) ||
      query.split(' ').some(word => service.toLowerCase().includes(word))
    )
    .slice(0, 8);

  if (filtered.length === 0) {
    return null;
  }

  const handleServiceSelect = (serviceName) => {
    onSelect(serviceName);
  };

  const renderSuggestionItem = ({ item, index }) => (
    <React.Fragment key={`service-${index}`}>
      <TouchableOpacity 
        style={styles.suggestionItem} 
        onPress={() => handleServiceSelect(item)} 
        activeOpacity={0.7}
      >
        <View style={styles.suggestionIconContainer}>
          <Ionicons name="search" size={18} color="#6366F1" />
        </View>
        <Text style={styles.suggestionText} numberOfLines={1}>{item}</Text>
      </TouchableOpacity>
      {index < filtered.length - 1 && (
        <View style={styles.suggestionSeparator} />
      )}
    </React.Fragment>
  );

  return (
    <View style={styles.container}>
      <View style={styles.suggestionsHeader}>
        <Text style={styles.suggestionsTitle}>Suggested Services</Text>
        <Text style={styles.suggestionsSubtitle}>{filtered.length} suggestions</Text>
      </View>
      <FlatList
        data={filtered}
        renderItem={renderSuggestionItem}
        keyExtractor={(item, index) => `service-${index}`}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    zIndex: 1000,
    maxHeight: 350,
  },
  suggestionsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  suggestionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  suggestionsSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
  },
  suggestionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '400',
  },
  suggestionSeparator: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginLeft: 60,
  },
});

export default ServiceSuggestionsDropdown;