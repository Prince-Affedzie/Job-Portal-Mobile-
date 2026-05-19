// screens/guest/GuestTaskerProfileScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Dimensions, StatusBar,
  Alert, SafeAreaView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import { getTaskerProfile } from '../../api/clientApi';
import { navigate } from '../../services/navigationService';

const { width: W } = Dimensions.get('window');
const BANNER_H  = 260;
const AVATAR_SZ = 92;

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:          '#F4F6FB',
  surface:     '#FFFFFF',
  charcoal:    '#0F1A35',
  inkMid:      '#243460',
  sage:        '#0F766E',
  sageLight:   '#E0F5F2',
  amber:       '#D4920A',
  amberBg:     '#FEF6E0',
  coral:       '#DC2626',
  coralBg:     '#FEE2E2',
  mist:        '#7A8BA8',
  hairline:    '#E8ECF4',
  textPri:     '#0D1B35',
  textSec:     '#4A5B7A',
  textMut:     '#8FA0BE',
  white:       '#FFFFFF',
  verified:    '#059669',
  verifiedBg:  '#D1FAE5',
  gold:        '#C9891A',
  goldBg:      '#FDF3E0',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}
const PRICE_LABEL = { fixed: 'Fixed', hourly: '/hr', starts_at: 'From', negotiable: 'Negotiable' };

function Stars({ rating, size = 14, color = C.amber }) {
  const full  = Math.floor(rating);
  const half  = (rating % 1) >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[...Array(full)].map((_, i) => <Ionicons key={`f${i}`} name="star" size={size} color={color} />)}
      {half && <Ionicons name="star-half" size={size} color={color} />}
      {[...Array(empty)].map((_, i) => <Ionicons key={`e${i}`} name="star-outline" size={size} color={color} />)}
    </View>
  );
}

