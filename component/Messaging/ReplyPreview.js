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


export const ReplyPreview = ({ replyTo, onClear }) => (
  <View style={styles.replyPreview}>
    <View style={styles.replyPreviewContent}>
      <Ionicons name="return-up-back" size={20} color="#6366F1" />
      <View style={styles.replyInfo}>
        <Text style={styles.replyLabel}>Replying to</Text>
        <Text style={styles.replyText} numberOfLines={1}>
          {replyTo.text?.substring(0, 40) || 'Media'}...
        </Text>
      </View>
    </View>
    <TouchableOpacity 
      onPress={onClear} 
      style={styles.clearButton}
      accessibilityLabel="Clear reply"
    >
      <Ionicons name="close-circle" size={24} color="#EF4444" />
    </TouchableOpacity>
  </View>
);
