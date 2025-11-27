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
import * as Progress from 'react-native-progress';
const { width, height } = Dimensions.get('window');


export const FileUploadProgress = ({ fileData, onCancel }) => (
  <View style={styles.fileUploadProgress}>
    <View style={styles.uploadContent}>
      <Ionicons 
        name={fileData.status === 'failed' ? 'warning' : 'document'} 
        size={20} 
        color={fileData.status === 'failed' ? '#EF4444' : '#6366F1'} 
      />
      <View style={styles.uploadInfo}>
        <Text style={styles.uploadFileName} numberOfLines={1}>
          {fileData.name}
        </Text>
        <Progress.Bar 
          progress={fileData.progress / 100} 
          width={width - 120} 
          height={6}
          color={fileData.status === 'failed' ? '#EF4444' : '#6366F1'}
          unfilledColor="#F3F4F6"
          borderWidth={0}
        />
        <Text style={styles.uploadStatus}>
          {fileData.status === 'failed' ? 'Upload failed' : `${fileData.progress}% uploaded`}
        </Text>
      </View>
    </View>
    <TouchableOpacity 
      onPress={onCancel} 
      style={styles.cancelButton}
      accessibilityLabel="Cancel file upload"
    >
      <Ionicons name="close" size={20} color="#6B7280" />
    </TouchableOpacity>
  </View>
);
