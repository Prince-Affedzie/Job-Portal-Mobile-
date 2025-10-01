import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import { navigate } from '../../services/navigationService';

const { width } = Dimensions.get('window');

export default function ApplicantProfileScreen({ route }) {
  const { applicant, taskId } = route.params;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Check if this is a bidder (from open-bid) or applicant (from fixed)
  const isBidder = applicant?.amount !== undefined;
  
  // Stats data
  const stats = {
    rating: applicant?.rating || 0,
    completedTasks: applicant?.completedTasks || 0,
    completionRate: applicant?.completionRate || 0,
    responseRate: applicant?.responseRate || 85,
    avgRating: applicant?.avgRating || 4.5,
    memberSince: applicant?.createdAt ? moment(applicant.createdAt).format('MMM YYYY') : 'Recently',
  };

  const handleContact = () => {
    if (applicant?.phone) {
      Alert.alert(
        "Contact Applicant",
        `Would you like to call or message ${applicant.name}?`,
        [
          { text: "Call", onPress: () => Linking.openURL(`tel:${applicant.phone}`) },
          { text: "Message", onPress: () => handleChat() },
          { text: "Cancel", style: "cancel" }
        ]
      );
    } else {
      handleChat();
    }
  };

  const handleChat = () => {
    navigate('Chat', {
      userId: applicant._id,
      userName: applicant.name,
      taskId: taskId
    });
  };

  const handleAssign = () => {
    Alert.alert(
      "Assign Task",
      `Assign this task to ${applicant.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Assign", 
          onPress: () => {
            // Navigate back to applicants screen with assignment intent
            navigate('TaskApplicants', { 
              taskId,
              assignApplicantId: applicant._id 
            });
          }
        }
      ]
    );
  };

  const handleAcceptBid = () => {
    Alert.alert(
      "Accept Bid",
      `Accept ${applicant.name}'s bid of ₵${applicant.amount}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Accept Bid", 
          onPress: () => {
            // Navigate back to applicants screen with bid acceptance intent
            navigate('TaskApplicants', { 
              taskId,
              acceptBidId: applicant._id 
            });
          }
        }
      ]
    );
  };

  const StatCard = ({ icon, value, label, color = '#6366F1' }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const InfoSection = ({ title, children, icon }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color="#6366F1" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const renderOverview = () => (
    <View>
      {/* Bio */}
      {applicant?.Bio && (
        <InfoSection title="About" icon="person-outline">
          <Text style={styles.bioText}>{applicant.Bio}</Text>
        </InfoSection>
      )}

      {/* Skills */}
      {applicant?.skills && applicant.skills.length > 0 && (
        <InfoSection title="Skills & Expertise" icon="construct-outline">
          <View style={styles.skillsContainer}>
            {applicant.skills.map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </InfoSection>
      )}

      {/* Verification Status */}
      <InfoSection title="Verification" icon="shield-checkmark-outline">
        <View style={styles.verificationGrid}>
          <View style={styles.verificationItem}>
            <Ionicons 
              name={applicant?.isVerified ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={applicant?.isVerified ? "#10B981" : "#EF4444"} 
            />
            <Text style={styles.verificationText}>
              {applicant?.isVerified ? 'Verified' : 'Not Verified'}
            </Text>
          </View>
          <View style={styles.verificationItem}>
            <Ionicons 
              name={applicant?.vettingStatus === 'approved' ? "checkmark-circle" : "time-outline"} 
              size={20} 
              color={applicant?.vettingStatus === 'approved' ? "#10B981" : "#F59E0B"} 
            />
            <Text style={styles.verificationText}>
              {applicant?.vettingStatus === 'approved' ? 'Background Checked' : 'Vetting Pending'}
            </Text>
          </View>
        </View>
      </InfoSection>

      {/* Location */}
      {applicant?.location && (
        <InfoSection title="Location" icon="location-outline">
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              {[applicant.location.region, applicant.location.city, applicant.location.suburb]
                .filter(Boolean)
                .join(', ')}
            </Text>
          </View>
        </InfoSection>
      )}
    </View>
  );

  const renderExperience = () => (
    <View>
      {/* Work Experience */}
      {applicant?.workExperience && applicant.workExperience.length > 0 && (
        <InfoSection title="Work Experience" icon="briefcase-outline">
          <View style={styles.experienceList}>
            {applicant.workExperience.map((exp, index) => (
              <View key={index} style={styles.experienceItem}>
                <View style={styles.experienceHeader}>
                  <Text style={styles.experienceTitle}>{exp.position}</Text>
                  <Text style={styles.experiencePeriod}>
                    {moment(exp.startDate).format('MMM YYYY')} -{' '}
                    {exp.endDate ? moment(exp.endDate).format('MMM YYYY') : 'Present'}
                  </Text>
                </View>
                <Text style={styles.experienceCompany}>{exp.company}</Text>
                {exp.description && (
                  <Text style={styles.experienceDescription}>{exp.description}</Text>
                )}
              </View>
            ))}
          </View>
        </InfoSection>
      )}

      {/* Education 
      {applicant?.education && applicant.education.length > 0 && (
        <InfoSection title="Education" icon="school-outline">
          <View style={styles.educationList}>
            {applicant.education.map((edu, index) => (
              <View key={index} style={styles.educationItem}>
                <View style={styles.educationHeader}>
                  <Text style={styles.educationDegree}>{edu.degree}</Text>
                  <Text style={styles.educationPeriod}>
                    {moment(edu.startDate).format('YYYY')} -{' '}
                    {edu.endDate ? moment(edu.endDate).format('YYYY') : 'Present'}
                  </Text>
                </View>
                <Text style={styles.educationSchool}>{edu.school}</Text>
                {edu.fieldOfStudy && (
                  <Text style={styles.educationField}>{edu.fieldOfStudy}</Text>
                )}
              </View>
            ))}
          </View>
        </InfoSection>
      )} */}
    </View>
  );

  const renderPortfolio = () => (
    <View>
      {/* Work Portfolio */}
      {applicant?.workPortfolio && applicant.workPortfolio.length > 0 ? (
        <InfoSection title="Portfolio" icon="images-outline">
          <View style={styles.portfolioGrid}>
            {applicant.workPortfolio.map((item, index) => (
              <View key={index} style={styles.portfolioItem}>
                {item.type === 'image' && item.url ? (
                  <Image
                    source={{ uri: item.url }}
                    style={styles.portfolioImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.portfolioPlaceholder}>
                    <Ionicons name="document-text-outline" size={24} color="#6B7280" />
                    <Text style={styles.portfolioText}>{item.title || 'Project'}</Text>
                  </View>
                )}
                <Text style={styles.portfolioTitle} numberOfLines={1}>
                  {item.title || 'Project'}
                </Text>
                {item.description && (
                  <Text style={styles.portfolioDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </InfoSection>
      ) : (
        <View style={styles.emptyPortfolio}>
          <Ionicons name="images-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyPortfolioText}>No portfolio items yet</Text>
          <Text style={styles.emptyPortfolioSubtext}>
            {applicant.name} hasn't added any work to their portfolio
          </Text>
        </View>
      )}
    </View>
  );

  const renderReviews = () => (
    <View>
      {/* Ratings Summary */}
      <InfoSection title="Ratings & Reviews" icon="star-outline">
        <View style={styles.ratingsSummary}>
          <View style={styles.ratingOverview}>
            <Text style={styles.ratingNumber}>{stats.avgRating}</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.floor(stats.avgRating) ? "star" : "star-outline"}
                  size={16}
                  color="#F59E0B"
                />
              ))}
            </View>
            <Text style={styles.ratingCount}>
              {applicant?.numberOfRatings || 0} reviews
            </Text>
          </View>
        </View>
      </InfoSection>

      {/* Individual Reviews */}
      {applicant?.ratingsReceived && applicant.ratingsReceived.length > 0 ? (
        <View style={styles.reviewsList}>
          {applicant.ratingsReceived.slice(0, 5).map((review, index) => (
            <View key={index} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                  <Text style={styles.reviewerName}>
                    {review.reviewerName || 'Anonymous'}
                  </Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= review.rating ? "star" : "star-outline"}
                        size={12}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewDate}>
                  {moment(review.createdAt).fromNow()}
                </Text>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyReviews}>
          <Ionicons name="star-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyReviewsText}>No reviews yet</Text>
          <Text style={styles.emptyReviewsSubtext}>
            {applicant.name} hasn't received any reviews yet
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Profile" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <Header title="Profile" showBackButton={true} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.profileHeader}
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {applicant?.profileImage ? (
                <Image
                  source={{ uri: applicant.profileImage }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {applicant?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              {applicant?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{applicant?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{applicant?.email}</Text>
              {applicant?.phone && (
                <Text style={styles.profilePhone}>{applicant.phone}</Text>
              )}
              <Text style={styles.memberSince}>
                Member since {stats.memberSince}
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="star"
              value={stats.rating}
              label="Rating"
              color="#F59E0B"
            />
            <StatCard
              icon="checkmark-done"
              value={stats.completedTasks}
              label="Completed"
              color="#10B981"
            />
            <StatCard
              icon="trending-up"
              value={`${stats.completionRate}%`}
              label="Success Rate"
              color="#6366F1"
            />
            <StatCard
              icon="flash"
              value={`${stats.responseRate}%`}
              label="Response Rate"
              color="#8B5CF6"
            />
          </View>
        </LinearGradient>

        {/* Bid Information (if from open-bid) */}
        {isBidder && (
          <View style={styles.bidCard}>
            <View style={styles.bidHeader}>
              <Ionicons name="pricetag-outline" size={24} color="#6366F1" />
              <Text style={styles.bidTitle}>Bid Details</Text>
            </View>
            <View style={styles.bidDetails}>
              <View style={styles.bidInfo}>
                <Text style={styles.bidAmount}>₵{applicant.amount}</Text>
                <Text style={styles.bidLabel}>Bid Amount</Text>
              </View>
              {applicant.timeline && (
                <View style={styles.bidInfo}>
                  <Text style={styles.bidTimeline}>{applicant.timeline} days</Text>
                  <Text style={styles.bidLabel}>Timeline</Text>
                </View>
              )}
            </View>
            {applicant.message && (
              <Text style={styles.bidMessage}>"{applicant.message}"</Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.contactButton]}
            onPress={handleContact}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>

          {isBidder ? (
            <TouchableOpacity 
              style={[styles.actionButton, styles.assignButton]}
              onPress={handleAcceptBid}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.assignButtonText}>Accept Bid</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, styles.assignButton]}
              onPress={handleAssign}
            >
              <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
              <Text style={styles.assignButtonText}>Assign Task</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {['overview', 'experience', 'portfolio', 'reviews'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'experience' && renderExperience()}
          {activeTab === 'portfolio' && renderPortfolio()}
          {activeTab === 'reviews' && renderReviews()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  profileHeader: {
    padding: 20,
    paddingTop: 40,
    marginHorizontal:10,
    borderRadius: 10,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#10B981',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  bidCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  bidTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  bidDetails: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  bidInfo: {
    alignItems: 'center',
  },
  bidAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  bidTimeline: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 4,
  },
  bidLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  bidMessage: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  contactButton: {
    backgroundColor: '#6366F1',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assignButton: {
    backgroundColor: '#10B981',
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    padding: 16,
    paddingTop: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
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
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  bioText: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  verificationGrid: {
    gap: 12,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationText: {
    fontSize: 16,
    color: '#475569',
  },
  locationInfo: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#475569',
  },
  experienceList: {
    gap: 16,
  },
  experienceItem: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  experiencePeriod: {
    fontSize: 14,
    color: '#64748B',
  },
  experienceCompany: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
    marginBottom: 4,
  },
  experienceDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  educationList: {
    gap: 16,
  },
  educationItem: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  educationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  educationDegree: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  educationPeriod: {
    fontSize: 14,
    color: '#64748B',
  },
  educationSchool: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
    marginBottom: 2,
  },
  educationField: {
    fontSize: 14,
    color: '#475569',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  portfolioItem: {
    width: (width - 64) / 2,
    marginBottom: 16,
  },
  portfolioImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  portfolioPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  portfolioText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  portfolioTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  portfolioDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  emptyPortfolio: {
    alignItems: 'center',
    padding: 40,
  },
  emptyPortfolioText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyPortfolioSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  ratingsSummary: {
    alignItems: 'center',
    padding: 20,
  },
  ratingOverview: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 16,
    color: '#64748B',
  },
  reviewsList: {
    gap: 16,
  },
  reviewItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 14,
    color: '#64748B',
  },
  reviewComment: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  emptyReviews: {
    alignItems: 'center',
    padding: 40,
  },
  emptyReviewsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyReviewsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});