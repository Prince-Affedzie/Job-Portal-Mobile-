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
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Progress from 'react-native-progress';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { fetchRoomMessages, handleChatFiles, fetchRoomInfo, blockUserChat, reportMessage } from '../../api/chatApi';
import { sendFileToS3 } from '../../api/commonApi';
import { NotificationContext } from '../../context/NotificationContext';
import { AuthContext } from '../../context/AuthContext';

import { MessageBubble } from '../../component/Messaging/MessageBubble';
import { TypingIndicator } from '../../component/Messaging/TypingIndicator';
import { FilePreview } from '../../component/Messaging/FilePreview';
import { MessageInput } from '../../component/Messaging/MessageInput';
import { ReplyPreview } from '../../component/Messaging/ReplyPreview';
import { FileUploadProgress } from '../../component/Messaging/FileUploadProgress';

import { styles } from '../../styles/message/ChatWindowScreen.styles';

const { width, height } = Dimensions.get('window');

// ─── Report reasons ────────────────────────────────────────────────────────────
const REPORT_REASONS = [
  { id: 'harassment',    label: 'Harassment or bullying'           },
  { id: 'spam',          label: 'Spam or unwanted messages'        },
  { id: 'inappropriate', label: 'Inappropriate content'            },
  { id: 'scam',          label: 'Scam or fraud attempt'            },
  { id: 'threats',       label: 'Threats or violent content'       },
  { id: 'other',         label: 'Other'                            },
];

