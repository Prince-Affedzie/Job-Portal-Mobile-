import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';

const { width: screenWidth } = Dimensions.get('window');

export const MediaDisplay = ({ media = [], style }) => {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
  const [videoStatus, setVideoStatus] = useState({});
  
  // FIX: Use a single ref object that stores multiple refs
  const videoRefs = useRef({});

  // Initialize refs when media changes
  useEffect(() => {
    media.forEach((_, index) => {
      if (!videoRefs.current[index]) {
        videoRefs.current[index] = React.createRef();
      }
    });
  }, [media]);

  if (!media || media.length === 0) {
    return null;
  }

  const handleMediaPress = (index) => {
    setSelectedMediaIndex(index);
  };

  const closeModal = () => {
    // Pause all videos when closing modal
    Object.values(videoRefs.current).forEach(ref => {
      if (ref && ref.current) {
        ref.current.pauseAsync();
      }
    });
    setSelectedMediaIndex(null);
  };

  const navigateMedia = (direction) => {
    const newIndex = selectedMediaIndex + direction;
    if (newIndex >= 0 && newIndex < media.length) {
      // Pause current video before navigating
      if (media[selectedMediaIndex].type === 'video' && videoRefs.current[selectedMediaIndex]) {
        videoRefs.current[selectedMediaIndex].current.pauseAsync();
      }
      setSelectedMediaIndex(newIndex);
    }
  };

  const onPlaybackStatusUpdate = (index, status) => {
    setVideoStatus(prev => ({
      ...prev,
      [index]: status
    }));
  };

  const togglePlayPause = async (index) => {
    if (videoRefs.current[index] && videoRefs.current[index].current) {
      const status = videoStatus[index];
      if (status && status.isPlaying) {
        await videoRefs.current[index].current.pauseAsync();
      } else {
        await videoRefs.current[index].current.playAsync();
      }
    }
  };

  const renderMediaItem = ({ item, index }) => {
    return (
      <TouchableOpacity
        style={styles.mediaItem}
        onPress={() => handleMediaPress(index)}
        activeOpacity={0.8}
      >
        {item.type === 'image' ? (
          <Image
            source={{ uri: item.url }}
            style={styles.mediaThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.videoContainer}>
            <Video
              ref={videoRefs.current[index]}
              source={{ uri: item.url }}
              style={styles.mediaThumbnail}
              resizeMode="cover"
              shouldPlay={false}
              isLooping={false}
              useNativeControls={false}
              onPlaybackStatusUpdate={(status) => onPlaybackStatusUpdate(index, status)}
            />
            <View style={styles.videoOverlay}>
              <Ionicons name="play-circle" size={40} color="#FFFFFF" />
            </View>
            <View style={styles.videoBadge}>
              <Ionicons name="videocam" size={12} color="#FFFFFF" />
              <Text style={styles.videoBadgeText}>VIDEO</Text>
            </View>
          </View>
        )}
        <View style={styles.mediaIndicator}>
          <Ionicons 
            name={item.type === 'image' ? 'image' : 'videocam'} 
            size={12} 
            color="#FFFFFF" 
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderModalContent = () => {
    if (selectedMediaIndex === null) return null;

    const mediaItem = media[selectedMediaIndex];
    const isVideo = mediaItem.type === 'video';

    return (
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {isVideo ? 'Video' : 'Image'} {selectedMediaIndex + 1} of {media.length}
          </Text>
          <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Media Content */}
        <View style={styles.mediaContent}>
          {isVideo ? (
            <Video
              ref={videoRefs.current[selectedMediaIndex]}
              source={{ uri: mediaItem.url }}
              style={styles.fullscreenMedia}
              resizeMode="contain"
              shouldPlay={true}
              isLooping={false}
              useNativeControls
              onPlaybackStatusUpdate={(status) => onPlaybackStatusUpdate(selectedMediaIndex, status)}
            />
          ) : (
            <Image
              source={{ uri: mediaItem.url }}
              style={styles.fullscreenMedia}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Navigation Arrows */}
        {media.length > 1 && (
          <>
            {selectedMediaIndex > 0 && (
              <TouchableOpacity 
                style={[styles.navArrow, styles.leftArrow]}
                onPress={() => navigateMedia(-1)}
              >
                <Ionicons name="chevron-back" size={30} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {selectedMediaIndex < media.length - 1 && (
              <TouchableOpacity 
                style={[styles.navArrow, styles.rightArrow]}
                onPress={() => navigateMedia(1)}
              >
                <Ionicons name="chevron-forward" size={30} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Thumbnail Strip */}
        {media.length > 1 && (
          <View style={styles.thumbnailStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {media.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.thumbnailItem,
                    index === selectedMediaIndex && styles.selectedThumbnail
                  ]}
                  onPress={() => {
                    if (media[selectedMediaIndex].type === 'video' && videoRefs.current[selectedMediaIndex]) {
                      videoRefs.current[selectedMediaIndex].current.pauseAsync();
                    }
                    setSelectedMediaIndex(index);
                  }}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  {item.type === 'video' && (
                    <View style={styles.thumbnailVideoBadge}>
                      <Ionicons name="videocam" size={8} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="images" size={20} color="#1E293B" />
        <Text style={styles.sectionTitle}>
          Media ({media.length})
        </Text>
      </View>

      <FlatList
        data={media}
        renderItem={renderMediaItem}
        keyExtractor={(item, index) => `media-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mediaList}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={screenWidth * 0.8 + 12}
      />

      <Modal
        visible={selectedMediaIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        {renderModalContent()}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  mediaList: {
    paddingHorizontal: 4,
  },
  mediaItem: {
    width: screenWidth * 0.8,
    height: 200,
    borderRadius: 16,
    marginHorizontal: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  videoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  videoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  mediaIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  mediaContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenMedia: {
    width: '100%',
    height: '100%',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    zIndex: 10,
  },
  leftArrow: {
    left: 20,
  },
  rightArrow: {
    right: 20,
  },
  thumbnailStrip: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  thumbnailItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThumbnail: {
    borderColor: '#6366F1',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailVideoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 2,
    borderRadius: 4,
  },
});

