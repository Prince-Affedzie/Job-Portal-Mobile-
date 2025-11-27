// components/client/RequestServiceFAB.js - Animated Version
import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const RequestServiceFAB = ({ 
  selectedCount, 
  onPress, 
  isVisible = true,
  isSelectionMode = false
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Scale animation when selection count changes
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [selectedCount, isSelectionMode]);

  if (!isVisible) return null;

  const getButtonConfig = () => {
    if (isSelectionMode) {
      if (selectedCount > 0) {
        return {
          text: `Send to ${selectedCount} Tasker${selectedCount > 1 ? 's' : ''}`,
          icon: 'paper-plane',
          gradient: ['#10B981', '#059669'],
          iconColor: '#FFFFFF'
        };
      } else {
        return {
          text: 'Cancel',
          icon: 'close',
          gradient: ['#6B7280', '#4B5563'],
          iconColor: '#FFFFFF'
        };
      }
    } else {
      return {
        text: 'Request Service',
        icon: 'add-circle',
        gradient: ['#6366F1', '#8B5CF6'],
        iconColor: '#FFFFFF'
      };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <Animated.View 
      style={[
        styles.fabContainer,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.fabTouchable}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={buttonConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fabGradient}
        >
          <View style={styles.fabContent}>
            <Ionicons 
              name={buttonConfig.icon} 
              size={22} 
              color={buttonConfig.iconColor} 
            />
            <Text style={styles.fabText}>
              {buttonConfig.text}
            </Text>
            {isSelectionMode && selectedCount > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{selectedCount}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  fabTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  fabGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  fabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    position: 'relative',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countPill: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
});

export default RequestServiceFAB;