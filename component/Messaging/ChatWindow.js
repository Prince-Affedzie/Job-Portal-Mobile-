import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import * as Progress from 'react-native-progress';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { fetchRoomMessages, handleChatFiles, fetchRoomInfo } from '../../api/chatApi';
import { sendFileToS3 } from '../../api/commonApi';

const { width, height } = Dimensions.get('window');

// Enhanced Message Bubble Component
const MessageBubble = ({ message, isMyMessage, onReply, currentUser, messageRef, isLastInGroup }) => {
  const [bubbleAnim] = useState(new Animated.Value(0));
  const isSeen = message.seenBy.length > 1 && isMyMessage;

  useEffect(() => {
    Animated.spring(bubbleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const openMedia = async () => {
    if (!message.mediaUrl) return;

    try {
      const supported = await Linking.canOpenURL(message.mediaUrl);
      if (supported) {
        await Linking.openURL(message.mediaUrl);
        return;
      }
    } catch (err) {
      console.error('Error opening media:', err);
    }
  };

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
      <TouchableOpacity
        style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.theirBubble]}
        onLongPress={() => onReply(message)}
        activeOpacity={0.9}
        delayLongPress={200}
      >
        {message.replyTo && (
          <View style={styles.replyContainer}>
            <Ionicons name="return-up-back" size={14} color="#6B7280" />
            <Text style={styles.replyText} numberOfLines={1}>
              {message.replyTo.text?.substring(0, 25) || 'Media'}...
            </Text>
          </View>
        )}
        
        {message.text && (
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.theirMessageText]}>
            {message.text}
          </Text>
        )}
        
        {message.mediaUrl && (
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
        )}
        
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
    </Animated.View>
  );
};

