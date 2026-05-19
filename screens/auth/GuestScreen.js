// screens/GuestScreen.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions,
  StatusBar, Animated, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { navigate } from '../../services/navigationService';
import { getPublicTasks } from '../../api/miniTaskApi';

const { width } = Dimensions.get('window');

// ─── Palette — "Pacific Indigo & Warm Gold" ───────────────────────────────────
const C = {
  bg:            '#F5F7FF',
  surface:       '#FFFFFF',
  border:        '#E4E8EE',
  navy:          '#0E1D3B',
  navyMid:       '#1A2E5C',
  navyLight:     '#243458',
  blue:          '#1A56DB',
  blueSoft:      '#EBF2FF',
  blueBorder:    '#C4D7FF',
  gold:          '#D49B3F',
  goldLight:     '#FCF3E1',
  goldBorder:    '#E8C97A',
  green:         '#0E9F6E',
  greenLight:    '#E3FCEC',
  textPri:       '#0E1D3B',
  textSec:       '#475569',
  textMut:       '#94A3B8',
  white:         '#FFFFFF',
  // card accent colours — cycling palette
  accents: ['#1A56DB', '#D49B3F', '#0E9F6E', '#7C3AED', '#DB1A6A', '#1A7AD4'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatAddress = (address) => {
  if (!address) return 'Remote';
  return [address.suburb, address.city, address.region].filter(Boolean).join(', ') || 'Remote';
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 3600000);
  if (diff < 1)  return 'Just now';
  if (diff < 24) return `${diff}h ago`;
  if (diff < 48) return 'Yesterday';
  return d.toLocaleDateString('en-GH', { month: 'short', day: 'numeric' });
};

// ─── Animated entrance ────────────────────────────────────────────────────────
function FadeSlide({ children, delay = 0, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(22)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 520, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 50, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity: op, transform: [{ translateY: ty }] }]}>{children}</Animated.View>;
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ icon, label, value, accent }) {
  return (
    <View style={[s.statPill, { borderColor: accent + '30', backgroundColor: accent + '10' }]}>
      <View style={[s.statPillIcon, { backgroundColor: accent + '18' }]}>
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <View>
        <Text style={[s.statPillVal, { color: accent }]}>{value}</Text>
        <Text style={s.statPillLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Gig Card ─────────────────────────────────────────────────────────────────
function GigCard({ task, index }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pIn  = () => Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true }).start();
  const pOut = () => Animated.spring(scaleAnim, { toValue: 1,     useNativeDriver: true }).start();

  const accent   = C.accents[index % C.accents.length];
  const initials = task.employer?.name?.charAt(0)?.toUpperCase() || 'C';

  return (
    <FadeSlide delay={80 + index * 60}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={pIn}
          onPressOut={pOut}
          onPress={() => navigate('GuestTaskDetail', { taskId: task._id })}
          style={s.gigCard}
        >
          {/* coloured top border accent */}
          <View style={[s.gigTopAccent, { backgroundColor: accent }]} />

          <View style={s.gigInner}>
            {/* ── Row 1: avatar + name + date + budget ── */}
            <View style={s.gigRow1}>
              <View style={[s.gigAvatar, { backgroundColor: accent }]}>
                <Text style={s.gigAvatarText}>{initials}</Text>
              </View>
              <View style={s.gigMeta}>
                <Text style={s.gigClientName} numberOfLines={1}>
                  {task.employer?.name || 'Client'}
                </Text>
                <Text style={s.gigTime}>{formatDate(task.createdAt)}</Text>
              </View>
              <View style={[s.budgetBadge, { backgroundColor: C.greenLight, borderColor: C.green + '30' }]}>
                <Ionicons name="cash-outline" size={11} color={C.green} />
                <Text style={s.budgetText}>₵{task.budget}</Text>
              </View>
            </View>

            {/* ── Title ── */}
            <Text style={s.gigTitle} numberOfLines={2}>{task.title}</Text>

            {/* ── Description ── */}
            {task.description
              ? <Text style={s.gigDesc} numberOfLines={2}>{task.description}</Text>
              : null}

            {/* ── Footer ── */}
            <View style={s.gigFooter}>
              <View style={s.gigLocationRow}>
                <Ionicons name="location-outline" size={12} color={C.textMut} />
                <Text style={s.gigLocationText} numberOfLines={1}>{formatAddress(task.address)}</Text>
              </View>
              <View style={s.gigRight}>
                {task.category && (
                  <View style={[s.categoryPill, { backgroundColor: accent + '12', borderColor: accent + '28' }]}>
                    <Text style={[s.categoryText, { color: accent }]}>{task.category}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── CTA strip ── */}
            <View style={[s.gigCta, { backgroundColor: accent + '08', borderColor: accent + '20' }]}>
              <Text style={[s.gigCtaText, { color: accent }]}>View Details</Text>
              <Ionicons name="arrow-forward" size={14} color={accent} />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </FadeSlide>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GuestScreen() {
  const [publicTasks, setPublicTasks] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(false);

  const loadTasks = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(false);
      const res = await getPublicTasks();
      if (res.status === 200) setPublicTasks(res.data.slice(0, 12));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTasks(true)}
            tintColor={C.blue}
            colors={[C.blue]}
            progressBackgroundColor={C.surface}
          />
        }
      >

        {/* ══════════════════════════════════════════════════════════════
            HERO SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <FadeSlide delay={0}>
          <View style={s.heroWrap}>
            <LinearGradient
              colors={[C.navy, C.navyMid, C.navyLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.heroCard}
            >
              {/* decorative rings */}
              <View style={s.ring1} />
              <View style={s.ring2} />
              <View style={s.ring3} />

              {/* top bar: guest badge + sign in */}
              <View style={s.heroTopBar}>
                <View style={s.guestChip}>
                  <Ionicons name="eye-outline" size={11} color={C.gold} />
                  <Text style={s.guestChipText}>Browsing as Guest</Text>
                </View>
                <TouchableOpacity onPress={() => navigate('Login')} style={s.signInLink} activeOpacity={0.8}>
                  <Text style={s.signInLinkText}>Sign In</Text>
                  <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>

              {/* headline */}
              <View style={s.heroHeadWrap}>
                <Text style={s.heroEyebrow}>Ghana's Gig Marketplace</Text>
                <Text style={s.heroTitle}>Find Your{'\n'}<Text style={s.heroTitleAccent}>Next Gig.</Text></Text>
                <Text style={s.heroSub}>
                  Browse live tasks from clients near you.{'\n'}No account required.
                </Text>
              </View>

             

              {/* CTA button */}
              <TouchableOpacity
                style={s.heroCta}
                onPress={() => navigate('GuestBrowseTaskers')}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={[C.blue, '#1040B8']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.heroCtaGrad}
                >
                  <Ionicons name="people-outline" size={18} color={C.white} />
                  <Text style={s.heroCtaText}>Browse Taskers</Text>
                  <Ionicons name="arrow-forward" size={16} color={C.white} />
                </LinearGradient>
              </TouchableOpacity>

              {/* register link */}
              <View style={s.heroFooterRow}>
                <Text style={s.heroFooterText}>New here?</Text>
                <TouchableOpacity onPress={() => navigate('Register')} activeOpacity={0.8}>
                  <Text style={s.heroFooterLink}>Create a free account →</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </FadeSlide>

        {/* ══════════════════════════════════════════════════════════════
            GIGS SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <View style={s.gigsSection}>

          {/* Section header */}
          <FadeSlide delay={120}>
            <View style={s.sectionHead}>
              <View>
                <Text style={s.sectionEyebrow}>LIVE OPPORTUNITIES</Text>
                <Text style={s.sectionTitle}>Recent Gigs</Text>
              </View>
              
            </View>
          </FadeSlide>

          {/* Refresh hint */}
          <FadeSlide delay={160}>
            <View style={s.refreshHint}>
              <Ionicons name="refresh-outline" size={13} color={C.textMut} />
              <Text style={s.refreshHintText}>Pull down to refresh</Text>
            </View>
          </FadeSlide>

          {/* ── States ── */}
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={C.blue} />
              <Text style={s.loadingText}>Fetching latest gigs…</Text>
            </View>
          ) : error ? (
            <View style={s.errorWrap}>
              <View style={s.errorIconWrap}>
                <Ionicons name="cloud-offline-outline" size={38} color={C.textMut} />
              </View>
              <Text style={s.errorTitle}>Couldn't load gigs</Text>
              <Text style={s.errorSub}>Pull down to retry</Text>
              <TouchableOpacity style={s.retryBtn} onPress={() => loadTasks()} activeOpacity={0.85}>
                <Text style={s.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : publicTasks.length > 0 ? (
            <View style={s.cardsWrap}>
              {publicTasks.map((task, idx) => (
                <GigCard key={task._id} task={task} index={idx} />
              ))}
            </View>
          ) : (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="briefcase-outline" size={36} color={C.textMut} />
              </View>
              <Text style={s.emptyTitle}>No gigs posted yet</Text>
              <Text style={s.emptySub}>Pull down to refresh or browse taskers directly.</Text>
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════
            FEATURE STRIP
        ═══════════════════════════════════════════════════════════════ */}
        <FadeSlide delay={200}>
          <View style={s.featureStrip}>
            {[
              { icon: 'shield-checkmark-outline', label: 'Verified Taskers', color: C.green   },
              { icon: 'flash-outline',            label: 'Fast Matching',    color: C.blue    },
              { icon: 'wallet-outline',           label: 'Secure Payments',  color: C.gold    },
            ].map((f, i) => (
              <View key={i} style={s.featureItem}>
                <View style={[s.featureIcon, { backgroundColor: f.color + '14' }]}>
                  <Ionicons name={f.icon} size={20} color={f.color} />
                </View>
                <Text style={s.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </FadeSlide>

        {/* ══════════════════════════════════════════════════════════════
            SIGN UP BANNER
        ═══════════════════════════════════════════════════════════════ */}
        <FadeSlide delay={260}>
          <View style={s.signUpBanner}>
            <LinearGradient
              colors={[C.navy, C.navyLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.signUpGrad}
            >
              {/* ring decoration */}
              <View style={s.bannerRing} />

              <View style={s.bannerIconWrap}>
                <Ionicons name="rocket-outline" size={26} color={C.gold} />
              </View>
              <Text style={s.bannerTitle}>Ready to start earning?</Text>
              <Text style={s.bannerSub}>
                Join thousands of taskers across Ghana. Apply for gigs, chat with clients, and get paid — all in one place.
              </Text>

              <View style={s.bannerBtns}>
                <TouchableOpacity
                  style={s.bannerPrimaryBtn}
                  onPress={() => navigate('Register')}
                  activeOpacity={0.88}
                >
                  <Text style={s.bannerPrimaryText}>Create Free Account</Text>
                  <Ionicons name="arrow-forward" size={16} color={C.navy} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.bannerSecBtn}
                  onPress={() => navigate('Login')}
                  activeOpacity={0.8}
                >
                  <Text style={s.bannerSecText}>I already have an account</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </FadeSlide>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 48 },

  // ── Hero ─────────────────────────────────────────────────────────────────
  heroWrap: {
    marginHorizontal: 8, marginTop: 14,
    overflow: 'hidden',
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 14,
    borderTopLeftRadius:26,
     borderTopRighttRadius:26,
  },
  heroCard: { position: 'relative', overflow: 'hidden', padding: 22 },

  // decorative rings
  ring1: {
    position: 'absolute', top: -50, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ring2: {
    position: 'absolute', top: 60, right: -30,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(26,86,219,0.12)',
  },
  ring3: {
    position: 'absolute', bottom: -70, left: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  heroTopBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 22,
  },
  guestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(212,155,63,0.18)',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(212,155,63,0.3)',
  },
  guestChipText: { fontSize: 11, fontWeight: '700', color: C.gold, letterSpacing: 0.3 },
  signInLink:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  signInLinkText:{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },

  heroHeadWrap:  { marginBottom: 20 },
  heroEyebrow: {
    fontSize: 10, fontWeight: '700', color: C.gold,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
  },
  heroTitle: {
    fontSize: 34, fontWeight: '800', color: C.white,
    letterSpacing: -1, lineHeight: 42, marginBottom: 12,
  },
  heroTitleAccent: { color: '#60CAFF' },
  heroSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.68)',
    lineHeight: 22,
  },

  statRow:    { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 11, paddingVertical: 8,
  },
  statPillIcon: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  statPillVal:  { fontSize: 13, fontWeight: '800' },
  statPillLabel:{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },

  heroCta:     { borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  heroCtaGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 10,
  },
  heroCtaText: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  heroFooterRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  heroFooterText:{ fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  heroFooterLink:{ fontSize: 13, color: 'rgba(255,255,255,0.78)', fontWeight: '700' },

  // ── Gigs section ─────────────────────────────────────────────────────────
  gigsSection:  { paddingHorizontal: 14, marginTop: 28 },
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 6,
  },
  sectionEyebrow: {
    fontSize: 10, fontWeight: '700', color: C.blue,
    letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 4,
  },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: C.textPri, letterSpacing: -0.5 },
  seeAllBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText:   { fontSize: 13, fontWeight: '700', color: C.blue },

  refreshHint: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 16,
  },
  refreshHintText: { fontSize: 12, color: C.textMut },

  // ── Loading / error / empty ───────────────────────────────────────────────
  loadingWrap: { alignItems: 'center', paddingVertical: 52, gap: 12 },
  loadingText: { fontSize: 14, color: C.textMut },

  errorWrap:    { alignItems: 'center', paddingVertical: 52, gap: 10 },
  errorIconWrap:{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 4 },
  errorTitle:   { fontSize: 17, fontWeight: '700', color: C.textPri },
  errorSub:     { fontSize: 13, color: C.textMut },
  retryBtn:     { marginTop: 8, backgroundColor: C.blue, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 11 },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: C.white },

  emptyWrap:    { alignItems: 'center', paddingVertical: 52, gap: 8 },
  emptyIconWrap:{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 4 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: C.textPri },
  emptySub:     { fontSize: 13, color: C.textMut, textAlign: 'center', paddingHorizontal: 24 },

  // ── Gig card ─────────────────────────────────────────────────────────────
  cardsWrap: { gap: 14 },
  gigCard: {
    backgroundColor: C.surface, borderRadius: 18,
    overflow: 'hidden', borderWidth: 1, borderColor: C.border,
    shadowColor: '#1E3A6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
  },
  gigTopAccent: { height: 3, width: '100%' },
  gigInner: { padding: 16 },

  gigRow1: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  gigAvatar: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  gigAvatarText: { color: C.white, fontWeight: '800', fontSize: 16 },
  gigMeta:   { flex: 1 },
  gigClientName: { fontSize: 14, fontWeight: '700', color: C.textPri },
  gigTime:       { fontSize: 11, color: C.textMut, marginTop: 1 },
  budgetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1,
  },
  budgetText: { fontSize: 13, fontWeight: '800', color: C.green },

  gigTitle: { fontSize: 17, fontWeight: '800', color: C.textPri, letterSpacing: -0.3, lineHeight: 23, marginBottom: 6 },
  gigDesc:  { fontSize: 13, color: C.textSec, lineHeight: 19, marginBottom: 12 },

  gigFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 10, marginBottom: 12,
  },
  gigLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  gigLocationText:{ fontSize: 12, color: C.textMut, flex: 1 },
  gigRight:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryPill:   { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1 },
  categoryText:   { fontSize: 11, fontWeight: '700' },

  gigCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, paddingVertical: 11, gap: 6,
    borderWidth: 1,
  },
  gigCtaText: { fontSize: 13, fontWeight: '700' },

  // ── Feature strip ─────────────────────────────────────────────────────────
  featureStrip: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginHorizontal: 14, marginTop: 28,
    backgroundColor: C.surface, borderRadius: 18,
    paddingVertical: 20, paddingHorizontal: 10,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#1E3A6E', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  featureItem:  { alignItems: 'center', gap: 8, flex: 1 },
  featureIcon:  { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: 12, fontWeight: '700', color: C.textSec, textAlign: 'center' },

  // ── Sign up banner ────────────────────────────────────────────────────────
  signUpBanner: {
    marginHorizontal: 14, marginTop: 24,
    borderRadius: 24, overflow: 'hidden',
    shadowColor: C.navy, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22, shadowRadius: 18, elevation: 10,
  },
  signUpGrad: { padding: 24, position: 'relative', overflow: 'hidden', alignItems: 'center' },
  bannerRing: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  bannerIconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: 'rgba(212,155,63,0.18)',
    borderWidth: 1, borderColor: 'rgba(212,155,63,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: C.white, letterSpacing: -0.4, textAlign: 'center', marginBottom: 10 },
  bannerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 21, textAlign: 'center', marginBottom: 22 },
  bannerBtns:  { width: '100%', gap: 10 },
  bannerPrimaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.white, borderRadius: 14,
    paddingVertical: 15, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  bannerPrimaryText: { fontSize: 15, fontWeight: '800', color: C.navy },
  bannerSecBtn:  { alignItems: 'center', paddingVertical: 10 },
  bannerSecText: { fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
});