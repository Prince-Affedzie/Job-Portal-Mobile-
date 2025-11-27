import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import moment from 'moment';
import Header from "../../component/tasker/Header";
import { navigate } from '../../services/navigationService';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ApplicantProfileScreen({ route }) {
  const { applicant, taskId } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState(null);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [expandedPortfolioIndex, setExpandedPortfolioIndex] = useState(null);
  const videoRef = useRef(null);

  // Check if this is a bidder (from open-bid) or applicant (from fixed)
  const isBidder = applicant?.amount !== undefined;
  
  // Calculate ratings properly from the schema
  const calculateRatings = () => {
    const ratingsReceived = applicant?.ratingsReceived || [];
    const numberOfRatings = ratingsReceived.length;
    
    let averageRating = 0;
    if (numberOfRatings > 0) {
      const totalRating = ratingsReceived.reduce((sum, review) => sum + review.rating, 0);
      averageRating = totalRating / numberOfRatings;
    }
    
    const finalRating = numberOfRatings > 0 ? averageRating : applicant?.rating || 0;
    
    return {
      rating: parseFloat(finalRating.toFixed(1)),
      numberOfRatings,
      completedTasks: applicant?.completedTasks || 0,
      completionRate: applicant?.completionRate || 0,
      responseRate: applicant?.responseRate || 85,
      memberSince: applicant?.createdAt ? moment(applicant.createdAt).format('MMM YYYY') : 'Recently',
    };
  };

  const stats = calculateRatings();

  // Function to render stars with proper decimal handling
  const renderStars = (rating, size = 16) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.ratingStars}>
        {[...Array(fullStars)].map((_, index) => (
          <Ionicons
            key={`full-${index}`}
            name="star"
            size={size}
            color="#F59E0B"
          />
        ))}
        
        {hasHalfStar && (
          <Ionicons
            key="half"
            name="star-half"
            size={size}
            color="#F59E0B"
          />
        )}
        
        {[...Array(emptyStars)].map((_, index) => (
          <Ionicons
            key={`empty-${index}`}
            name="star-outline"
            size={size}
            color="#F59E0B"
          />
        ))}
      </View>
    );
  };

  // Enhanced file type detection
  const getFileType = (file) => {
    const name = (file.name || '').toLowerCase();
    const url = (file.publicUrl || '').toLowerCase();
    
    if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) || 
        url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
      return 'image';
    }
    if (name.match(/\.(mp4|mov|avi|mkv|webm)$/i) || 
        url.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      return 'video';
    }
    return 'document';
  };

  // Apply file types to all portfolio items
  const getPortfolioWithFileTypes = () => {
    if (!applicant?.workPortfolio) return [];
    
    return applicant.workPortfolio.map(item => ({
      ...item,
      files: (item.files || []).map(file => ({
        ...file,
        type: getFileType(file)
      }))
    }));
  };

  const portfolioWithTypes = getPortfolioWithFileTypes();

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
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={22} color="#6366F1" />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  // SIMPLIFIED: Direct media viewer - no intermediate modal
  const openMediaDirectly = (portfolioItem, fileIndex) => {
    const mediaFiles = portfolioItem.files.filter(file => 
      file.type === 'image' || file.type === 'video'
    );
    
    if (mediaFiles.length > 0) {
      setSelectedPortfolioItem(portfolioItem);
      setSelectedMediaIndex(fileIndex);
      setShowMediaViewer(true);
    }
  };

  // File Thumbnail Component with direct tap to view
  const FileThumbnail = ({ file, size = 150, onPress }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    if (file.type === 'image') {
      return (
        <TouchableOpacity onPress={onPress} style={[styles.fileThumbnail, { width: size, height: size }]}>
          {!imageLoaded && !imageError && (
            <View style={styles.thumbnailLoading}>
              <ActivityIndicator size="small" color="#6366F1" />
            </View>
          )}
          {imageError ? (
            <View style={styles.thumbnailError}>
              <Ionicons name="image-outline" size={32} color="#94A3B8" />
              <Text style={styles.thumbnailErrorText}>Failed to load</Text>
            </View>
          ) : (
            <Image
              source={{ uri: file.publicUrl }}
              style={[styles.fileThumbnailImage, !imageLoaded && styles.hiddenImage]}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
          <View style={styles.mediaTypeBadge}>
            <Ionicons name="image" size={12} color="#FFFFFF" />
            <Text style={styles.mediaTypeText}>IMAGE</Text>
          </View>
        </TouchableOpacity>
      );
    } else if (file.type === 'video') {
      return (
        <TouchableOpacity onPress={onPress} style={[styles.fileThumbnail, { width: size, height: size }]}>
          <Video
            source={{ uri: file.publicUrl }}
            style={styles.fileThumbnailImage}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            useNativeControls={false}
            isMuted={true}
          />
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={36} color="#FFFFFF" />
          </View>
          <View style={styles.mediaTypeBadge}>
            <Ionicons name="videocam" size={12} color="#FFFFFF" />
            <Text style={styles.mediaTypeText}>VIDEO</Text>
          </View>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity onPress={onPress} style={[styles.fileThumbnail, styles.documentThumbnail, { width: size, height: size }]}>
          <Ionicons name="document" size={32} color="#6366F1" />
          <View style={styles.documentBadge}>
            <Text style={styles.documentBadgeText}>
              {file.name?.split('.').pop()?.toUpperCase() || 'DOC'}
            </Text>
          </View>
          <Text style={styles.documentName} numberOfLines={2}>
            {file.name || 'Document'}
          </Text>
        </TouchableOpacity>
      );
    }
  };

  // Media Viewer Component (Simplified - opens directly)
  const MediaViewer = () => {
    if (!showMediaViewer || !selectedPortfolioItem) return null;

    const mediaFiles = selectedPortfolioItem.files.filter(file => 
      file.type === 'image' || file.type === 'video'
    );
    const currentFile = mediaFiles[selectedMediaIndex];

    if (!currentFile) return null;

    const closeMediaViewer = () => {
      setShowMediaViewer(false);
      videoRef.current?.pauseAsync();
    };

    const navigateMedia = (direction) => {
      const newIndex = (selectedMediaIndex + direction + mediaFiles.length) % mediaFiles.length;
      setSelectedMediaIndex(newIndex);
      videoRef.current?.pauseAsync();
    };

    const openInSystem = async () => {
      try {
        const supported = await Linking.canOpenURL(currentFile.publicUrl);
        if (supported) {
          await Linking.openURL(currentFile.publicUrl);
        } else {
          Alert.alert('Cannot Open', 'No app found to open this file');
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to open file');
      }
    };

    return (
      <Modal
        visible={showMediaViewer}
        animationType="fade"
        transparent={true}
        onRequestClose={closeMediaViewer}
      >
        <SafeAreaView style={styles.mediaViewerOverlay}>
          <TouchableOpacity style={styles.closeMediaButton} onPress={closeMediaViewer}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {mediaFiles.length > 1 && (
            <>
              <TouchableOpacity style={[styles.navButton, styles.navLeft]} onPress={() => navigateMedia(-1)}>
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navButton, styles.navRight]} onPress={() => navigateMedia(1)}>
                <Ionicons name="chevron-forward" size={28} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.mediaViewerContent}>
            {currentFile.type === 'image' ? (
              <Image
                source={{ uri: currentFile.publicUrl }}
                style={styles.fullMedia}
                resizeMode="contain"
              />
            ) : (
              <Video
                ref={videoRef}
                source={{ uri: currentFile.publicUrl }}
                style={styles.fullMedia}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
              />
            )}
          </View>

         {/* <View style={styles.mediaViewerFooter}>
            <Text style={styles.mediaViewerTitle}>
              {currentFile.name || 'Media File'}
            </Text>
            <Text style={styles.mediaViewerCounter}>
              {selectedMediaIndex + 1} of {mediaFiles.length}
            </Text>
          </View>

          <TouchableOpacity style={styles.openExternalButton} onPress={openInSystem}>
            <Ionicons name="open-outline" size={20} color="#FFFFFF" />
            <Text style={styles.openExternalText}>Open in app</Text>
          </TouchableOpacity>*/}
        </SafeAreaView>
      </Modal>
    );
  };

  // SIMPLIFIED: Portfolio item component with direct media access
  const PortfolioItem = ({ item, index }) => {
    const isExpanded = expandedPortfolioIndex === index;
    const mediaFiles = item.files.filter(file => file.type === 'image' || file.type === 'video');
    const documentFiles = item.files.filter(file => file.type === 'document');

    return (
      <View style={styles.portfolioCard}>
        {/* Header - Always visible */}
        <TouchableOpacity 
          style={styles.portfolioCardHeader}
          onPress={() => setExpandedPortfolioIndex(isExpanded ? null : index)}
        >
          <View style={styles.portfolioHeaderContent}>
            <Text style={styles.portfolioTitle} numberOfLines={2}>
              {item.title || 'Untitled Project'}
            </Text>
            {item.description && (
              <Text style={styles.portfolioDescriptionPreview} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#6366F1" 
          />
        </TouchableOpacity>

        {/* Media Grid - Show immediately when expanded */}
        {isExpanded && mediaFiles.length > 0 && (
          <View style={styles.portfolioMediaGrid}>
            {mediaFiles.map((file, fileIndex) => (
              <FileThumbnail
                key={fileIndex}
                file={file}
                size={width / 3 - 24}
                onPress={() => openMediaDirectly(item, fileIndex)}
              />
            ))}
          </View>
        )}

        {/* Documents and metadata - Always visible */}
        <View style={styles.portfolioMeta}>
          <View style={styles.fileCounts}>
            {mediaFiles.length > 0 && (
              <View style={styles.fileCount}>
                <Ionicons name="images" size={16} color="#6366F1" />
                <Text style={styles.fileCountText}>
                  {mediaFiles.length} media
                </Text>
              </View>
            )}
            {documentFiles.length > 0 && (
              <View style={styles.fileCount}>
                <Ionicons name="document" size={16} color="#10B981" />
                <Text style={styles.fileCountText}>
                  {documentFiles.length} doc{documentFiles.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
          
          {item.link && (
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => Linking.openURL(item.link)}
            >
              <Ionicons name="link" size={14} color="#6366F1" />
              <Text style={styles.linkButtonText}>Live Project</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick document access */}
        {isExpanded && documentFiles.length > 0 && (
          <View style={styles.documentsSection}>
            <Text style={styles.documentsTitle}>Documents</Text>
            {documentFiles.map((file, docIndex) => (
              <TouchableOpacity
                key={docIndex}
                style={styles.documentItem}
                onPress={() => Linking.openURL(file.publicUrl)}
              >
                <Ionicons name="document" size={20} color="#6366F1" />
                <Text style={styles.documentName} numberOfLines={1}>
                  {file.name || 'Document'}
                </Text>
                <Ionicons name="open-outline" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

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
              {applicant?.isVerified ? 'Verified Professional' : 'Not Verified'}
            </Text>
          </View>
          <View style={styles.verificationItem}>
            <Ionicons 
              name={applicant?.vettingStatus === 'approved' ? "checkmark-circle" : "time-outline"} 
              size={20} 
              color={applicant?.vettingStatus === 'approved' ? "#10B981" : "#F59E0B"} 
            />
            <Text style={styles.verificationText}>
              {applicant?.vettingStatus === 'approved' ? 'Background Verified' : 'Vetting in Progress'}
            </Text>
          </View>
        </View>
      </InfoSection>

      {/* Location */}
      {applicant?.location && (
        <InfoSection title="Location" icon="location-outline">
          <View style={styles.locationInfo}>
            <Ionicons name="location" size={16} color="#6366F1" />
            <Text style={styles.locationText}>
              {[applicant.location.region, applicant.location.city, applicant.location.town]
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
                  <View style={styles.experienceTitleContainer}>
                    <Text style={styles.experienceTitle}>{exp.jobTitle}</Text>
                    <Text style={styles.experienceCompany}>{exp.company}</Text>
                  </View>
                  <Text style={styles.experiencePeriod}>
                    {moment(exp.startDate).format('MMM YYYY')} -{' '}
                    {exp.endDate ? moment(exp.endDate).format('MMM YYYY') : 'Present'}
                  </Text>
                </View>
                {exp.description && (
                  <Text style={styles.experienceDescription}>{exp.description}</Text>
                )}
              </View>
            ))}
          </View>
        </InfoSection>
      )}
    </View>
  );

  const renderPortfolio = () => (
    <View>
      {portfolioWithTypes && portfolioWithTypes.length > 0 ? (
        <View>
          <InfoSection title="Work Portfolio" icon="images-outline">
            <Text style={styles.portfolioSubtitle}>
              {portfolioWithTypes.length} project{portfolioWithTypes.length !== 1 ? 's' : ''} • Tap to explore work samples
            </Text>
          </InfoSection>
          
          <View style={styles.portfolioGrid}>
            {portfolioWithTypes.map((item, index) => (
              <PortfolioItem key={index} item={item} index={index} />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyPortfolio}>
          <Ionicons name="images-outline" size={64} color="#E2E8F0" />
          <Text style={styles.emptyPortfolioTitle}>No Portfolio Yet</Text>
          <Text style={styles.emptyPortfolioText}>
            {applicant.name} hasn't added any work samples to their portfolio
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
            <Text style={styles.ratingNumber}>{stats.rating}</Text>
            {renderStars(stats.rating, 20)}
            <Text style={styles.ratingCount}>
              {stats.numberOfRatings} review{stats.numberOfRatings !== 1 ? 's' : ''}
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
                    {review.ratedBy?.name || 'Anonymous Client'}
                  </Text>
                  {renderStars(review.rating, 14)}
                </View>
                <Text style={styles.reviewDate}>
                  {moment(review.createdAt).fromNow()}
                </Text>
              </View>
              {review.feedback && (
                <Text style={styles.reviewComment}>"{review.feedback}"</Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyReviews}>
          <Ionicons name="star-outline" size={48} color="#E2E8F0" />
          <Text style={styles.emptyReviewsTitle}>No Reviews Yet</Text>
          <Text style={styles.emptyReviewsText}>
            {applicant.name} hasn't received any reviews yet
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Tasker Profile" showBackButton={true} />
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
      <Header title="Tasker Profile" showBackButton={true} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LinearGradient
          colors={['#1A1F3B', '#2D1B69']}
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
              <View style={styles.ratingContainer}>
                {renderStars(stats.rating, 16)}
                <Text style={styles.ratingText}>({stats.numberOfRatings})</Text>
              </View>
              <Text style={styles.memberSince}>
                Member since {stats.memberSince}
              </Text>
            </View>
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

      {/* Media Viewer - Only one modal needed now */}
      <MediaViewer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D325D',
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    borderRadius:24,
    marginHorizontal:12,
    marginTop:12,
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
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 6,
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
    marginTop: -40,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1,
  },
  bidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  bidTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  bidDetails: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 12,
  },
  bidInfo: {
    alignItems: 'flex-start',
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
    marginTop: 12,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    padding: 16,
    paddingTop: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
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
    paddingVertical: 8,
    borderRadius: 20,
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
    gap: 12,
  },
  verificationText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  experienceList: {
    gap: 16,
  },
  experienceItem: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  experienceTitleContainer: {
    flex: 1,
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  experienceCompany: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  experiencePeriod: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  experienceDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  // Enhanced Portfolio Styles
  portfolioSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  portfolioGrid: {
    gap: 16,
  },
  portfolioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  portfolioCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  portfolioHeaderContent: {
    flex: 1,
    marginRight: 8,
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  portfolioDescriptionPreview: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 18,
  },
  portfolioMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  portfolioMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileCounts: {
    flexDirection: 'row',
    gap: 12,
  },
  fileCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  linkButtonText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  documentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  documentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 6,
    gap: 8,
  },
  documentName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  emptyPortfolio: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 8,
  },
  emptyPortfolioTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyPortfolioText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  ratingsSummary: {
    alignItems: 'center',
  },
  ratingOverview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
  },
  reviewsList: {
    gap: 16,
  },
  reviewItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
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
  reviewDate: {
    fontSize: 14,
    color: '#64748B',
  },
  reviewComment: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  emptyReviews: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyReviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyReviewsText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  // File Thumbnail Styles
  fileThumbnail: {
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  fileThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  hiddenImage: {
    opacity: 0,
  },
  thumbnailLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  thumbnailError: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  thumbnailErrorText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  mediaTypeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  documentThumbnail: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    padding: 8,
  },
  documentBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  documentBadgeText: {
    color: '#6366F1',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Media Viewer Styles
  mediaViewerOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeMediaButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 25,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 30,
  },
  navLeft: {
    left: 20,
  },
  navRight: {
    right: 20,
  },
  mediaViewerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  fullMedia: {
    width: '100%',
    height: '100%',
  },
  mediaViewerFooter: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
  },
  mediaViewerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  mediaViewerCounter: {
    color: '#e5e7eb',
    fontSize: 13,
    marginTop: 4,
  },
  openExternalButton: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  openExternalText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});