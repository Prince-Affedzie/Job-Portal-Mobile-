// screens/guest/GuestTaskDetailScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMiniTaskInfo } from '../../api/miniTaskApi';
import { navigate } from '../../services/navigationService';
import LoadingIndicator from '../../component/common/LoadingIndicator';

const { width } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#F8FAFF',
  surface: '#FFFFFF',
  border: '#E4E8EE',
  borderLight: '#EEF1F6',
  primary: '#1E3A6E',
  primaryMid: '#1A56DB',
  primaryGlow: '#EBF5FF',
  gold: '#D49B3F',
  goldLight: '#FCF3E1',
  green: '#0E9F6E',
  greenLight: '#E3FCEC',
  red: '#DC2626',
  redLight: '#FEF2F2',
  amber: '#F59E0B',
  amberLight: '#FFFBEB',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calculateTimeLeft = (deadline) => {
  if (!deadline) return { label: 'No deadline', urgent: false };
  const diff = new Date(deadline) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return { label: 'Expired', urgent: true };
  if (days === 1) return { label: '1 day left', urgent: true };
  if (days <= 3) return { label: `${days} days left`, urgent: true };
  return { label: `${days} days left`, urgent: false };
};

const formatAddress = (address) => {
  if (!address) return null;
  return [address.suburb, address.city, address.region].filter(Boolean).join(', ');
};

const BIDDING_CONFIG = {
  'open-bid': {
    icon: 'pricetags-outline', label: 'Open Bidding', color: C.primaryMid, bg: C.primaryGlow,
  },
  negotiation: {
    icon: 'chatbubble-ellipses-outline', label: 'Open to Negotiation', color: C.gold, bg: C.goldLight,
  },
  fixed: {
    icon: 'lock-closed-outline', label: 'Fixed Budget', color: C.green, bg: C.greenLight,
  },
};

const getBiddingCfg = (type) => BIDDING_CONFIG[type] || BIDDING_CONFIG.fixed;

