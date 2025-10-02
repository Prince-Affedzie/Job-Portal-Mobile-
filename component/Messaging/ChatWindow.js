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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Progress from 'react-native-progress';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { fetchRoomMessages, handleChatFiles, fetchRoomInfo } from '../../api/chatApi';
import { sendFileToS3 } from '../../api/commonApi';

// Reusable Components
const MessageBubble = ({ message, isMyMessage, onReply, currentUser, messageRef }) => {
  const isSeen = message.seenBy.length > 1 && isMyMessage;

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
    <TouchableOpacity
      style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.theirMessage]}
      onLongPress={() => onReply(message)}
      ref={messageRef}
    >
      <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.theirBubble]}>
        {message.replyTo && (
          <View style={styles.replyContainer}>
            <Text style={styles.replyText}>
              Replying to: {message.replyTo.text?.substring(0, 30) || 'Media'}...
            </Text>
          </View>
        )}
        {message.text && (
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.theirMessageText]}>
            {message.text}
          </Text>
        )}
        {message.mediaUrl && (
          <TouchableOpacity onPress={openMedia}>
            <Image source={{ uri: message.mediaUrl }} style={styles.media} />
          </TouchableOpacity>
        )}
        <View style={styles.messageFooter}>
          <Text style={styles.messageTime}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isMyMessage && (
            <Ionicons
              name={isSeen ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={isSeen ? '#6366F1' : '#9CA3AF'}
              style={styles.seenIcon}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const TypingIndicator = () => (
  <View style={styles.typingContainer}>
    <View style={styles.theirBubble}>
      <Text style={styles.typingText}>Typing...</Text>
    </View>
  </View>
);

const FilePreview = ({ file, onClear }) => (
  <View style={styles.filePreview}>
    <Text style={styles.filePreviewText} numberOfLines={1}>
      {file.name || 'Selected File'}
    </Text>
    <TouchableOpacity onPress={onClear} accessibilityLabel="Clear selected file">
      <Ionicons name="close" size={20} color="#EF4444" />
    </TouchableOpacity>
  </View>
);

const ReplyPreview = ({ replyTo, onClear }) => (
  <View style={styles.replyPreview}>
    <Text style={styles.replyPreviewText} numberOfLines={1}>
      Replying to: {replyTo.text?.substring(0, 30) || 'Media'}...
    </Text>
    <TouchableOpacity onPress={onClear} accessibilityLabel="Clear reply">
      <Ionicons name="close" size={20} color="#EF4444" />
    </TouchableOpacity>
  </View>
);

const FileUploadProgress = ({ fileData, onCancel }) => (
  <View style={styles.fileUploadProgress}>
    <Text style={styles.fileUploadText} numberOfLines={1}>{fileData.name}</Text>
    <Progress.Bar progress={fileData.progress / 100} width={200} color="#6366F1" />
    {fileData.status === 'failed' && (
      <Text style={styles.fileUploadError}>Upload failed</Text>
    )}
    <TouchableOpacity onPress={onCancel} accessibilityLabel="Cancel file upload">
      <Ionicons name="close" size={20} color="#EF4444" />
    </TouchableOpacity>
  </View>
);

const MessageInput = ({ text, setText, handleSend, handleTyping, triggerFileInput, disabled, hasFile, isUploading }) => (
  <View style={styles.inputContainer}>
    <TouchableOpacity
      style={styles.attachButton}
      onPress={triggerFileInput}
      disabled={isUploading}
      accessibilityLabel="Attach file"
    >
      <Ionicons name="attach" size={24} color={isUploading ? '#9CA3AF' : '#6B7280'} />
    </TouchableOpacity>
    <TextInput
      style={styles.textInput}
      value={text}
      onChangeText={(value) => {
        setText(value);
        handleTyping();
      }}
      placeholder="Type a message..."
      multiline
      maxLength={500}
      editable={!disabled}
    />
    <TouchableOpacity
      style={[styles.sendButton, (disabled || (!text.trim() && !hasFile)) && styles.sendButtonDisabled]}
      onPress={handleSend}
      disabled={disabled || (!text.trim() && !hasFile)}
      accessibilityLabel="Send message"
    >
      {disabled ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Ionicons name="send" size={20} color="#FFFFFF" />
      )}
    </TouchableOpacity>
  </View>
);

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

  // Scroll to last read message
  const scrollToLastReadMessage = useCallback(() => {
    if (lastReadMessageId && messageRefs.current[lastReadMessageId]) {
      const index = messages.findIndex(msg => msg._id === lastReadMessageId);
      if (index !== -1) {
        flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
        setInitialScrollSet(true);
      }
    } else if (messages.length > 0 && !initialScrollSet) {
      scrollToBottom(false);
      setInitialScrollSet(true);
    }
  }, [lastReadMessageId, messages, initialScrollSet, scrollToBottom]);

  // Find last read message
  const findLastReadMessage = useCallback(
    (messageList) => {
      for (let i = messageList.length - 1; i >= 0; i--) {
        const msg = messageList[i];
        if (msg.seenBy.includes(currentUser._id) && msg.sender._id !== currentUser._id) {
          return msg._id;
        }
      }
      return null;
    },
    [currentUser._id]
  );

  // Identify unread messages
  const identifyUnreadMessages = useCallback(
    (messageList) => {
      return messageList.filter(msg => !msg.seenBy.includes(currentUser._id) && msg.sender._id !== currentUser._id);
    },
    [currentUser._id]
  );

  // Update message in state
  const updateMessageInState = useCallback(
    (messageId, updatedFields) => {
      setMessages(prev =>
        prev.map(msg => (msg._id === messageId ? { ...msg, ...updatedFields } : msg))
      );
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
              if (isInitialLoad) {
                const lastRead = findLastReadMessage(newMessages);
                const unread = identifyUnreadMessages(newMessages);
                setLastReadMessageId(lastRead);
                setUnreadMessages(unread);
              }
            }
            return updatedMessages;
          });

          setNextCursor(nextCursor);
          setHasMoreMessages(hasMore);

          if (!isInitialLoad || checkIfAtBottom({ nativeEvent: { contentOffset: { y: 0 }, contentSize: { height: 0 }, layoutMeasurement: { height: 0 } } })) {
            newMessages.forEach(msg => {
              if (!msg.seenBy.includes(currentUser._id) && msg.sender._id !== currentUser._id) {
                socket.emit('markAsSeen', { messageId: msg._id, userId: currentUser._id });
              }
            });
          }

          if (append && newMessages.length > 0 && flatListRef.current) {
            const newContentHeight = flatListRef.current._listRef._scrollRef._contentSize?.height || 0;
            const heightDifference = newContentHeight - previousContentHeight;
            flatListRef.current.scrollToOffset({
              offset: lastScrollOffset.current + heightDifference,
              animated: false,
            });
          }
        } else {
          console.error('Fetch failed with status:', response.status);
          Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load messages' });
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
    [ findLastReadMessage, identifyUnreadMessages, checkIfAtBottom]
  );

  // Handle scroll
  const handleScroll = useCallback(
    (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      lastScrollOffset.current = offsetY;

      setIsAtBottom(checkIfAtBottom(event));

      if (offsetY < 100 && hasMoreMessages && !isFetchingMore && nextCursor) {
        fetchMessages(nextCursor, true);
      }

      if (checkIfAtBottom(event) && unreadMessages.length > 0) {
        unreadMessages.forEach(msg => {
          socket.emit('markAsSeen', { messageId: msg._id, userId: currentUser._id });
        });
        setUnreadMessages([]);
      }
    },
    [hasMoreMessages, isFetchingMore, nextCursor, fetchMessages, unreadMessages, currentUser._id, checkIfAtBottom]
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
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch room info' });
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

  // Handle initial scroll
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !initialScrollSet) {
      scrollToLastReadMessage();
    }
  }, [isLoading, messages.length, initialScrollSet, scrollToLastReadMessage]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMsg) => {
      if (newMsg.room === room._id) {
        setMessages(prev => {
          const messageExists = prev.some(msg => msg._id === newMsg._id);
          if (messageExists) return prev;

          // Replace temp message if it exists
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

    const handleMessageDeleted = ({ messageId }) => {
      updateMessageInState(messageId, { deleted: true });
    };

    const handleMessageSendError = ({ tempId, error }) => {
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      Toast.show({ type: 'error', text1: 'Error', text2: error || 'Failed to send message' });
      setIsSending(false);
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageSeen', handleMessageSeen);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStopTyping', handleUserStopTyping);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('messageSendError', handleMessageSendError);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageSeen', handleMessageSeen);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStopTyping', handleUserStopTyping);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('messageSendError', handleMessageSendError);
    };
  }, [socket, room._id, currentUser._id, isAtBottom, updateMessageInState]);

  // File picker
  const triggerFileInput = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      console.log('DocumentPicker result:', result);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        setFile(selectedFile);
        Toast.show({ type: 'success', text1: 'File Selected', text2: `Selected "${selectedFile.name}"` });
      } else {
        Toast.show({ type: 'info', text1: 'No File Selected', text2: 'File selection was canceled' });
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
      setIsSending(false);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
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
            {onlineUserIds?.includes(otherParticipant?._id) && <View style={styles.chatOnlineIndicator} />}
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
      </View>

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
            renderItem={({ item }) => (
              <MessageBubble
                key={item._id}
                message={item}
                isMyMessage={isMyMessage(item)}
                onReply={handleReply}
                currentUser={currentUser}
                socket={socket}
                messageRef={el => (messageRefs.current[item._id] = el)}
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
                <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>No messages yet</Text>
                <Text style={styles.emptyStateSubtext}>Start the conversation</Text>
              </View>
            }
          />
          {unreadMessages.length > 0 && !isAtBottom && (
            <View style={styles.jumpToBottomButton}>
              <TouchableOpacity onPress={scrollToLatestMessages} accessibilityLabel="Jump to latest messages">
                <Text style={styles.jumpToBottomText}>
                  {unreadMessages.length} new message{unreadMessages.length > 1 ? 's' : ''}
                </Text>
                <Ionicons name="arrow-down-circle" size={40} color="#6366F1" />
              </TouchableOpacity>
            </View>
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
    padding: 16,
    marginVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
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
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chatOnlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatUserDetails: {
    flex: 1,
  },
  chatUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  chatJobTitle: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
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
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  seenIcon: {
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loadingMoreContainer: {
    alignItems: 'center',
    padding: 16,
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  jumpToBottomButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    zIndex: 10,
    alignItems: 'center',
  },
  jumpToBottomText: {
    fontSize: 14,
    color: '#6366F1',
    marginBottom: 4,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    zIndex: 10,
  },
  filePreviewText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    zIndex: 10,
  },
  replyPreviewText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontStyle: 'italic',
  },
  fileUploadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  fileUploadText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  fileUploadError: {
    fontSize: 12,
    color: '#EF4444',
    marginRight: 8,
  },
  typingContainer: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
  typingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  replyContainer: {
    padding: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
  },
  replyText: {
    fontSize: 12,
    color: '#1F2937',
    fontStyle: 'italic',
  },
  media: {
    width: 200,
    height: 250,
    borderRadius: 8,
    marginTop: 8,
  },
});

export default ChatWindow;