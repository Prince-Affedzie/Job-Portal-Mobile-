import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/message/ChatWindowScreen.styles';
import VoiceRecorder from './VoiceRecoder'; // ← Make sure filename is correct

const { width, height } = Dimensions.get('window');

export const MessageInput = ({
  text,
  setText,
  handleSend,
  handleTyping,
  triggerFileInput,
  disabled,
  hasFile,
  isUploading,
  onVoiceNoteRecorded,
}) => {
  const [inputHeight, setInputHeight] = useState(40);
  const [voiceModal, setVoiceModal] = useState(false); // ← Correct state
  const [recordedVoice, setRecordedVoice] = useState(null);

  const handleVoiceNoteRecorded = (voiceNote) => {
    onVoiceNoteRecorded(voiceNote);
  };

  return (
    <>
      <View style={styles.inputContainer}>
        {/* Attach Button */}
        <TouchableOpacity
          style={[styles.attachButton, isUploading && styles.attachButtonDisabled]}
          onPress={triggerFileInput}
          disabled={isUploading}
        >
          <Ionicons name="attach" size={24} color={isUploading ? '#D1D5DB' : '#6366F1'} />
        </TouchableOpacity>

        {/* Voice Button - FIXED */}
        <TouchableOpacity
          style={[styles.voiceButton, isUploading && styles.voiceButtonDisabled]}
          onPress={() => setVoiceModal(true)} // ← This was the bug!
          disabled={isUploading}
        >
          <Ionicons name="mic" size={22} color={isUploading ? '#D1D5DB' : '#EF4444'} />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={[styles.textInput, { height: Math.min(100, inputHeight) }]}
          value={text}
          onChangeText={setText}
          onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={1000}
          editable={!disabled}
          onFocus={handleTyping}
        />

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (disabled || (!text.trim() && !hasFile)) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={disabled || (!text.trim() && !hasFile)}
        >
          {disabled ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Voice Recorder Modal */}
      <Modal visible={voiceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setVoiceModal(false)}
          />
          <View style={styles.modalContent}>
            <VoiceRecorder
              onSend={(file) => {
                setRecordedVoice(file);
                setVoiceModal(false);
                handleVoiceNoteRecorded(file); // ← This sends to parent
              }}
              onCancel={() => setVoiceModal(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};