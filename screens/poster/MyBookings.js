import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { getMyBookings } from "../../api/bookingApi"; // adjust path as needed

const { width } = Dimensions.get("window");

// ─── Light‑theme palette (matches BookingScreen) ─────────────────────────
const C = {
  bg: "#F8FAFF",             // main background
  surface: "#FFFFFF",        // card / container
  card: "#FFFFFF",
  border: "#E5E7EB",
  accent: "#1A56DB",         // primary blue
  accentGlow: "#EBF5FF",
  gold: "#F59E0B",
  green: "#0E9F6E",
  red: "#EF4444",
  orange: "#F59E0B",        // warm accent
  purple: "#7E3AF2",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  white: "#FFFFFF",
};

// ─── Status Config (light‑theme friendly) ────────────────────────────────
const STATUS_CONFIG = {
  PENDING:               { label: "Pending",             color: C.orange,  icon: "⏳", bg: "#FEF3C7" },
  LOCKED:                { label: "Locked",              color: C.purple,  icon: "🔒", bg: "#EDE9FE" },
  ACCEPTED:              { label: "Accepted",            color: C.green,   icon: "✅", bg: "#D1FAE5" },
  DECLINED:              { label: "Declined",            color: C.red,     icon: "✗",  bg: "#FEE2E2" },
  ARRIVAL_PENDING:       { label: "Arrival Pending",     color: C.accent,  icon: "🚗", bg: "#DBEAFE" },
  ARRIVED:               { label: "Arrived",             color: C.accent,  icon: "📍", bg: "#DBEAFE" },
  IN_PROGRESS:           { label: "In Progress",         color: C.gold,    icon: "⚡", bg: "#FEF3C7" },
  COMPLETION_REQUESTED:  { label: "Review Completion",   color: C.gold,    icon: "🔔", bg: "#FEF3C7" },
  COMPLETED:             { label: "Completed",           color: C.green,   icon: "🎉", bg: "#D1FAE5" },
  DISPUTED:              { label: "Disputed",            color: C.red,     icon: "⚠️",  bg: "#FEE2E2" },
  NO_SHOW:               { label: "No Show",             color: C.red,     icon: "👻",  bg: "#FEE2E2" },
  CANCELLED:             { label: "Cancelled",           color: C.textMuted, icon: "✕", bg: "#F3F4F6" },
};

// ─── Filter Tabs ─────────────────────────────────────────────────────────
const FILTERS = [
  { key: "ALL",     label: "All" },
  { key: "ACTIVE",  label: "Active" },
  { key: "UPCOMING", label: "Upcoming" },
  { key: "DONE",    label: "Done" },
];

const ACTIVE_STATUSES   = ["ACCEPTED", "ARRIVAL_PENDING", "ARRIVED", "IN_PROGRESS", "COMPLETION_REQUESTED"];
const UPCOMING_STATUSES = ["PENDING", "LOCKED"];
const DONE_STATUSES     = ["COMPLETED", "DECLINED", "NO_SHOW", "CANCELLED", "DISPUTED"];

