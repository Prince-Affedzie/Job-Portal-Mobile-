// component/Messaging/MessageBubble.js
import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Animated,
  ActionSheetIOS,
  Linking,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { styles } from '../../styles/message/ChatWindowScreen.styles';
import AudioPlayer from './AudioPlayer';

// ─── Image Modal Component ────────────────────────────────────────────────────
const ImageModal = ({ visible, imageUri, fileName, onClose }) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      transparent={false}
    >
      <View style={styles.imageModalContainer}>
        <TouchableOpacity 
          style={styles.imageCloseButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <ScrollView 
          contentContainerStyle={styles.imageScrollContent}
          maximumZoomScale={3}
          minimumZoomScale={1}
        >
          <Image 
            source={{ uri: imageUri }} 
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
        </ScrollView>
        
        {fileName && (
          <View style={styles.imageFileName}>
            <Text style={styles.imageFileNameText}>{fileName}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

// ─── Video Player Modal Component ──────────────────────────────────────────────
const VideoPlayerModal = ({ visible, videoUri, onClose }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={styles.videoModalContainer}>
        <TouchableOpacity 
          style={styles.videoCloseButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.fullScreenVideo}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping={false}
          onPlaybackStatusUpdate={setStatus}
        />
      </View>
    </Modal>
  );
};

// ─── Video Thumbnail Component ─────────────────────────────────────────────────
const VideoThumbnail = ({ videoUri, fileName, onPress }) => {
  const videoRef = useRef(null);

  return (
    <TouchableOpacity onPress={onPress} style={styles.videoThumbnailContainer}>
      <Video
        ref={videoRef}
        source={{ uri: videoUri }}
        style={styles.videoThumbnail}
        resizeMode="cover"
        shouldPlay={false}
        useNativeControls={false}
        isMuted={true}
      />
      <View style={styles.playOverlay}>
        <Ionicons name="play-circle" size={36} color="#FFFFFF" />
      </View>
      <View style={styles.videoBadge}>
        <Ionicons name="videocam" size={12} color="#fff" />
        <Text style={styles.badgeText}>VIDEO</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Document File Component ───────────────────────────────────────────────────
const DocumentFile = ({ fileUrl, fileName, fileType, onPress, isMyMessage }) => {
  const getFileIcon = () => {
    const ext = fileName.toLowerCase().split('.').pop();
    
    if (ext === 'pdf') return 'document-text';
    if (['doc', 'docx'].includes(ext)) return 'document';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'document';
    if (['ppt', 'pptx'].includes(ext)) return 'document';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
    if (['txt', 'rtf'].includes(ext)) return 'document-text';
    return 'document';
  };

  const getFileColor = () => {
    const ext = fileName.toLowerCase().split('.').pop();
    
    if (ext === 'pdf') return '#EF4444';
    if (['doc', 'docx'].includes(ext)) return '#2563EB';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '#16A34A';
    if (['ppt', 'pptx'].includes(ext)) return '#EAB308';
    if (['zip', 'rar', '7z'].includes(ext)) return '#7C3AED';
    if (['txt', 'rtf'].includes(ext)) return '#6B7280';
    return '#6B7280';
  };

  const getFileTypeName = () => {
    const ext = fileName.toLowerCase().split('.').pop();
    
    if (ext === 'pdf') return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'Word';
    if (['xls', 'xlsx'].includes(ext)) return 'Excel';
    if (['csv'].includes(ext)) return 'CSV';
    if (['ppt', 'pptx'].includes(ext)) return 'PowerPoint';
    if (['zip', 'rar', '7z'].includes(ext)) return 'Archive';
    if (['txt', 'rtf'].includes(ext)) return 'Text';
    return ext.toUpperCase();
  };

  return (
    <TouchableOpacity onPress={onPress} style={[
      styles.documentContainer,
      isMyMessage ? styles.myDocumentContainer : styles.theirDocumentContainer
    ]}>
      <View style={[styles.documentIcon, { backgroundColor: getFileColor() + '20' }]}>
        <Ionicons name={getFileIcon()} size={32} color={getFileColor()} />
      </View>
      <View style={styles.documentInfo}>
        <Text style={[
          styles.documentName,
          isMyMessage ? styles.myDocumentName : styles.theirDocumentName
        ]} numberOfLines={2}>
          {fileName}
        </Text>
        <Text style={[
          styles.documentType,
          isMyMessage ? styles.myDocumentType : styles.theirDocumentType
        ]}>
          {getFileTypeName()} Document
        </Text>
      </View>
      <View style={styles.documentDownload}>
        <Ionicons 
          name="open-outline" 
          size={20} 
          color={isMyMessage ? '#FFFFFF' : '#6366F1'} 
        />
      </View>
    </TouchableOpacity>
  );
};

// ─── Main MessageBubble Component ──────────────────────────────────────────────
export const MessageBubble = ({ 
  message, 
  isMyMessage, 
  onReply, 
  currentUser, 
  messageRef, 
  isLastInGroup,
  onDelete,
  onReport,          // ← NEW: report callback from parent
  socket 
}) => {
  const [bubbleAnim] = useState(new Animated.Value(0));
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [fileType, setFileType] = useState(null);
  
  const isSeen = message.seenBy && message.seenBy.length > 1 && isMyMessage;

  useEffect(() => {
    Animated.spring(bubbleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (message.mediaUrl || message.fileName) {
      determineFileType();
    }
  }, [message.mediaUrl, message.fileName]);

  const determineFileType = () => {
    const fileName = message.fileName || '';
    const mediaUrl = message.mediaUrl || '';
    
    const ext = fileName.toLowerCase().split('.').pop();
    const url = mediaUrl.toLowerCase();

    // Check if it's an audio message first
    if (message.type === 'audio' || ['mp3', 'm4a', 'wav', 'aac', 'ogg'].includes(ext)) {
      setFileType('audio');
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      setFileType('image');
    } else if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', '3gp'].includes(ext)) {
      setFileType('video');
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(ext)) {
      setFileType('document');
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      setFileType('archive');
    } else {
      setFileType('other');
    }
  };

  const handleLongPress = () => {
    if (message.deleted) return;

    if (Platform.OS === 'ios') {
      const options = [
        'Cancel',
        'Reply',
        ...(isMyMessage ? ['Delete'] : []),
        ...(!isMyMessage ? ['Report'] : []),
      ];
      const cancelButtonIndex = 0;
      const destructiveButtonIndex = isMyMessage ? 2 : undefined;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Reply
            onReply(message);
          } else if (buttonIndex === 2 && isMyMessage) {
            // Delete (only for own messages)
            handleDelete();
          } else if (!isMyMessage && buttonIndex === (isMyMessage ? -1 : 2)) {
            // Report (index 2 when Delete is not present)
            onReport?.(message);
          } else if (!isMyMessage && buttonIndex === 3) {
            // Report (index 3 when Delete IS present)
            onReport?.(message);
          }
        }
      );
    } else {
      setShowActions(true);
    }
  };

  const handleDelete = () => {
    if (!isMyMessage) return;

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            socket.emit('deleteMessage', { 
              messageId: message._id, 
              userId: currentUser._id 
            });
          }
        }
      ]
    );
    setShowActions(false);
  };

  const openMedia = async () => {
    if (!message.mediaUrl) return;

    try {
      if (fileType === 'video') {
        setVideoModalVisible(true);
        return;
      } else if (fileType === 'image') {
        setImageModalVisible(true);
        return;
      }

      const supported = await Linking.canOpenURL(message.mediaUrl);
      if (supported) {
        await Linking.openURL(message.mediaUrl);
      } else {
        Alert.alert(
          'Cannot Open File',
          'No app available to open this file type. Would you like to download it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Download', 
              onPress: () => downloadFile(message.mediaUrl, message.fileName)
            }
          ]
        );
      }
    } catch (err) {
      console.error('Error opening media:', err);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const downloadFile = async (url, filename) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'Could not download the file');
    }
  };

  const renderMediaContent = () => {
    if (!message.mediaUrl) return null;

    switch (fileType) {
      case 'audio':
        return (
          <AudioPlayer
            audioUri={message.mediaUrl}
            duration={message.audioDuration}
            isMyMessage={isMyMessage}
          />
        );
      
      case 'image':
        return (
          <TouchableOpacity onPress={openMedia} style={styles.mediaContainer}>
            <Image 
              source={{ uri: message.mediaUrl }} 
              style={styles.media} 
              resizeMode="cover"
            />
            <View style={styles.mediaOverlay}>
              <Ionicons name="expand" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        );
      
      case 'video':
        return (
          <VideoThumbnail
            videoUri={message.mediaUrl}
            fileName={message.fileName}
            onPress={openMedia}
          />
        );
      
      case 'document':
      case 'archive':
        return (
          <DocumentFile
            fileUrl={message.mediaUrl}
            fileName={message.fileName}
            fileType={fileType}
            onPress={openMedia}
            isMyMessage={isMyMessage}
          />
        );
      
      default:
        return (
          <TouchableOpacity onPress={openMedia} style={[
            styles.otherFileContainer,
            isMyMessage ? styles.myOtherFileContainer : styles.theirOtherFileContainer
          ]}>
            <View style={styles.otherFileIcon}>
              <Ionicons name="document" size={32} color={isMyMessage ? '#FFFFFF' : '#6B7280'} />
            </View>
            <View style={styles.otherFileInfo}>
              <Text style={[
                styles.otherFileName,
                isMyMessage ? styles.myOtherFileName : styles.theirOtherFileName
              ]} numberOfLines={2}>
                {message.fileName || 'Shared file'}
              </Text>
              <Text style={[
                styles.otherFileType,
                isMyMessage ? styles.myOtherFileType : styles.theirOtherFileType
              ]}>
                File
              </Text>
            </View>
            <View style={styles.otherFileDownload}>
              <Ionicons 
                name="open-outline" 
                size={20} 
                color={isMyMessage ? '#FFFFFF' : '#6366F1'} 
              />
            </View>
          </TouchableOpacity>
        );
    }
  };

  if (message.deleted) {
    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.theirMessage,
          {
            transform: [
              { scale: bubbleAnim },
              { translateY: bubbleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}
            ],
            opacity: bubbleAnim
          }
        ]}
        ref={messageRef}
      >
        <View style={[styles.messageBubble, styles.deletedMessageBubble]}>
          <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
          <Text style={styles.deletedMessageText}>
            This message was deleted
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <>
      <Animated.View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.theirMessage,
          {
            transform: [
              { scale: bubbleAnim },
              { translateY: bubbleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}
            ],
            opacity: bubbleAnim
          }
        ]}
        ref={messageRef}
      >
        <TouchableOpacity
          style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.theirBubble]}
          onLongPress={handleLongPress}
          activeOpacity={0.9}
          delayLongPress={200}
        >
          {message.replyTo && (
            <View style={[
              styles.replyContainer,
              isMyMessage ? styles.myReplyContainer : styles.theirReplyContainer
            ]}>
              <Ionicons name="return-up-back" size={14} color={isMyMessage ? '#FFFFFF' : '#6B7280'} />
              <Text style={[
                styles.replyText,
                isMyMessage ? styles.myReplyText : styles.theirReplyText
              ]} numberOfLines={1}>
                {message.replyTo.text?.substring(0, 25) || 'Media'}...
              </Text>
            </View>
          )}
          
          {message.text && (
            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.theirMessageText]}>
              {message.text}
            </Text>
          )}
          
          {renderMediaContent()}
          
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.theirMessageTime]}>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isMyMessage && (
              <Ionicons
                name={isSeen ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={isSeen ? '#10B981' : '#9CA3AF'}
                style={styles.seenIcon}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Android Action Sheet */}
        {showActions && Platform.OS === 'android' && (
          <View style={[
            styles.actionSheet,
            isMyMessage ? styles.myActionSheet : styles.theirActionSheet
          ]}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                onReply(message);
                setShowActions(false);
              }}
            >
              <Ionicons name="return-up-back" size={20} color="#6366F1" />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>

            {isMyMessage && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteAction]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={[styles.actionText, styles.deleteActionText]}>Delete</Text>
              </TouchableOpacity>
            )}

            {/* ── Report button (only for other people's messages) ── */}
            {!isMyMessage && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  onReport?.(message);
                  setShowActions(false);
                }}
              >
                <Ionicons name="flag-outline" size={20} color="#7C3AED" />
                <Text style={styles.actionText}>Report</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowActions(false)}
            >
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={videoModalVisible}
        videoUri={message.mediaUrl}
        onClose={() => setVideoModalVisible(false)}
      />

      {/* Image Modal */}
      <ImageModal
        visible={imageModalVisible}
        imageUri={message.mediaUrl}
        fileName={message.fileName}
        onClose={() => setImageModalVisible(false)}
      />
    </>
  );
};