import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../component/tasker/Header';
import { navigate } from '../../services/navigationService';
import {
  viewBookingById,
  unlockBooking,
  acceptBooking,
  declineBooking,
  confirmCompletion,
} from '../../api/taskerApi';
import { startOrGetChatRoom } from '../../api/chatApi';
import { TaskerContext } from '../../context/TaskerContext';
import { AuthContext } from '../../context/AuthContext';
import {triggerCreditPurchase} from '../../services/creditPurchaseService'
import {CreditSheet} from '../../component/tasker/CreditPackages'
import { verifyCreditPurchase} from '../../api/paymentApi';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const scale = (size) => (width / 375) * size;

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg: '#F9FAFC',
  surface: '#FFFFFF',
  border: '#E4E8EE',
  accent: '#1E3A6E',
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

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   color: C.orange,    icon: '⏳', bg: '#FEF3C7' },
  LOCKED:    { label: 'Locked',    color: C.purple,    icon: '🔒', bg: '#EDE9FE' },
  ACCEPTED:  { label: 'Accepted',  color: C.green,     icon: '✅', bg: '#D1FAE5' },
  DECLINED:  { label: 'Declined',  color: C.red,       icon: '✗',  bg: '#FEE2E2' },
  COMPLETED: { label: 'Completed', color: C.green,     icon: '🎉', bg: '#D1FAE5' },
  CANCELLED: { label: 'Cancelled', color: C.textMuted, icon: '✕',  bg: '#F3F4F6' },
};

const pricingTypeLabel = {
  fixed: 'Fixed',
  hourly: 'Hourly',
  starts_at: 'Starts at',
  negotiable: 'Negotiable',
};

