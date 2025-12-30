import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const ReviewScreen = () => {
  const {
    bio,
    phone,
    location,
    skills,
    primaryService,
    secondaryServices,
    profileImage,
    submitOnboarding,
  } = useTaskerOnboarding();

  const { user } = useContext(AuthContext);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const completeness = (() => {
    let completed = 0;
    if (bio?.trim()) completed++;
    if (phone?.trim()) completed++;
    if (location.region && location.city) completed++;
    if (skills.length > 0) completed++;
    if (profileImage?.uri) completed++;
    return Math.round((completed / 5) * 100);
  })();

  useEffect(() => {
    if (!user) {
      navigate('AuthStack', { screen: 'Login' });
    }
  }, [user]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSubmit = async () => {
    if (completeness < 100) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete all sections before launching your profile.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await submitOnboarding();
      Alert.alert('🎉 Welcome!', 'Your profile is now live and ready to attract clients!', [
        {
          text: 'Start Earning',
          onPress: () => navigate('TaskerStack', { screen: 'AvailableTab' }),
        },
      ]);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Something went wrong';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (screen) => {
    navigate(screen);
  };

  return (
    <SafeAreaView  style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        style={{ flex: 1, }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <Animated.View style={{ opacity: fadeAnim, flexGrow: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Review Your Profile</Text>
            <Text style={styles.headerSubtitle}>Final check before going live</Text>
            <View style={styles.completenessContainer}>
              <Text style={styles.completenessText}>{completeness}% Complete</Text>
              {completeness < 100 && (
                <Text style={styles.completenessWarning}>
                  Complete all sections to launch your profile
                </Text>
              )}
            </View>
          </View>

          {/* Profile Photo */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Profile Photo</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit('ProfileImage')}
              >
                <Ionicons name="create-outline" size={20} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.profileImageContainer}>
              {profileImage?.uri ? (
                <Image source={{ uri: profileImage.uri }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={40} color="#8E8E93" />
                  <Text style={styles.placeholderText}>No photo added</Text>
                </View>
              )}
            </View>
          </View>

          {/* Professional Summary */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Professional Summary</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit('BasicInfo')}
              >
                <Ionicons name="create-outline" size={20} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionContent, !bio && styles.placeholderText]}>
              {bio || 'Add a compelling bio to attract clients'}
            </Text>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="call-outline" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit('BasicInfo')}
              >
                <Ionicons name="create-outline" size={20} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionContent, !phone && styles.placeholderText]}>
              {phone || 'Add your phone number'}
            </Text>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Location</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit('Location')}
              >
                <Ionicons name="create-outline" size={20} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionContent, !location.city && styles.placeholderText]}>
              {location.city && location.region
                ? `${location.city}, ${location.region}`
                : 'Set your service location'}
            </Text>
          </View>

          {/* Skills */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="construct-outline" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Skills ({skills.length})</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit('Skills')}
              >
                <Ionicons name="create-outline" size={20} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            {skills.length > 0 ? (
              <View style={styles.skillsContainer}>
                {skills.map((skill, index) => (
                  <View key={index} style={styles.skillTag}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.placeholderText}>
                Add skills to showcase your expertise
              </Text>
            )}
          </View>

          {/* Services */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase-outline" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Services</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit('Skills')}
              >
                <Ionicons name="create-outline" size={20} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {primaryService && (
              <View style={styles.serviceItem}>
                <View style={styles.primaryServiceBadge}>
                  <Ionicons name="star" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Primary Service</Text>
                  <Text style={styles.serviceValue}>
                    {typeof primaryService === 'object' ? primaryService.name : primaryService}
                  </Text>
                </View>
              </View>
            )}

            {secondaryServices && secondaryServices.length > 0 && (
              <View style={styles.secondaryServicesContainer}>
                <Text style={styles.secondaryServicesTitle}>
                  Additional Services ({secondaryServices.length})
                </Text>
                <View style={styles.secondaryServicesList}>
                  {secondaryServices.map((service, index) => (
                    <View key={index} style={styles.secondaryServiceChip}>
                      <Text style={styles.secondaryServiceText}>
                        {typeof service === 'object' ? service.name : service}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!primaryService && (!secondaryServices || secondaryServices.length === 0) && (
              <Text style={styles.placeholderText}>No services selected</Text>
            )}
          </View>

          {/* Bottom padding to ensure content isn't hidden */}
          <View style={{ height: 120 }} />
        </Animated.View>
      </ScrollView>

      {/* Fixed Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (isSubmitting || completeness < 100) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || completeness < 100}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Launch Profile</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 160,
     flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#65676B',
    marginBottom: 16,
  },
  completenessContainer: {
    alignItems: 'center',
  },
  completenessText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
  },
  completenessWarning: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1E21',
    marginLeft: 8,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#E4E6EA',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  sectionContent: {
    fontSize: 16,
    color: '#1C1E21',
    lineHeight: 24,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#E7F3FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skillText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  primaryServiceBadge: {
    backgroundColor: '#FF9500',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  serviceValue: {
    fontSize: 16,
    color: '#1C1E21',
    fontWeight: '500',
  },
  secondaryServicesContainer: {
    marginTop: 16,
  },
  secondaryServicesTitle: {
    fontSize: 16,
    color: '#65676B',
    marginBottom: 8,
    fontWeight: '500',
  },
  secondaryServicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryServiceChip: {
    backgroundColor: '#E7F3FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryServiceText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E6EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#AEAEB2',
  },
  submitButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ReviewScreen;