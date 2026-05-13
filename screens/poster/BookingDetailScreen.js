import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../component/tasker/Header";
import { navigate } from "../../services/navigationService";
import { bookingDetails, cancelBooking, markBookingCompleted } from "../../api/bookingApi";
import { startOrGetChatRoom } from "../../api/chatApi";
import RatingModal from '../../component/common/RatingModal';

const { width } = Dimensions.get("window");
const scale = (size) => (width / 375) * size;

// ─── Theme Colors ────────────────────────────────────────────────────────────
const C = {
  bg: "#F8FAFF",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  accent: "#1A56DB",
  accentGlow: "#EBF5FF",
  gold: "#F59E0B",
  green: "#0E9F6E",
  red: "#EF4444",
  orange: "#F59E0B",
  purple: "#7E3AF2",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
};

// ─── Status Config ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:              { label: "Pending",           color: C.orange,    icon: "⏳", bg: "#FEF3C7" },
  LOCKED:               { label: "Locked",            color: C.purple,    icon: "🔒", bg: "#EDE9FE" },
  ACCEPTED:             { label: "Accepted",          color: C.green,     icon: "✅", bg: "#D1FAE5" },
  DECLINED:             { label: "Declined",          color: C.red,       icon: "✗",  bg: "#FEE2E2" },
  ARRIVAL_PENDING:      { label: "Arrival Pending",   color: C.accent,    icon: "🚗", bg: "#DBEAFE" },
  ARRIVED:              { label: "Arrived",           color: C.accent,    icon: "📍", bg: "#DBEAFE" },
  IN_PROGRESS:          { label: "In Progress",       color: C.gold,      icon: "⚡", bg: "#FEF3C7" },
  COMPLETION_REQUESTED: { label: "Review Completion", color: C.gold,      icon: "🔔", bg: "#FEF3C7" },
  COMPLETED:            { label: "Completed",         color: C.green,     icon: "🎉", bg: "#D1FAE5" },
  DISPUTED:             { label: "Disputed",          color: C.red,       icon: "⚠️", bg: "#FEE2E2" },
  NO_SHOW:              { label: "No Show",           color: C.red,       icon: "👻", bg: "#FEE2E2" },
  CANCELLED:            { label: "Cancelled",         color: C.textMuted, icon: "✕", bg: "#F3F4F6" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ─── Mini Avatar ─────────────────────────────────────────────────────────────
const Avatar = ({ uri, name, size = 44 }) => {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);
  const colors = ["#5B8BF7", "#A78BFA", "#2DD4A0", "#F5C842", "#F7A25B"];
  const colorIndex = (name?.charCodeAt(0) || 0) % colors.length;

  if (uri && !imgError) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, styles.avatarBorder]}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors[colorIndex] + "20",
          borderColor: colors[colorIndex] + "50",
          justifyContent: "center",
          alignItems: "center",
        },
        styles.avatarBorder,
      ]}
    >
      <Text style={{ fontSize: size * 0.35, fontWeight: "800", color: colors[colorIndex] }}>
        {initials || "?"}
      </Text>
    </View>
  );
};

