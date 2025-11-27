import React, { useState, useEffect, useRef, useCallback,useContext,  } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  BackHandler,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/message/ChatWindowScreen.styles';


export const FilePreview = ({ file, onClear }) => (
  <View style={styles.filePreview}>
    <View style={styles.filePreviewContent}>
      <Ionicons name="document" size={24} color="#6366F1" />
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.name || 'Selected File'}
        </Text>
        <Text style={styles.fileSize}>
          {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
        </Text>
      </View>
    </View>
    <TouchableOpacity 
      onPress={onClear} 
      style={styles.clearButton}
      accessibilityLabel="Clear selected file"
    >
      <Ionicons name="close-circle" size={24} color="#EF4444" />
    </TouchableOpacity>
  </View>
);
