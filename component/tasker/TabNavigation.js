// component/tasker/TabNavigation.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TabNavigation = ({ activeTab, onTabChange, tabs, counts }) => {
  const getTabConfig = (tab) => {
    const configs = {
      applications: {
        label: 'Applications',
        icon: 'document-text-outline',
        activeIcon: 'document-text'
      },
      bids: {
        label: 'Bids',
        icon: 'pricetags-outline',
        activeIcon: 'pricetags'
      },
      service_requests: {
        label: 'Service Requests',
        icon: 'mail-outline',
        activeIcon: 'mail'
      }
    };
    return configs[tab] || configs.applications;
  };

  return (
    <View style={styles.tabContainer}>
      {Object.values(tabs).map(tab => {
        const config = getTabConfig(tab);
        const isActive = activeTab === tab;
        const count = counts[tab] || 0;

        return (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              isActive && styles.activeTab
            ]}
            onPress={() => onTabChange(tab)}
          >
            <Text style={[
              styles.tabText,
              isActive && styles.activeTabText
            ]}>
              {config.label} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
});

export default TabNavigation;