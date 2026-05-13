// screens/client/BidsScreen.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, SafeAreaView, Dimensions,
  StatusBar, Alert, RefreshControl, Animated,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from '../../component/tasker/Header';
import { AuthContext } from '../../context/AuthContext';
import { clientGetTaskInfo } from '../../api/miniTaskApi';
import { getMicroTaskBids, acceptBidForTask } from '../../api/bidApi';
import { navigate } from '../../services/navigationService';
import { triggerPayment } from '../../services/PaymentServices';
import { verifyTaskPayment } from '../../api/paymentApi';
import { usePaystack } from 'react-native-paystack-webview';
import { startOrGetChatRoom } from '../../api/chatApi';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// ─── Theme (Pacific Indigo & Warm Gold — unchanged) ───────────────────────────
const C = {
  bg:           '#F8FAFF',
  surface:      '#FFFFFF',
  border:       '#E4E8EE',
  primary:      '#1E3A6E',
  primaryDark:  '#152C4F',
  primaryGlow:  '#EBF5FF',
  primaryMid:   '#2D5299',
  gold:         '#D49B3F',
  goldLight:    '#FCF3E1',
  green:        '#0F766E',
  greenLight:   '#D1FAE5',
  red:          '#DC2626',
  redLight:     '#FEE2E2',
  amber:        '#F59E0B',
  textPrimary:  '#0F172A',
  textSecondary:'#475569',
  textMuted:    '#94A3B8',
  white:        '#FFFFFF',
  // extras for depth
  surfaceAlt:   '#F1F5FD',
  shadow:       '#1E3A6E18',
};

// ─── Animated entrance helper ─────────────────────────────────────────────────
function useFadeSlide(delay = 0) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 55, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity: op, transform: [{ translateY: ty }] };
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, count, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
      <View style={[styles.pillBadge, active && styles.pillBadgeActive]}>
        <Text style={[styles.pillBadgeText, active && styles.pillBadgeTextActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Sort chip ────────────────────────────────────────────────────────────────
function SortChip({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.sortChip, active && styles.sortChipActive]}
    >
      <Ionicons name={icon} size={13} color={active ? C.white : C.textMuted} />
      <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Star row ─────────────────────────────────────────────────────────────────
function Stars({ rating, size = 12 }) {
  const full  = Math.floor(rating);
  const empty = 5 - full;
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[...Array(full)].map((_, i)  => <Ionicons key={`f${i}`} name="star"         size={size} color={C.gold} />)}
      {[...Array(empty)].map((_, i) => <Ionicons key={`e${i}`} name="star-outline" size={size} color={C.border} />)}
    </View>
  );
}

