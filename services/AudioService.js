// services/AudioService.js
import { Audio } from 'expo-av';

class AudioService {
  static instance = null;
  static currentSound = null;
  static currentPlayerId = null;
  static isConfigured = false;

  static getInstance() {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  async configureForPlayback() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      AudioService.isConfigured = true;
      console.log('🔊 AudioService: Configured for playback');
    } catch (error) {
      console.error('🔊 AudioService: Failed to configure for playback:', error);
    }
  }

  async configureForRecording() {
    try {
      // First stop any playing audio
      await this.stopAllPlayback();
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('🔊 AudioService: Configured for recording');
    } catch (error) {
      console.error('🔊 AudioService: Failed to configure for recording:', error);
    }
  }

  async stopAllPlayback() {
    try {
      if (AudioService.currentSound) {
        console.log('🔊 AudioService: Force stopping & unloading current sound');

        // Store reference before nulling
        const soundToStop = AudioService.currentSound;
        
        // Clear references first to prevent any new operations
        AudioService.currentSound = null;
        AudioService.currentPlayerId = null;

        // Get status to check if we need to stop
        const status = await soundToStop.getStatusAsync();
        
        if (status.isLoaded) {
          // Stop if playing
          if (status.isPlaying) {
            await soundToStop.stopAsync();
          }
          // Always unload
          await soundToStop.unloadAsync();
        }
        
        console.log('🔊 AudioService: Successfully stopped all playback');
      }
    } catch (error) {
      console.error('🔊 AudioService: Error in stopAllPlayback:', error);
      // Still clear references even if stopping failed
      AudioService.currentSound = null;
      AudioService.currentPlayerId = null;
    }
  }

  async registerSound(sound, playerId) {
    // Stop any previously playing audio
    await this.stopAllPlayback();
    
    AudioService.currentSound = sound;
    AudioService.currentPlayerId = playerId;
    console.log(`🔊 AudioService: Registered sound for player ${playerId}`);
  }

  async unregisterSound(playerId) {
    if (AudioService.currentPlayerId === playerId) {
      const soundToUnload = AudioService.currentSound;
      
      AudioService.currentSound = null;
      AudioService.currentPlayerId = null;
      
      // Try to unload the sound if it exists
      if (soundToUnload) {
        try {
          const status = await soundToUnload.getStatusAsync();
          if (status.isLoaded) {
            await soundToUnload.unloadAsync();
          }
        } catch (error) {
          console.log('🔊 AudioService: Sound already unloaded');
        }
      }
      
      console.log(`🔊 AudioService: Unregistered sound for player ${playerId}`);
    }
  }

  isPlaying(playerId) {
    return AudioService.currentPlayerId === playerId && AudioService.currentSound !== null;
  }
}

export default AudioService;