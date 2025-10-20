import React, { useState, useRef, useEffect ,useContext} from 'react';
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
    profileImage,
    submitOnboarding
  } = useTaskerOnboarding();

 const { user, logout, updateProfile } = useContext(AuthContext);

 useEffect(()=>{
  if(!user){
   navigate('AuthStack', { screen: 'Login' });
  }
 },[])
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const completeness = getCompleteness();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  function getCompleteness() {
    let completed = 0;
    if (bio?.trim()) completed++;
    if (phone?.trim()) completed++;
    if (location.region && location.city) completed++;
    if (skills.length > 0) completed++;
    if (profileImage?.uri) completed++;
    return Math.round((completed / 5) * 100);
  }

  const handleSubmit = async () => {
    if (completeness < 100) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete all sections before launching your profile.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await submitOnboarding();
      Alert.alert(
        '🎉 Welcome!',
        'Your profile is now live and ready to attract clients!',
        [
          { 
            text: 'Start Earning', 
            onPress: () => navigate('TaskerStack', { screen: 'AvailableTab' }),
            style: 'default'
          }
        ]
      );
    } catch (error) {
       const errorMessage = error.response?.data?.message || "Something went wrong";
      Alert.alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (section) => {
    navigate( section );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
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

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={wp('5%')} color="#007AFF" />
              <Text style={styles.sectionTitle}>Profile Photo</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit('ProfileImage')}
                accessibilityLabel="Edit profile photo"
                accessibilityHint="Go to the profile photo screen to change your photo"
              >
                <Ionicons name="create-outline" size={wp('4%')} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.profileImageContainer}>
              {profileImage?.uri ? (
                <Image source={{ uri: profileImage.uri }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={wp('8%')} color="#8E8E93" />
                  <Text style={styles.placeholderText}>No photo added</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={wp('5%')} color="#007AFF" />
              <Text style={styles.sectionTitle}>Professional Summary</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit('BasicInfo')}
                accessibilityLabel="Edit professional summary"
                accessibilityHint="Go to the basic info screen to edit your bio"
              >
                <Ionicons name="create-outline" size={wp('4%')} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionContent, !bio && styles.placeholderText]}>
              {bio || 'Add a compelling bio to attract clients'}
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="call-outline" size={wp('5%')} color="#007AFF" />
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit('BasicInfo')}
                accessibilityLabel="Edit contact information"
                accessibilityHint="Go to the basic info screen to edit your phone number"
              >
                <Ionicons name="create-outline" size={wp('4%')} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionContent, !phone && styles.placeholderText]}>
              {phone || 'Add your phone number'}
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={wp('5%')} color="#007AFF" />
              <Text style={styles.sectionTitle}>Location</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit('Location')}
                accessibilityLabel="Edit location"
                accessibilityHint="Go to the location screen to set your service area"
              >
                <Ionicons name="create-outline" size={wp('4%')} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionContent, !location.city && styles.placeholderText]}>
              {location.city && location.region ? `${location.city}, ${location.region}` : 'Set your service location'}
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="construct-outline" size={wp('5%')} color="#007AFF" />
              <Text style={styles.sectionTitle}>Skills ({skills.length})</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit('Skills')}
                accessibilityLabel="Edit skills"
                accessibilityHint="Go to the skills screen to add or remove skills"
              >
                <Ionicons name="create-outline" size={wp('4%')} color="#007AFF" />
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
              <Text style={styles.placeholderText}>Add skills to showcase your expertise</Text>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting || completeness < 100}
          activeOpacity={0.8}
          accessibilityLabel="Launch profile"
          accessibilityHint={completeness < 100 ? 'Complete all profile sections to launch' : 'Submit your profile to go live'}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={wp('5%')} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Launch Profile</Text>
            </>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: wp('5%'),
    paddingBottom: hp('10%'),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp('3%'),
  },
  headerTitle: {
    fontSize: wp('7%'),
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: hp('1%'),
  },
  headerSubtitle: {
    fontSize: wp('4%'),
    color: '#65676B',
    marginBottom: hp('2%'),
  },
  completenessContainer: {
    alignItems: 'center',
  },
  completenessText: {
    fontSize: wp('5%'),
    fontWeight: '600',
    color: '#007AFF',
  },
  completenessWarning: {
    fontSize: wp('3.5%'),
    color: '#FF3B30',
    marginTop: hp('1%'),
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: wp('3%'),
    padding: wp('5%'),
    marginBottom: hp('2%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  sectionTitle: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    color: '#1C1E21',
    marginLeft: wp('2%'),
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp('2%'),
  },
  editButtonText: {
    fontSize: wp('3.5%'),
    color: '#007AFF',
    marginLeft: wp('1%'),
  },
  profileImageContainer: {
    alignItems: 'center',
  },
  profileImage: {
    width: wp('30%'),
    height: wp('30%'),
    borderRadius: wp('15%'),
    borderWidth: 2,
    borderColor: '#E4E6EA',
  },
  profileImagePlaceholder: {
    width: wp('30%'),
    height: wp('30%'),
    borderRadius: wp('15%'),
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: wp('4%'),
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sectionContent: {
    fontSize: wp('4%'),
    color: '#1C1E21',
    lineHeight: wp('5.5%'),
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
  },
  skillTag: {
    backgroundColor: '#E7F3FF',
    borderRadius: wp('5%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1%'),
  },
  skillText: {
    fontSize: wp('3.5%'),
    color: '#007AFF',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    paddingBottom: Platform.OS === 'ios' ? hp('4%') : hp('3%'),
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
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    borderRadius: wp('3%'),
    opacity: 1,
  },
  submitButtonDisabled: {
    backgroundColor: '#AEAEB2',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: wp('4%'),
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: wp('2%'),
  },
};

export default ReviewScreen;