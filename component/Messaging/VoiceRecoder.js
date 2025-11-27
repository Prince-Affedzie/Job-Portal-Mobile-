// components/Messaging/VoiceRecorder.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AudioService from '../../services/AudioService'; 

const VoiceRecorder = ({ onSend, onCancel }) => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackInstance, setPlaybackInstance] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [audioLevel] = useState(new Animated.Value(0));
  const durationInterval = useRef(null);
  const isRecordingRef = useRef(false);
  const audioServiceRef = useRef(AudioService.getInstance());

  // One-time audio setup
  useEffect(() => {
    let isMounted = true;
    

    const setupAudio = async () => {
      try {
        console.log('🎤 Requesting audio permissions...');
        // Stop any currently playing audio using the service
        await audioServiceRef.current.stopAllPlayback();
        
        const { status } = await Audio.requestPermissionsAsync();
        
        if (!isMounted) return;
        
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Microphone access is needed to record voice messages');
          setHasPermission(false);
          return;
        }

        
        console.log('🎤 Configuring audio mode for recording...');
        await audioServiceRef.current.configureForRecording();

        if (isMounted) {
          setHasPermission(true);
        }
        console.log('🎤 Audio setup completed successfully');
      } catch (error) {
        console.error('🎤 Audio setup error:', error);
        if (isMounted) {
          setHasPermission(false);
          Alert.alert('Setup Error', 'Failed to configure audio system');
        }
      }
    };

    setupAudio();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if ((nextAppState === 'background' || nextAppState === 'inactive') && isRecording) {
        await stopRecording();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [isRecording]);

  const cleanup = async () => {
    try {
      // Clear interval
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      
      // Stop preview playback
      if (playbackInstance) {
        await playbackInstance.stopAsync();
        await playbackInstance.unloadAsync();
        setPlaybackInstance(null);
      }
      
      // Stop and cleanup recording if active
      if (recording) {
        const status = await recording.getStatusAsync();
        if (status.isRecording) {
          await recording.stopAndUnloadAsync();
        }
        setRecording(null);
      }
      
      // Reset audio level animation
      audioLevel.stopAnimation();
      
      // Switch back to playback mode when component unmounts
      await audioServiceRef.current.configureForPlayback();
      
      console.log('🎤 VoiceRecorder cleanup completed');
    } catch (error) {
      console.error('🎤 Cleanup error:', error);
    }
  };

  const startRecording = async () => {
    if (!hasPermission || isRecordingRef.current) return;

    try {
      console.log('🎤 Starting recording...');
      isRecordingRef.current = true;
      
      // Stop any playing audio first using the service
      await audioServiceRef.current.stopAllPlayback();
      
      // Ensure audio mode is set for recording
      await audioServiceRef.current.configureForRecording();

      const { recording: newRecording } = await Audio.Recording.createAsync(
        {
          android: {
            extension: '.m4a',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
            sampleRate: 48000,
            numberOfChannels: 1,
            bitRate: 96000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 96000,
          },
        }
      );

      setRecording(newRecording);
      setIsRecording(true);
      setDuration(0);
      setRecordedUri(null);

      // Timer for recording duration
      durationInterval.current = setInterval(() => {
        setDuration(prev => {
          // Auto-stop after 5 minutes (safety limit)
          if (prev >= 300) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Pulse animation for visual feedback
      Animated.loop(
        Animated.sequence([
          Animated.timing(audioLevel, { 
            toValue: 1, 
            duration: 400, 
            useNativeDriver: true 
          }),
          Animated.timing(audioLevel, { 
            toValue: 0.4, 
            duration: 300, 
            useNativeDriver: true 
          }),
        ])
      ).start();

      console.log('🎤 Recording started successfully');
    } catch (err) {
      console.error('🎤 Failed to start recording:', err);
      isRecordingRef.current = false;
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording || !isRecordingRef.current) return;

    console.log('🎤 Stopping recording...');
    isRecordingRef.current = false;
    setIsRecording(false);
    
    // Clear the interval timer
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    // Stop the animation
    audioLevel.stopAnimation();

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      console.log('🎤 Recording stopped, URI:', uri);

      if (!uri) {
        throw new Error('No recording URI returned');
      }

      // Verify the file exists
      const info = await FileSystem.getInfoAsync(uri);
      console.log('🎤 File info:', info);

      if (!info.exists) {
        throw new Error('Recorded file does not exist');
      }

      // Check minimum duration (at least 1 second)
      if (duration < 1) {
        Alert.alert('Too Short', 'Please record for at least 1 second');
        setRecordedUri(null);
        setDuration(0);
        setRecording(null);
        return;
      }

      setRecordedUri(uri);
      setRecording(null);

      // Switch back to playback mode for preview
      await audioServiceRef.current.configureForPlayback();

      console.log('🎤 Recording saved successfully');
    } catch (err) {
      console.error('🎤 Failed to stop recording:', err);
      Alert.alert('Save Error', 'Failed to save recording. Please try again.');
      setRecordedUri(null);
      setDuration(0);
      setRecording(null);
    }
  };

  const playPreview = async () => {
    if (!recordedUri || isPlaying) return;

    try {
      console.log('🎤 Playing preview...');
      
      // Stop any existing playback first
      if (playbackInstance) {
        await playbackInstance.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: recordedUri },
        { 
          shouldPlay: true,
          androidImplementation: 'MediaPlayer',
        },
        (status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        }
      );

      setPlaybackInstance(sound);
      setIsPlaying(true);
      console.log('🎤 Preview playing successfully');

    } catch (err) {
      console.error('🎤 Playback error:', err);
      Alert.alert('Playback Error', 'Could not play recording');
      setIsPlaying(false);
    }
  };

  const stopPreview = async () => {
    if (!playbackInstance) return;

    try {
      console.log('🎤 Stopping preview...');
      await playbackInstance.stopAsync();
      await playbackInstance.unloadAsync();
      setPlaybackInstance(null);
      setIsPlaying(false);
    } catch (err) {
      console.error('🎤 Stop preview error:', err);
    }
  };

  const sendRecording = async () => {
    if (!recordedUri) return;

    try {
      console.log('🎤 Sending recording...');
      
      // Stop preview if playing
      if (playbackInstance) {
        await stopPreview();
      }

      // Verify file still exists
      const info = await FileSystem.getInfoAsync(recordedUri);
      
      if (!info.exists) {
        Alert.alert('Error', 'Recording file not found');
        return;
      }

      const recordingData = {
        uri: recordedUri,
        duration,
        size: info.size,
        type: 'audio/m4a',
        name: `voice_message_${Date.now()}.m4a`,
      };

      console.log('🎤 Sending recording data:', recordingData);
      onSend(recordingData);

      // Reset state after sending
      setRecordedUri(null);
      setDuration(0);

    } catch (error) {
      console.error('🎤 Send recording error:', error);
      Alert.alert('Error', 'Failed to send recording');
    }
  };

  const cancel = async () => {
    try {
      console.log('🎤 Canceling recording...');
      
      // Stop preview if playing
      if (playbackInstance) {
        await stopPreview();
      }
      
      // Stop recording if in progress
      if (isRecording) {
        await stopRecording();
      }
      
      // Reset all state
      setRecordedUri(null);
      setDuration(0);
      setIsRecording(false);
      
      // Call the parent cancel callback
      onCancel();
      
    } catch (error) {
      console.error('🎤 Cancel error:', error);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const pulseScale = audioLevel.interpolate({
    inputRange: [0.4, 1],
    outputRange: [1, 1.25],
  });

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Microphone permission denied</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setHasPermission(null)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={cancel}>
          <Ionicons name="close" size={28} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.title}>Voice Message</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        {/* Recording State */}
        {isRecording ? (
          <View style={styles.recordingView}>
            <Animated.View style={[styles.micPulse, { transform: [{ scale: pulseScale }] }]}>
              <Ionicons name="mic" size={40} color="#FFF" />
            </Animated.View>
            <Text style={styles.recordingText}>Recording...</Text>
            <Text style={styles.timer}>{formatTime(duration)}</Text>
          </View>
        ) : recordedUri ? (
          /* Preview State */
          <View style={styles.preview}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={isPlaying ? stopPreview : playPreview}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={28}
                color="#6366F1"
              />
            </TouchableOpacity>
            <View style={styles.waveform}>
              <View style={styles.waveBar} />
              <View style={[styles.waveBar, { height: 20 }]} />
              <View style={[styles.waveBar, { height: 30 }]} />
              <View style={[styles.waveBar, { height: 25 }]} />
              <View style={styles.waveBar} />
            </View>
            <Text style={styles.duration}>{formatTime(duration)}</Text>
          </View>
        ) : (
          /* Ready State */
          <View style={styles.ready}>
            <Ionicons name="mic-outline" size={60} color="#9CA3AF" />
            <Text style={styles.instruction}>Tap and hold to record</Text>
            <Text style={styles.subInstruction}>Release to stop</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isRecording ? (
          <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
            <Ionicons name="square" size={28} color="#EF4444" />
            <Text style={styles.stopText}>Stop</Text>
          </TouchableOpacity>
        ) : recordedUri ? (
          <>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
              <Text style={styles.cancelText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendBtn} onPress={sendRecording}>
              <Ionicons name="send" size={24} color="#FFF" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.recordBtn}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={!hasPermission}
          >
            <Ionicons name="mic" size={32} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    alignItems: 'center',
    paddingVertical: 30,
    minHeight: 180,
    justifyContent: 'center',
  },
  ready: {
    alignItems: 'center',
  },
  instruction: {
    marginTop: 12,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  subInstruction: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  recordingView: {
    alignItems: 'center',
  },
  micPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recordingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  timer: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waveBar: {
    width: 4,
    height: 15,
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  duration: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 30,
    paddingHorizontal: 20,
    marginBottom:12,
    gap: 20,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  stopText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 16,
  },
  recordBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  sendBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    color: '#6B7280',
  },
  errorText: {
    textAlign: 'center',
    padding: 20,
    color: '#EF4444',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default VoiceRecorder;