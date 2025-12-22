import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ServiceRequestFundingNoticeCard = ({ serviceRequest, isAssignedToUser }) => {
  // Check all conditions for showing the notice
  // For service requests, we check if it's assigned to the user and accepted
  const shouldShowNotice = isAssignedToUser && 
    serviceRequest?.status === ('Booked' || 'In-progress') && 
    serviceRequest?.status !== 'Completed' &&
    serviceRequest?.status !== 'Canceled';

  if (!shouldShowNotice) {
    return null;
  }

  const handleWhatsAppPress = () => {
    const message = `Hello Workaflow Support,\n\nI need equipment funding for service request:\n\nService ID: ${serviceRequest._id}\nService Type: ${serviceRequest.type}\nAmount: ₵${serviceRequest.budget || serviceRequest.finalCost || '0'}`;
    Linking.openURL(`https://wa.me/233505671577?text=${encodeURIComponent(message)}`);
  };

  const handleEmailPress = () => {
    const subject = `Equipment Funding - ${serviceRequest.type}`;
    const body = `Hello Workaflow Support,\n\nI need equipment funding for service request:\n\nService ID: ${serviceRequest._id}\nService Type: ${serviceRequest.type}\nAmount: ₵${serviceRequest.budget || serviceRequest.finalCost || '0'}\nClient: ${serviceRequest.client?.name || 'Not specified'}\n\nPlease advise on the next steps.`;
    Linking.openURL(`mailto:workaflow726@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={styles.badgeText}>Fully Funded</Text>
        </View>
      </View>

      {/* Main Content */}
      <Text style={styles.message}>
        Payment secured in escrow. Contact support if you need some of the funds for tools/equipment purchasing for this service.
      </Text>

      {/* Support Options */}
      <View style={styles.supportSection}>
        <TouchableOpacity 
          style={styles.supportButton}
          onPress={handleWhatsAppPress}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>WhatsApp</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.supportButton, styles.emailButton]}
          onPress={handleEmailPress}
        >
          <Ionicons name="mail" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>Email</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.supportButton, styles.callButton]}
          onPress={() => Linking.openURL('tel:+233505671577')}
        >
          <Ionicons name="call" size={16} color="#FFFFFF" />
          <Text style={styles.buttonText}>Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginHorizontal: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1E40AF',
    marginBottom: 16,
  },
  supportSection: {
    flexDirection: 'row',
    gap: 8,
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  emailButton: {
    backgroundColor: '#6366F1',
  },
  callButton: {
    backgroundColor: '#10B981',
    flex: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ServiceRequestFundingNoticeCard;