function FadeUp({ delay = 0, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 480, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 55, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity: op, transform: [{ translateY: ty }] }]}>{children}</Animated.View>;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, dot, badge, children }) {
  return (
    <View style={ss.section}>
      <View style={ss.secHeader}>
        <View style={[ss.secDot, { backgroundColor: dot }]} />
        <Text style={ss.secTitle}>{title}</Text>
        {badge != null && (
          <View style={ss.secBadge}><Text style={ss.secBadgeText}>{badge}</Text></View>
        )}
      </View>
      {children}
    </View>
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────
const ACCENT_CYCLE = [C.sage, C.inkMid, C.amber, C.coral, '#7C6FE8', '#3B82C4'];

function ServiceCard({ svc, index }) {
  const sc = useRef(new Animated.Value(1)).current;
  const accent = ACCENT_CYCLE[index % ACCENT_CYCLE.length];
  const hasPrice = svc.price > 0 && svc.priceType !== 'negotiable';

  return (
    <FadeUp delay={100 + index * 55}>
      <Animated.View style={{ transform: [{ scale: sc }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={() => Animated.spring(sc, { toValue: 0.97, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true }).start()}
          style={[ss.svcCard, { borderLeftColor: accent }]}
        >
          <View style={[ss.svcIconWrap, { backgroundColor: accent + '18' }]}>
            <Ionicons name="construct-outline" size={16} color={accent} />
          </View>
          <View style={ss.svcBody}>
            <Text style={ss.svcName}>{svc.name}</Text>
            {svc.description ? <Text style={ss.svcDesc} numberOfLines={2}>{svc.description}</Text> : null}
          </View>
          <View style={[ss.svcPricePill, { backgroundColor: accent + '12', borderColor: accent + '35' }]}>
            {hasPrice && <Text style={[ss.svcPriceAmt, { color: accent }]}>GHS {svc.price}</Text>}
            <Text style={[ss.svcPriceType, { color: accent }]}>{PRICE_LABEL[svc.priceType] || svc.priceType}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </FadeUp>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GuestTaskerProfileScreen({ route }) {
  const { taskerId } = route.params;
  const scrollY = useRef(new Animated.Value(0)).current;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTaskerProfile(taskerId);
      if (res.status === 200) setProfile(res.data.data || res.data);
      else { Alert.alert('Not found', 'This profile could not be loaded.'); navigate('GuestBrowseTaskers'); }
    } catch {
      Alert.alert('Error', 'Failed to load profile.');
    } finally { setLoading(false); }
  }, [taskerId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const user       = profile?.userId || {};
  const userName   = profile?.businessName || user.name || 'Tasker';
  const userImage  = user.profileImage || null;
  const bannerImg  = profile?.brandBanner || null;
  const rating     = profile?.rating || 0;
  const numRatings = profile?.numberOfRatings || 0;
  const score      = profile?.score ?? 0;
  const isVerified = !!profile?.isVerified;
  const location   = [profile?.location?.city, profile?.location?.region].filter(Boolean).join(', ');
  const portfolio  = profile?.workPortfolio || [];
  const services   = profile?.servicesOffered || [];

  const headerBgOp = scrollY.interpolate({
    inputRange: [BANNER_H - 80, BANNER_H - 30],
    outputRange: [0, 1], extrapolate: 'clamp',
  });

  const TABS = [
    { id: 'overview',  label: 'Overview',  icon: 'person-outline'    },
    { id: 'services',  label: 'Services',  icon: 'construct-outline' },
    { id: 'portfolio', label: 'Portfolio', icon: 'images-outline'    },
    { id: 'reviews',   label: 'Reviews',   icon: 'star-outline'      },
  ];

  if (loading) return (
    <SafeAreaView style={[ss.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <StatusBar barStyle="dark-content" />
      <ActivityIndicator size="large" color={C.inkMid} />
      <Text style={{ color: C.textSec, marginTop: 14, fontSize: 14 }}>Loading profile…</Text>
    </SafeAreaView>
  );

  if (!profile) return (
    <SafeAreaView style={[ss.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: C.textSec }}>Profile not found.</Text>
    </SafeAreaView>
  );

  return (
    <View style={ss.root}>
      <StatusBar barStyle="light-content" />

      {/* Scroll-driven solid header */}
      <Animated.View style={[ss.floatingHeader, {
        paddingTop: 50,
        backgroundColor: C.surface,
        opacity: headerBgOp,
        borderBottomWidth: 1, borderBottomColor: C.hairline,
      }]}>
        <TouchableOpacity onPress={() => navigate('GuestBrowseTaskers')} style={ss.backSolid}>
          <Ionicons name="chevron-back" size={20} color={C.charcoal} />
        </TouchableOpacity>
        <Text style={ss.floatingTitle} numberOfLines={1}>{userName}</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      {/* Always-visible glass back btn */}
      <View style={[ss.floatingHeader, { paddingTop: 50, backgroundColor: 'transparent', borderBottomWidth: 0, zIndex: 10 }]}>
        <TouchableOpacity onPress={() => navigate('GuestBrowseTaskers')} style={ss.backGlass}>
          <Ionicons name="chevron-back" size={20} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/* Banner */}
        <View style={ss.bannerWrap}>
          {bannerImg ? (
            <Image source={{ uri: bannerImg }} style={ss.bannerImg} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[C.charcoal, C.inkMid, '#2D3A6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ss.bannerImg} />
          )}
          <LinearGradient colors={['transparent', 'rgba(8,12,28,0.6)']} style={ss.bannerVig} />
          <View style={ss.providerTag}>
            <Text style={ss.providerTagTxt}>
              {profile?.providerType === 'business' ? '🏢 Business' : '👤 Individual'}
            </Text>
          </View>
        </View>

        {/* Avatar row */}
        <View style={ss.avatarRow}>
          <View style={ss.avatarRing}>
            {userImage ? (
              <Image source={{ uri: userImage }} style={ss.avatar} />
            ) : (
              <LinearGradient colors={[C.inkMid, C.charcoal]} style={ss.avatar}>
                <Text style={ss.avatarInit}>{getInitials(userName)}</Text>
              </LinearGradient>
            )}
            {isVerified && (
              <View style={ss.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color={C.white} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }} />
          {rating > 0 && (
            <View style={ss.ratingPill}>
              <Ionicons name="star" size={13} color={C.amber} />
              <Text style={ss.ratingPillVal}>{rating.toFixed(1)}</Text>
              <Text style={ss.ratingPillCount}>({numRatings})</Text>
            </View>
          )}
        </View>

        {/* Identity */}
        <FadeUp delay={40}>
          <View style={ss.identityBlock}>
            <View style={ss.nameRow}>
              <Text style={ss.nameText}>{userName}</Text>
              {isVerified && (
                <View style={ss.verifiedChip}>
                  <Ionicons name="checkmark-circle" size={13} color={C.verified} />
                  <Text style={ss.verifiedChipTxt}>Verified</Text>
                </View>
              )}
            </View>
            {profile?.tagline ? <Text style={ss.tagline}>"{profile.tagline}"</Text> : null}
            {location ? (
              <View style={ss.locationRow}>
                <Ionicons name="location-outline" size={13} color={C.mist} />
                <Text style={ss.locationTxt}>{location}</Text>
              </View>
            ) : null}
          </View>
        </FadeUp>

        {/* Tab bar */}
        <View style={ss.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.tabBarInner}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[ss.tabBtn, activeTab === tab.id && ss.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={tab.icon} size={14} color={activeTab === tab.id ? C.white : C.mist} />
                <Text style={[ss.tabBtnTxt, activeTab === tab.id && ss.tabBtnTxtActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab content */}
        <View style={ss.tabContent}>
          {activeTab === 'overview' && (
            <View>
              {profile?.bio ? (
                <FadeUp delay={80}>
                  <Section title="About" dot={C.sage}>
                    <Text style={ss.bioText}>{profile.bio}</Text>
                  </Section>
                </FadeUp>
              ) : null}

              <FadeUp delay={130}>
                <View style={ss.statsStrip}>
                  <View style={ss.statItem}>
                    <Text style={ss.statVal}>{rating.toFixed(1)}</Text>
                    <Stars rating={rating} size={13} />
                    <Text style={ss.statLabel}>{numRatings} reviews</Text>
                  </View>
                  <View style={ss.statDivider} />
                  <View style={ss.statItem}>
                    <Text style={ss.statVal}>{score}</Text>
                    <View style={ss.statMeta}>
                      <Ionicons name="trending-up-outline" size={13} color={C.sage} />
                      <Text style={ss.statLabel}>Score</Text>
                    </View>
                  </View>
                  <View style={ss.statDivider} />
                  <View style={ss.statItem}>
                    <Text style={ss.statVal}>{portfolio.length}</Text>
                    <View style={ss.statMeta}>
                      <Ionicons name="images-outline" size={13} color={C.inkMid} />
                      <Text style={ss.statLabel}>Projects</Text>
                    </View>
                  </View>
                </View>
              </FadeUp>

              {services.length > 0 && (
                <FadeUp delay={170}>
                  <Section title="Services" dot={C.inkMid}>
                    {services.slice(0, 3).map((svc, i) => <ServiceCard key={i} svc={svc} index={i} />)}
                  </Section>
                </FadeUp>
              )}

              <FadeUp delay={220}>
                <Section title="Details" dot={C.amber}>
                  <View style={ss.detailsGrid}>
                    {location ? (
                      <View style={ss.detailRow}>
                        <View style={[ss.detailIcon, { backgroundColor: C.sageLight }]}>
                          <Ionicons name="location-outline" size={16} color={C.sage} />
                        </View>
                        <View><Text style={ss.detailLabel}>Location</Text><Text style={ss.detailVal}>{location}</Text></View>
                      </View>
                    ) : null}
                    <View style={ss.detailRow}>
                      <View style={[ss.detailIcon, { backgroundColor: isVerified ? C.verifiedBg : C.coralBg }]}>
                        <Ionicons name={isVerified ? 'checkmark-circle' : 'shield-outline'} size={16} color={isVerified ? C.verified : C.coral} />
                      </View>
                      <View>
                        <Text style={ss.detailLabel}>Verification</Text>
                        <Text style={[ss.detailVal, { color: isVerified ? C.verified : C.coral }]}>{isVerified ? 'Verified' : 'Not Verified'}</Text>
                      </View>
                    </View>
                    <View style={ss.detailRow}>
                      <View style={[ss.detailIcon, { backgroundColor: C.goldBg }]}>
                        <Ionicons name="time-outline" size={16} color={C.gold} />
                      </View>
                      <View>
                        <Text style={ss.detailLabel}>Vetting</Text>
                        <Text style={ss.detailVal}>{profile?.vettingStatus === 'approved' ? 'Background Checked' : (profile?.vettingStatus || 'N/A')}</Text>
                      </View>
                    </View>
                    <View style={ss.detailRow}>
                      <View style={[ss.detailIcon, { backgroundColor: '#EEF0FF' }]}>
                        <Ionicons name="calendar-outline" size={16} color={C.inkMid} />
                      </View>
                      <View>
                        <Text style={ss.detailLabel}>Member Since</Text>
                        <Text style={ss.detailVal}>{moment(profile?.createdAt).format('MMMM YYYY')}</Text>
                      </View>
                    </View>
                  </View>
                </Section>
              </FadeUp>
            </View>
          )}

          {activeTab === 'services' && (
            <FadeUp delay={60}>
              <Section title="All Services" dot={C.inkMid} badge={services.length}>
                {services.length > 0
                  ? services.map((svc, i) => <ServiceCard key={i} svc={svc} index={i} />)
                  : (
                    <View style={ss.emptyState}>
                      <Ionicons name="construct-outline" size={32} color={C.mist} />
                      <Text style={ss.emptyText}>No services listed yet.</Text>
                    </View>
                  )}
              </Section>
            </FadeUp>
          )}

          {activeTab === 'portfolio' && (
            <View>
              {portfolio.length > 0 ? (
                <FadeUp delay={60}>
                  <View style={ss.portfolioGrid}>
                    {portfolio.map((item, i) => (
                      <View key={i} style={ss.portfolioCard}>
                        {(item.files?.[0] || item.images?.[0]) ? (
                          <Image source={{ uri: item.files?.[0] || item.images?.[0] }} style={ss.portfolioImg} />
                        ) : (
                          <View style={ss.portfolioPlaceholder}>
                            <Ionicons name="images-outline" size={20} color={C.mist} />
                          </View>
                        )}
                        <View style={ss.portfolioInfo}>
                          <Text style={ss.portfolioTitle} numberOfLines={1}>{item.title || 'Project'}</Text>
                          {item.completedAt && (
                            <Text style={ss.portfolioDate}>{moment(item.completedAt).format('MMM YYYY')}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </FadeUp>
              ) : (
                <FadeUp delay={60}>
                  <View style={ss.emptyState}>
                    <Ionicons name="images-outline" size={32} color={C.mist} />
                    <Text style={ss.emptyText}>No portfolio projects yet.</Text>
                  </View>
                </FadeUp>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <FadeUp delay={60}>
              <Section title="Ratings & Reviews" dot={C.amber}>
                <View style={ss.ratingHero}>
                  <Text style={ss.ratingBig}>{rating.toFixed(1)}</Text>
                  <Stars rating={rating} size={26} color={C.amber} />
                  <Text style={ss.ratingCount}>{numRatings} review{numRatings !== 1 ? 's' : ''}</Text>
                </View>
                {numRatings === 0 && (
                  <View style={ss.emptyState}>
                    <Ionicons name="star-outline" size={32} color={C.mist} />
                    <Text style={ss.emptyText}>No reviews yet.</Text>
                  </View>
                )}
              </Section>
            </FadeUp>
          )}
        </View>
      </Animated.ScrollView>

      {/* Sign Up to Book bar */}
      <View style={ss.bookBar}>
        <TouchableOpacity
          style={ss.bookBtn}
          onPress={() => navigate('Register')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={[C.inkMid, C.charcoal]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={ss.bookGrad}
          >
            <Ionicons name="calendar-outline" size={20} color={C.white} />
            <Text style={ss.bookTxt}>Sign Up to Book This Tasker</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  floatingTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: C.charcoal },
  backGlass: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center' },
  backSolid: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.hairline, alignItems: 'center', justifyContent: 'center' },

  bannerWrap: { width: '100%', height: BANNER_H, position: 'relative' },
  bannerImg: { width: '100%', height: '100%' },
  bannerVig: { position: 'absolute', bottom: 0, left: 0, right: 0, height: BANNER_H * 0.5 },
  providerTag: {
    position: 'absolute', bottom: 12, left: 14,
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  providerTagTxt: { color: C.white, fontSize: 12, fontWeight: '600' },

  avatarRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    marginTop: -(AVATAR_SZ / 2), paddingHorizontal: 18, paddingBottom: 4, zIndex: 5,
  },
  avatarRing: {
    width: AVATAR_SZ + 6, height: AVATAR_SZ + 6, borderRadius: (AVATAR_SZ + 6) / 2,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 10,
  },
  avatar: { width: AVATAR_SZ, height: AVATAR_SZ, borderRadius: AVATAR_SZ / 2, justifyContent: 'center', alignItems: 'center' },
  avatarInit: { fontSize: 30, fontWeight: '800', color: C.white, letterSpacing: 1 },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.verified, borderWidth: 2, borderColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.goldBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: C.amber + '30', marginBottom: 6,
  },
  ratingPillVal: { fontSize: 14, fontWeight: '800', color: C.charcoal },
  ratingPillCount: { fontSize: 12, color: C.mist },

  identityBlock: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  nameText: { fontSize: 26, fontWeight: '800', color: C.charcoal, letterSpacing: -0.5 },
  verifiedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.verifiedBg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: C.verified + '30',
  },
  verifiedChipTxt: { fontSize: 11, fontWeight: '700', color: C.verified },
  tagline: { fontSize: 14, color: C.textSec, fontStyle: 'italic', lineHeight: 20, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationTxt: { fontSize: 13, color: C.mist },

  tabBar: {
    marginHorizontal: 8, marginTop: 18, marginBottom: 4,
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.hairline,
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  tabBarInner: { paddingVertical: 6, gap: 1, flexDirection: 'row', paddingHorizontal: 4 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  tabBtnActive: { backgroundColor: C.charcoal },
  tabBtnTxt: { fontSize: 13, fontWeight: '600', color: C.mist },
  tabBtnTxtActive: { color: C.white },
  tabContent: { paddingHorizontal: 16, paddingTop: 12 },

  section: {
    backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: C.hairline,
    shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.hairline },
  secDot: { width: 10, height: 10, borderRadius: 5 },
  secTitle: { fontSize: 17, fontWeight: '800', color: C.charcoal, flex: 1, letterSpacing: -0.2 },
  secBadge: { backgroundColor: C.inkMid + '14', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  secBadgeText: { fontSize: 12, fontWeight: '700', color: C.inkMid },

  bioText: { fontSize: 15, color: C.textSec, lineHeight: 23 },

  statsStrip: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: C.hairline,
    shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: C.hairline, marginHorizontal: 8 },
  statVal: { fontSize: 24, fontWeight: '800', color: C.charcoal },
  statLabel: { fontSize: 11, color: C.mist, textAlign: 'center' },
  statMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  svcCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.bg, borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.hairline, borderLeftWidth: 3,
  },
  svcIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  svcBody: { flex: 1, marginRight: 8 },
  svcName: { fontSize: 15, fontWeight: '700', color: C.charcoal, marginBottom: 3 },
  svcDesc: { fontSize: 13, color: C.textSec, lineHeight: 18 },
  svcPricePill: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    alignItems: 'center', minWidth: 70,
  },
  svcPriceAmt: { fontSize: 13, fontWeight: '800' },
  svcPriceType: { fontSize: 11, fontWeight: '600', marginTop: 1 },

  detailsGrid: { gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 11, color: C.mist, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  detailVal: { fontSize: 14, color: C.textPri, fontWeight: '600' },

  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 14 },
  portfolioCard: {
    width: (W - 42) / 2, backgroundColor: C.surface, borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: C.hairline,
  },
  portfolioImg: { width: '100%', height: 110 },
  portfolioPlaceholder: {
    width: '100%', height: 110, backgroundColor: C.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  portfolioInfo: { padding: 10 },
  portfolioTitle: { fontSize: 13, fontWeight: '700', color: C.charcoal },
  portfolioDate: { fontSize: 11, color: C.mist, marginTop: 2 },

  ratingHero: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  ratingBig: { fontSize: 56, fontWeight: '800', color: C.charcoal, letterSpacing: -2 },
  ratingCount: { fontSize: 14, color: C.mist, marginTop: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  emptyText: { fontSize: 14, color: C.mist },

  bookBar: {
    position: 'absolute', bottom: 14, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.hairline,
  },
  bookBtn: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },
  bookGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 10,
  },
  bookTxt: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});