// Enhanced Typing Indicator
const TypingIndicator = () => {
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

// Enhanced File Preview
const FilePreview = ({ file, onClear }) => (
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

// Enhanced Reply Preview
const ReplyPreview = ({ replyTo, onClear }) => (
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

// Enhanced File Upload Progress
const FileUploadProgress = ({ fileData, onCancel }) => (
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

// Enhanced Message Input
const MessageInput = ({ 
  text, 
  setText, 
  handleSend, 
  handleTyping, 
  triggerFileInput, 
  disabled, 
  hasFile, 
  isUploading 
}) => {
  const [inputHeight, setInputHeight] = useState(40);

  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity
        style={[styles.attachButton, isUploading && styles.attachButtonDisabled]}
        onPress={triggerFileInput}
        disabled={isUploading}
        accessibilityLabel="Attach file"
      >
        <Ionicons 
          name="attach" 
          size={24} 
          color={isUploading ? '#D1D5DB' : '#6366F1'} 
        />
      </TouchableOpacity>
      
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
      
      <TouchableOpacity
        style={[
          styles.sendButton,
          (disabled || (!text.trim() && !hasFile)) && styles.sendButtonDisabled
        ]}
        onPress={handleSend}
        disabled={disabled || (!text.trim() && !hasFile)}
        accessibilityLabel="Send message"
      >
        {disabled ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons 
            name="send" 
            size={20} 
            color="#FFFFFF" 
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const ChatWindow = ({ room, socket, currentUser, onlineUserIds, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(new Map());
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [lastReadMessageId, setLastReadMessageId] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [initialScrollSet, setInitialScrollSet] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [roomInfo, setRoomInfo] = useState(null);
  const [otherParticipant, setOtherParticipant] = useState(null);

  const flatListRef = useRef(null);
  const messageRefs = useRef({});
  const fetchLockRef = useRef(false);
  const lastScrollOffset = useRef(0);
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Validate props
  if (!room || !currentUser || !socket) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: Invalid chat data</Text>
      </View>
    );
  }

  // Generate unique file ID
  const generateFileId = useCallback(() => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, []);

  // Update file upload progress
  const updateFileProgress = useCallback((fileId, progress, status = 'uploading') => {
    setUploadingFiles(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(fileId);
      if (existing) {
        newMap.set(fileId, { ...existing, progress, status });
      }
      return newMap;
    });
  }, []);

  // Remove file from uploads
  const removeFileFromUploads = useCallback((fileId) => {
    setUploadingFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, []);

  // File upload with progress
  const uploadFileWithProgress = useCallback(
    async (file, messageText = '', replyToMessage = null) => {
      const fileId = generateFileId();
      const fileData = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.mimeType,
        progress: 0,
        status: 'preparing',
        startTime: Date.now(),
      };

      setUploadingFiles(prev => new Map(prev).set(fileId, fileData));

      try {
        updateFileProgress(fileId, 0, 'preparing');
        const res = await handleChatFiles({ filename: file.name, contentType: file.mimeType });

        if (res.status !== 200) {
          throw new Error('Failed to get upload URL');
        }

        const { fileKey, fileUrl, publicUrl } = res.data;

        updateFileProgress(fileId, 5, 'uploading');
        await sendFileToS3(fileUrl, file, (progress) => {
          updateFileProgress(fileId, Math.round(progress * 90), 'uploading');
        });

        updateFileProgress(fileId, 95, 'processing');
        const payload = {
          senderId: currentUser._id,
          roomId: room._id,
          ...(messageText.trim() && { text: messageText.trim() }),
          mediaUrl: publicUrl,
          fileName: file.name,
          ...(replyToMessage?._id && { replyTo: replyToMessage._id }),
        };

        socket.emit('sendMessage', payload);
        setText('');
        setFile(null);
        setIsSending(false);
        setReplyTo(null);
        updateFileProgress(fileId, 100, 'completed');
        setTimeout(() => removeFileFromUploads(fileId), 2000);
        Toast.show({ type: 'success', text1: `File "${file.name}" uploaded successfully!` });
        return true;
      } catch (error) {
        console.error('File upload failed:', error);
        updateFileProgress(fileId, 0, 'failed');
        Toast.show({ type: 'error', text1: 'Upload failed', text2: error.message });
        setTimeout(() => removeFileFromUploads(fileId), 5000);
        return false;
      }
    },
    [currentUser._id, room._id, socket, updateFileProgress, removeFileFromUploads]
  );

  // Check if at bottom
  const checkIfAtBottom = useCallback(
    (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const contentHeight = event.nativeEvent.contentSize.height;
      const containerHeight = event.nativeEvent.layoutMeasurement.height;
      return contentHeight - offsetY - containerHeight < 50;
    },
    []
  );

  // Scroll to bottom
  const scrollToBottom = useCallback(
    (animated = true) => {
      flatListRef.current?.scrollToEnd({ animated });
      setIsAtBottom(true);
    },
    []
  );

  // Load messages with pagination
  const fetchMessages = useCallback(
    async (cursor = null, append = false) => {
      if (fetchLockRef.current || (append && !hasMoreMessages)) {
        return;
      }
      fetchLockRef.current = true;

      let previousContentHeight = 0;
      if (append && flatListRef.current) {
        previousContentHeight = flatListRef.current._listRef._scrollRef._contentSize?.height || 0;
      }

      try {
        if (append) {
          setIsFetchingMore(true);
        } else {
          setIsLoading(true);
        }

        const response = await fetchRoomMessages(room._id, cursor);
        if (response.status === 200) {
          const { messages: newMessages, nextCursor, hasMore } = response.data;

          setMessages(prev => {
            let updatedMessages;
            if (append) {
              const existingIds = new Set(prev.map(msg => msg._id));
              const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg._id));
              updatedMessages = [...uniqueNewMessages, ...prev];
            } else {
              updatedMessages = newMessages;
            }
            return updatedMessages;
          });

          setNextCursor(nextCursor);
          setHasMoreMessages(hasMore);

          if (!append) {
            setTimeout(() => scrollToBottom(false), 100);
          }
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load messages' });
      } finally {
        fetchLockRef.current = false;
        setIsFetchingMore(false);
        setIsLoading(false);
        if (!append) {
          setIsInitialLoad(false);
        }
      }
    },
    [room._id,  scrollToBottom]
  );

  // Handle scroll
  const handleScroll = useCallback(
    (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      lastScrollOffset.current = offsetY;

      setIsAtBottom(checkIfAtBottom(event));

      // Show/hide header shadow based on scroll
      const scrollY = event.nativeEvent.contentOffset.y;
      if (scrollY > 10) {
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }).start();
      } else {
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }

      if (offsetY < 100 && hasMoreMessages && !isFetchingMore && nextCursor) {
        fetchMessages(nextCursor, true);
      }
    },
    [hasMoreMessages, isFetchingMore, nextCursor, fetchMessages, checkIfAtBottom, headerAnim]
  );

  // Fetch room info
  useEffect(() => {
    const getRoomInfo = async () => {
      try {
        const res = await fetchRoomInfo(room._id);
        if (res.status === 200 && res.data?.participants?.length > 0) {
          setRoomInfo(res.data);
          const participant = res.data.participants.find(p => p._id !== currentUser._id);
          setOtherParticipant(participant);
        }
      } catch (error) {
        console.error('Failed to fetch room info:', error);
      }
    };
    getRoomInfo();
  }, [room._id, currentUser._id]);

  // Reset state on room change
  useEffect(() => {
    if (room?._id) {
      setMessages([]);
      setIsLoading(true);
      setIsAtBottom(true);
      setNextCursor(null);
      setHasMoreMessages(true);
      setIsFetchingMore(false);
      setLastReadMessageId(null);
      setUnreadMessages([]);
      setInitialScrollSet(false);
      setIsInitialLoad(true);
      setUploadingFiles(new Map());
      fetchMessages();
      socket.emit('joinRoom', { roomId: room._id });
    }
    return () => {
      socket.emit('leaveRoom', { roomId: room._id });
    };
  }, [room._id, socket, fetchMessages]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMsg) => {
      if (newMsg.room === room._id) {
        setMessages(prev => {
          const messageExists = prev.some(msg => msg._id === newMsg._id);
          if (messageExists) return prev;

          const tempIndex = prev.findIndex(
            msg => msg.isTemp && msg.text === newMsg.text && msg.sender._id === newMsg.sender._id
          );
          if (tempIndex !== -1) {
            const updatedMessages = [...prev];
            updatedMessages[tempIndex] = newMsg;
            return updatedMessages;
          }

          return [...prev, newMsg];
        });

        const wasAtBottom = isAtBottom;
        const isOwnMessage = newMsg.sender._id === currentUser._id;

        if (wasAtBottom || isOwnMessage) {
          socket.emit('markAsSeen', { messageId: newMsg._id, userId: currentUser._id });
          setTimeout(() => scrollToBottom(true), 100);
        } else {
          setUnreadMessages(prev => [...prev, newMsg]);
        }
      }
    };

    const handleMessageSeen = ({ messageId, userId }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, seenBy: [...new Set([...msg.seenBy, userId])] } : msg
        )
      );
    };

    const handleUserTyping = ({ userId }) => {
      if (userId !== currentUser._id) setIsTyping(true);
    };

    const handleUserStopTyping = ({ userId }) => {
      if (userId !== currentUser._id) setIsTyping(false);
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageSeen', handleMessageSeen);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStopTyping', handleUserStopTyping);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageSeen', handleMessageSeen);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStopTyping', handleUserStopTyping);
    };
  }, [socket, room._id, currentUser._id, isAtBottom, scrollToBottom]);

  // File picker
  const triggerFileInput = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        setFile(selectedFile);
      }
    } catch (error) {
      console.error('File picker error:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to pick file' });
    }
  }, []);

  // Send message
  const handleSend = useCallback(async () => {
    if ((!text.trim() && !file) || isSending) return;

    setIsSending(true);

    if (file) {
      await uploadFileWithProgress(file, text, replyTo);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: tempId,
      text: text.trim(),
      sender: { _id: currentUser._id, name: currentUser.name },
      createdAt: new Date(),
      seenBy: [currentUser._id],
      isTemp: true,
      ...(replyTo?._id && { replyTo: replyTo }),
    };

    setMessages(prev => [...prev, tempMessage]);
    setText('');
    setReplyTo(null);

    if (isAtBottom) {
      setTimeout(() => scrollToBottom(true), 100);
    }

    try {
      const payload = {
        senderId: currentUser._id,
        roomId: room._id,
        text: text.trim(),
        ...(replyTo?._id && { replyTo: replyTo._id }),
        tempId,
      };

      socket.emit('sendMessage', payload);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to send message' });
    } finally {
      setIsSending(false);
    }
  }, [text, file, isSending, currentUser._id, room._id, socket, replyTo, isAtBottom, scrollToBottom, uploadFileWithProgress]);

  // Typing handler
  const handleTyping = useCallback(() => {
    if (!socket) return;

    socket.emit('typing', { roomId: room._id, userId: currentUser._id });

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(() => {
      socket.emit('stopTyping', { roomId: room._id, userId: currentUser._id });
    }, 2000);

    setTypingTimeout(timeout);
  }, [socket, room._id, currentUser._id, typingTimeout]);

  // Reply handler
  const handleReply = useCallback((message) => {
    setReplyTo(message);
  }, []);

  // Scroll to latest messages
  const scrollToLatestMessages = useCallback(() => {
    unreadMessages.forEach(msg => {
      socket.emit('markAsSeen', { messageId: msg._id, userId: currentUser._id });
    });
    setUnreadMessages([]);
    scrollToBottom(true);
  }, [unreadMessages, socket, currentUser._id, scrollToBottom]);

  const isMyMessage = useCallback((msg) => msg.sender._id === currentUser._id, [currentUser._id]);

  // Render header for loading older messages
  const renderHeader = useCallback(
    () =>
      isFetchingMore ? (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingMoreText}>Loading older messages...</Text>
        </View>
      ) : null,
    [isFetchingMore]
  );

  const headerShadow = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8]
  });

  const headerBorder = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5]
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Enhanced Chat Header */}
      <Animated.View 
        style={[
          styles.chatHeader,
          {
            shadowOpacity: headerAnim,
            shadowRadius: headerShadow,
            borderBottomWidth: headerBorder,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack} 
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <View style={styles.chatUserInfo}>
          <View style={styles.chatAvatar}>
            {otherParticipant?.profileImage ? (
              <Image source={{ uri: otherParticipant.profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {otherParticipant?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            {onlineUserIds?.includes(otherParticipant?._id) && (
              <View style={styles.chatOnlineIndicator} />
            )}
          </View>
          
          <View style={styles.chatUserDetails}>
            <Text style={styles.chatUserName} numberOfLines={1}>
              {otherParticipant?.name || 'Unknown User'}
            </Text>
            <Text style={styles.chatJobTitle} numberOfLines={1}>
              {room.job?.title || 'No Job Title'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="call" size={20} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="videocam" size={20} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Messages List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item, index }) => (
              <MessageBubble
                key={item._id}
                message={item}
                isMyMessage={isMyMessage(item)}
                onReply={handleReply}
                currentUser={currentUser}
                messageRef={el => (messageRefs.current[item._id] = el)}
                isLastInGroup={index === messages.length - 1}
              />
            )}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={64} color="#E5E7EB" />
                </View>
                <Text style={styles.emptyStateText}>No messages yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Send a message to start the conversation
                </Text>
              </View>
            }
          />
          
          {unreadMessages.length > 0 && !isAtBottom && (
            <TouchableOpacity 
              style={styles.jumpToBottomButton}
              onPress={scrollToLatestMessages}
              accessibilityLabel="Jump to latest messages"
            >
              <View style={styles.jumpToBottomContent}>
                <Text style={styles.jumpToBottomText}>
                  {unreadMessages.length} new message{unreadMessages.length > 1 ? 's' : ''}
                </Text>
                <Ionicons name="arrow-down" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
          
          {Array.from(uploadingFiles.entries()).map(([fileId, fileData]) => (
            <FileUploadProgress
              key={fileId}
              fileData={fileData}
              onCancel={() => removeFileFromUploads(fileId)}
            />
          ))}
          
          {isTyping && <TypingIndicator />}
        </>
      )}

      {/* File and Reply Previews */}
      {file && <FilePreview file={file} onClear={() => setFile(null)} />}
      {replyTo && <ReplyPreview replyTo={replyTo} onClear={() => setReplyTo(null)} />}

      {/* Message Input */}
      <MessageInput
        text={text}
        setText={setText}
        handleSend={handleSend}
        handleTyping={handleTyping}
        triggerFileInput={triggerFileInput}
        disabled={isSending}
        hasFile={!!file}
        isUploading={uploadingFiles.size > 0}
      />

      <Toast />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop:12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    elevation: 0,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  chatUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  chatOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatUserDetails: {
    flex: 1,
  },
  chatUserName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  chatJobTitle: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 20,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginBottom: 8,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  myBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 8,
  },
  theirBubble: {
    backgroundColor: '#F8FAFC',
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#1F2937',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  messageTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  theirMessageTime: {
    color: '#94A3B8',
  },
  seenIcon: {
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: height * 0.2,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
    color: '#1F2937',
    fontWeight: '400',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingMoreContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingMoreText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  jumpToBottomButton: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  jumpToBottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jumpToBottomText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  filePreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  clearButton: {
    padding: 4,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderTopWidth: 1,
    borderTopColor: '#BAE6FD',
  },
  replyPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  replyInfo: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  fileUploadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  uploadInfo: {
    flex: 1,
    gap: 6,
  },
  uploadFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  uploadStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
  cancelButton: {
    padding: 4,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
  },
  typingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  replyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    flex: 1,
  },
  mediaContainer: {
    position: 'relative',
    marginTop: 8,
  },
  media: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  mediaOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatWindow;