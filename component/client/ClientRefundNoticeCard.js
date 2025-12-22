import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const ClientRefundNoticeCard = ({ task, isTaskOwner }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(20))[0];

  // Check if user is the task owner AND task is in eligible statuses
  const eligibleStatuses = ['In-progress', 'Assigned', 'Review'];
  const shouldShowNotice = isTaskOwner && 
    task?.status && 
    eligibleStatuses.includes(task.status) &&
    !task?.completed;

  if (!shouldShowNotice) {
    return null;
  }

  const toggleExpanded = () => {
    if (isExpanded) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setIsExpanded(false));
    } else {
      setIsExpanded(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleSupportPress = (type) => {
    Alert.alert(
      `Need to ${type === 'withdraw' ? 'Withdraw Task' : 'Request Refund'}?`,
      `Contact our support team for assistance with ${type === 'withdraw' ? 'task withdrawal' : 'refund requests'}. We'll help you resolve any issues with the assigned worker.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Contact WhatsApp", 
          onPress: () => {
            const message = `Hello Workaflow Support,\n\nI need assistance regarding task ${type === 'withdraw' ? 'withdrawal' : 'refund'}:\n\nTask ID: ${task._id}\nTask: ${task.title}\nWorker: ${task.assignedWorkerName || 'Not specified'}\nStatus: ${task.status}\n\nPlease advise on the next steps.`;
            Linking.openURL(`https://wa.me/233505671577?text=${encodeURIComponent(message)}`);
          }
        },
        { 
          text: "Send Email", 
          onPress: () => {
            const subject = `${type === 'withdraw' ? 'Task Withdrawal' : 'Refund'} Request - ${task.title}`;
            const body = `Hello Workaflow Support,\n\nI need assistance regarding task ${type === 'withdraw' ? 'withdrawal' : 'refund'}:\n\nTask ID: ${task._id}\nTask Title: ${task.title}\nBudget: ₵${task.budget}\nAssigned Worker: ${task.assignedWorkerName || 'Not specified'}\nTask Status: ${task.status}\nReason for request: \n\nPlease advise on the process.`;
            Linking.openURL(`mailto:workaflow726@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
          }
        }
      ]
    );
  };

  const handleInfoPress = () => {
    Alert.alert(
      "Help & Support",
      "Need assistance with this task? Our support team can help with:\n\n• Task withdrawal\n• Refund requests\n• Dispute resolution\n• Communication issues",
      [{ text: "OK", style: "default" }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Floating Help Button */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isExpanded ? "close-circle" : "help-circle"} 
          size={22} 
          color="#8B5CF6" 
        />
      </TouchableOpacity>

      {/* Expanded Content - Now appears to the LEFT of the button */}
      {isExpanded && (
        <Animated.View 
          style={[
            styles.expandedContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.expandedHeader}>
            <Ionicons name="wallet-outline" size={20} color="#8B5CF6" />
            <Text style={styles.expandedTitle}>Need Help?</Text>
            <TouchableOpacity onPress={handleInfoPress} style={styles.infoButton}>
              <Ionicons name="information-circle-outline" size={18} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.expandedMessage}>
            Contact support for assistance with this task
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.withdrawButton]}
              onPress={() => handleSupportPress('withdraw')}
            >
              <Ionicons name="arrow-undo" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.refundButton]}
              onPress={() => handleSupportPress('refund')}
            >
              <Ionicons name="cash-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Refund</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.supportButton]}
              onPress={() => handleSupportPress('general')}
            >
              <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Support</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
   container: {
    position: 'absolute',
    top: 560,
    left: 16,
    zIndex: 100,
  },
  floatingButton: {
    width: 54,
    height: 54,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  expandedContent: {
    position: 'absolute',
    bottom: 50, // Appears above the button
    right: -width * 0.85 + 44, // Positions to the right of the button
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
    marginLeft: 8,
    flex: 1,
  },
  infoButton: {
    padding: 4,
  },
  expandedMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6D28D9',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  withdrawButton: {
    backgroundColor: '#EF4444',
  },
  refundButton: {
    backgroundColor: '#8B5CF6',
  },
  supportButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ClientRefundNoticeCard;