// ─── Media Thumbnail ─────────────────────────────────────────────────────────
const MediaThumb = ({ item }) => (
  <View style={styles.mediaThumb}>
    {item.type === "image" ? (
      <Image source={{ uri: item.url }} style={styles.mediaImage} />
    ) : (
      <View style={styles.videoPlaceholder}>
        <Ionicons name="play-circle" size={24} color="#1A56DB" />
      </View>
    )}
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
const BookingDetailScreen = ({ route }) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookingDetails(bookingId);
      setBooking(res.data);
    } catch (err) {
      setError("Could not load booking details.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // ── Chat Eligibility ───────────────────────────────────────────────────────
  const canChat = () => {
    if (!booking) return false;
    const { status, completedAt, updatedAt } = booking;
    if (["PENDING", "CANCELLED", "DECLINED", "NO_SHOW"].includes(status)) return false;
    if (status === "COMPLETED") {
      const referenceDate = completedAt || updatedAt;
      if (!referenceDate) return false;
      const diff = new Date().getTime() - new Date(referenceDate).getTime();
      return diff <= 2 * 24 * 60 * 60 * 1000;
    }
    return true;
  };

  const chatAllowed = canChat();

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking? This cannot be undone.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await cancelBooking(bookingId);
              Alert.alert("Cancelled", "Your booking has been cancelled.");
              fetchBooking();
            } catch (error) {
              Alert.alert("Error", error.response?.data?.message || "Failed to cancel.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmCompletion = async () => {
    try {
      setActionLoading(true);
      const res = await markBookingCompleted(bookingId);
      const pin = res.data?.pin;
      if (pin) {
        Alert.alert(
          "Success",
          `Completion initiated. Share this PIN with your tasker: ${pin}`,
          [{
            text: "OK",
            onPress: () => {
              fetchBooking();                                    // refresh data
              setTimeout(() => setRatingModalVisible(true), 800); // then show rating modal
            }
          }]
        );
      
      } else {
        Alert.alert("Success", res.data?.message || "Operation completed.");
        fetchBooking();
      }
    } catch (error) {
      console.log(error)
      Alert.alert("Error", error.response?.data?.message || "Failed to confirm completion.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!booking?.tasker?.userId) return;
    const taskerUserId = booking.tasker.userId._id || booking.tasker.userId;
    const taskerName = booking.tasker.userId?.name || booking.tasker.businessName || "Tasker";

    try {
      setChatLoading(true);
      const res = await startOrGetChatRoom({ userId2: taskerUserId, jobId: bookingId });
      if (res.status === 200) {
        navigate("ChatWindow", { roomId: res.data._id, recipientName: taskerName });
      } else {
        Alert.alert("Error", "Failed to start chat");
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to start chat");
    } finally {
      setChatLoading(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const status = booking?.status;
  const cfg = STATUS_CONFIG[status] || {};
  const canCancel = status && !["ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DECLINED"].includes(status);
  const canConfirm = status === "ACCEPTED";
  const hasActions = chatAllowed || canCancel || canConfirm;
  const tasker = booking?.tasker;

  // ── Loading / Error States ─────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading booking…</Text>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || "Booking not found"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchBooking}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <Header title="Booking Details" showBackButton />

      {/* ── Scrollable Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          hasActions && { paddingBottom: scale(20) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: cfg.bg || "#F3F4F6" }]}>
          <Text style={styles.statusBannerIcon}>{cfg.icon || "📋"}</Text>
          <Text style={[styles.statusBannerText, { color: cfg.color || C.textSecondary }]}>
            {cfg.label || status}
          </Text>
        </View>

        {/* Tasker Card */}
        {tasker ? (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigate("ApplicantProfile", { taskerId: tasker._id })}
            activeOpacity={0.85}
          >
            <View style={styles.taskerRow}>
              <Avatar
                uri={tasker.userId?.profileImage}
                name={tasker.userId?.name || tasker.businessName || "Tasker"}
                size={52}
              />
              <View style={styles.taskerInfo}>
                <Text style={styles.taskerName}>
                  {tasker.userId?.name || tasker.businessName || "Tasker"}
                </Text>
                <View style={styles.taskerMeta}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.taskerRating}>
                    {tasker.rating?.toFixed(1) || "5.0"}
                  </Text>
                  {tasker.numberOfRatings > 0 && (
                    <Text style={styles.taskerJobs}>· {tasker.numberOfRatings} reviews</Text>
                  )}
                </View>
                {tasker.servicesOffered?.[0]?.name && (
                  <Text style={styles.taskerPrimary}>{tasker.servicesOffered[0].name}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tasker</Text>
            <Text style={styles.rowText}>Not assigned yet</Text>
          </View>
        )}

        {/* Service Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Service</Text>
          <Text style={styles.serviceName}>{booking.service?.name || "—"}</Text>
          {booking.service?.price != null && (
            <View style={[styles.row, { marginTop: 8 }]}>
              <Ionicons name="cash-outline" size={16} color={C.green} />
              <Text style={[styles.rowText, { fontWeight: "700", color: C.green }]}>
                GH₵ {Number(booking.service.price).toFixed(2)}
              </Text>
            </View>
          )}
          <Text style={styles.description}>{booking.description}</Text>
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={16} color={C.accent} />
            <Text style={styles.rowText}>{formatDate(booking.preferredDate)}</Text>
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Ionicons name="time-outline" size={16} color={C.accent} />
            <Text style={styles.rowText}>
              {booking.preferredTime ? formatTime(booking.preferredTime) : "Not specified"}
            </Text>
          </View>
          {booking.scheduledAt && (
            <View style={[styles.row, { marginTop: 8 }]}>
              <Ionicons name="alert-circle-outline" size={16} color={C.red} />
              <Text style={styles.rowText}>Scheduled: {formatDate(booking.scheduledAt)}</Text>
            </View>
          )}
        </View>

        {/* Location */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={16} color={C.accent} />
            <Text style={styles.rowText}>
              {[booking.address?.suburb, booking.address?.city, booking.address?.region]
                .filter(Boolean)
                .join(", ") || "Not specified"}
            </Text>
          </View>
        </View>

        {/* Media */}
        {booking.media && booking.media.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            <View style={styles.mediaRow}>
              {booking.media.map((item, idx) => (
                <MediaThumb key={idx} item={item} />
              ))}
            </View>
          </View>
        )}

        {/* PIN Display */}
        {booking.verification?.pinCode && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Verification PIN</Text>
            <View style={styles.pinContainer}>
              <Text style={styles.pinCode}>{booking.verification.pinCode}</Text>
              <Text style={styles.pinHint}>
                Share this PIN with the tasker to confirm service completion.
              </Text>
            </View>
          </View>
        )}

        <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        userId={booking.tasker.userId._id || booking.tasker.userId}
        userName={ booking.tasker.businessName || booking.tasker.userId?.name }
        userRole="tasker"
       />
      </ScrollView>

      {/* ── Sticky Action Bar ── */}
      {hasActions && (
        <SafeAreaView edges={["bottom"]} style={styles.stickyBar}>
          {/* Primary actions row: Chat + Confirm side by side */}
          {(chatAllowed || canConfirm) && (
            <View style={styles.primaryRow}>
              {chatAllowed && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: C.accent, flex: canConfirm ? 1 : undefined, minWidth: canConfirm ? undefined : "100%" }]}
                  onPress={handleMessage}
                  disabled={chatLoading || actionLoading}
                  activeOpacity={0.88}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
                  <Text style={styles.primaryBtnText}>
                    {chatLoading ? "Opening…" : "Message Tasker"}
                  </Text>
                </TouchableOpacity>
              )}
              {canConfirm && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: C.green, flex: chatAllowed ? 1 : undefined, minWidth: chatAllowed ? undefined : "100%" }]}
                  onPress={handleConfirmCompletion}
                  disabled={actionLoading || chatLoading}
                  activeOpacity={0.88}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.primaryBtnText}>
                    {actionLoading ? "Please wait…" : "Confirm Done"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Cancel — outlined, destructive, full width */}
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={actionLoading || chatLoading}
              activeOpacity={0.88}
            >
              <Ionicons name="close-circle-outline" size={20} color={C.red} />
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}

        
        </SafeAreaView>
      )}
      
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: C.textSecondary,
  },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(24),
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(14),
    borderRadius: scale(12),
    marginBottom: scale(16),
    gap: 10,
  },
  statusBannerIcon: { fontSize: 20 },
  statusBannerText: { fontSize: 18, fontWeight: "700" },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: scale(16),
    marginBottom: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#1A56DB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarBorder: { borderWidth: 2, borderColor: C.border },
  taskerInfo: { flex: 1 },
  taskerName: { fontSize: 16, fontWeight: "700", color: C.textPrimary },
  taskerMeta: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  taskerRating: { fontSize: 13, fontWeight: "600", color: C.textSecondary },
  taskerJobs: { fontSize: 12, color: C.textMuted },
  taskerPrimary: { fontSize: 12, color: C.accent, fontWeight: "500", marginTop: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  serviceName: { fontSize: 17, fontWeight: "700", color: C.textPrimary, marginBottom: 6 },
  description: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  rowText: { fontSize: 14, color: C.textPrimary, fontWeight: "500", flex: 1 },
  mediaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mediaThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  mediaImage: { width: "100%", height: "100%" },
  videoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EBF5FF",
  },
  pinContainer: {
    backgroundColor: C.accentGlow,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.accent + "30",
  },
  pinCode: {
    fontSize: 32,
    fontWeight: "800",
    color: C.accent,
    letterSpacing: 4,
    marginBottom: 6,
  },
  pinHint: { fontSize: 12, color: C.textSecondary, textAlign: "center" },

  // ── Sticky Action Bar ──────────────────────────────────────────────────────
  stickyBar: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(8),
    gap: scale(10),
  },
  primaryRow: {
    flexDirection: "row",
    gap: scale(10),
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scale(14),
    borderRadius: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scale(13),
    borderRadius: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.red,
    backgroundColor: C.surface,
  },
  cancelBtnText: {
    color: C.red,
    fontSize: 15,
    fontWeight: "600",
  },
});

export default BookingDetailScreen;