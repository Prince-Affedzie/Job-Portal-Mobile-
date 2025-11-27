import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Progress from 'react-native-progress';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { fetchRoomMessages, handleChatFiles, fetchRoomInfo } from '../../api/chatApi';
import { sendFileToS3 } from '../../api/commonApi';
import { NotificationContext } from '../../context/NotificationContext';
import { AuthContext } from '../../context/AuthContext';

import { MessageBubble } from '../../component/Messaging/MessageBubble'
import { TypingIndicator } from '../../component/Messaging/TypingIndicator';
import { FilePreview } from '../../component/Messaging/FilePreview';
import { MessageInput } from '../../component/Messaging/MessageInput';
import { ReplyPreview } from '../../component/Messaging/ReplyPreview';
import { FileUploadProgress } from '../../component/Messaging/FileUploadProgress';

import { styles } from '../../styles/message/ChatWindowScreen.styles';

const { width, height } = Dimensions.get('window');
const ChatWindowScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { roomId } = route.params;
  const { socket } = useContext(NotificationContext);
  const { user } = useContext(AuthContext);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const currentUser = user;

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

  // Generate unique file ID
  const generateFileId = useCallback(() => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, []);


   const handleVoiceNoteRecorded = useCallback(async (voiceNote) => {
    if (!voiceNote?.uri) return;

    setIsSending(true);
    
    try {
      // Upload the voice note file
      await uploadFileWithProgress(
        {
          uri: voiceNote.uri,
          name: voiceNote.name,
          type: voiceNote.type,
          size: voiceNote.size,
        },
        '', // No text
        null, // No reply
        voiceNote.duration // Pass duration for audio messages
      );
    } catch (error) {
      console.error('Failed to send voice note:', error);
      Toast.show({ type: 'error', text1: 'Failed to send voice note' });
    } finally {
      setIsSending(false);
    }
  }, [uploadFileWithProgress]);

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
          roomId: roomId,
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
    [currentUser._id, roomId, socket, updateFileProgress, removeFileFromUploads]
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

  // CRITICAL UPDATE: Load messages with automatic marking as seen (like web version)
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

        const response = await fetchRoomMessages(roomId, cursor);
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
              
              // CRITICAL: Automatically mark all loaded messages as seen (like web version)
              console.log('🟢 Automatically marking messages as seen on load:', newMessages.length);
              newMessages.forEach(msg => {
                if (!msg.seenBy?.includes(currentUser._id)) {
                  socket.emit('markAsSeen', { 
                    messageId: msg._id, 
                    userId: currentUser._id 
                  });
                }
              });
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
    [roomId, scrollToBottom, currentUser._id, socket,] // Added socket dependency
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
  const fetchRoomDetails = useCallback(async () => {
    try {
      const res = await fetchRoomInfo(roomId);
      if (res.status === 200 && res.data?.participants?.length > 0) {
        setRoomInfo(res.data);
        const participant = res.data.participants.find(p => p._id !== currentUser._id);
        setOtherParticipant(participant);
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load room information' });
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to fetch room info:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load room information' });
      navigation.goBack();
    }
  }, [roomId, currentUser._id, navigation]);

  const updateMessageInState = useCallback((messageId, updatedFields) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg._id === messageId ? { ...msg, ...updatedFields } : msg
      )
    );
  }, []);

  // CRITICAL UPDATE: Mark room as seen when entering (like web version)
  useEffect(() => {
    if (roomId && currentUser?._id && socket) {
      console.log('🟢 Entering chat room, marking room as seen');
      
      // Mark room as seen when entering (like web does automatically)
      socket.emit('markRoomAsSeen', { 
        roomId, 
        userId: currentUser._id 
      });
    }
  }, [roomId, currentUser?._id, socket]);

  // Reset state on room change
  useEffect(() => {
    if (roomId) {
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
      fetchRoomDetails();
      fetchMessages();
      socket.emit('joinRoom', { roomId });
    }
    return () => {
      socket.emit('leaveRoom', { roomId });
    };
  }, [roomId, socket, fetchMessages, fetchRoomDetails]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
   
    const handleReceiveMessage = (newMsg) => {
      if (newMsg.room === roomId) {
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

        if (wasAtBottom || !isOwnMessage) {
          console.log(' New message received, marking as seen:', newMsg._id);
          socket.emit('markAsSeen', { messageId: newMsg._id, userId: currentUser._id });
          setTimeout(() => scrollToBottom(true), 100);
        } else {
          setUnreadMessages(prev => [...prev, newMsg]);
        }
      }
    };

    const handleMessageSeen = ({ messageId, userId }) => {
      console.log('Message seen event received:', { messageId, userId });
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

    const handleMessageDeleted = ({ messageId }) => {
      updateMessageInState(messageId, { deleted: true });
    };

    // CRITICAL: Add handler for room marked as seen events
    const handleRoomMarkedAsSeen = ({ roomId, userId }) => {
      console.log('🟢 Room marked as seen event:', { roomId, userId });
      // This event confirms the backend has updated the unread counts
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageSeen', handleMessageSeen);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStopTyping', handleUserStopTyping);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('roomMarkedAsSeen', handleRoomMarkedAsSeen);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageSeen', handleMessageSeen);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStopTyping', handleUserStopTyping);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('roomMarkedAsSeen', handleRoomMarkedAsSeen);
    };
  }, [socket, roomId, currentUser._id, isAtBottom, scrollToBottom]);

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
        roomId: roomId,
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
  }, [text, file, isSending, currentUser._id, roomId, socket, replyTo, isAtBottom, scrollToBottom, uploadFileWithProgress]);

  // Typing handler
  const handleTyping = useCallback(() => {
    if (!socket) return;

    socket.emit('typing', { roomId, userId: currentUser._id });

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(() => {
      socket.emit('stopTyping', { roomId, userId: currentUser._id });
    }, 2000);

    setTypingTimeout(timeout);
  }, [socket, roomId, currentUser._id, typingTimeout]);

  // Reply handler
  const handleReply = useCallback((message) => {
    setReplyTo(message);
  }, []);

  // Scroll to latest messages
  const scrollToLatestMessages = useCallback(() => {
    console.log('🟢 Scrolling to latest messages, marking unread as seen');
    unreadMessages.forEach(msg => {
      socket.emit('markAsSeen', { messageId: msg._id, userId: currentUser._id });
    });
    setUnreadMessages([]);
    scrollToBottom(true);
  }, [unreadMessages, socket, currentUser._id, scrollToBottom]);

  // CRITICAL UPDATE: Mark room as seen when leaving
  const handleBack = useCallback(() => {
    console.log('🟢 Leaving chat room, ensuring room is marked as seen');
    // Ensure room is marked as seen before leaving
    if (roomId && currentUser?._id && socket) {
      socket.emit('markRoomAsSeen', { 
        roomId, 
        userId: currentUser._id 
      });
    }
    navigation.goBack();
  }, [roomId, currentUser?._id, socket, navigation]);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });

    return () => backHandler.remove();
  }, [handleBack]);

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

  // Show error if required props are missing
  if (!roomId || !currentUser || !socket) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: Invalid chat data</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          onPress={handleBack} 
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
              {otherParticipant?.name || 'Loading...'}
            </Text>
            <Text style={styles.chatJobTitle} numberOfLines={1}>
              {roomInfo?.job?.title || 'No Job Title'}
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
        <GestureHandlerRootView style={{ flex: 1 }}>
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
                socket={socket}
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
          </GestureHandlerRootView>
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
        onVoiceNoteRecorded= {handleVoiceNoteRecorded}
      />

      <Toast />
    </KeyboardAvoidingView>
  );
};

export default ChatWindowScreen;