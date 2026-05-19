import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getMiniTaskInfo,
  applyToMiniTask,
  bidOnMiniTask,
  negotiateMiniTask,
} from '../../api/miniTaskApi';
import { BidModal } from '../../component/tasker/BidModal';
import { NegotiationModal } from '../../component/tasker/NegotiationModal';
import { ScamAlertModal } from '../../component/tasker/ScamAlertModal';
import { MediaDisplay } from '../../component/tasker/TaskMediaDisplay';
import ReportForm from '../../component/common/reportForm';
import Header from '../../component/tasker/Header';
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { width } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:            '#F8FAFF',
  surface:       '#FFFFFF',
  border:        '#E4E8EE',
  borderLight:   '#EEF1F6',
  primary:       '#1E3A6E',
  primaryMid:    '#1A56DB',
  primaryGlow:   '#EBF5FF',
  gold:          '#D49B3F',
  goldLight:     '#FCF3E1',
  green:         '#0E9F6E',
  greenLight:    '#E3FCEC',
  red:           '#DC2626',
  redLight:      '#FEF2F2',
  amber:         '#F59E0B',
  amberLight:    '#FFFBEB',
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  white:         '#FFFFFF',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calculateTimeLeft = (deadline) => {
  if (!deadline) return { label: 'No deadline', urgent: false };
  const diff = new Date(deadline) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0)  return { label: 'Expired', urgent: true };
  if (days === 1) return { label: '1 day left', urgent: true };
  if (days <= 3)  return { label: `${days} days left`, urgent: true };
  return { label: `${days} days left`, urgent: false };
};

const formatAddress = (address) => {
  if (!address) return null;
  return [address.suburb, address.city, address.region].filter(Boolean).join(', ');
};

const BIDDING_CONFIG = {
  'open-bid': {
    icon:    'pricetags-outline',
    label:   'Open Bidding',
    color:   C.primaryMid,
    bg:      C.primaryGlow,
    btnIcon: 'pricetag',
    btnText: 'Place a Bid',
    sentText:'Bid Sent!',
  },
  negotiation: {
    icon:    'chatbubble-ellipses-outline',
    label:   'Open to Negotiation',
    color:   C.gold,
    bg:      C.goldLight,
    btnIcon: 'chatbubbles',
    btnText: 'Start Negotiation',
    sentText:'Offer Sent!',
  },
  fixed: {
    icon:    'lock-closed-outline',
    label:   'Fixed Budget',
    color:   C.green,
    bg:      C.greenLight,
    btnIcon: 'hand-right',
    btnText: 'Show Interest',
    sentText:'Interest Sent!',
  },
};

const getBiddingCfg = (type) => BIDDING_CONFIG[type] || BIDDING_CONFIG.fixed;

// ─── Small sub-components ─────────────────────────────────────────────────────

const PillLabel = ({ text, color = C.primaryMid }) => (
  <View style={styles.pillRow}>
    <View style={[styles.pillDot, { backgroundColor: color }]} />
    <Text style={[styles.pillText, { color }]}>{text.toUpperCase()}</Text>
  </View>
);

