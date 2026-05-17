import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
  RefreshControl,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../component/tasker/Header';          // your updated header
import { viewBookings } from '../../api/taskerApi';        // adjust path
import { navigate } from '../../services/navigationService';
import TaskerPaymentSafetyBanner from '../../component/tasker/PaymentSafetyTasker'

const { width } = Dimensions.get('window');
const scale = (size) => (width / 375) * size;

// ─── Theme – “Pacific Indigo & Warm Gold” ────────────────────────────────
const C = {
  bg: '#F9FAFC',
  surface: '#FFFFFF',
  border: '#E4E8EE',
  accent: '#1E3A6E',            // deep indigo (use sparingly, mostly in headers)
  accentGlow: '#DDE7F5',
  gold: '#D49B3F',
  green: '#0F766E',
  red: '#DC2626',
  orange: '#F59E0B',
  purple: '#7E3AF2',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
};

// ─── Status config (matches your MyBookings & BookingDetail) ───────────
const STATUS_CONFIG = {
  PENDING:               { label: 'Pending',             color: C.orange, icon: '⏳', bg: '#FEF3C7' },
  LOCKED:                { label: 'Locked',              color: C.purple, icon: '🔒', bg: '#EDE9FE' },
  ACCEPTED:              { label: 'Accepted',            color: C.green,  icon: '✅', bg: '#D1FAE5' },
  DECLINED:              { label: 'Declined',            color: C.red,    icon: '✗',  bg: '#FEE2E2' },
  ARRIVAL_PENDING:       { label: 'Arrival Pending',     color: C.accent, icon: '🚗', bg: '#DBEAFE' },
  ARRIVED:               { label: 'Arrived',             color: C.accent, icon: '📍', bg: '#DBEAFE' },
  IN_PROGRESS:           { label: 'In Progress',         color: C.gold,   icon: '⚡', bg: '#FEF3C7' },
  COMPLETION_REQUESTED:  { label: 'Review Completion',   color: C.gold,   icon: '🔔', bg: '#FEF3C7' },
  COMPLETED:             { label: 'Completed',           color: C.green,  icon: '🎉', bg: '#D1FAE5' },
  DISPUTED:              { label: 'Disputed',            color: C.red,    icon: '⚠️',  bg: '#FEE2E2' },
  NO_SHOW:               { label: 'No Show',             color: C.red,    icon: '👻',  bg: '#FEE2E2' },
  CANCELLED:             { label: 'Cancelled',           color: C.textMuted, icon: '✕', bg: '#F3F4F6' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    color: C.textMuted,
    icon: '•',
    bg: '#F3F4F6',
  };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
      <Text style={styles.badgeIcon}>{cfg.icon}</Text>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

// ─── Booking Card ──────────────────────────────────────────────────────────
function BookingCard({ booking, index, onPress }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  const serviceName = booking.service?.name || 'Service';
  const cfg = STATUS_CONFIG[booking.status] || {};

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress?.(booking)}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.serviceName} numberOfLines={1}>
              {serviceName}
            </Text>
            <StatusBadge status={booking.status} />
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {booking.description || 'No description provided'}
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Schedule */}
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleItem}>
              <Ionicons name="calendar-outline" size={14} color={C.accent} />
              <Text style={styles.scheduleText}>
                {booking.preferredDate
                  ? formatDate(booking.preferredDate)
                  : 'Date not set'}
              </Text>
            </View>
            <View style={styles.scheduleItem}>
              <Ionicons name="time-outline" size={14} color={C.accent} />
              <Text style={styles.scheduleText}>
                {booking.preferredTime
                  ? formatTime(booking.preferredTime)
                  : 'Time not set'}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="eye-outline" size={14} color={C.textMuted} />
            <Text style={styles.footerText}>
              Disclosure Lv.{booking.disclosureLevel || 1}
            </Text>
            <Text style={styles.createdAt}>
              {formatDate(booking.createdAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color={C.textMuted} />
      <Text style={styles.emptyTitle}>No bookings yet</Text>
      <Text style={styles.emptySub}>
        When clients book your services, they will appear here.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function TaskerBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const headerAnim = useRef(new Animated.Value(0)).current;

  const fetchBookings = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);

      const res = await viewBookings();
      // backend returns array directly, or { data } depending on your axios config
      const data = res.data?.data || res.data || [];
      setBookings(Array.isArray(data) ? data : []);

      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error('Error fetching tasker bookings:', err);
      setError('Could not load bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [headerAnim]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleBookingPress = (booking) => {
    // Navigate to the existing BookingDetail screen (same as client view)
    // You might want a tasker-specific view later, but for now reuse same screen.
    navigate('BookingDetail', { bookingId: booking._id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <Header title="My Bookings" showBackButton />

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading your bookings…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color={C.orange} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchBookings()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <BookingCard
              booking={item}
              index={index}
              onPress={handleBookingPress}
            />
          )}
          ListEmptyComponent={EmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBookings(true)}
              tintColor={C.accent}
              colors={[C.accent]}
            />
          }
        />
      )}
      <TaskerPaymentSafetyBanner/>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: C.textSecondary,
  },
  errorText: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#1E3A6E',      // subtle indigo shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: '700',
    color: C.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  description: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  createdAt: {
    fontSize: 11,
    color: C.textMuted,
  },
  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    gap: 4,
  },
  badgeIcon: {
    fontSize: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});