// ─── Block Confirmation Modal ──────────────────────────────────────────────────
function BlockConfirmModal({ visible, userName, onConfirm, onCancel, loading }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          {/* Icon */}
          <View style={ms.blockIconCircle}>
            <Ionicons name="ban-outline" size={32} color="#DC2626" />
          </View>

          <Text style={ms.sheetTitle}>Block {userName}?</Text>
          <Text style={ms.sheetBody}>
            Blocking this user will permanently delete all messages in this conversation and prevent
            further contact. This action cannot be undone.
          </Text>

          {/* Warning chips */}
          {[
            'All messages will be deleted',
            'The conversation will be removed',
            'A moderation review will be triggered',
          ].map((line, i) => (
            <View key={i} style={ms.warningRow}>
              <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
              <Text style={ms.warningText}>{line}</Text>
            </View>
          ))}

          <View style={ms.buttonRow}>
            <TouchableOpacity style={ms.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={ms.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.blockBtn, loading && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={ms.blockBtnText}>Block User</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Report Message Modal ──────────────────────────────────────────────────────
function ReportMessageModal({ visible, message, currentUserId, onSubmit, onCancel, loading }) {
  const [selectedReason, setSelectedReason] = useState(null);

  // Reset each time modal opens
  useEffect(() => {
    if (visible) setSelectedReason(null);
  }, [visible]);

  const handleSubmit = () => {
    if (!selectedReason) {
      Toast.show({ type: 'info', text1: 'Please select a reason' });
      return;
    }
    const reportedUserId = message?.sender?._id;
    onSubmit({ reason: selectedReason, reportedUser: reportedUserId });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.reportHandle} />

          <View style={ms.reportHeader}>
            <View style={ms.reportIconCircle}>
              <Ionicons name="flag-outline" size={22} color="#7C3AED" />
            </View>
            <View>
              <Text style={ms.sheetTitle}>Report Message</Text>
              <Text style={ms.reportSubtitle}>Help us understand what's wrong</Text>
            </View>
          </View>

          {/* Preview of the reported message */}
          {message?.text ? (
            <View style={ms.msgPreview}>
              <Text style={ms.msgPreviewLabel}>Reported message</Text>
              <Text style={ms.msgPreviewText} numberOfLines={3}>{message.text}</Text>
            </View>
          ) : null}

          {/* Reason list */}
          <Text style={ms.reasonsLabel}>Select a reason</Text>
          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
            {REPORT_REASONS.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[ms.reasonRow, selectedReason === r.label && ms.reasonRowActive]}
                onPress={() => setSelectedReason(r.label)}
                activeOpacity={0.8}
              >
                <View style={[ms.reasonRadio, selectedReason === r.label && ms.reasonRadioActive]}>
                  {selectedReason === r.label && (
                    <View style={ms.reasonRadioInner} />
                  )}
                </View>
                <Text style={[ms.reasonText, selectedReason === r.label && ms.reasonTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={ms.buttonRow}>
            <TouchableOpacity style={ms.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={ms.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.reportSubmitBtn, (!selectedReason || loading) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={!selectedReason || loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="flag" size={15} color="#fff" />
                    <Text style={ms.reportSubmitText}>Submit Report</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Header options menu ───────────────────────────────────────────────────────
function HeaderOptionsMenu({ visible, onBlock, onClose }) {
  if (!visible) return null;
  return (
    <TouchableOpacity style={ms.menuBackdrop} activeOpacity={1} onPress={onClose}>
      <View style={ms.menuSheet}>
        <TouchableOpacity style={ms.menuItem} onPress={() => { onClose(); onBlock(); }}>
          <View style={ms.menuItemIcon}>
            <Ionicons name="ban-outline" size={18} color="#DC2626" />
          </View>
          <View>
            <Text style={[ms.menuItemText, { color: '#DC2626' }]}>Block User</Text>
            <Text style={ms.menuItemSub}>Block conversation </Text>
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// Modal styles
const ms = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  sheet:          { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  blockIconCircle:{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:     { fontSize: 18, fontWeight: '800', color: '#0D1B35', textAlign: 'center', marginBottom: 8 },
  sheetBody:      { fontSize: 14, color: '#4A5B7A', lineHeight: 21, textAlign: 'center', marginBottom: 16 },
  warningRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  warningText:    { fontSize: 13, color: '#7F1D1D', flex: 1 },
  buttonRow:      { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:      { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8ECF2', alignItems: 'center' },
  cancelBtnText:  { fontSize: 14, fontWeight: '600', color: '#4A5B7A' },
  blockBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, backgroundColor: '#DC2626' },
  blockBtnText:   { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Report modal
  reportHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D9E6', alignSelf: 'center', marginBottom: 16 },
  reportHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  reportIconCircle:{ width: 44, height: 44, borderRadius: 13, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  reportSubtitle:  { fontSize: 12, color: '#8FA0BE', marginTop: 1 },
  msgPreview:      { backgroundColor: '#F4F6FB', borderRadius: 12, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#7C3AED' },
  msgPreviewLabel: { fontSize: 10, fontWeight: '700', color: '#8FA0BE', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  msgPreviewText:  { fontSize: 13, color: '#4A5B7A', lineHeight: 19 },
  reasonsLabel:    { fontSize: 12, fontWeight: '700', color: '#8FA0BE', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  reasonRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, borderWidth: 1.5, borderColor: '#E8ECF2' },
  reasonRowActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  reasonRadio:     { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D9E6', alignItems: 'center', justifyContent: 'center' },
  reasonRadioActive:{ borderColor: '#7C3AED' },
  reasonRadioInner:{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C3AED' },
  reasonText:      { fontSize: 14, color: '#4A5B7A', fontWeight: '500', flex: 1 },
  reasonTextActive:{ color: '#4C1D95', fontWeight: '700' },
  reportSubmitBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, backgroundColor: '#7C3AED' },
  reportSubmitText:{ fontSize: 14, fontWeight: '700', color: '#fff' },

  // Header options menu (positioned top-right)
  menuBackdrop:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  menuSheet:      { position: 'absolute', top: 60, right: 12, backgroundColor: '#fff', borderRadius: 14, padding: 4, minWidth: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12, borderWidth: 1, borderColor: '#E8ECF2' },
  menuItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10 },
  menuItemIcon:   { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  menuItemText:   { fontSize: 14, fontWeight: '700' },
  menuItemSub:    { fontSize: 11, color: '#8FA0BE', marginTop: 1 },
});

// ─────────────────────────────────────────────────────────────────────────────
const ChatWindowScreen = () => {
  const navigation  = useNavigation();
  const route       = useRoute();
  const { roomId }  = route.params;
  const { socket }  = useContext(NotificationContext);
  const { user }    = useContext(AuthContext);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const currentUser = user;

  const [messages,          setMessages]          = useState([]);
  const [text,              setText]              = useState('');
  const [file,              setFile]              = useState(null);
  const [isLoading,         setIsLoading]         = useState(true);
  const [isSending,         setIsSending]         = useState(false);
  const [isTyping,          setIsTyping]          = useState(false);
  const [typingTimeout,     setTypingTimeout]     = useState(null);
  const [replyTo,           setReplyTo]           = useState(null);
  const [uploadingFiles,    setUploadingFiles]    = useState(new Map());
  const [nextCursor,        setNextCursor]        = useState(null);
  const [hasMoreMessages,   setHasMoreMessages]   = useState(true);
  const [isFetchingMore,    setIsFetchingMore]    = useState(false);
  const [isAtBottom,        setIsAtBottom]        = useState(true);
  const [lastReadMessageId, setLastReadMessageId] = useState(null);
  const [unreadMessages,    setUnreadMessages]    = useState([]);
  const [initialScrollSet,  setInitialScrollSet]  = useState(false);
  const [isInitialLoad,     setIsInitialLoad]     = useState(true);
  const [roomInfo,          setRoomInfo]          = useState(null);
  const [otherParticipant,  setOtherParticipant]  = useState(null);

  // ── Block & Report state ────────────────────────────────────────────────────
  const [showOptionsMenu,   setShowOptionsMenu]   = useState(false);
  const [showBlockModal,    setShowBlockModal]    = useState(false);
  const [isBlocking,        setIsBlocking]        = useState(false);
  const [showReportModal,   setShowReportModal]   = useState(false);
  const [reportingMessage,  setReportingMessage]  = useState(null); // the message being reported
  const [isReporting,       setIsReporting]       = useState(false);

  const flatListRef      = useRef(null);
  const messageRefs      = useRef({});
  const fetchLockRef     = useRef(false);
  const lastScrollOffset = useRef(0);
  const headerAnim       = useRef(new Animated.Value(0)).current;

  const generateFileId = useCallback(
    () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  // ── Block user ──────────────────────────────────────────────────────────────
  const handleBlockUser = useCallback(async () => {
    if (!otherParticipant?._id) return;
    setIsBlocking(true);
    try {
      const res = await blockUserChat(otherParticipant._id);
      if (res.status === 200) {
        Toast.show({ type: 'success', text1: 'User blocked', text2: 'The conversation has been removed.' });
        setShowBlockModal(false);
        // Give the toast a moment to show before navigating away
        setTimeout(() => navigation.goBack(), 1200);
      } else {
        Toast.show({ type: 'error', text1: 'Failed to block user', text2: 'Please try again.' });
      }
    } catch (err) {
      console.error('Block user error:', err);
      Toast.show({ type: 'error', text1: 'Error', text2: err?.message || 'Failed to block user.' });
    } finally {
      setIsBlocking(false);
    }
  }, [otherParticipant, navigation]);

  // ── Report message ──────────────────────────────────────────────────────────
  // Called by MessageBubble via onReport prop
  const handleOpenReport = useCallback((message) => {
    setReportingMessage(message);
    setShowReportModal(true);
  }, []);

  const handleSubmitReport = useCallback(async ({ reason, reportedUser }) => {
    if (!reportingMessage?._id) return;
    setIsReporting(true);
    try {
      const res = await reportMessage(reportingMessage._id, { reason, reportedUser });
      if (res.status === 200) {
        Toast.show({ type: 'success', text1: 'Report submitted', text2: 'Thank you. Our team will review this.' });
        setShowReportModal(false);
        setReportingMessage(null);
      } else {
        Toast.show({ type: 'error', text1: 'Failed to submit report', text2: 'Please try again.' });
      }
    } catch (err) {
      console.error('Report message error:', err);
      Toast.show({ type: 'error', text1: 'Error', text2: err?.message || 'Failed to submit report.' });
    } finally {
      setIsReporting(false);
    }
  }, [reportingMessage]);

  // ── Voice note ──────────────────────────────────────────────────────────────
  const handleVoiceNoteRecorded = useCallback(async (voiceNote) => {
    if (!voiceNote?.uri) return;
    setIsSending(true);
    try {
      await uploadFileWithProgress(
        { uri: voiceNote.uri, name: voiceNote.name, type: voiceNote.type, size: voiceNote.size },
        '', null, voiceNote.duration
      );
    } catch (error) {
      console.error('Failed to send voice note:', error);
      Toast.show({ type: 'error', text1: 'Failed to send voice note' });
    } finally {
      setIsSending(false);
    }
  }, []);

  const updateFileProgress = useCallback((fileId, progress, status = 'uploading') => {
    setUploadingFiles(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(fileId);
      if (existing) newMap.set(fileId, { ...existing, progress, status });
      return newMap;
    });
  }, []);

  const removeFileFromUploads = useCallback((fileId) => {
    setUploadingFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, []);

  const uploadFileWithProgress = useCallback(
    async (file, messageText = '', replyToMessage = null) => {
      const fileId = generateFileId();
      const fileData = {
        id: fileId, name: file.name, size: file.size, type: file.mimeType,
        progress: 0, status: 'preparing', startTime: Date.now(),
      };
      setUploadingFiles(prev => new Map(prev).set(fileId, fileData));
      try {
        updateFileProgress(fileId, 0, 'preparing');
        const res = await handleChatFiles({ filename: file.name, contentType: file.mimeType });
        if (res.status !== 200) throw new Error('Failed to get upload URL');
        const { fileKey, fileUrl, publicUrl } = res.data;
        updateFileProgress(fileId, 5, 'uploading');
        await sendFileToS3(fileUrl, file, (progress) => {
          updateFileProgress(fileId, Math.round(progress * 90), 'uploading');
        });
        updateFileProgress(fileId, 95, 'processing');
        const payload = {
          senderId: currentUser._id, roomId,
          ...(messageText.trim() && { text: messageText.trim() }),
          mediaUrl: publicUrl, fileName: file.name,
          ...(replyToMessage?._id && { replyTo: replyToMessage._id }),
        };
        socket?.emit('sendMessage', payload);
        setText(''); setFile(null); setIsSending(false); setReplyTo(null);
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
    [currentUser._id, roomId, socket, updateFileProgress, removeFileFromUploads, generateFileId]
  );

  const checkIfAtBottom = useCallback((event) => {
    const offsetY       = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const containerHeight = event.nativeEvent.layoutMeasurement.height;
    return contentHeight - offsetY - containerHeight < 50;
  }, []);

  const scrollToBottom = useCallback((animated = true) => {
    flatListRef.current?.scrollToEnd({ animated });
    setIsAtBottom(true);
  }, []);

  const fetchMessages = useCallback(async (cursor = null, append = false) => {
    if (fetchLockRef.current || (append && !hasMoreMessages)) return;
    fetchLockRef.current = true;
    try {
      if (append) setIsFetchingMore(true);
      else setIsLoading(true);
      const response = await fetchRoomMessages(roomId, cursor);
      if (response.status === 200) {
        const { messages: newMessages, nextCursor, hasMore } = response.data;
        setMessages(prev => {
          if (append) {
            const existingIds = new Set(prev.map(msg => msg._id));
            const unique = newMessages.filter(msg => !existingIds.has(msg._id));
            return [...unique, ...prev];
          }
          newMessages.forEach(msg => {
            if (!msg.seenBy?.includes(currentUser._id)) {
              socket?.emit('markAsSeen', { messageId: msg._id, userId: currentUser._id });
            }
          });
          return newMessages;
        });
        setNextCursor(nextCursor);
        setHasMoreMessages(hasMore);
        if (!append) setTimeout(() => scrollToBottom(false), 100);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load messages' });
    } finally {
      fetchLockRef.current = false;
      setIsFetchingMore(false);
      setIsLoading(false);
      if (!append) setIsInitialLoad(false);
    }
  }, [roomId, scrollToBottom, currentUser._id, socket]);

  const handleScroll = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    lastScrollOffset.current = offsetY;
    setIsAtBottom(checkIfAtBottom(event));
    if (offsetY > 10) {
      Animated.timing(headerAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    } else {
      Animated.timing(headerAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
    if (offsetY < 100 && hasMoreMessages && !isFetchingMore && nextCursor) {
      fetchMessages(nextCursor, true);
    }
  }, [hasMoreMessages, isFetchingMore, nextCursor, fetchMessages, checkIfAtBottom, headerAnim]);

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
    setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, ...updatedFields } : msg));
  }, []);

  useEffect(() => {
    if (roomId && currentUser?._id && socket) {
      socket.emit('markRoomAsSeen', { roomId, userId: currentUser._id });
    }
  }, [roomId, currentUser?._id, socket]);

  useEffect(() => {
    if (roomId) {
      setMessages([]); setIsLoading(true); setIsAtBottom(true);
      setNextCursor(null); setHasMoreMessages(true); setIsFetchingMore(false);
      setLastReadMessageId(null); setUnreadMessages([]); setInitialScrollSet(false);
      setIsInitialLoad(true); setUploadingFiles(new Map());
      fetchRoomDetails();
      fetchMessages();
      socket?.emit('joinRoom', { roomId });
    }
    return () => { socket?.emit('leaveRoom', { roomId }); };
  }, [roomId, socket, fetchMessages, fetchRoomDetails]);

  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = (newMsg) => {
      if (newMsg.room === roomId) {
        setMessages(prev => {
          if (prev.some(msg => msg._id === newMsg._id)) return prev;
          const tempIndex = prev.findIndex(
            msg => msg.isTemp && msg.text === newMsg.text && msg.sender._id === newMsg.sender._id
          );
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = newMsg;
            return updated;
          }
          return [...prev, newMsg];
        });
        const isOwnMessage = newMsg.sender._id === currentUser._id;
        if (isAtBottom || !isOwnMessage) {
          socket?.emit('markAsSeen', { messageId: newMsg._id, userId: currentUser._id });
          setTimeout(() => scrollToBottom(true), 100);
        } else {
          setUnreadMessages(prev => [...prev, newMsg]);
        }
      }
    };
    const handleMessageSeen = ({ messageId, userId }) => {
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, seenBy: [...new Set([...msg.seenBy, userId])] } : msg
      ));
    };
    const handleUserTyping      = ({ userId }) => { if (userId !== currentUser._id) setIsTyping(true); };
    const handleUserStopTyping  = ({ userId }) => { if (userId !== currentUser._id) setIsTyping(false); };
    const handleMessageDeleted  = ({ messageId }) => { updateMessageInState(messageId, { deleted: true }); };
    const handleRoomMarkedAsSeen = ({ roomId: rId, userId }) => {
      // Acknowledged – unread counts updated on backend
    };
    socket.on('receiveMessage',    handleReceiveMessage);
    socket.on('messageSeen',       handleMessageSeen);
    socket.on('userTyping',        handleUserTyping);
    socket.on('userStopTyping',    handleUserStopTyping);
    socket.on('messageDeleted',    handleMessageDeleted);
    socket.on('roomMarkedAsSeen',  handleRoomMarkedAsSeen);
    return () => {
      socket.off('receiveMessage',   handleReceiveMessage);
      socket.off('messageSeen',      handleMessageSeen);
      socket.off('userTyping',       handleUserTyping);
      socket.off('userStopTyping',   handleUserStopTyping);
      socket.off('messageDeleted',   handleMessageDeleted);
      socket.off('roomMarkedAsSeen', handleRoomMarkedAsSeen);
    };
  }, [socket, roomId, currentUser._id, isAtBottom, scrollToBottom, updateMessageInState]);

  const triggerFileInput = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) setFile(result.assets[0]);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to pick file' });
    }
  }, []);

  const handleSend = useCallback(async () => {
    if ((!text.trim() && !file) || isSending) return;
    setIsSending(true);
    if (file) { await uploadFileWithProgress(file, text, replyTo); return; }
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: tempId, text: text.trim(),
      sender: { _id: currentUser._id, name: currentUser.name },
      createdAt: new Date(), seenBy: [currentUser._id], isTemp: true,
      ...(replyTo?._id && { replyTo }),
    };
    setMessages(prev => [...prev, tempMessage]);
    setText(''); setReplyTo(null);
    if (isAtBottom) setTimeout(() => scrollToBottom(true), 100);
    try {
      socket?.emit('sendMessage', {
        senderId: currentUser._id, roomId, text: text.trim(),
        ...(replyTo?._id && { replyTo: replyTo._id }), tempId,
      });
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to send message' });
    } finally { setIsSending(false); }
  }, [text, file, isSending, currentUser._id, roomId, socket, replyTo, isAtBottom, scrollToBottom, uploadFileWithProgress]);

  const handleTyping = useCallback(() => {
    if (!socket) return;
    socket.emit('typing', { roomId, userId: currentUser._id });
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(() => {
      socket.emit('stopTyping', { roomId, userId: currentUser._id });
    }, 2000));
  }, [socket, roomId, currentUser._id, typingTimeout]);

  const handleReply = useCallback((message) => { setReplyTo(message); }, []);

  const scrollToLatestMessages = useCallback(() => {
    unreadMessages.forEach(msg => {
      socket?.emit('markAsSeen', { messageId: msg._id, userId: currentUser._id });
    });
    setUnreadMessages([]);
    scrollToBottom(true);
  }, [unreadMessages, socket, currentUser._id, scrollToBottom]);

  const handleBack = useCallback(() => {
    if (roomId && currentUser?._id && socket) {
      socket.emit('markRoomAsSeen', { roomId, userId: currentUser._id });
    }
    navigation.goBack();
  }, [roomId, currentUser?._id, socket, navigation]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack(); return true;
    });
    return () => backHandler.remove();
  }, [handleBack]);

  const isMyMessage = useCallback((msg) => msg.sender._id === currentUser._id, [currentUser._id]);

  const renderHeader = useCallback(() =>
    isFetchingMore ? (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#6366F1" />
        <Text style={styles.loadingMoreText}>Loading older messages...</Text>
      </View>
    ) : null,
  [isFetchingMore]);

  const headerShadow = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });
  const headerBorder = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });

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
      {/* ── Chat Header ──────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.chatHeader,
          { shadowOpacity: headerAnim, shadowRadius: headerShadow, borderBottomWidth: headerBorder },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack} accessibilityLabel="Go back">
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
          
          {/* ⋮ menu — opens block option */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowOptionsMenu(v => !v)}
            accessibilityLabel="More options"
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Messages List ─────────────────────────────────────────────────────── */}
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
                  onReport={handleOpenReport}        // ← passes report trigger down
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
                  <Text style={styles.emptyStateSubtext}>Send a message to start the conversation</Text>
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
            <FileUploadProgress key={fileId} fileData={fileData} onCancel={() => removeFileFromUploads(fileId)} />
          ))}

          {isTyping && <TypingIndicator />}
        </>
      )}

      {/* File / Reply previews */}
      {file    && <FilePreview file={file} onClear={() => setFile(null)} />}
      {replyTo && <ReplyPreview replyTo={replyTo} onClear={() => setReplyTo(null)} />}

      {/* Message input */}
      <MessageInput
        text={text}
        setText={setText}
        handleSend={handleSend}
        handleTyping={handleTyping}
        triggerFileInput={triggerFileInput}
        disabled={isSending}
        hasFile={!!file}
        isUploading={uploadingFiles.size > 0}
        onVoiceNoteRecorded={handleVoiceNoteRecorded}
      />

      {/* ── Header options dropdown (block) ───────────────────────────────────── */}
      <HeaderOptionsMenu
        visible={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        onBlock={() => setShowBlockModal(true)}
      />

      {/* ── Block confirmation modal ──────────────────────────────────────────── */}
      <BlockConfirmModal
        visible={showBlockModal}
        userName={otherParticipant?.name || 'this user'}
        onConfirm={handleBlockUser}
        onCancel={() => setShowBlockModal(false)}
        loading={isBlocking}
      />

      {/* ── Report message modal ──────────────────────────────────────────────── */}
      <ReportMessageModal
        visible={showReportModal}
        message={reportingMessage}
        currentUserId={currentUser._id}
        onSubmit={handleSubmitReport}
        onCancel={() => { setShowReportModal(false); setReportingMessage(null); }}
        loading={isReporting}
      />

      <Toast topOffset={100} />
    </KeyboardAvoidingView>
  );
};

export default ChatWindowScreen;