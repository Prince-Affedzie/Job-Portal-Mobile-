// components/AudioPlayer.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Alert,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AudioService from '../../services/AudioService'; // Adjust path as needed

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AudioPlayer = ({ audioUri, duration, isMyMessage }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [position, setPosition] = useState(0);
  const [durationMs, setDurationMs] = useState(duration * 1000 || 0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

  const soundRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadingPromiseRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const playerId = useRef(`player_${Date.now()}_${Math.random()}`).current;
  const audioServiceRef = useRef(AudioService.getInstance());

  // Initialize component
  useEffect(() => {
    isMountedRef.current = true;
    
    const initAudio = async () => {
      await audioServiceRef.current.configureForPlayback();
      await loadAudio();
    };
    
    initAudio();
    
    return () => {
      isMountedRef.current = false;
      cleanupAudio();
      audioServiceRef.current.unregisterSound(playerId);
    };
  }, [audioUri]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        await pauseAudio();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  const onPlaybackStatusUpdate = useCallback((status) => {
    if (!isMountedRef.current) return;

    if (status.isLoaded && !isSeeking) {
      setPosition(status.positionMillis);
      
      if (durationMs > 0) {
        const progress = Math.min(1, status.positionMillis / durationMs);
        progressAnim.setValue(progress);
        setSeekPosition(progress);
      }

      if (status.didJustFinish) {
        handlePlaybackFinish();
      }
    } else if (status.error) {
      console.error('🔊 Playback status error:', status.error);
      setHasError(true);
      setIsPlaying(false);
    }
  }, [durationMs, isSeeking]);

  const handlePlaybackFinish = async () => {
    if (!isMountedRef.current) return;
    
    setIsPlaying(false);
    setPosition(0);
    progressAnim.setValue(0);
    setSeekPosition(0);
    
    // Unregister from audio service
    await audioServiceRef.current.unregisterSound(playerId);
  };

  const loadAudio = async () => {
    if (loadingPromiseRef.current) {
      console.log('🔊 Load already in progress, waiting...');
      return loadingPromiseRef.current;
    }

    loadingPromiseRef.current = (async () => {
      try {
        if (isMountedRef.current) {
          setIsLoading(true);
          setHasError(false);
        }

        console.log('🔊 Loading audio from:', audioUri);

        // Clean up any existing sound
        await cleanupAudio();

        // Create and load the sound
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { 
            shouldPlay: false,
            progressUpdateIntervalMillis: 250,
            androidImplementation: 'MediaPlayer',
            volume: 1.0,
            isMuted: false,
            isLooping: false,
          },
          onPlaybackStatusUpdate
        );

        if (!isMountedRef.current) {
          await sound.unloadAsync();
          return null;
        }

        soundRef.current = sound;

        if (status.isLoaded) {
          const actualDuration = status.durationMillis || duration * 1000 || 0;
          setDurationMs(actualDuration);
          console.log('🔊 Audio loaded successfully, duration:', actualDuration);
          
          return sound;
        } else if (status.error) {
          throw new Error(`Load failed: ${status.error}`);
        }
        
      } catch (error) {
        console.error('🔊 Error loading audio:', error);
        soundRef.current = null;
        if (isMountedRef.current) {
          setHasError(true);
        }
        return null;
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        loadingPromiseRef.current = null;
      }
    })();

    return loadingPromiseRef.current;
  };

  const cleanupAudio = async () => {
    const currentSound = soundRef.current;

    if (!currentSound) return;

    try {
      console.log('🔊 Cleaning up audio...');
      const status = await currentSound.getStatusAsync();

      if (status.isLoaded) {
        if (status.isPlaying) {
          await currentSound.stopAsync();
        }
        await currentSound.unloadAsync();
        console.log('🔊 Audio unloaded successfully');
      }
    } catch (error) {
      console.log('🔊 Cleanup error (ignored):', error.message);
    }

    soundRef.current = null;
    
    // Unregister from audio service
    await audioServiceRef.current.unregisterSound(playerId);
  };

  const pauseAudio = async () => {
    if (!isPlaying || !soundRef.current) return;
    
    try {
      const sound = soundRef.current;
      const status = await sound.getStatusAsync();
      
      if (status.isLoaded && status.isPlaying) {
        await sound.pauseAsync();
        if (isMountedRef.current) {
          setIsPlaying(false);
        }
        console.log('🔊 Audio paused');
      }
    } catch (error) {
      console.error('🔊 Error pausing audio:', error);
    }
  };

  const playPauseAudio = async () => {
    if (hasError) {
      await retryLoading();
      return;
    }

    if (loadingPromiseRef.current) {
      console.log('🔊 Still loading, please wait...');
      return;
    }

    try {
      let sound = soundRef.current;

      // If no sound, load it first
      if (!sound) {
        console.log('🔊 No sound instance, loading...');
        sound = await loadAudio();
        if (!sound) {
          throw new Error('Failed to load audio');
        }
      }

      // Verify sound is still valid before using
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        console.log('🔊 Sound not loaded, reloading...');
        soundRef.current = null;
        sound = await loadAudio();
        if (!sound) {
          throw new Error('Failed to reload audio');
        }
      }

      if (isPlaying) {
        await pauseAudio();
      } else {
        // Register this sound with the audio service (will stop others)
        await audioServiceRef.current.registerSound(sound, playerId);
        
        // If at the end, restart from beginning
        if (position >= durationMs - 100) {
          await sound.setPositionAsync(0);
          if (isMountedRef.current) {
            setPosition(0);
            progressAnim.setValue(0);
          }
        }
        
        await sound.playAsync();
        if (isMountedRef.current) {
          setIsPlaying(true);
        }
        console.log('🔊 Audio playing');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('🔊 Error playing/pausing audio:', error);
      if (isMountedRef.current) {
        setHasError(true);
        setIsPlaying(false);
      }
      
      Alert.alert(
        'Playback Error',
        'Unable to play audio. Please try again.',
        [{ text: 'OK', onPress: () => retryLoading() }]
      );
    }
  };

  const handleSeek = async (seekProgress) => {
    if (loadingPromiseRef.current || hasError) return;

    try {
      const sound = soundRef.current;
      if (!sound) return;

      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;

      const newPosition = seekProgress * durationMs;
      
      await sound.setPositionAsync(newPosition);
      if (isMountedRef.current) {
        setPosition(newPosition);
        setSeekPosition(seekProgress);
      }
      
      if (isPlaying && !status.isPlaying) {
        await sound.playAsync();
      }
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('🔊 Error seeking audio:', error);
    }
  };

  const restartAudio = async () => {
    if (loadingPromiseRef.current || hasError) return;

    try {
      const sound = soundRef.current;
      if (!sound) return;

      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;

      await sound.setPositionAsync(0);
      if (isMountedRef.current) {
        setPosition(0);
        progressAnim.setValue(0);
        setSeekPosition(0);
      }
      
      if (!isPlaying) {
        await audioServiceRef.current.registerSound(sound, playerId);
        await sound.playAsync();
        if (isMountedRef.current) {
          setIsPlaying(true);
        }
      }
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('🔊 Error restarting audio:', error);
    }
  };

  const retryLoading = async () => {
    console.log('🔊 Retrying audio load...');
    setHasError(false);
    setIsPlaying(false);
    setPosition(0);
    progressAnim.setValue(0);
    
    await cleanupAudio();
    await loadAudio();
  };

  const formatTime = (millis) => {
    if (!millis && millis !== 0) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !hasError && !isLoading,
      onMoveShouldSetPanResponder: () => !hasError && !isLoading,
      onPanResponderGrant: () => {
        if (hasError || isLoading) return;
        setIsSeeking(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gestureState) => {
        if (hasError || isLoading) return;
        const currentProgressValue = durationMs > 0 ? position / durationMs : 0;
        const seekDelta = (gestureState.dx / (SCREEN_WIDTH * 0.4));
        const newProgress = Math.max(0, Math.min(1, currentProgressValue + seekDelta));
        
        setSeekPosition(newProgress);
        progressAnim.setValue(newProgress);
      },
      onPanResponderRelease: () => {
        if (hasError || isLoading) return;
        handleSeek(seekPosition);
        setIsSeeking(false);
      },
    })
  ).current;

  const progressBarFillStyle = {
    width: progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    }),
    backgroundColor: isMyMessage ? '#FFFFFF' : '#6366F1',
    height: 4,
    borderRadius: 2,
  };

  if (hasError) {
    return (
      <View style={[
        styles.container,
        isMyMessage ? styles.myAudio : styles.theirAudio,
        styles.errorContainer
      ]}>
        <Ionicons 
          name="warning" 
          size={20} 
          color={isMyMessage ? "#FFFFFF" : "#EF4444"} 
        />
        <Text style={[
          styles.errorText,
          isMyMessage ? styles.myErrorText : styles.theirErrorText
        ]}>
          Audio unavailable
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={retryLoading}
        >
          <Ionicons 
            name="refresh" 
            size={16} 
            color={isMyMessage ? "#FFFFFF" : "#6366F1"} 
          />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      isMyMessage ? styles.myAudio : styles.theirAudio
    ]}>
      <TouchableOpacity 
        style={[
          styles.playButton,
          isMyMessage ? styles.myPlayButton : styles.theirPlayButton,
          (isLoading || hasError) && styles.disabledButton
        ]}
        onPress={playPauseAudio}
        disabled={isLoading || hasError}
      >
        {isLoading ? (
          <Ionicons 
            name="ellipsis-horizontal" 
            size={20} 
            color={isMyMessage ? "#FFFFFF" : "#6366F1"} 
          />
        ) : (
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={20} 
            color={isMyMessage ? "#FFFFFF" : "#6366F1"} 
          />
        )}
      </TouchableOpacity>

      <View style={styles.progressSection}>
        <View style={styles.timeContainer}>
          <Text style={[
            styles.timeText,
            isMyMessage ? styles.myTimeText : styles.theirTimeText
          ]}>
            {formatTime(position)}
          </Text>
          <Text style={[
            styles.timeText,
            isMyMessage ? styles.myTimeText : styles.theirTimeText
          ]}>
            {formatTime(durationMs)}
          </Text>
        </View>

        <View 
          style={[
            styles.progressBarContainer,
            isMyMessage ? styles.myProgressBarContainer : styles.theirProgressBarContainer
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.progressBarBackground} />
          <Animated.View style={[styles.progressBarFill, progressBarFillStyle]} />
          
          {!isLoading && !hasError && (
            <Animated.View 
              style={[
                styles.seekHandle,
                isMyMessage ? styles.mySeekHandle : styles.theirSeekHandle,
                {
                  left: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }
              ]}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginTop: 8,
    maxWidth: SCREEN_WIDTH * 0.8,
    minWidth: 230,
  },
  
  errorContainer: {
    opacity: 0.7,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  myPlayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  theirPlayButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  progressSection: {
    flex: 1,
    marginRight: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  theirTimeText: {
    color: '#6B7280',
  },
  progressBarContainer: {
    height: 20,
    justifyContent: 'center',
    borderRadius: 10,
    position: 'relative',
  },
  myProgressBarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  theirProgressBarContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  progressBarBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  progressBarFill: {
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 8,
  },
  seekHandle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: 2,
    marginLeft: -8,
  },
  mySeekHandle: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  theirSeekHandle: {
    backgroundColor: '#6366F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  restartButton: {
    padding: 8,
    opacity: 0.8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  myErrorText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  theirErrorText: {
    color: '#EF4444',
  },
  retryButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default AudioPlayer;