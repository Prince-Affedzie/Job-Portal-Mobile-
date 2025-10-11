import React, { useState, useEffect, useMemo, useCallback,useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Header from '../tasker/Header';
import { AuthContext } from '../../context/AuthContext';
dayjs.extend(relativeTime);

const RoomList = ({ 
  rooms, 
  setRooms,
  onSelectRoom, 
  selectedRoom, 
  currentUserId, 
  onlineUserIds, 
  socket,
  loading, 
  onRefresh 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const {user} = useContext(AuthContext)

  const onRefreshHandler = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const getOtherParticipant = (room) => {
    return room.participants.find(p => p._id !== currentUserId);
  };

  const filteredRooms = rooms.filter(room => {
    const otherUser = getOtherParticipant(room);
    const userName = otherUser?.name || '';
    const jobTitle = room.job?.title || '';
    
    return userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = dayjs(timestamp);
    const now = dayjs();
    
    if (now.diff(date, 'day') >= 1) {
      return date.format('MMM D');
    } else {
      return date.format('h:mm A');
    }
  };

  // Socket events for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = (updatedRoom) => {
      setRooms(prev => {
        const roomExists = prev.find(r => r._id.toString() === updatedRoom._id.toString());
        if (roomExists) {
          return prev.map(r => r._id === updatedRoom._id ? {
            ...r,
            ...updatedRoom, // This brings in lastMessage, lastMessageAt, unreadCounts
          } : r);
        } else {
          return [updatedRoom, ...prev];
        }
      });
    };

    const handleMessageSeen = ({ messageId, userId, roomId }) => {
      // Only update if the current user marked the message as seen
      if (userId === currentUserId) {
        setRooms(prev => 
          prev.map(room => {
            if (room._id === roomId) {
              return {
                ...room,
                unreadCounts: {
                  ...room.unreadCounts,
                  [currentUserId]: 0 // Reset unread count for the current user
                }
              };
            }
            return room;
          })
        );
      }
    };

    socket.on("updatedRoom", handleRoomUpdate);
    socket.on("messageSeen", handleMessageSeen);

    return () => {
      socket.off("updatedRoom", handleRoomUpdate);
      socket.off('messageSeen', handleMessageSeen);
    };
  }, [socket, setRooms, currentUserId]);

  const renderRoomItem = ({ item: room }) => {
    const otherUser = getOtherParticipant(room);
    const isOnline = onlineUserIds.includes(otherUser?._id);
    const isSelected = selectedRoom?._id === room._id;
    const unreadCount = room.unreadCounts?.[currentUserId] || 0;

    return (
      <TouchableOpacity
        style={[
          styles.roomItem,
          isSelected && styles.roomItemSelected
        ]}
        onPress={() => onSelectRoom(room)}
      >
        <View style={styles.roomAvatar}>
          {otherUser?.profileImage ? (
            <Image
              source={{ uri: otherUser.profileImage }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.roomContent}>
          <View style={styles.roomHeader}>
            <Text 
              style={[
                styles.roomName,
                unreadCount > 0 && styles.roomNameUnread
              ]} 
              numberOfLines={1}
            >
              {otherUser?.name || 'Unknown User'}
            </Text>
            <Text style={styles.roomTime}>
              {formatTime(room.lastMessageAt)}
            </Text>
          </View>
          
          {room.job?.title && (
            <Text style={styles.roomJob} numberOfLines={1}>
              {room.job.title}
            </Text>
          )}
          
          <Text 
            style={[
              styles.roomLastMessage,
              unreadCount > 0 && styles.roomLastMessageUnread
            ]} 
            numberOfLines={1}
          >
            {room.lastMessage || 'No messages yet'}
          </Text>
        </View>

        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header title="Chats" />
      <View style={styles.compactHeader}>
       <View style={styles.headerTextContainer}>
       <Text style={styles.compactHeaderTitle}>Messages</Text>
        <Text style={styles.compactHeaderSubtitle}>
        {filteredRooms.length} {filteredRooms.length === 1 ? 'conversation' : 'conversations'}
       </Text>
        </View>
       </View>


      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Room List */}
      <FlatList
        data={filteredRooms}
        renderItem={renderRoomItem}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.roomListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefreshHandler}
            colors={['#6366F1']}
          />
        }
       ListEmptyComponent={
  <View style={styles.emptyState}>
    <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
    <Text style={styles.emptyStateTitle}>
      {user.role === 'client'
        ? 'No conversations yet. Assign a task to chat with Taskers.'
        : 'No conversations yet. Apply to tasks to start chatting with Clients.'}
    </Text>
    <Text style={styles.emptyStateText}>
      {searchQuery
        ? 'No conversations match your search.'
        : user.role === 'client'
          ? 'Once you assign a task, conversations will appear here.'
          : 'Once a client assigns you a task, conversations will appear here.'}
    </Text>
  </View>
}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
   compactHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  headerTextContainer: {
    alignItems: 'flex-start',
  },
  compactHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  compactHeaderSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
 
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  roomListContent: {
    paddingBottom: 16,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  roomItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  roomAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  onlineIndicator: {
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
  roomContent: {
    flex: 1,
    marginRight: 8,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  roomNameUnread: {
    color: '#6366F1',
  },
  roomTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  roomJob: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
    marginBottom: 2,
  },
  roomLastMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  roomLastMessageUnread: {
    color: '#1F2937',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
  alignItems: 'center',
  justifyContent: 'center',
  padding: 40,
  marginTop: 60,
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
  paddingBottom: 20,
},
emptyStateTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#1E293B',
  marginTop: 16,
  marginBottom: 8,
  textAlign: 'center',
  maxWidth: '80%',
},
emptyStateText: {
  fontSize: 14,
  color: '#6B7280',
  textAlign: 'center',
  maxWidth: '80%',
  lineHeight: 20,
},
});

export default RoomList;