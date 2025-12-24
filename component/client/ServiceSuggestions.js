import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ServiceSuggestions = ({
  suggestions,
  onSelect,
  visible,
}) => {
  if (!visible || suggestions.length === 0) return null;

  return (
    <View style={styles.serviceSuggestionsContainer}>
      <View style={styles.suggestionsHeader}>
        <Text style={styles.suggestionsTitle}>Suggested Services</Text>
        <Text style={styles.suggestionsSubtitle}>{suggestions.length} suggestions</Text>
      </View>
      <View style={styles.suggestionsList}>
        {suggestions.map((item, index) => (
          <React.Fragment key={`service-${index}`}>
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <View style={styles.suggestionIconContainer}>
                <Ionicons name="search" size={18} color="#6366F1" />
              </View>
              <Text style={styles.suggestionText} numberOfLines={1}>
                {item}
              </Text>
            </TouchableOpacity>
            {index < suggestions.length - 1 && (
              <View style={styles.suggestionSeparator} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  serviceSuggestionsContainer: {
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
  suggestionsList: {
    paddingBottom: 8,
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

export default ServiceSuggestions;