// ─── Bid Card ─────────────────────────────────────────────────────────────────
function BidCard({ item, index, canAssign, processingAction, onAccept, onMessage, onViewProfile }) {
  const anim = useFadeSlide(index * 70);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true }).start();

  const bidder     = item.bidder;
  const isAccepted = item.isAccepted;
  const isProcessing = processingAction === item._id;
  const initials   = bidder?.name?.charAt(0)?.toUpperCase() || 'T';

  return (
    <Animated.View style={[anim, { transform: [...(anim.transform || []), { scale: scaleAnim }] }]}>
      <View style={styles.bidCard}>

        {/* Accepted ribbon */}
        {isAccepted && (
          <View style={styles.acceptedRibbon}>
            <Ionicons name="checkmark-circle" size={11} color={C.white} />
            <Text style={styles.acceptedRibbonText}>Accepted</Text>
          </View>
        )}

        {/* ── Top: avatar + name + message btn ────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={() => onViewProfile(item)}
          style={styles.cardTop}
        >
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {bidder?.profileImage ? (
              <Image source={{ uri: bidder.profileImage }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[C.primary, C.primaryMid]}
                style={styles.avatarGrad}
              >
                <Text style={styles.avatarInitial}>{initials}</Text>
              </LinearGradient>
            )}
            {bidder?.isVerified && (
              <View style={styles.verifiedDot}>
                <Ionicons name="checkmark" size={9} color={C.white} />
              </View>
            )}
          </View>

          {/* Identity */}
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{bidder?.name || 'Tasker'}</Text>
              {bidder?.isVerified && (
                <View style={styles.verifiedChip}>
                  <Text style={styles.verifiedChipText}>Verified</Text>
                </View>
              )}
            </View>
            <View style={styles.ratingRow}>
              <Stars rating={bidder?.rating || 0} />
              <Text style={styles.ratingNum}>{(bidder?.rating || 0).toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({bidder?.numberOfRatings || 0})</Text>
              {bidder?.location?.city && (
                <>
                  <View style={styles.ratingDot} />
                  <Ionicons name="location-outline" size={11} color={C.textMuted} />
                  <Text style={styles.locationText} numberOfLines={1}>{bidder.location.city}</Text>
                </>
              )}
            </View>
          </View>

          {/* Message button */}
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => onMessage(bidder.userId, bidder?.name)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={C.primary} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* ── Services ─────────────────────────────────────────────── */}
        {bidder?.services?.length > 0 && (
          <View style={styles.servicesRow}>
            {bidder.services.slice(0, 3).map((svc, i) => (
              <View key={i} style={styles.svcChip}>
                <Text style={styles.svcChipText}>{svc.name}</Text>
              </View>
            ))}
            {bidder.services.length > 3 && (
              <View style={[styles.svcChip, styles.svcChipMore]}>
                <Text style={styles.svcChipMoreText}>+{bidder.services.length - 3} more</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Bid amount + status ───────────────────────────────────── */}
        <View style={styles.amountRow}>
          <View style={styles.amountLeft}>
            <Text style={styles.amountLabel}>Bid Amount</Text>
            <Text style={styles.amountValue}>₵{item.amount}</Text>
          </View>
          <View style={[styles.statusPill, isAccepted ? styles.statusAccepted : styles.statusPending]}>
            <View style={[styles.statusDot, { backgroundColor: isAccepted ? C.green : C.amber }]} />
            <Text style={[styles.statusText, { color: isAccepted ? C.green : C.amber }]}>
              {isAccepted ? 'Accepted' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* ── Message/proposal ─────────────────────────────────────── */}
        {item.message ? (
          <View style={styles.proposalBox}>
            <Ionicons name="document-text-outline" size={14} color={C.primary} style={{ marginRight: 6, marginTop: 1 }} />
            <Text style={styles.proposalText} numberOfLines={3}>{item.message}</Text>
          </View>
        ) : null}

        {/* ── CTA ──────────────────────────────────────────────────── */}
        {!isAccepted ? (
          <TouchableOpacity
            style={[styles.acceptBtn, (!canAssign || isProcessing) && styles.acceptBtnDisabled]}
            onPress={() => onAccept(bidder, item.amount, item._id, bidder?.name)}
            disabled={!canAssign || isProcessing}
            activeOpacity={0.88}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <LinearGradient
                colors={canAssign ? [C.primary, C.primaryDark] : [C.border, C.border]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.acceptBtnGrad}
              >
                <Ionicons name="checkmark-circle-outline" size={17} color={C.white} />
                <Text style={styles.acceptBtnText}>
                  {canAssign ? 'Accept Bid' : 'Task In Progress'}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.acceptedBar}>
            <Ionicons name="checkmark-circle" size={17} color={C.green} />
            <Text style={styles.acceptedBarText}>Bid Accepted</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ApplicantsScreen({ route }) {
  const { taskId, task: initialTask } = route.params;
  const { user }   = useContext(AuthContext);
  const { popup }  = usePaystack();
  const navigation = useNavigation();

  const [bids,             setBids]             = useState([]);
  const [task,             setTask]             = useState(initialTask);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [activeFilter,     setActiveFilter]     = useState('all');
  const [sortBy,           setSortBy]           = useState('score');
  const [processingAction, setProcessingAction] = useState(null);

  const isTaskInProgress = ['Assigned','In-progress','Review'].includes(task?.status);
  const isTaskCompleted  = ['Completed','Closed'].includes(task?.status);
  const canAssign        = !isTaskInProgress && !isTaskCompleted;
  const isAlreadyFunded  = task?.funded;

  const headerAnim = useFadeSlide(0);

  // ── Data ──────────────────────────────────────────────────────────────────
  const fetchTaskData = async () => {
    try {
      const res = await clientGetTaskInfo(taskId);
      if (res.status === 200) setTask(res.data);
      return res.data;
    } catch { return task; }
  };

  const loadBids = async () => {
    try {
      setLoading(true);
      const latestTask = await fetchTaskData();
      const res = await getMicroTaskBids(taskId);
      if (res.status === 200) {
        const mapped = res.data.map(b => ({
          ...b,
          isAccepted: latestTask?.assignedTo?.toString() === b.bidder?._id?.toString(),
        }));
        setBids(mapped);
      }
    } catch {
      Alert.alert('Error', 'Failed to load bids');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadBids(); }, [taskId]);

  const onRefresh = async () => { setRefreshing(true); await loadBids(); };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleMessage = async (userId, userName) => {
    try {
      const res = await startOrGetChatRoom({ userId2: userId, jobId: taskId });
      if (res.status === 200) navigate('ChatWindow', { roomId: res.data._id, recipientName: userName });
      else Alert.alert('Error', 'Failed to start chat');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to start chat');
    }
  };

  const handleAcceptBid = async (bidder, amount, bidId, bidderName) => {
    if (!canAssign) return;
    const alertTitle = isAlreadyFunded ? 'Reassign Task' : 'Accept Bid';
    const message = isAlreadyFunded
      ? `Reassign to ${bidderName}? No additional payment required.`
      : `Accepting ${bidderName}'s bid requires payment of GH₵${amount}. Funds are securely escrowed until both parties confirm completion.`;

    Alert.alert(alertTitle, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isAlreadyFunded ? 'Reassign' : 'Pay & Accept',
        onPress: async () => {
          setProcessingAction(bidId);
          try {
            if (!isAlreadyFunded) {
              const result = await triggerPayment({
                navigation, popup,
                email: user.email, phone: user.phone,
                amount, taskId: task._id, beneficiary: bidder.userId,
              });
              if (!result.success) {
                if (!result.cancelled) Alert.alert('Error', 'Payment failed. Please try again.');
                return;
              }
              const verifyRes = await verifyTaskPayment(result.reference, {
                taskId: task._id, beneficiary: bidder.userId, amount,
              });
              if (verifyRes.status !== 200) {
                Alert.alert('Error', verifyRes.message || 'Payment verification failed.');
                return;
              }
            }
            const response = await acceptBidForTask(taskId, bidId);
            if (response.status === 200) {
              Alert.alert('Success 🎉', `${isAlreadyFunded ? 'Task reassigned' : 'Bid accepted'} — ${bidderName} is on the job!`);
              await fetchTaskData();
              await loadBids();
            } else {
              throw new Error(response.data?.message || 'Bid acceptance failed');
            }
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || err.message || 'Error accepting bid');
          } finally {
            setProcessingAction(null);
          }
        },
      },
    ]);
  };

  const handleViewProfile = (bid) => navigate('ApplicantProfile', { taskerId: bid.bidder._id });

  // ── Derived lists ─────────────────────────────────────────────────────────
  const pendingCount  = bids.filter(b => !b.isAccepted).length;
  const acceptedCount = bids.filter(b =>  b.isAccepted).length;

  const filtered = bids
    .filter(b =>
      activeFilter === 'all'      ? true :
      activeFilter === 'accepted' ? b.isAccepted :
                                    !b.isAccepted
    )
    .sort((a, b) => {
      if (sortBy === 'score')  return (b.bidder?.totalScore || 0)  - (a.bidder?.totalScore || 0);
      if (sortBy === 'rating') return (b.bidder?.rating      || 0) - (a.bidder?.rating      || 0);
      if (sortBy === 'amount') return a.amount - b.amount;
      return 0;
    });

  // ── Average bid ───────────────────────────────────────────────────────────
  const avgBid = bids.length
    ? Math.round(bids.reduce((s, b) => s + b.amount, 0) / bids.length)
    : 0;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Bids" showBackButton />
        <LoadingIndicator text="Loading bids…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <Header
        title="Bids Received"
        showBackButton
        rightComponent={
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Ionicons name="refresh-outline" size={20} color={C.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />
        }
      >
        {/* ── Hero task card ────────────────────────────────────────── */}
        <Animated.View style={headerAnim}>
          <LinearGradient
            colors={[C.primary, C.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* subtle grid pattern */}
            <View style={styles.heroPattern} />

            <View style={styles.heroTop}>
              <View style={styles.heroTitleWrap}>
                <View style={styles.heroTaskBadge}>
                  <Ionicons name="document-text-outline" size={11} color={C.gold} />
                  <Text style={styles.heroTaskBadgeText}>Task</Text>
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>{task?.title || 'Your Task'}</Text>
              </View>
              <View style={[styles.heroStatusPill,
                isTaskCompleted ? styles.heroStatusDone :
                isTaskInProgress ? styles.heroStatusActive :
                styles.heroStatusOpen
              ]}>
                <Text style={styles.heroStatusText}>
                  {isTaskCompleted ? 'Completed' : isTaskInProgress ? 'In Progress' : task?.status || 'Open'}
                </Text>
              </View>
            </View>

            {/* Stats strip */}
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{bids.length}</Text>
                <Text style={styles.heroStatLabel}>Total Bids</Text>
              </View>
              <View style={styles.heroStatDiv} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>₵{avgBid}</Text>
                <Text style={styles.heroStatLabel}>Avg Bid</Text>
              </View>
              <View style={styles.heroStatDiv} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>₵{task?.budget || '—'}</Text>
                <Text style={styles.heroStatLabel}>Budget</Text>
              </View>
              <View style={styles.heroStatDiv} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {task?.deadline ? moment(task.deadline).format('MMM D') : 'Flex'}
                </Text>
                <Text style={styles.heroStatLabel}>Deadline</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Warning if task locked ───────────────────────────────── */}
        {!canAssign && (
          <View style={styles.warningBanner}>
            <View style={styles.warningIconWrap}>
              <Ionicons name="alert-circle" size={18} color={C.amber} />
            </View>
            <Text style={styles.warningText}>
              {isTaskCompleted
                ? 'This task has been completed. Bids are read-only.'
                : 'This task is already in progress. You can view but not accept new bids.'}
            </Text>
          </View>
        )}

        {/* ── Filters + sort ───────────────────────────────────────── */}
        <View style={styles.controlBar}>
          {/* Filter pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            <FilterPill label="All"      count={bids.length}   active={activeFilter === 'all'}      onPress={() => setActiveFilter('all')}      />
            <FilterPill label="Pending"  count={pendingCount}   active={activeFilter === 'pending'}  onPress={() => setActiveFilter('pending')}  />
            <FilterPill label="Accepted" count={acceptedCount}  active={activeFilter === 'accepted'} onPress={() => setActiveFilter('accepted')} />
          </ScrollView>

          {/* Sort */}
          <View style={styles.sortRow}>
            <Ionicons name="funnel-outline" size={13} color={C.textMuted} />
            <Text style={styles.sortLabel}>Sort</Text>
            <SortChip label="Score"  icon="trending-up-outline"   active={sortBy === 'score'}  onPress={() => setSortBy('score')}  />
            <SortChip label="Rating" icon="star-outline"           active={sortBy === 'rating'} onPress={() => setSortBy('rating')} />
            <SortChip label="Price"  icon="pricetag-outline"       active={sortBy === 'amount'} onPress={() => setSortBy('amount')} />
          </View>
        </View>

        {/* ── Bid cards ────────────────────────────────────────────── */}
        <View style={styles.cardsWrap}>
          {filtered.length > 0 ? (
            filtered.map((bid, i) => (
              <BidCard
                key={bid._id}
                item={bid}
                index={i}
                canAssign={canAssign}
                processingAction={processingAction}
                onAccept={handleAcceptBid}
                onMessage={handleMessage}
                onViewProfile={handleViewProfile}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={40} color={C.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeFilter === 'all' ? 'No Bids Yet' : `No ${activeFilter} bids`}
              </Text>
              <Text style={styles.emptyDesc}>
                {activeFilter === 'all'
                  ? 'Taskers are reviewing your requirements. Check back soon.'
                  : `Switch the filter to see ${activeFilter === 'pending' ? 'accepted' : 'pending'} bids.`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  scroll:      { flex: 1 },
  scrollContent:{ paddingBottom: 40 },
  refreshBtn:  { padding: 6 },

  // ── Hero ─────────────────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: 16, marginTop: 14, marginBottom: 6,
    borderRadius: 22, padding: 20,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  heroPattern: {
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 18,
  },
  heroTitleWrap: { flex: 1, marginRight: 12 },
  heroTaskBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(212,155,63,0.2)',
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(212,155,63,0.35)',
  },
  heroTaskBadgeText: { fontSize: 10, fontWeight: '700', color: C.gold, letterSpacing: 0.5 },
  heroTitle:    { fontSize: 18, fontWeight: '800', color: C.white, letterSpacing: -0.3, lineHeight: 24 },
  heroStatusPill:{ borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  heroStatusOpen:  { backgroundColor: 'rgba(255,255,255,0.15)' },
  heroStatusActive:{ backgroundColor: 'rgba(245,158,11,0.25)' },
  heroStatusDone:  { backgroundColor: 'rgba(15,118,110,0.3)' },
  heroStatusText: { fontSize: 11, fontWeight: '700', color: C.white, letterSpacing: 0.3 },

  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, padding: 14,
  },
  heroStat:      { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 17, fontWeight: '800', color: C.white, marginBottom: 2 },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.3 },
  heroStatDiv:   { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 4 },

  // ── Warning ───────────────────────────────────────────────────────────────
  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFBEB', marginHorizontal: 16, marginTop: 12,
    padding: 14, borderRadius: 14, gap: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  warningIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center',
  },
  warningText: { flex: 1, fontSize: 13, color: '#78350F', lineHeight: 19, fontWeight: '500' },

  // ── Controls ──────────────────────────────────────────────────────────────
  controlBar: { marginTop: 16, paddingHorizontal: 16, gap: 10 },

  pillsRow:      { flexDirection: 'row', gap: 8, paddingRight: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border,
  },
  pillActive:    { backgroundColor: C.primary, borderColor: C.primary },
  pillText:      { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  pillTextActive:{ color: C.white },
  pillBadge: {
    backgroundColor: C.surfaceAlt, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 1,
  },
  pillBadgeActive:    { backgroundColor: 'rgba(255,255,255,0.2)' },
  pillBadgeText:      { fontSize: 11, fontWeight: '700', color: C.textMuted },
  pillBadgeTextActive:{ color: C.white },

  sortRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border, gap: 8,
  },
  sortLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600', letterSpacing: 0.3 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg,
  },
  sortChipActive:    { backgroundColor: C.primary, borderColor: C.primary },
  sortChipText:      { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  sortChipTextActive:{ color: C.white },

  // ── Cards ─────────────────────────────────────────────────────────────────
  cardsWrap: { paddingHorizontal: 16, marginTop: 14 },

  bidCard: {
    backgroundColor: C.surface, borderRadius: 18,
    marginBottom: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },

  // Accepted ribbon
  acceptedRibbon: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: C.green,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5,
    borderBottomLeftRadius: 12,
  },
  acceptedRibbonText: { fontSize: 10, fontWeight: '800', color: C.white, letterSpacing: 0.4 },

  // Card top
  cardTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 14, gap: 12,
  },
  avatarWrap:  { position: 'relative' },
  avatar: {
    width: 56, height: 56, borderRadius: 16,
    borderWidth: 2, borderColor: C.border,
  },
  avatarGrad: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 20, fontWeight: '800', color: C.white },
  verifiedDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.surface,
  },

  identity:  { flex: 1 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  name:      { fontSize: 16, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  verifiedChip: {
    backgroundColor: '#D1FAE5', borderRadius: 20,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  verifiedChipText: { fontSize: 10, fontWeight: '700', color: C.green },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  ratingNum:  { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  ratingCount:{ fontSize: 11, color: C.textMuted },
  ratingDot:  { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.textMuted },
  locationText:{ fontSize: 11, color: C.textSecondary, maxWidth: 90 },

  msgBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.primary + '22',
  },

  // Services
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  svcChip: {
    backgroundColor: C.primaryGlow, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.primary + '25',
  },
  svcChipText:    { fontSize: 11, fontWeight: '600', color: C.primary },
  svcChipMore:    { backgroundColor: C.surfaceAlt, borderColor: C.border },
  svcChipMoreText:{ fontSize: 11, fontWeight: '600', color: C.textMuted },

  // Amount row
  amountRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surfaceAlt, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
  },
  amountLeft:  {},
  amountLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', letterSpacing: 0.4, marginBottom: 2 },
  amountValue: { fontSize: 22, fontWeight: '800', color: C.green, letterSpacing: -0.5 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  statusAccepted: { backgroundColor: C.greenLight },
  statusPending:  { backgroundColor: '#FEF3C7' },
  statusDot:      { width: 6, height: 6, borderRadius: 3 },
  statusText:     { fontSize: 12, fontWeight: '700' },

  // Proposal box
  proposalBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.primaryGlow, borderRadius: 10,
    padding: 12, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: C.primary,
  },
  proposalText: { flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 19, fontStyle: 'italic' },

  // Accept CTA
  acceptBtn: {
    borderRadius: 12, overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnDisabled: { shadowOpacity: 0, elevation: 0 },
  acceptBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 8,
  },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: C.white, letterSpacing: 0.2 },

  acceptedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.greenLight, borderRadius: 12,
    paddingVertical: 12, gap: 8,
    borderWidth: 1, borderColor: '#6EE7B7',
  },
  acceptedBarText: { fontSize: 15, fontWeight: '700', color: C.green },

  // Empty
  emptyState: {
    alignItems: 'center', paddingVertical: 56,
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, marginTop: 4,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: C.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: C.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 21 },
});