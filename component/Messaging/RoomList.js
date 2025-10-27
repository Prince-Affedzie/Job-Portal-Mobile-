import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Header from '../tasker/Header';
import { AuthContext } from '../../context/AuthContext';

dayjs.extend(relativeTime);

const { width } = Dimensions.get('window');

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
  const [searchFocused, setSearchFocused] = useState(false);
  const { user } = useContext(AuthContext);

  const searchAnim = useState(new Animated.Value(0))[0];

  const onRefreshHandler = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const getOtherParticipant = (room) => {
    return room.participants.find(p => p._id !== currentUserId);
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const otherUser = getOtherParticipant(room);
      const userName = otherUser?.name || '';
      const jobTitle = room.job?.title || '';
      
      return userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [rooms, searchQuery, currentUserId]);

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

  const handleSearchFocus = () => {
    setSearchFocused(true);
    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    setSearchFocused(false);
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const getLastMessagePreview = (room) => {
    if (!room.lastMessage) return 'No messages yet';
    
    const message = room.lastMessage;
    if (message.length > 40) {
      return message.substring(0, 40) + '...';
    }
    return message;
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
            ...updatedRoom,
          } : r);
        } else {
          return [updatedRoom, ...prev];
        }
      });
    };

    const handleMessageSeen = ({ messageId, userId, roomId }) => {
      if (userId === currentUserId) {
        setRooms(prev => 
          prev.map(room => {
            if (room._id === roomId) {
              return {
                ...room,
                unreadCounts: {
                  ...room.unreadCounts,
                  [currentUserId]: 0
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

  const renderRoomItem = ({ item: room, index }) => {
    const otherUser = getOtherParticipant(room);
    const isOnline = onlineUserIds.includes(otherUser?._id);
    const isSelected = selectedRoom?._id === room._id;
    const unreadCount = room.unreadCounts?.[currentUserId] || 0;
    const lastMessagePreview = getLastMessagePreview(room);

    return (
      <TouchableOpacity
        style={[
          styles.roomItem,
          isSelected && styles.roomItemSelected,
          index === 0 && styles.firstRoomItem,
          index === filteredRooms.length - 1 && styles.lastRoomItem,
        ]}
        onPress={() => onSelectRoom(room)}
        activeOpacity={0.7}
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
            <View style={styles.nameContainer}>
              <Text 
                style={[
                  styles.roomName,
                  unreadCount > 0 && styles.roomNameUnread
                ]} 
                numberOfLines={1}
              >
                {otherUser?.name || 'Unknown User'}
              </Text>
              {room.job?.title && (
                <View style={styles.jobBadge}>
                  <Ionicons name="briefcase-outline" size={10} color="#6366F1" />
                  <Text style={styles.jobBadgeText} numberOfLines={1}>
                    {room.job.title}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.roomTime}>
                {formatTime(room.lastMessageAt)}
              </Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <Text 
            style={[
              styles.roomLastMessage,
              unreadCount > 0 && styles.roomLastMessageUnread
            ]} 
            numberOfLines={2}
          >
            {lastMessagePreview}
          </Text>
        </View>

        <Ionicons 
          name="chevron-forward" 
          size={16} 
          color="#D1D5DB" 
          style={styles.chevronIcon}
        />
      </TouchableOpacity>
    );
  };

  const borderColor = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#6366F1']
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header title="Chats" />
      
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            {filteredRooms.length} {filteredRooms.length === 1 ? 'conversation' : 'conversations'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="filter" size={20} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Search Bar */}
      <Animated.View style={[styles.searchContainer, { borderColor }]}>
        <Ionicons 
          name="search" 
          size={20} 
          color={searchFocused ? '#6366F1' : '#6B7280'} 
          style={styles.searchIcon} 
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Quick Actions 
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="person-add" size={18} color="#6366F1" />
          </View>
          <Text style={styles.quickActionText}>New Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="checkmark-done" size={18} color="#16A34A" />
          </View>
          <Text style={styles.quickActionText}>Archive</Text>
        </TouchableOpacity>
      </View>*/}

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
            tintColor="#6366F1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="#E5E7EB" />
            </View>
            <Text style={styles.emptyStateTitle}>
              {user.role === 'client'
                ? 'No conversations yet'
                : 'No conversations yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery
                ? 'No conversations match your search'
                : user.role === 'client'
                  ? 'Assign a task to start chatting with Taskers'
                  : 'Apply to tasks to start chatting with Clients'}
            </Text>
            
          </View>
        }
        ListHeaderComponent={
          filteredRooms.length > 0 ? (
            <Text style={styles.listHeader}>Recent Conversations</Text>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  quickAction: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  roomListContent: {
    paddingBottom: 20,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginHorizontal: 20,
    marginVertical: 12,
    marginBottom: 8,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  roomItemSelected: {
    backgroundColor: '#F0F9FF',
    borderLeftColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  firstRoomItem: {
    marginTop: 8,
  },
  lastRoomItem: {
    marginBottom: 16,
  },
  roomAvatar: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: 20,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  roomContent: {
    flex: 1,
    marginRight: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  roomName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  roomNameUnread: {
    color: '#1E293B',
  },
  jobBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  jobBadgeText: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
    maxWidth: 120,
  },
  timeContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  roomTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  roomLastMessage: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 20,
  },
  roomLastMessageUnread: {
    color: '#1E293B',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  chevronIcon: {
    opacity: 0.7,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default RoomList;