const SectionCard = ({ icon, title, children, accent = C.primary }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionCardHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: C.primaryGlow }]}>
        <Ionicons name={icon} size={17} color={accent} />
      </View>
      <Text style={styles.sectionCardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const InfoChip = ({ icon, text, color = C.textSecondary, bg = C.border }) => (
  <View style={[styles.infoChip, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={13} color={color} />
    <Text style={[styles.infoChipText, { color }]}>{text}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const TaskDetailsScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const insets = useSafeAreaInsets();

  const [task,                setTask]                = useState(null);
  const [loading,             setLoading]             = useState(true);
  const [applying,            setApplying]            = useState(false);
  const [applyClicked,        setApplyClicked]        = useState(false);
  const [showScamAlert,       setShowScamAlert]       = useState(false);
  const [showBidModal,        setShowBidModal]        = useState(false);
  const [showNegotiationModal,setShowNegotiationModal]= useState(false);
  const [showReportForm,      setShowReportForm]      = useState(false);

  const [bidData, setBidData] = useState({ amount: '', message: '', timeline: '' });
  const [negotiationData, setNegotiationData] = useState({ preferred: '', mid: '', lowest: '', message: '' });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await getMiniTaskInfo(taskId);
        if (res.status === 200) {
          setTask(res.data);
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        } else throw new Error();
      } catch {
        Alert.alert('Error', 'Failed to load task details');
      } finally {
        setLoading(false);
      }
    })();
  }, [taskId]);

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleApplyOrBid = async () => {
    if (task?.biddingType === 'open-bid')    { setShowBidModal(true); return; }
    if (task?.biddingType === 'negotiation') { setShowNegotiationModal(true); return; }
    await handleFixedApplication();
  };

  const handleFixedApplication = async () => {
    setApplying(true);
    try {
      const res = await applyToMiniTask(taskId);
      if (res.status === 200) {
        setApplyClicked(true);
        Alert.alert('Interest Sent! 🎉', "Stay tuned — the client might reach out soon.");
      } else Alert.alert('Error', 'Please try again later.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setApplying(false);
    }
  };

  const submitBid = async () => {
    if (!bidData.amount || !bidData.timeline) {
      Alert.alert('Missing Info', 'Please provide both amount and timeline.');
      return;
    }
    setApplying(true);
    try {
      const res = await bidOnMiniTask(taskId, bidData);
      if (res.status === 200) {
        setApplyClicked(true);
        setShowBidModal(false);
        Alert.alert('Bid Submitted! 🎉', 'The client will review your bid.');
      } else Alert.alert('Error', 'Please try again later.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setApplying(false);
    }
  };

  const submitNegotiation = async () => {
    if (!negotiationData.preferred || !negotiationData.mid || !negotiationData.lowest) {
      Alert.alert('Missing Info', 'Please fill all three price points.');
      return;
    }
    setApplying(true);
    try {
      const res = await negotiateMiniTask(taskId, negotiationData);
      if (res.status === 200) {
        setApplyClicked(true);
        setShowNegotiationModal(false);
        Alert.alert('Offer Sent! 🎉', 'The client will review your negotiation offer.');
      } else Alert.alert('Error', 'Please try again later.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setApplying(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const requirements = task?.requirements?.length
    ? task.requirements
    : ['Good communication skills', 'Reliable and punctual', 'Attention to detail'];

  const skills = task?.skillsRequired?.length
    ? task.skillsRequired
    : ['Reliable', 'Professional', 'Skilled'];

  const timeLeft  = calculateTimeLeft(task?.deadline);
  const biddingCfg = getBiddingCfg(task?.biddingType);

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Task Details" showBackButton />
        <LoadingIndicator text="Loading task details..." logoStyle="glow" />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <View style={styles.errorWrap}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={C.red} />
        </View>
        <Text style={styles.errorTitle}>Task Not Found</Text>
        <Text style={styles.errorSub}>This task may have been removed or expired.</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const buttonDisabled = applying || applyClicked;
  const btnLabel = applyClicked
    ? biddingCfg.sentText
    : applying ? 'Processing…' : biddingCfg.btnText;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <Header title="Task Details" showBackButton />

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ─────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={[C.primary, '#1A3A7A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Decorative circle */}
            <View style={styles.heroCircle} />

            {/* Bidding type pill */}
            <View style={[styles.biddingPill, { backgroundColor: biddingCfg.bg }]}>
              <Ionicons name={biddingCfg.icon} size={13} color={biddingCfg.color} />
              <Text style={[styles.biddingPillText, { color: biddingCfg.color }]}>
                {biddingCfg.label}
              </Text>
            </View>

            {/* Title */}
            <Text style={styles.heroTitle}>{task.title}</Text>

            {/* Meta row */}
            <View style={styles.heroMeta}>
              {/* Budget */}
              <View style={styles.heroMetaItem}>
                <Ionicons name="cash-outline" size={15} color="rgba(255,255,255,0.75)" />
                <Text style={styles.heroMetaLabel}>Budget</Text>
                <Text style={styles.heroMetaValue}>
                  {task.biddingType === 'negotiation' ? 'Negotiable' : `₵${task.budget}`}
                </Text>
              </View>

              <View style={styles.heroMetaDivider} />

              {/* Deadline */}
              <View style={styles.heroMetaItem}>
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={timeLeft.urgent ? '#FCD34D' : 'rgba(255,255,255,0.75)'}
                />
                <Text style={styles.heroMetaLabel}>Deadline</Text>
                <Text style={[styles.heroMetaValue, timeLeft.urgent && { color: '#FCD34D' }]}>
                  {timeLeft.label}
                </Text>
              </View>

              <View style={styles.heroMetaDivider} />

              {/* Status */}
              <View style={styles.heroMetaItem}>
                <Ionicons name="radio-button-on" size={15} color={task.status?.toLowerCase() === 'active' ? C.green : C.red} />
                <Text style={styles.heroMetaLabel}>Status</Text>
                <Text style={[
                  styles.heroMetaValue,
                  { color: task.status?.toLowerCase() === 'active' ? '#6EE7B7' : '#FCA5A5' }
                ]}>
                  {task.status || 'Active'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Content ───────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Description */}
          <SectionCard icon="document-text-outline" title="Description">
            <Text style={styles.description}>{task.description}</Text>
          </SectionCard>

          {/* Media */}
          {task.media?.length > 0 && (
            <View style={styles.mediaSectionWrap}>
              <PillLabel text="Attachments" color={C.primaryMid} />
              <MediaDisplay media={task.media} />
            </View>
          )}

          {/* Requirements */}
          <SectionCard icon="checkmark-circle-outline" title="Requirements">
            {requirements.map((req, i) => (
              <View key={i} style={styles.reqRow}>
                <View style={styles.reqBullet}>
                  <Ionicons name="checkmark" size={12} color={C.white} />
                </View>
                <Text style={styles.reqText}>{req}</Text>
              </View>
            ))}
          </SectionCard>

          {/* Skills */}
          <SectionCard icon="build-outline" title="Required Skills">
            <View style={styles.skillsWrap}>
              {skills.map((skill, i) => (
                <View key={i} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skill}</Text>
                </View>
              ))}
            </View>
          </SectionCard>

          {/* Location */}
          <SectionCard icon="location-outline" title="Location" accent={C.green}>
            <View style={styles.locationRow}>
              <View style={[styles.locationIconWrap, { backgroundColor: C.greenLight }]}>
                <Ionicons name="location" size={20} color={C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationType}>
                  {task.locationType || 'Flexible Location'}
                </Text>
                <Text style={styles.locationAddress}>
                  {formatAddress(task.address) || 'Location details available after application'}
                </Text>
              </View>
            </View>
          </SectionCard>

          {/* Client */}
          <SectionCard icon="person-outline" title="About the Client">
            <View style={styles.clientRow}>
              {/* Avatar */}
              <View style={styles.clientAvatar}>
                <Text style={styles.clientAvatarText}>
                  {task.employer?.name?.charAt(0)?.toUpperCase() || 'C'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.clientName}>
                  {task.employer?.name || 'Client'}
                </Text>

                <View style={styles.clientChips}>
                  {task.employer?.rating != null && (
                    <InfoChip
                      icon="star"
                      text={`${Math.floor(task.employer.rating)} rating`}
                      color={C.gold}
                      bg={C.goldLight}
                    />
                  )}
                  {task.employer?.isVerified && (
                    <InfoChip
                      icon="checkmark-circle"
                      text="Verified"
                      color={C.green}
                      bg={C.greenLight}
                    />
                  )}
                </View>
              </View>

              {/* Report button */}
              <TouchableOpacity
                style={styles.reportBtn}
                onPress={() => setShowReportForm(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="flag-outline" size={16} color={C.red} />
                <Text style={styles.reportBtnText}>Report</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>

          {/* Safety */}
          <View style={styles.safetyCard}>
            <View style={styles.safetyTop}>
              <View style={styles.safetyIconWrap}>
                <Ionicons name="shield-checkmark" size={22} color={C.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.safetyTitle}>Stay Safe</Text>
                <Text style={styles.safetyText}>
                  Never pay upfront fees or send money to secure a task. Workaflow does not require any initial payments.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.safetyLearnMore}
              onPress={() => setShowScamAlert(true)}
            >
              <Text style={styles.safetyLearnMoreText}>Learn About Scam Alerts</Text>
              <Ionicons name="chevron-forward" size={15} color={C.primaryMid} />
            </TouchableOpacity>
          </View>

        </View>
      </Animated.ScrollView>

      {/* ── Sticky Footer ─────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.applyBtn, buttonDisabled && styles.applyBtnDisabled]}
          onPress={handleApplyOrBid}
          disabled={buttonDisabled}
          activeOpacity={0.88}
        >
          {applying ? (
            <ActivityIndicator color={C.white} size="small" />
          ) : (
            <>
              <Ionicons
                name={applyClicked ? 'checkmark-circle' : biddingCfg.btnIcon}
                size={21}
                color={C.white}
              />
              <Text style={styles.applyBtnText}>{btnLabel}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <ScamAlertModal
        visible={showScamAlert}
        onClose={() => setShowScamAlert(false)}
      />
      <BidModal
        visible={showBidModal}
        onClose={() => setShowBidModal(false)}
        bidData={bidData}
        setBidData={setBidData}
        onSubmit={submitBid}
        isProcessing={applying}
      />
      <NegotiationModal
        visible={showNegotiationModal}
        onClose={() => setShowNegotiationModal(false)}
        negotiationData={negotiationData}
        setNegotiationData={setNegotiationData}
        onSubmit={submitNegotiation}
        isProcessing={applying}
      />

      {/* Report Form — passes all required context props */}
      <ReportForm
        isVisible={showReportForm}
        onClose={() => setShowReportForm(false)}
        onReportSubmitted={() => {
          setShowReportForm(false);
          Alert.alert('Thank you', 'Our team will review your report shortly.');
        }}
        reportedUserId={task?.employer?._id || task?.employer?.id || ''}
        taskId={taskId}
        taskTitle={task?.title || ''}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingBottom: 110,
  },

  // ── Error state ──
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    paddingHorizontal: 32,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  errorBtn: {
    backgroundColor: C.primaryMid,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },
  errorBtnText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 15,
  },

  // ── Hero ──
  heroCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  heroGradient: {
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  biddingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  biddingPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.white,
    lineHeight: 30,
    letterSpacing: -0.4,
    marginBottom: 18,
  },
  heroMeta: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  heroMetaItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  heroMetaLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroMetaValue: {
    fontSize: 13,
    color: C.white,
    fontWeight: '700',
  },
  heroMetaDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // ── Content ──
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // ── Section card ──
  sectionCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
  },

  // ── Pill label ──
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },

  // ── Description ──
  description: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 22,
  },

  // ── Media ──
  mediaSectionWrap: {
    marginBottom: 14,
  },

  // ── Requirements ──
  reqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  reqBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  reqText: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },

  // ── Skills ──
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: C.primaryGlow,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  skillChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primaryMid,
  },

  // ── Location ──
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationType: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 3,
  },
  locationAddress: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 19,
  },

  // ── Client ──
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    color: C.white,
    fontSize: 18,
    fontWeight: '800',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 6,
  },
  clientChips: {
    flexDirection: 'row',
    gap: 6,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: C.redLight,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  reportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.red,
  },

  // ── Safety ──
  safetyCard: {
    backgroundColor: C.amberLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  safetyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  safetyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  safetyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  safetyText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
  },
  safetyLearnMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  safetyLearnMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primaryMid,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryMid,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: C.primaryMid,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  applyBtnDisabled: {
    backgroundColor: C.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  applyBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default TaskDetailsScreen;

// ─── Named style export ───────────────────────────────────────────────────────
// ScamAlertModal (and any other component) does:
//   import { styles } from '../../screens/TaskDetailsScreen'
// We keep those keys alive here so nothing breaks.
export const scamStyles = StyleSheet.create({
  scamAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scamAlertContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  scamAlertTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  scamAlertList: {
    marginBottom: 24,
  },
  scamAlertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  scamAlertText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    lineHeight: 20,
  },
  scamAlertButton: {
    backgroundColor: '#1A56DB',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  scamAlertButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

// Re-export merged so `import { styles } from './TaskDetailsScreen'` still resolves
export { styles };