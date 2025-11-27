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


export const TypingIndicator = () => {
  const [dotAnim] = useState(new Animated.Value(0));
  
  useEffect(() => {
    const animateDots = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    
    animateDots();
  }, []);

  const dot1Opacity = dotAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 1, 0.3, 0.3]
  });

  const dot2Opacity = dotAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 0.3, 1, 0.3]
  });

  const dot3Opacity = dotAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 0.3, 0.3, 1]
  });

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, { opacity: dot1Opacity }]} />
        <Animated.View style={[styles.typingDot, { opacity: dot2Opacity }]} />
        <Animated.View style={[styles.typingDot, { opacity: dot3Opacity }]} />
      </View>
      <Text style={styles.typingText}>Typing...</Text>
    </View>
  );
};
