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
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [activeTab, setActiveTab] = useState('portfolio');
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [portfolioLayout, setPortfolioLayout] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const videoRef = useRef(null);

  const isBidder = applicant?.amount !== undefined;
  
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

  const renderStars = (rating, size = 16) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.ratingStars}>
        {[...Array(fullStars)].map((_, index) => (
          <Ionicons key={`full-${index}`} name="star" size={size} color="#F59E0B" />
        ))}
        {hasHalfStar && <Ionicons key="half" name="star-half" size={size} color="#F59E0B" />}
        {[...Array(emptyStars)].map((_, index) => (
          <Ionicons key={`empty-${index}`} name="star-outline" size={size} color="#F59E0B" />
        ))}
      </View>
    );
  };

  const getFileType = (file) => {
    const name = (file.name || '').toLowerCase();
    const url = (file.publicUrl || '').toLowerCase();
    
    if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) || url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
      return 'image';
    }
    if (name.match(/\.(mp4|mov|avi|mkv|webm)$/i) || url.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      return 'video';
    }
    if (name.match(/\.(pdf)$/i) || url.match(/\.(pdf)$/i)) {
      return 'pdf';
    }
    return 'document';
  };

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

  const portfolioCategories = portfolioWithTypes.reduce((categories, item) => {
    const category = item.category || 'uncategorized';
    if (!categories.includes(category)) {
      categories.push(category);
    }
    return categories;
  }, ['all']);

  const filteredPortfolio = selectedCategory === 'all' 
    ? portfolioWithTypes 
    : portfolioWithTypes.filter(item => (item.category || 'uncategorized') === selectedCategory);

  // InfoSection Component
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

  // Stats Grid Component
  const StatsGrid = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
          <Ionicons name="checkmark-done" size={20} color="#10B981" />
        </View>
        <Text style={styles.statValue}>{stats.completedTasks}</Text>
        <Text style={styles.statLabel}>Tasks Done</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
          <Ionicons name="star" size={20} color="#F59E0B" />
        </View>
        <Text style={styles.statValue}>{stats.rating}</Text>
        <Text style={styles.statLabel}>Rating</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#6366F120' }]}>
          <Ionicons name="chatbubble" size={20} color="#6366F1" />
        </View>
        <Text style={styles.statValue}>{stats.responseRate}%</Text>
        <Text style={styles.statLabel}>Response</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
          <Ionicons name="timer" size={20} color="#10B981" />
        </View>
        <Text style={styles.statValue}>{stats.completionRate}%</Text>
        <Text style={styles.statLabel}>On Time</Text>
      </View>
    </View>
  );

  // Portfolio Stats Card
  const PortfolioStatsCard = () => {
    const totalProjects = portfolioWithTypes.length;
    const totalMedia = portfolioWithTypes.reduce((count, item) => 
      count + (item.files?.filter(f => f.type === 'image' || f.type === 'video').length || 0), 0);
    const totalImages = portfolioWithTypes.reduce((count, item) => 
      count + (item.files?.filter(f => f.type === 'image').length || 0), 0);
    const totalVideos = portfolioWithTypes.reduce((count, item) => 
      count + (item.files?.filter(f => f.type === 'video').length || 0), 0);

    return (
      <View style={styles.portfolioStatsCard}>
        <View style={styles.portfolioStatsHeader}>
          <MaterialCommunityIcons name="chart-box-outline" size={24} color="#6366F1" />
          <Text style={styles.portfolioStatsTitle}>Portfolio Summary</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalProjects}</Text>
            <Text style={styles.statLabel}>Projects</Text>
            <MaterialCommunityIcons name="folder-multiple" size={16} color="#6366F1" />
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalMedia}</Text>
            <Text style={styles.statLabel}>Media Files</Text>
            <MaterialCommunityIcons name="image-multiple" size={16} color="#10B981" />
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalImages}</Text>
            <Text style={styles.statLabel}>Photos</Text>
            <MaterialCommunityIcons name="image" size={16} color="#F59E0B" />
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalVideos}</Text>
            <Text style={styles.statLabel}>Videos</Text>
            <MaterialCommunityIcons name="video" size={16} color="#EF4444" />
          </View>
        </View>
      </View>
    );
  };

  // Media Thumbnail Component
  const MediaThumbnail = ({ file, onPress, size = 'medium' }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    // Calculate thumbnail size accounting for container padding
    let thumbnailSize;
    if (size === 'large') {
      // Account for the parent container's padding (16px on each side = 32px total)
      thumbnailSize = width - 32; // Full width minus container padding
    } else if (size === 'small') {
      thumbnailSize = 80;
    } else {
      thumbnailSize = width / 3 - 16;
    }
    
    if (file.type === 'image') {
      return (
        <TouchableOpacity 
          onPress={onPress} 
          style={[styles.mediaThumbnail, { width: thumbnailSize, height: thumbnailSize }]}
          activeOpacity={0.8}
        >
          {!imageLoaded && !imageError && (
            <View style={styles.thumbnailLoading}>
              <ActivityIndicator size="small" color="#6366F1" />
            </View>
          )}
          {imageError ? (
            <View style={styles.thumbnailError}>
              <Ionicons name="image-outline" size={24} color="#94A3B8" />
              <Text style={styles.thumbnailErrorText}>Image</Text>
            </View>
          ) : (
            <Image
              source={{ uri: file.publicUrl }}
              style={[
                styles.mediaImage, 
                !imageLoaded && styles.hiddenImage,
                // Add this to ensure image fills the container properly
                { width: thumbnailSize, height: thumbnailSize }
              ]}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
          <View style={styles.mediaTypeBadge}>
            <Ionicons name="image" size={12} color="#FFFFFF" />
            <Text style={styles.mediaTypeText}>PHOTO</Text>
          </View>
        </TouchableOpacity>
      );
    } else if (file.type === 'video') {
      return (
        <TouchableOpacity 
          onPress={onPress} 
          style={[styles.mediaThumbnail, { width: thumbnailSize, height: thumbnailSize }]}
          activeOpacity={0.8}
        >
          <Video
            source={{ uri: file.publicUrl }}
            style={[styles.mediaImage, { width: thumbnailSize, height: thumbnailSize }]}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            useNativeControls={false}
            isMuted={true}
          />
          <View style={styles.videoOverlay}>
            <View style={styles.playButton}>
              <Ionicons name="play-circle" size={36} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.mediaTypeBadge}>
            <Ionicons name="videocam" size={12} color="#FFFFFF" />
            <Text style={styles.mediaTypeText}>VIDEO</Text>
          </View>
        </TouchableOpacity>
      );
    } else if (file.type === 'pdf') {
      return (
        <TouchableOpacity 
          onPress={onPress} 
          style={[styles.mediaThumbnail, styles.documentThumbnail, { width: thumbnailSize, height: thumbnailSize }]}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#EF4444', '#F87171']} style={[styles.documentGradient, { width: thumbnailSize }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={40} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.documentInfo}>
            <Text style={styles.documentTitle} numberOfLines={1}>
              {file.name || 'Document.pdf'}
            </Text>
            <Text style={styles.documentSize}>{file.size || 'PDF Document'}</Text>
          </View>
          <TouchableOpacity style={styles.downloadButton} onPress={() => Linking.openURL(file.publicUrl)}>
            <Ionicons name="download-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }
    return null;
  };
  // Portfolio Project Card
  const PortfolioProjectCard = ({ item, index }) => {
    const mediaFiles = item.files.filter(file => file.type === 'image' || file.type === 'video');
    const primaryMedia = mediaFiles[0];
    
    return (
      <View style={styles.projectCard}>
        {primaryMedia && (
          <MediaThumbnail file={primaryMedia} onPress={() => openMediaViewer(item, 0)} size="large" />
        )}
        <View style={styles.projectInfo}>
          <View style={styles.projectHeader}>
            <Text style={styles.projectTitle} numberOfLines={2}>{item.title || 'Untitled Project'}</Text>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
          </View>
          {item.description && (
            <Text style={styles.projectDescription} numberOfLines={2}>{item.description}</Text>
          )}
          <View style={styles.projectMeta}>
            <View style={styles.projectStats}>
              <View style={styles.projectStat}>
                <Ionicons name="images-outline" size={14} color="#64748B" />
                <Text style={styles.projectStatText}>{mediaFiles.length} media</Text>
              </View>
              {item.date && (
                <View style={styles.projectStat}>
                  <Ionicons name="calendar-outline" size={14} color="#64748B" />
                  <Text style={styles.projectStatText}>{moment(item.date).format('MMM YYYY')}</Text>
                </View>
              )}
            </View>
            {item.link && (
              <TouchableOpacity style={styles.projectLink} onPress={() => Linking.openURL(item.link)}>
                <Ionicons name="link-outline" size={16} color="#6366F1" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.viewProjectButton} onPress={() => openMediaViewer(item, 0)}>
            <Text style={styles.viewProjectText}>View Project</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Portfolio Gallery Item
  const PortfolioGalleryItem = ({ item, index }) => {
    const mediaFiles = item.files.filter(file => file.type === 'image' || file.type === 'video');
    
    return (
      <View style={styles.galleryCard}>
        <View style={styles.galleryHeader}>
          <View style={styles.galleryTitleSection}>
            <Text style={styles.galleryTitle} numberOfLines={1}>{item.title || 'Untitled Project'}</Text>
            {item.category && (
              <View style={styles.galleryCategory}>
                <Text style={styles.galleryCategoryText}>{item.category}</Text>
              </View>
            )}
          </View>
          <View style={styles.galleryActions}>
            {item.link && (
              <TouchableOpacity style={styles.linkIcon} onPress={() => Linking.openURL(item.link)}>
                <Ionicons name="open-outline" size={20} color="#6366F1" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.expandIcon} onPress={() => openMediaViewer(item, 0)}>
              <Ionicons name="expand" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
        {item.description && (
          <Text style={styles.galleryDescription} numberOfLines={2}>{item.description}</Text>
        )}
        {mediaFiles.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {mediaFiles.map((file, fileIndex) => (
              <MediaThumbnail key={fileIndex} file={file} onPress={() => openMediaViewer(item, fileIndex)} size="small" />
            ))}
          </ScrollView>
        )}
        <View style={styles.galleryFooter}>
          <Text style={styles.galleryDate}>
            {item.date ? moment(item.date).format('MMMM YYYY') : 'Date not specified'}
          </Text>
          <View style={styles.galleryStats}>
            <Ionicons name="images-outline" size={14} color="#64748B" />
            <Text style={styles.galleryStatsText}>
              {mediaFiles.length} {mediaFiles.length === 1 ? 'file' : 'files'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const openMediaViewer = (portfolioItem, fileIndex) => {
    const mediaFiles = portfolioItem.files.filter(file => file.type === 'image' || file.type === 'video');
    if (mediaFiles.length > 0) {
      setSelectedPortfolioItem(portfolioItem);
      setSelectedMediaIndex(fileIndex);
      setShowMediaViewer(true);
    }
  };

  const MediaViewer = () => {
    if (!showMediaViewer || !selectedPortfolioItem) return null;

    const mediaFiles = selectedPortfolioItem.files.filter(file => file.type === 'image' || file.type === 'video');
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

    return (
      <Modal visible={showMediaViewer} animationType="fade" transparent={true} onRequestClose={closeMediaViewer}>
        <View style={styles.mediaViewerContainer}>
          <View style={styles.mediaViewerHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={closeMediaViewer}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.mediaViewerTitle}>
              <Text style={styles.mediaTitle} numberOfLines={1}>
                {selectedPortfolioItem.title || 'Project Media'}
              </Text>
              <Text style={styles.mediaCounter}>
                {selectedMediaIndex + 1} of {mediaFiles.length}
              </Text>
            </View>
            {/*<TouchableOpacity style={styles.shareButton} onPress={() => Alert.alert('Share', 'Share functionality')}>
              <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>*/}
          </View>
          <View style={styles.mediaViewerContent}>
            {mediaFiles.length > 1 && (
              <TouchableOpacity style={[styles.navButton, styles.navLeft]} onPress={() => navigateMedia(-1)}>
                <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <View style={styles.mediaDisplay}>
              {currentFile.type === 'image' ? (
                <Image source={{ uri: currentFile.publicUrl }} style={styles.fullSizeImage} resizeMode="contain" />
              ) : (
                <Video ref={videoRef} source={{ uri: currentFile.publicUrl }} style={styles.fullSizeVideo} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay={false} />
              )}
            </View>
            {mediaFiles.length > 1 && (
              <TouchableOpacity style={[styles.navButton, styles.navRight]} onPress={() => navigateMedia(1)}>
                <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.mediaViewerFooter}>
            <Text style={styles.mediaDescription} numberOfLines={2}>
              {selectedPortfolioItem.description || 'No description available'}
            </Text>
            {/*<TouchableOpacity style={styles.downloadMediaButton} onPress={() => Linking.openURL(currentFile.publicUrl)}>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.downloadMediaText}>Download</Text>
            </TouchableOpacity>*/}
          </View>
        </View>
      </Modal>
    );
  };

  // FIXED: Render Overview Function
  const renderOverview = () => (
  <View>
    {/* Stats Grid */}
    <View style={styles.section}>
      <StatsGrid />
    </View>

    {/* Bio */}
    {applicant?.Bio && (
      <InfoSection title="About" icon="person-outline">
        <Text style={styles.bioText}>{applicant.Bio}</Text>
      </InfoSection>
    )}

    {/* Services Offered */}
    <InfoSection title="Services Offered" icon="briefcase-outline">
      {/* Primary Service */}
      {applicant?.primaryService?.serviceName && (
        <View style={styles.serviceSection}>
          <Text style={styles.serviceSectionTitle}>Primary Service</Text>
          <View style={styles.serviceItem}>
            <View style={[styles.serviceIcon, styles.primaryServiceIcon]}>
              <Ionicons name="star" size={16} color="#FFFFFF" />
            </View>
            <Text style={[styles.serviceName, styles.primaryServiceName]}>
              {applicant.primaryService.serviceName}
            </Text>
          </View>
        </View>
      )}

      {/* Secondary Services */}
      {applicant?.secondaryServices && applicant.secondaryServices.length > 0 && (
        <View style={styles.serviceSection}>
          <Text style={styles.serviceSectionTitle}>
            Also Offers These {applicant.secondaryServices.length} 
            {applicant.secondaryServices.length === 1 ? ' Service' : ' Services'}
          </Text>
          <View style={styles.secondaryServicesGrid}>
            {applicant.secondaryServices.map((service, index) => (
              <View key={index} style={styles.secondaryServiceItem}>
                <View style={styles.serviceIcon}>
                  <Ionicons name="checkmark" size={14} color="#3B82F6" />
                </View>
                <Text style={styles.secondaryServiceName} numberOfLines={2}>
                  {service.serviceName}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* No services message */}
      {!applicant?.primaryService?.serviceName && 
       (!applicant?.secondaryServices || applicant.secondaryServices.length === 0) && (
        <Text style={styles.noServicesText}>
          No services listed yet
        </Text>
      )}
    </InfoSection>

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
          <Ionicons name={applicant?.isVerified ? "checkmark-circle" : "close-circle"} size={20} color={applicant?.isVerified ? "#10B981" : "#EF4444"} />
          <Text style={styles.verificationText}>
            {applicant?.isVerified ? 'Verified Professional' : 'Not Verified'}
          </Text>
        </View>
        <View style={styles.verificationItem}>
          <Ionicons name={applicant?.vettingStatus === 'approved' ? "checkmark-circle" : "time-outline"} size={20} color={applicant?.vettingStatus === 'approved' ? "#10B981" : "#F59E0B"} />
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
  // FIXED: Render Experience Function
  const renderExperience = () => (
    <View>
      {/* Work Experience */}
      {applicant?.workExperience && applicant.workExperience.length > 0 ? (
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
      ) : (
        <View style={styles.emptyPortfolio}>
          <Ionicons name="briefcase-outline" size={64} color="#E2E8F0" />
          <Text style={styles.emptyPortfolioTitle}>No Experience Added</Text>
          <Text style={styles.emptyPortfolioText}>
            {applicant?.name || 'This tasker'} hasn't added any work experience yet.
          </Text>
        </View>
      )}
    </View>
  );

  // FIXED: Render Portfolio Function
  const renderPortfolio = () => (
    <View style={styles.portfolioSection}>
      <PortfolioStatsCard />
      
      {portfolioWithTypes.length > 0 ? (
        <>
          <View style={styles.portfolioControls}>
            <View style={styles.categoryFilter}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {portfolioCategories.map((category) => (
                  <TouchableOpacity key={category} style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonActive]} onPress={() => setSelectedCategory(category)}>
                    <Text style={[styles.categoryButtonText, selectedCategory === category && styles.categoryButtonTextActive]}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.layoutToggle}>
              <TouchableOpacity style={[styles.layoutButton, portfolioLayout === 'grid' && styles.layoutButtonActive]} onPress={() => setPortfolioLayout('grid')}>
                <Ionicons name="grid" size={20} color={portfolioLayout === 'grid' ? '#6366F1' : '#94A3B8'} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.layoutButton, portfolioLayout === 'list' && styles.layoutButtonActive]} onPress={() => setPortfolioLayout('list')}>
                <Ionicons name="list" size={20} color={portfolioLayout === 'list' ? '#6366F1' : '#94A3B8'} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.portfolioContent}>
            {portfolioLayout === 'grid' ? (
              <View style={styles.portfolioGrid}>
                {filteredPortfolio.map((item, index) => (
                  <PortfolioProjectCard key={index} item={item} index={index} />
                ))}
              </View>
            ) : (
              <View style={styles.portfolioList}>
                {filteredPortfolio.map((item, index) => (
                  <PortfolioGalleryItem key={index} item={item} index={index} />
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.portfolioSummary}>
            <Text style={styles.portfolioSummaryText}>
              Showing {filteredPortfolio.length} of {portfolioWithTypes.length} projects
            </Text>
            {filteredPortfolio.length === 0 && selectedCategory !== 'all' && (
              <Text style={styles.noProjectsText}>No projects found in "{selectedCategory}" category</Text>
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyPortfolio}>
          <MaterialCommunityIcons name="image-off-outline" size={80} color="#E2E8F0" />
          <Text style={styles.emptyPortfolioTitle}>No Portfolio Available</Text>
          <Text style={styles.emptyPortfolioText}>
            This tasker hasn't added any work samples to their portfolio yet.
          </Text>
          <Text style={styles.emptyPortfolioSubtext}>
            You can still review their skills, experience, and ratings to make a decision.
          </Text>
        </View>
      )}
    </View>
  );

  // FIXED: Render Reviews Function
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
            {applicant?.name || 'This tasker'} hasn't received any reviews yet
          </Text>
        </View>
      )}
    </View>
  );

  const tabs = [
    { id: 'portfolio', label: 'Portfolio', icon: 'images-outline' },
    { id: 'overview', label: 'Overview', icon: 'person-outline' },
    { id: 'experience', label: 'Experience', icon: 'briefcase-outline' },
    { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
  ];

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
        {/* FIXED: Profile Header with content */}
        <LinearGradient colors={['#1A1F3B', '#2D1B69']} style={styles.profileHeader}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {applicant?.profileImage ? (
                <Image source={{ uri: applicant.profileImage }} style={styles.avatar} />
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
              <Text style={styles.profileName}>{applicant?.name || 'Professional Tasker'}</Text>
              <Text style={styles.profileEmail}>{applicant?.email || 'No email provided'}</Text>
              <View style={styles.ratingContainer}>
                {renderStars(stats.rating, 16)}
                <Text style={styles.ratingText}>({stats.numberOfRatings})</Text>
              </View>
              <Text style={styles.memberSince}>Member since {stats.memberSince}</Text>
            </View>
          </View>
        
        </LinearGradient>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab.id} style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]} onPress={() => setActiveTab(tab.id)}>
              <Ionicons name={tab.icon} size={20} color={activeTab === tab.id ? '#FFFFFF' : '#64748B'} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
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

      <MediaViewer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D325D' },
  ratingStars: { flexDirection: 'row', alignItems: 'center' },
  scrollView: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B' },
  
  // Profile Header
  profileHeader: { padding: 20, paddingTop: 40, borderRadius: 24, marginHorizontal: 12, marginTop: 12 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatarContainer: { position: 'relative', marginRight: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: '600' },
  verifiedBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#10B981', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  profileEmail: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 6 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ratingText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', marginLeft: 6 },
  memberSince: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  statCard: { alignItems: 'center', flex: 1 },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  statLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center' },
  serviceSection: {
    marginBottom: 20,
  },
  serviceSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryServiceIcon: {
    backgroundColor: '#F59E0B',
  },
  serviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  primaryServiceName: {
    color: '#D97706',
  },
  
  // Secondary Services Grid
  secondaryServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  secondaryServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  secondaryServiceName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  noServicesText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },

  
  // Bid Card
  bidCard: { backgroundColor: '#FFFFFF', margin: 16, marginTop: -40, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, zIndex: 1 },
  bidHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  bidTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  bidDetails: { flexDirection: 'row', gap: 32, marginBottom: 12 },
  bidInfo: { alignItems: 'flex-start' },
  bidAmount: { fontSize: 24, fontWeight: '700', color: '#10B981', marginBottom: 4 },
  bidTimeline: { fontSize: 18, fontWeight: '600', color: '#6366F1', marginBottom: 4 },
  bidLabel: { fontSize: 14, color: '#64748B' },
  bidMessage: { fontSize: 14, color: '#475569', fontStyle: 'italic', lineHeight: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  
  // Tabs
  tabContainer: { flexDirection: 'row', marginHorizontal: 5, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, marginTop: 12, marginBottom: 8 },
  tabButton: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8, gap: 6 },
  tabButtonActive: { backgroundColor: '#6366F1' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  tabContent: { padding: 16, paddingTop: 8 },
  
  // Sections
  section: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  sectionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  bioText: { fontSize: 16, color: '#475569', lineHeight: 24 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillTag: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  skillText: { fontSize: 14, fontWeight: '500', color: '#6366F1' },
  verificationGrid: { gap: 12 },
  verificationItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verificationText: { fontSize: 16, color: '#475569', fontWeight: '500' },
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8 },
  locationText: { fontSize: 16, color: '#475569', fontWeight: '500' },
  
  // Experience
  experienceList: { gap: 16 },
  experienceItem: { padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#6366F1' },
  experienceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  experienceTitleContainer: { flex: 1 },
  experienceTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  experienceCompany: { fontSize: 14, color: '#6366F1', fontWeight: '500' },
  experiencePeriod: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  experienceDescription: { fontSize: 14, color: '#475569', lineHeight: 20 },
  
  // Portfolio
  portfolioSection: { padding: 16 },
portfolioStatsCard: { 
  backgroundColor: '#FFFFFF', 
  marginHorizontal: -12, // Negative margin to expand beyond parent padding
  marginLeft: -16,      // Adjust left to account for container padding
  marginRight: -16,     // Adjust right to account for container padding
  borderRadius: 16, 
  padding: 20, 
  marginBottom: 16, 
  shadowColor: '#000', 
  shadowOffset: { width: 0, height: 2 }, 
  shadowOpacity: 0.1, 
  shadowRadius: 8, 
  elevation: 3 
},  portfolioStatsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  portfolioStatsTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748B', marginBottom: 6, textAlign: 'center' },
  portfolioControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12 },
  categoryFilter: { flex: 1, marginRight: 12 },
  categoryScroll: { paddingRight: 8 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  categoryButtonActive: { backgroundColor: '#6366F1' },
  categoryButtonText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  categoryButtonTextActive: { color: '#FFFFFF' },
  layoutToggle: { flexDirection: 'row', gap: 8, backgroundColor: '#F1F5F9', padding: 4, borderRadius: 8 },
  layoutButton: { padding: 6, borderRadius: 6 },
  layoutButtonActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  portfolioContent: { marginBottom: 16 },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  portfolioList: { gap: 12 },
  projectCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  projectInfo: { padding: 12 },
  projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  projectTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B', flex: 1, marginRight: 8 },
  categoryBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  categoryText: { fontSize: 10, fontWeight: '600', color: '#6366F1' },
  projectDescription: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 12 },
  projectMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  projectStats: { flexDirection: 'row', gap: 12 },
  projectStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  projectStatText: { fontSize: 12, color: '#64748B' },
  projectLink: { padding: 4 },
  viewProjectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366F1', paddingVertical: 10, borderRadius: 8, gap: 8 },
  viewProjectText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  galleryCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  galleryTitleSection: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  galleryTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', flex: 1 },
  galleryCategory: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  galleryCategoryText: { fontSize: 11, fontWeight: '600', color: '#16A34A' },
  galleryActions: { flexDirection: 'row', gap: 8 },
  linkIcon: { padding: 4 },
  expandIcon: { padding: 4 },
  galleryDescription: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 12 },
  galleryScroll: { marginBottom: 12 },
  galleryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  galleryDate: { fontSize: 12, color: '#94A3B8' },
  galleryStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  galleryStatsText: { fontSize: 12, color: '#64748B' },
  portfolioSummary: { alignItems: 'center', paddingVertical: 16 },
  portfolioSummaryText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  noProjectsText: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  
  // Media Thumbnail
  mediaThumbnail: { borderRadius: 8, backgroundColor: '#F3F4F6', overflow: 'hidden', position: 'relative' },
  mediaImage: { width: '150%', height: '100%' },
  hiddenImage: { opacity: 0 },
  thumbnailLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  thumbnailError: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  thumbnailErrorText: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  playButton: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 20 },
  mediaTypeBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, gap: 4 },
  mediaTypeText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  documentThumbnail: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  documentGradient: { width: '100%', height: '70%', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  documentInfo: { padding: 8 },
  documentTitle: { fontSize: 12, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  documentSize: { fontSize: 10, color: '#64748B' },
  downloadButton: { position: 'absolute', bottom: 8, right: 8, backgroundColor: '#FFFFFF', padding: 4, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  
  // Reviews
  ratingsSummary: { alignItems: 'center' },
  ratingOverview: { alignItems: 'center', marginBottom: 20 },
  ratingNumber: { fontSize: 48, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  ratingCount: { fontSize: 16, color: '#64748B', marginTop: 8 },
  reviewsList: { gap: 16 },
  reviewItem: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reviewerInfo: { flex: 1 },
  reviewerName: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  reviewDate: { fontSize: 14, color: '#64748B' },
  reviewComment: { fontSize: 14, color: '#475569', lineHeight: 20, fontStyle: 'italic' },
  
  // Empty States
  emptyPortfolio: { alignItems: 'center', padding: 40, backgroundColor: '#FFFFFF', borderRadius: 16 },
  emptyPortfolioTitle: { fontSize: 20, fontWeight: '600', color: '#6B7280', marginTop: 16, marginBottom: 8 },
  emptyPortfolioText: { fontSize: 16, color: '#9CA3AF', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  emptyPortfolioSubtext: { fontSize: 14, color: '#D1D5DB', textAlign: 'center', lineHeight: 20 },
  emptyReviews: { alignItems: 'center', padding: 40, backgroundColor: '#FFFFFF', borderRadius: 16 },
  emptyReviewsTitle: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16, marginBottom: 8 },
  emptyReviewsText: { fontSize: 16, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
  
  // Media Viewer
  mediaViewerContainer: { flex: 1, backgroundColor: '#000' },
  mediaViewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  closeButton: { padding: 4 },
  mediaViewerTitle: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  mediaTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  mediaCounter: { fontSize: 13, color: '#E5E7EB' },
  shareButton: { padding: 4 },
  mediaViewerContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  mediaDisplay: { flex: 1 },
  fullSizeImage: { width: '100%', height: '100%' },
  fullSizeVideo: { width: '100%', height: '100%' },
  navButton: { padding: 16, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 30, marginHorizontal: 8 },
  navLeft: { marginLeft: 8 },
  navRight: { marginRight: 8 },
  mediaViewerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.5)' },
  mediaDescription: { flex: 1, fontSize: 14, color: '#FFFFFF', marginRight: 12 },
  downloadMediaButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  downloadMediaText: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
});