// ─── Small sub‑components ─────────────────────────────────────────────────────
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
export default function GuestTaskDetailScreen({ route }) {
  const { taskId } = route.params;
  const insets = useSafeAreaInsets();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  const requirements = task?.requirements?.length
    ? task.requirements
    : ['Good communication skills', 'Reliable and punctual', 'Attention to detail'];

  const skills = task?.skillsRequired?.length
    ? task.skillsRequired
    : ['Reliable', 'Professional', 'Skilled'];

  const timeLeft = calculateTimeLeft(task?.deadline);
  const biddingCfg = getBiddingCfg(task?.biddingType);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
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
        <TouchableOpacity style={styles.errorBtn} onPress={() => navigate('Guest')}>
          <Text style={styles.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('Guest')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{task.title}</Text>
          <Text style={styles.headerSub}>Task Details</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

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
            <View style={styles.heroCircle} />
            <View style={[styles.biddingPill, { backgroundColor: biddingCfg.bg }]}>
              <Ionicons name={biddingCfg.icon} size={13} color={biddingCfg.color} />
              <Text style={[styles.biddingPillText, { color: biddingCfg.color }]}>
                {biddingCfg.label}
              </Text>
            </View>
            <Text style={styles.heroTitle}>{task.title}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaItem}>
                <Ionicons name="cash-outline" size={15} color="rgba(255,255,255,0.75)" />
                <Text style={styles.heroMetaLabel}>Budget</Text>
                <Text style={styles.heroMetaValue}>
                  {task.biddingType === 'negotiation' ? 'Negotiable' : `₵${task.budget}`}
                </Text>
              </View>
              <View style={styles.heroMetaDivider} />
              <View style={styles.heroMetaItem}>
                <Ionicons name="time-outline" size={15} color={timeLeft.urgent ? '#FCD34D' : 'rgba(255,255,255,0.75)'} />
                <Text style={styles.heroMetaLabel}>Deadline</Text>
                <Text style={[styles.heroMetaValue, timeLeft.urgent && { color: '#FCD34D' }]}>
                  {timeLeft.label}
                </Text>
              </View>
              <View style={styles.heroMetaDivider} />
              <View style={styles.heroMetaItem}>
                <Ionicons name="radio-button-on" size={15} color={task.status?.toLowerCase() === 'active' ? C.green : C.red} />
                <Text style={styles.heroMetaLabel}>Status</Text>
                <Text style={[styles.heroMetaValue, { color: task.status?.toLowerCase() === 'active' ? '#6EE7B7' : '#FCA5A5' }]}>
                  {task.status || 'Active'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Content ───────────────────────────────────────────────── */}
        <View style={styles.content}>
          <SectionCard icon="document-text-outline" title="Description">
            <Text style={styles.description}>{task.description}</Text>
          </SectionCard>

          {/* Attachments (simplified) */}
          {task.media?.length > 0 && (
            <View style={styles.mediaSectionWrap}>
              <PillLabel text="Attachments" color={C.primaryMid} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                {task.media.map((item, i) => (
                  <View key={i} style={styles.mediaThumb}>
                    {item.type === 'image' ? (
                      <Image source={{ uri: item.url }} style={styles.mediaThumbImg} />
                    ) : (
                      <View style={styles.mediaThumbVideo}>
                        <Ionicons name="videocam" size={20} color={C.primaryMid} />
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

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

          <SectionCard icon="build-outline" title="Required Skills">
            <View style={styles.skillsWrap}>
              {skills.map((skill, i) => (
                <View key={i} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skill}</Text>
                </View>
              ))}
            </View>
          </SectionCard>

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
                    <InfoChip icon="star" text={`${Math.floor(task.employer.rating)} rating`} color={C.gold} bg={C.goldLight} />
                  )}
                  {task.employer?.isVerified && (
                    <InfoChip icon="checkmark-circle" text="Verified" color={C.green} bg={C.greenLight} />
                  )}
                </View>
              </View>
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
          </View>
        </View>
      </Animated.ScrollView>

      {/* ── Sticky Footer — Sign Up Prompt ────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.footerContent}>
          <View style={styles.footerInfo}>
            <Ionicons name="person-add-outline" size={18} color={C.primaryMid} />
            <View style={{ flex: 1 }}>
              <Text style={styles.footerTitle}>Interested in this gig?</Text>
              <Text style={styles.footerSub}>Create a free account to apply</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.signUpBtn}
            onPress={() => navigate('Register')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[C.primary, C.primaryMid]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.signUpGradient}
            >
              <Text style={styles.signUpBtnText}>Sign Up Free</Text>
              <Ionicons name="arrow-forward" size={16} color={C.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 130 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  headerSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },

  // Error
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, paddingHorizontal: 32 },
  errorIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.redLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  errorSub: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  errorBtn: { backgroundColor: C.primaryMid, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  errorBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },

  // Hero
  heroCard: { marginHorizontal: 16, marginTop: 12, marginBottom: 6, borderRadius: 20, overflow: 'hidden', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 14, elevation: 8 },
  heroGradient: { padding: 22, position: 'relative', overflow: 'hidden' },
  heroCircle: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  biddingPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, marginBottom: 14 },
  biddingPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: C.white, lineHeight: 30, letterSpacing: -0.4, marginBottom: 18 },
  heroMeta: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 4 },
  heroMetaItem: { flex: 1, alignItems: 'center', gap: 3 },
  heroMetaLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  heroMetaValue: { fontSize: 13, color: C.white, fontWeight: '700' },
  heroMetaDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 12 },
  sectionCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.borderLight, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionCardTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  description: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
  mediaSectionWrap: { marginBottom: 14 },
  mediaRow: { gap: 10, paddingVertical: 4 },
  mediaThumb: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: C.border },
  mediaThumbImg: { width: '100%', height: '100%' },
  mediaThumbVideo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  reqBullet: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  reqText: { fontSize: 14, color: C.textSecondary, lineHeight: 20, flex: 1, fontWeight: '500' },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { backgroundColor: C.primaryGlow, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#DBEAFE' },
  skillChipText: { fontSize: 13, fontWeight: '600', color: C.primaryMid },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  locationIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  locationType: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
  locationAddress: { fontSize: 13, color: C.textSecondary, lineHeight: 19 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primaryMid, alignItems: 'center', justifyContent: 'center' },
  clientAvatarText: { color: C.white, fontSize: 18, fontWeight: '800' },
  clientName: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  clientChips: { flexDirection: 'row', gap: 6 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  infoChipText: { fontSize: 11, fontWeight: '600' },
  safetyCard: { backgroundColor: C.amberLight, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  safetyTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  safetyIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  safetyTitle: { fontSize: 15, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  safetyText: { fontSize: 13, color: '#92400E', lineHeight: 19 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface,
    paddingHorizontal: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 10,
  },
  footerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  footerTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  footerSub: { fontSize: 11, color: C.textMuted },
  signUpBtn: { borderRadius: 12, overflow: 'hidden' },
  signUpGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 18, gap: 8 },
  signUpBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
});