export default function TaskerBookingDetailScreen({ route }) {
  const { bookingId } = route.params;
  const { tasker, fetchTasker } = useContext(TaskerContext);
  const { user } = useContext(AuthContext);
  const navigation = useNavigation(); 
  const [showCreditSheet, setShowCreditSheet] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await viewBookingById(bookingId);
      setBooking(res.data.data || res.data);
    } catch (err) {
      console.error('Fetch tasker booking error:', err);
      setError('Could not load booking details.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // ── Chat Eligibility ──────────────────────────────────────────────────────
  const canChat = () => {
    if (!booking) return false;
    const { status, completedAt, updatedAt } = booking;
    if (['PENDING', 'CANCELLED', 'DECLINED', 'NO_SHOW'].includes(status)) return false;
    if (status === 'COMPLETED') {
      const referenceDate = completedAt || updatedAt;
      if (!referenceDate) return false;
      const diff = new Date().getTime() - new Date(referenceDate).getTime();
      return diff <= 2 * 24 * 60 * 60 * 1000;
    }
    return true;
  };

  const chatAllowed = canChat();



  const handleCreditPurchase = async (pkg) => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const result = await triggerCreditPurchase({
        navigation,
        email: user.email,
        phone: user.phone,
        amount: pkg.price,
      });

      if (result.success) {
        // Verify the payment on backend
        const verifyRes = await verifyCreditPurchase(result.reference);
        if (verifyRes.status === 200) {
          setShowCreditSheet(false);
          Alert.alert('Success', `${pkg.credits} credits added to your account!`);
          await fetchTasker(); // refresh credits
        } else {
          Alert.alert('Error', verifyRes.message || 'Verification failed. Please contact support.');
        }
      } else if (result.cancelled) {
        // user cancelled – do nothing, bottom sheet stays open
      } else {
        Alert.alert('Error', 'Payment failed. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setPurchasing(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleUnlock = () => {
    if (!tasker || tasker.credits < 3) {
      setShowCreditSheet(true);
      return;
    }

    Alert.alert(
      'Unlock Booking',
      'This will use 3 credits and allow you to see client details and accept the booking.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock (3 credits)',
          onPress: async () => {
            setActionLoading(true);
            try {
              await unlockBooking(bookingId);
              Alert.alert('Success', 'Booking unlocked! You can now accept or decline.');
              await fetchTasker();
              fetchBooking();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to unlock booking.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAccept = () => {
    Alert.alert('Accept Booking', 'Are you sure you want to accept this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setActionLoading(true);
          try {
            await acceptBooking(bookingId);
            Alert.alert('Accepted ✅', 'Booking accepted. The client has been notified.');
            fetchBooking();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to accept booking.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDecline = () => {
    Alert.alert('Decline Booking', 'Are you sure you want to decline this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await declineBooking(bookingId);
            Alert.alert('Declined ✗', 'You have declined this booking.');
            fetchBooking();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to decline booking.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleConfirmCompletion = async () => {
    if (!pinCode.trim()) {
      Alert.alert('PIN Required', 'Please enter the completion PIN provided by the client.');
      return;
    }
    setActionLoading(true);
    try {
      await confirmCompletion(bookingId, { pinCode: pinCode.trim() });
      Alert.alert('Completed 🎉', 'The booking has been marked as completed.');
      setPinCode('');
      setShowPinInput(false);
      fetchBooking();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to confirm completion.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!booking?.client?._id) return;
    const clientUserId = booking.client._id;
    const clientName = booking.client.name || 'Client';
    try {
      setChatLoading(true);
      const res = await startOrGetChatRoom({ userId2: clientUserId, jobId: bookingId });
      if (res.status === 200) {
        navigate('ChatWindow', { roomId: res.data._id, recipientName: clientName });
      } else {
        Alert.alert('Error', 'Failed to start chat');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to start chat');
    } finally {
      setChatLoading(false);
    }
  };

  // ── Format helpers ────────────────────────────────────────────────────────
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const formatTime = (d) =>
    d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

  // ── Loading / Error ───────────────────────────────────────────────────────
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
        <Ionicons name="alert-circle-outline" size={48} color={C.orange} />
        <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchBooking}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const cfg = STATUS_CONFIG[booking.status] || { label: booking.status, color: C.textMuted, icon: '•', bg: '#F3F4F6' };
  const isUnlocked = booking.disclosureLevel >= 2;
  const canAcceptDecline = booking.status === 'LOCKED';
  const isAccepted = booking.status === 'ACCEPTED';
  const isPending = booking.status === 'PENDING';
  const credits = tasker?.credits ?? 0;
  const serviceSnapshot = booking.service || {};

  // Whether the sticky bar should render at all
  const hasActions = chatAllowed || isPending || canAcceptDecline || isAccepted;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <Header title="Booking Details" showBackButton showNotifications={false}/>

      {/* ── Scrollable Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, hasActions && { paddingBottom: scale(20) }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
          <Text style={styles.statusBannerIcon}>{cfg.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusBannerText, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={styles.statusHint}>
              {isPending
                ? 'Unlock to see client details and accept'
                : canAcceptDecline
                ? 'You can now accept or decline this booking'
                : isAccepted
                ? 'The client has been notified'
                : ''}
            </Text>
          </View>
        </View>

        {/* Service Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Service</Text>
          <Text style={styles.serviceName}>{serviceSnapshot.name || '—'}</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>
                GH₵ {serviceSnapshot.price != null ? Number(serviceSnapshot.price).toFixed(2) : '—'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Pricing</Text>
              <Text style={styles.detailValue}>
                {pricingTypeLabel[serviceSnapshot.pricingType] || serviceSnapshot.pricingType || '—'}
              </Text>
            </View>
          </View>
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
            <Text style={styles.rowText}>{formatTime(booking.preferredTime)}</Text>
          </View>
        </View>

        {/* Location & Client (post-unlock) */}
        {isUnlocked && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.row}>
                <Ionicons name="location-outline" size={16} color={C.accent} />
                <Text style={styles.rowText}>
                  {[booking.address?.suburb, booking.address?.city, booking.address?.region]
                    .filter(Boolean)
                    .join(', ') || 'Not provided'}
                </Text>
              </View>
            </View>

            {booking.client && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Client</Text>
                <View style={styles.clientRow}>
                  <View style={styles.clientAvatarCircle}>
                    <Text style={styles.clientAvatarInitial}>
                      {booking.client?.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>{booking.client.name || 'N/A'}</Text>
                    {booking.client.phone && (
                      <Text style={styles.clientPhone}>{booking.client.phone}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        
        {/* PIN Input Section — inline in scroll when open */}
        {isAccepted && showPinInput && (
          <View style={styles.pinInputSection}>
            <Text style={styles.pinInputLabel}>Enter completion PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={pinCode}
              onChangeText={setPinCode}
              placeholder="000000"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <View style={styles.pinActionRow}>
              <TouchableOpacity
                style={styles.cancelPinBtn}
                onPress={() => { setPinCode(''); setShowPinInput(false); }}
              >
                <Text style={{ color: C.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitPinBtn, actionLoading && { opacity: 0.6 }]}
                onPress={handleConfirmCompletion}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <Text style={styles.submitPinBtnText}>Submit PIN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Sticky Action Bar ── */}
      {hasActions && (
        <SafeAreaView edges={['bottom']} style={styles.stickyBar}>

          {/* PENDING: credit info + unlock */}
          {isPending && (
            <>
              <View style={styles.creditInfo}>
                <Ionicons name="wallet-outline" size={15} color={C.gold} />
                <Text style={styles.creditText}>
                  You have{' '}
                  <Text style={{ fontWeight: '800', color: C.gold }}>{credits} credits</Text>
                </Text>
                <Text style={styles.creditCost}>· Unlock costs 3 credits</Text>
              </View>
              <TouchableOpacity
                style={[styles.fullBtn, { backgroundColor: C.accent }, actionLoading && { opacity: 0.6 }]}
                onPress={handleUnlock}
                disabled={actionLoading}
                activeOpacity={0.88}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <>
                    <Ionicons name="lock-open-outline" size={20} color={C.white} />
                    <Text style={styles.fullBtnText}>Unlock Booking (3 credits)</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* LOCKED: chat (if allowed) + decline + accept */}
          {canAcceptDecline && (
            <>
              {chatAllowed && (
                <TouchableOpacity
                  style={[styles.fullBtn, { backgroundColor: C.accent }]}
                  onPress={handleMessage}
                  disabled={chatLoading || actionLoading}
                  activeOpacity={0.88}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color={C.white} />
                  <Text style={styles.fullBtnText}>
                    {chatLoading ? 'Opening…' : 'Message Client'}
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.splitRow}>
                <TouchableOpacity
                  style={[styles.splitBtn, styles.declineBtn, actionLoading && { opacity: 0.6 }]}
                  onPress={handleDecline}
                  disabled={actionLoading}
                  activeOpacity={0.88}
                >
                  <Ionicons name="close-circle-outline" size={20} color={C.red} />
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.splitBtn, styles.acceptBtn, actionLoading && { opacity: 0.6 }]}
                  onPress={handleAccept}
                  disabled={actionLoading}
                  activeOpacity={0.88}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ACCEPTED: chat + confirm completion */}
          {isAccepted && (
            <View style={styles.splitRow}>
              {chatAllowed && (
                <TouchableOpacity
                  style={[styles.splitBtn, { backgroundColor: C.accent }]}
                  onPress={handleMessage}
                  disabled={chatLoading || actionLoading}
                  activeOpacity={0.88}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color={C.white} />
                  <Text style={styles.splitBtnText}>
                    {chatLoading ? 'Opening…' : 'Message Client'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  chatAllowed ? styles.splitBtn : styles.fullBtn,
                  { backgroundColor: C.green },
                  actionLoading && { opacity: 0.6 },
                ]}
                onPress={() => setShowPinInput(true)}
                disabled={actionLoading || showPinInput}
                activeOpacity={0.88}
              >
                <Ionicons name="checkmark-done-outline" size={20} color={C.white} />
                <Text style={chatAllowed ? styles.splitBtnText : styles.fullBtnText}>
                  Confirm Done
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* CHAT ONLY (all other active states not covered above) */}
          {chatAllowed && !canAcceptDecline && !isAccepted && !isPending && (
            <TouchableOpacity
              style={[styles.fullBtn, { backgroundColor: C.accent }]}
              onPress={handleMessage}
              disabled={chatLoading}
              activeOpacity={0.88}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color={C.white} />
              <Text style={styles.fullBtnText}>
                {chatLoading ? 'Opening…' : 'Message Client'}
              </Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      )}

      <CreditSheet
        visible={showCreditSheet}
        onClose={() => setShowCreditSheet(false)}
        onSelect={handleCreditPurchase}
        purchasing={purchasing}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: { marginTop: 16, fontSize: 14, color: C.textSecondary },
  errorText: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },
  scrollContent: { padding: scale(16), paddingBottom: scale(24) },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  statusBannerIcon: { fontSize: 24 },
  statusBannerText: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  statusHint: { fontSize: 13, color: C.textSecondary },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#1E3A6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  serviceName: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  detailRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600', marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  description: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  rowText: { fontSize: 14, color: C.textPrimary, fontWeight: '500', flex: 1 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accentGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.accent + '30',
  },
  clientAvatarInitial: { fontSize: 18, fontWeight: '700', color: C.accent },
  clientName: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  clientPhone: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  pinDisplay: {
    backgroundColor: C.accentGlow,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  pinCodeText: {
    fontSize: 24,
    fontWeight: '800',
    color: C.accent,
    letterSpacing: 3,
    marginBottom: 6,
  },
  pinHint: { fontSize: 12, color: C.textSecondary, textAlign: 'center' },
  pinInputSection: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  pinInputLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginBottom: 10 },
  pinInput: {
    borderWidth: 1.5,
    borderColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: 4,
    textAlign: 'center',
    backgroundColor: C.bg,
  },
  pinActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 12,
  },
  cancelPinBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  submitPinBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.green,
  },
  submitPinBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },

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
  creditInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  creditText: { fontSize: 13, color: C.textSecondary },
  creditCost: { fontSize: 13, color: C.textMuted },
  splitRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  splitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: scale(14),
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  splitBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },
  fullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: scale(14),
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  fullBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },
  acceptBtn: { backgroundColor: C.green },
  acceptBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },
  declineBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: C.red + '30',
  },
  declineBtnText: { color: C.red, fontSize: 15, fontWeight: '700' },
});