import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NotificationContext } from '../../context/NotificationContext';
import { AuthContext } from '../../context/AuthContext';
import { getAllChatRooms } from '../../api/chatApi';
import RoomList from '../../component/Messaging/RoomList';
import ChatWindow from '../../component/Messaging/ChatWindow';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import Header from '../../component/tasker/Header';

const { width } = Dimensions.get('window');

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { socket } = useContext(NotificationContext);
  const { user } = useContext(AuthContext);
  
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRoomList, setShowRoomList] = useState(true);

  // Get roomId from route params if coming from deep link
  const roomId = route.params?.roomId;

  // Load chat rooms
  const loadRooms = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await getAllChatRooms();
      if (response.status === 200) {
        setRooms(response.data);
        
        // Auto-select room if roomId is provided
        if (roomId) {
          const room = response.data.find(r => r._id === roomId);
          if (room) {
            setSelectedRoom(room);
            setShowRoomList(false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to load conversations'
      );
    } finally {
      setLoading(false);
    }
  }, [user, roomId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !user?._id) return;

    // Mark user as online
    socket.emit('user-online', user._id);

    // Listen for online users updates
    const handleOnlineUsers = (ids) => {
      setOnlineUserIds(ids);
    };

    // Listen for room updates
    const handleRoomUpdate = (updatedRoom) => {
      setRooms(prev => {
        const roomExists = prev.find(r => r._id.toString() === updatedRoom._id.toString());
        if (roomExists) {
          return prev.map(r => r._id === updatedRoom._id ? {
            ...r,
            ...updatedRoom,
          } : r);
        } else {
          return [updatedRoom, ...prev];
        }
      });

      // Update selected room if it's the current one
      if (selectedRoom && selectedRoom._id === updatedRoom._id) {
        setSelectedRoom(updatedRoom);
      }
    };

    socket.on('update-online-users', handleOnlineUsers);
    socket.on('updatedRoom', handleRoomUpdate);

    return () => {
      socket.off('update-online-users', handleOnlineUsers);
      socket.off('updatedRoom', handleRoomUpdate);
    };
  }, [socket, user, selectedRoom]);

  // Initial load
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Handle room selection
  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setShowRoomList(false);
  };

  // Handle back to room list
  const handleBackToRoomList = () => {
    setSelectedRoom(null);
    setShowRoomList(true);
  };

  // Handle navigation back
  const handleNavigationBack = () => {
    if (selectedRoom && !showRoomList) {
      handleBackToRoomList();
    } else {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
      <Header title='Chats'/>
      <LoadingIndicator text='Loading Conversations'/>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Room List View */}
      {showRoomList && (
        <RoomList
          rooms={rooms}
          onSelectRoom={handleSelectRoom}
          selectedRoom={selectedRoom}
          currentUserId={user?._id}
          onlineUserIds={onlineUserIds}
          loading={loading}
          onRefresh={loadRooms}
          socket={socket}
        />
      )}

      {/* Chat Window View */}
      {selectedRoom && !showRoomList && (
        <ChatWindow
          room={selectedRoom}
          socket={socket}
          currentUser={user}
          onlineUserIds={onlineUserIds}
          onBack={handleBackToRoomList}
        />
      )}

      {/* Empty State when no room selected */}
      {!selectedRoom && !showRoomList && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Select a conversation to start chatting
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default ChatScreen;