function filterBookings(bookings, filter) {
  if (filter === "ALL")      return bookings;
  if (filter === "ACTIVE")   return bookings.filter(b => ACTIVE_STATUSES.includes(b.status));
  if (filter === "UPCOMING") return bookings.filter(b => UPCOMING_STATUSES.includes(b.status));
  if (filter === "DONE")     return bookings.filter(b => DONE_STATUSES.includes(b.status));
  return bookings;
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function getInitials(name = "") {
  return name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Avatar ───────────────────────────────────────────────────────────────
function Avatar({ uri, name, size = 44 }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);
  const colors = ["#5B8BF7", "#A78BFA", "#2DD4A0", "#F5C842", "#F7A25B"];
  const colorIndex = (name?.charCodeAt(0) || 0) % colors.length;

  if (uri && !imgError) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors[colorIndex] + "20",
          borderColor: colors[colorIndex] + "50",
        },
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: size * 0.35, color: colors[colorIndex] }]}>
        {initials || "?"}
      </Text>
    </View>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    color: C.textSecondary,
    icon: "•",
    bg: "#F3F4F6",
  };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.color + "40" }]}>
      <Text style={styles.badgeIcon}>{cfg.icon}</Text>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────
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

  const cfg = STATUS_CONFIG[booking.status] || {};
  const serviceName = booking.service?.name || booking.service?.title || "Service";
  const taskerName  = booking.tasker?.name ||booking.tasker?.businessName || "Awaiting tasker";
  const taskerImg   = booking.tasker?.profileImage;
  const location    = [booking.address?.suburb, booking.address?.city]
    .filter(Boolean)
    .join(", ") || "—";

  const isActive = ACTIVE_STATUSES.includes(booking.status);
  const leftAccent = cfg.color || C.border;

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
        <View style={[styles.card, { borderLeftColor: leftAccent }]}>
          {/* Active pulse indicator */}
          {isActive && (
            <View style={styles.activeDot}>
              <View style={[styles.activeDotInner, { backgroundColor: cfg.color }]} />
            </View>
          )}

          {/* Top row: Service name + Status */}
          <View style={styles.cardHeader}>
            <Text style={styles.serviceName} numberOfLines={1}>
              {serviceName}
            </Text>
            <StatusBadge status={booking.status} />
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {booking.description}
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Meta row */}
          <View style={styles.metaRow}>
            {/* Tasker */}
            <View style={styles.taskerRow}>
              <Avatar uri={taskerImg} name={taskerName} size={32} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.metaLabel}>Tasker</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {taskerName}
                </Text>
              </View>
            </View>

            {/* Scheduled */}
            <View style={styles.scheduleBlock}>
              <Text style={styles.metaLabel}>Scheduled</Text>
              <Text style={styles.metaValue}>{formatDate(booking.scheduledAt)}</Text>
              <Text style={styles.metaTime}>{formatTime(booking.scheduledAt)}</Text>
            </View>
          </View>

          {/* Footer row: location + price */}
          <View style={styles.footerRow}>
            <View style={styles.locationRow}>
              <Text style={styles.locationPin}>📍</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {location}
              </Text>
            </View>
            {booking.price != null && (
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>GH₵ {booking.price.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Rating (if completed) */}
          {booking.status === "COMPLETED" && booking.feedback?.rating && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Text
                  key={s}
                  style={{
                    fontSize: 12,
                    opacity: s <= booking.feedback.rating ? 1 : 0.2,
                  }}
                >
                  ⭐
                </Text>
              ))}
              {booking.feedback?.comment && (
                <Text style={styles.ratingComment} numberOfLines={1}>
                  {" "}
                  "{booking.feedback.comment}"
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────
function EmptyState({ filter }) {
  const msgs = {
    ALL:      { icon: "📋", title: "No bookings yet", sub: "Your service bookings will appear here." },
    ACTIVE:   { icon: "⚡", title: "Nothing active",  sub: "You have no active bookings right now." },
    UPCOMING: { icon: "📅", title: "Nothing upcoming", sub: "No pending or locked bookings." },
    DONE:     { icon: "✅", title: "No history",       sub: "Completed bookings will show up here." },
  };
  const m = msgs[filter] || msgs.ALL;
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{m.icon}</Text>
      <Text style={styles.emptyTitle}>{m.title}</Text>
      <Text style={styles.emptySub}>{m.sub}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function MyBookingsScreen({ navigation }) {
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [filter, setFilter]         = useState("ALL");

  const headerAnim = useRef(new Animated.Value(0)).current;

  async function fetchBookings(isRefresh = false) {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const data = await getMyBookings();
      setBookings(Array.isArray(data) ? data : data?.data ?? []);
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (e) {
      setError("Could not load bookings. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  const filtered = filterBookings(bookings, filter);

  // Count badges per filter
  const counts = {
    ALL:      bookings.length,
    ACTIVE:   bookings.filter(b => ACTIVE_STATUSES.includes(b.status)).length,
    UPCOMING: bookings.filter(b => UPCOMING_STATUSES.includes(b.status)).length,
    DONE:     bookings.filter(b => DONE_STATUSES.includes(b.status)).length,
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <View>
          <Text style={styles.headerEyebrow}>Overview</Text>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountNum}>{bookings.length}</Text>
          <Text style={styles.headerCountLabel}>total</Text>
        </View>
      </Animated.View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                {f.label}
              </Text>
              {counts[f.key] > 0 && (
                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                    {counts[f.key]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading your bookings…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchBookings()}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={({ item, index }) => (
            <BookingCard
              booking={item}
              index={index}
              onPress={b => navigation?.navigate?.("BookingDetail", { bookingId: b._id })}
            />
          )}
          ListEmptyComponent={<EmptyState filter={filter} />}
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
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 48,
    paddingBottom: 16,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.5,
    color: C.accent,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: -0.5,
  },
  headerCount: {
    alignItems: "center",
    backgroundColor: C.accentGlow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.accent + "30",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerCountNum: {
    fontSize: 22,
    fontWeight: "800",
    color: C.accent,
    lineHeight: 26,
  },
  headerCountLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Filters
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    maxHeight: 52,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
  },
  filterTabTextActive: {
    color: C.white,
  },
 filterBadge: {
    marginLeft: 6,
    backgroundColor: '#E5E7EB',        // or a soft gray
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
},
filterBadgeActive: {
    backgroundColor: '#ffffff30',
},
filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    lineHeight: 16,                     // prevent clipping
},
filterBadgeTextActive: {
    color: '#FFFFFF',
},
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    shadowColor: "#1A56DB",      // soft blue shadow (reflecting theme)
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: "relative",
    overflow: "hidden",
  },
  activeDot: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 10,
  },
  activeDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingRight: 16,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    flex: 1,
    marginRight: 10,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  taskerRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  scheduleBlock: {
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textPrimary,
  },
  metaTime: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 1,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationPin: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    color: C.textSecondary,
    flex: 1,
  },
  priceTag: {
    backgroundColor: C.accentGlow,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.accent + "30",
  },
  priceText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.accent,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  ratingComment: {
    fontSize: 12,
    color: C.textSecondary,
    fontStyle: "italic",
    flex: 1,
  },

  // Badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Avatar
  avatar: {
    borderWidth: 2,
    borderColor: C.border,
  },
  avatarFallback: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  avatarInitials: {
    fontWeight: "800",
  },

  // States
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: C.textSecondary,
    letterSpacing: 0.3,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: "center",
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
    fontSize: 14,
    fontWeight: "700",
    color: C.white,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
});