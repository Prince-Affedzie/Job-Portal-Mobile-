import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Dimensions, StatusBar,
  Alert, Modal, Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import moment from 'moment';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTaskerProfile } from '../../api/clientApi';
import { navigate } from '../../services/navigationService';   // already imported

const { width, height } = Dimensions.get('window');
const BANNER_H = 240;
const AVATAR_SIZE = 88;
const AVATAR_OFFSET = AVATAR_SIZE / 2;

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:        '#F7F5F0',
  surface:   '#FFFFFF',
  card:      '#FEFEFE',
  charcoal:  '#1A1A2E',
  inkDark:   '#16213E',
  inkMid:    '#2D3561',
  sage:      '#4A7C6F',
  sageLight: '#EBF4F1',
  amber:     '#E8A838',
  amberBg:   '#FEF6E4',
  coral:     '#E05C5C',
  coralBg:   '#FDECEC',
  mist:      '#8C95A8',
  hairline:  '#E8E4DC',
  textPri:   '#1A1A2E',
  textSec:   '#4F5568',
  textMut:   '#9BA3B5',
  white:     '#FFFFFF',
  gold:      '#D4A844',
  goldBg:    '#FBF3E0',
  verified:  '#34C98A',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PRICE_LABEL = { fixed: 'Fixed', hourly: '/hr', starts_at: 'From', negotiable: 'Negotiable' };

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function getFileType(url = '') {
  if (/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url)) return 'image';
  if (/\.(mp4|mov|avi|mkv|webm)$/i.test(url)) return 'video';
  return 'other';
}

// ─── Animated entrance ───────────────────────────────────────────────────────
function FadeUp({ delay = 0, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(22)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 52, friction: 11, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity: op, transform: [{ translateY: ty }] }]}>{children}</Animated.View>;
}

// ─── Star row ─────────────────────────────────────────────────────────────────
function Stars({ rating, size = 14, color = C.amber }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[...Array(full)].map((_, i)  => <Ionicons key={`f${i}`} name="star"      size={size} color={color} />)}
      {half                          &&  <Ionicons             name="star-half" size={size} color={color} />}
      {[...Array(empty)].map((_, i) => <Ionicons key={`e${i}`} name="star-outline" size={size} color={color} />)}
    </View>
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────
function ServiceCard({ svc, index }) {
  const sc = useRef(new Animated.Value(1)).current;
  const pIn  = () => Animated.spring(sc, { toValue: 0.97, useNativeDriver: true }).start();
  const pOut = () => Animated.spring(sc, { toValue: 1,    useNativeDriver: true }).start();
  const priceLabel = PRICE_LABEL[svc.priceType] || svc.priceType;
  const hasPrice = svc.price > 0 && svc.priceType !== 'negotiable';

  const accentColors = [C.sage, C.inkMid, C.amber, C.coral, '#7C6FE8', '#3B82C4'];
  const accent = accentColors[index % accentColors.length];

  return (
    <FadeUp delay={120 + index * 60}>
      <Animated.View style={{ transform: [{ scale: sc }] }}>
        <TouchableOpacity
          activeOpacity={1} onPressIn={pIn} onPressOut={pOut}
          style={[ss.serviceCard, { borderLeftColor: accent }]}
        >
          <View style={[ss.serviceIconDot, { backgroundColor: accent + '18' }]}>
            <Ionicons name="construct-outline" size={16} color={accent} />
          </View>
          <View style={ss.serviceBody}>
            <Text style={ss.serviceName}>{svc.name}</Text>
            {svc.description
              ? <Text style={ss.serviceDesc} numberOfLines={2}>{svc.description}</Text>
              : null}
          </View>
          <View style={[ss.pricePill, { backgroundColor: accent + '12', borderColor: accent + '30' }]}>
            {hasPrice && <Text style={[ss.priceAmt, { color: accent }]}>GHS {svc.price}</Text>}
            <Text style={[ss.priceType, { color: accent }]}>{priceLabel}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </FadeUp>
  );
}

// ─── Portfolio Grid Thumb ────────────────────────────────────────────────────
function PortfolioThumb({ item, onPress }) {
  const [err, setErr] = useState(false);
  const firstImg = item.images?.[0];
  const extraCount = (item.images?.length || 0) - 1;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={ss.portfolioThumb}>
      {firstImg && !err
        ? <Image source={{ uri: firstImg }} style={ss.portfolioThumbImg} onError={() => setErr(true)} />
        : (
          <View style={ss.portfolioThumbPlaceholder}>
            <Ionicons name="images-outline" size={24} color={C.textMut} />
          </View>
        )
      }
      <LinearGradient
        colors={['transparent', 'rgba(26,26,46,0.85)']}
        style={ss.portfolioThumbOverlay}
      >
        {extraCount > 0 && (
          <View style={ss.portfolioThumbMore}>
            <Text style={ss.portfolioThumbMoreText}>+{extraCount}</Text>
          </View>
        )}
        <Text style={ss.portfolioThumbTitle} numberOfLines={1}>{item.title || 'Project'}</Text>
        {item.completedAt && (
          <Text style={ss.portfolioThumbDate}>{moment(item.completedAt).format('MMM YYYY')}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ApplicantProfileScreen({ route, navigation }) {
  const { taskerId } = route.params;
  const insets = useSafeAreaInsets();

  const [profile,          setProfile]          = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [activeTab,        setActiveTab]        = useState('overview');
  const [selectedItem,     setSelectedItem]     = useState(null);
  const [selectedMediaIdx, setSelectedMediaIdx] = useState(0);
  const [showViewer,       setShowViewer]       = useState(false);
  const videoRef = useRef(null);
  const scrollY  = useRef(new Animated.Value(0)).current;

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTaskerProfile(taskerId);
      if (res.status === 200) {
        setProfile(res.data.data || res.data);
      } else {
        Alert.alert('Error', 'Profile not found.');
        navigation?.goBack();
      }
    } catch {
      Alert.alert('Error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [taskerId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const user       = profile?.userId || {};
  const userName   = profile?.businessName || user.name || 'Tasker';
  const userImage  = user.profileImage || null;
  const bannerImg  = profile?.brandBanner || null;
  const rating     = profile?.rating || 0;
  const numRatings = profile?.numberOfRatings || 0;
  const score      = profile?.score ?? 0;
  const isVerified = profile?.isVerified || false;
  const location   = [profile?.location?.city, profile?.location?.region].filter(Boolean).join(', ');
  const portfolioItems = profile?.workPortfolio || [];
  const services = profile?.servicesOffered || [];

  // ── Header opacity for back-button bg ───────────────────────────────────
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [BANNER_H - 80, BANNER_H - 40],
    outputRange: [0, 1], extrapolate: 'clamp',
  });

  // ── Media viewer ────────────────────────────────────────────────────────
  const openViewer = (item, idx = 0) => {
    setSelectedItem(item);
    setSelectedMediaIdx(idx);
    setShowViewer(true);
  };
  const closeViewer = () => { setShowViewer(false); videoRef.current?.pauseAsync?.(); };
  const navigateMedia = (dir) => {
    if (!selectedItem) return;
    const files = selectedItem.images || [];
    const next = (selectedMediaIdx + dir + files.length) % files.length;
    setSelectedMediaIdx(next);
  };

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'overview',   label: 'Overview',  icon: 'person-outline' },
    { id: 'services',   label: 'Services',  icon: 'construct-outline' },
    { id: 'portfolio',  label: 'Portfolio', icon: 'images-outline' },
    { id: 'reviews',    label: 'Reviews',   icon: 'star-outline' },
  ];

  // ── Book Now action ──────────────────────────────────────────────────────
  const handleBookNow = () => {
    // Navigate to search screen with this tasker pre‑selected
    navigate('Booking', {
          selectedTasker:profile
         
        });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={[ss.safe, { justifyContent: 'center', alignItems: 'center' }]}>
      <StatusBar barStyle="dark-content" />
      <ActivityIndicator size="large" color={C.inkMid} />
      <Text style={{ color: C.textSec, marginTop: 14, fontSize: 14 }}>Loading profile…</Text>
    </SafeAreaView>
  );

  if (!profile) return (
    <SafeAreaView style={[ss.safe, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: C.textSec }}>Profile not found.</Text>
    </SafeAreaView>
  );

  // ─── Tab Content ─────────────────────────────────────────────────────────

  const OverviewTab = () => (
    <View>
      {/* Bio */}
      {profile?.bio ? (
        <FadeUp delay={80}>
          <View style={ss.section}>
            <View style={ss.sectionTitleRow}>
              <View style={[ss.sectionDot, { backgroundColor: C.sage }]} />
              <Text style={ss.sectionTitle}>About</Text>
            </View>
            <Text style={ss.bioText}>{profile.bio}</Text>
          </View>
        </FadeUp>
      ) : null}

      {/* Stats strip */}
      <FadeUp delay={140}>
        <View style={ss.statsStrip}>
          <View style={ss.statStripItem}>
            <Text style={ss.statStripVal}>{rating.toFixed(1)}</Text>
            <Stars rating={rating} size={13} />
            <Text style={ss.statStripLabel}>{numRatings} reviews</Text>
          </View>
          <View style={ss.statStripDivider} />
          <View style={ss.statStripItem}>
            <Text style={ss.statStripVal}>{score}</Text>
            <View style={ss.statStripRow}>
              <Ionicons name="trending-up-outline" size={14} color={C.sage} />
              <Text style={ss.statStripLabel}>Platform score</Text>
            </View>
          </View>
          <View style={ss.statStripDivider} />
          <View style={ss.statStripItem}>
            <Text style={ss.statStripVal}>{portfolioItems.length}</Text>
            <View style={ss.statStripRow}>
              <Ionicons name="images-outline" size={14} color={C.inkMid} />
              <Text style={ss.statStripLabel}>Projects</Text>
            </View>
          </View>
        </View>
      </FadeUp>

      {/* Services preview (top 3) */}
      {services.length > 0 && (
        <FadeUp delay={180}>
          <View style={ss.section}>
            <View style={ss.sectionTitleRow}>
              <View style={[ss.sectionDot, { backgroundColor: C.inkMid }]} />
              <Text style={ss.sectionTitle}>Services</Text>
              {services.length > 3 && (
                <TouchableOpacity onPress={() => setActiveTab('services')} style={ss.seeAllBtn}>
                  <Text style={ss.seeAllText}>See all {services.length}</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.sage} />
                </TouchableOpacity>
              )}
            </View>
            {services.slice(0, 3).map((svc, i) => <ServiceCard key={i} svc={svc} index={i} />)}
          </View>
        </FadeUp>
      )}

      {/* Location & Verification */}
      <FadeUp delay={240}>
        <View style={ss.section}>
          <View style={ss.sectionTitleRow}>
            <View style={[ss.sectionDot, { backgroundColor: C.amber }]} />
            <Text style={ss.sectionTitle}>Details</Text>
          </View>
          <View style={ss.detailsGrid}>
            {location ? (
              <View style={ss.detailRow}>
                <View style={[ss.detailIcon, { backgroundColor: C.sageLight }]}>
                  <Ionicons name="location-outline" size={16} color={C.sage} />
                </View>
                <View>
                  <Text style={ss.detailLabel}>Location</Text>
                  <Text style={ss.detailVal}>{location}</Text>
                </View>
              </View>
            ) : null}

            <View style={ss.detailRow}>
              <View style={[ss.detailIcon, { backgroundColor: isVerified ? '#E8F9F2' : '#F8F0F0' }]}>
                <Ionicons
                  name={isVerified ? 'checkmark-circle' : 'shield-outline'}
                  size={16}
                  color={isVerified ? C.verified : C.coral}
                />
              </View>
              <View>
                <Text style={ss.detailLabel}>Verification</Text>
                <Text style={[ss.detailVal, { color: isVerified ? C.verified : C.coral }]}>
                  {isVerified ? 'Verified Professional' : 'Not Verified'}
                </Text>
              </View>
            </View>

            <View style={ss.detailRow}>
              <View style={[ss.detailIcon, { backgroundColor: C.goldBg }]}>
                <Ionicons name="time-outline" size={16} color={C.gold} />
              </View>
              <View>
                <Text style={ss.detailLabel}>Vetting Status</Text>
                <Text style={ss.detailVal}>
                  {profile?.vettingStatus === 'approved' ? 'Background Checked' : (profile?.vettingStatus || 'N/A')}
                </Text>
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
        </View>
      </FadeUp>
    </View>
  );

  const ServicesTab = () => (
    <FadeUp delay={60}>
      <View style={ss.section}>
        <View style={ss.sectionTitleRow}>
          <View style={[ss.sectionDot, { backgroundColor: C.inkMid }]} />
          <Text style={ss.sectionTitle}>All Services</Text>
          <View style={ss.countBadge}>
            <Text style={ss.countBadgeText}>{services.length}</Text>
          </View>
        </View>
        {services.length > 0
          ? services.map((svc, i) => <ServiceCard key={i} svc={svc} index={i} />)
          : <EmptyState icon="construct-outline" text="No services listed yet." />
        }
      </View>
    </FadeUp>
  );

  const PortfolioTab = () => (
    <View>
      {portfolioItems.length > 0 ? (
        <FadeUp delay={60}>
          <View style={ss.portfolioGrid}>
            {portfolioItems.map((item, i) => (
              <PortfolioThumb
                key={i}
                item={item}
                onPress={() => openViewer(item, 0)}
              />
            ))}
          </View>
        </FadeUp>
      ) : (
        <FadeUp delay={60}>
          <EmptyState icon="images-outline" text="No portfolio projects yet." />
        </FadeUp>
      )}
    </View>
  );

  const ReviewsTab = () => (
    <FadeUp delay={60}>
      <View style={ss.section}>
        <View style={ss.sectionTitleRow}>
          <View style={[ss.sectionDot, { backgroundColor: C.amber }]} />
          <Text style={ss.sectionTitle}>Ratings & Reviews</Text>
        </View>
        <View style={ss.ratingHero}>
          <Text style={ss.ratingBig}>{rating.toFixed(1)}</Text>
          <Stars rating={rating} size={24} color={C.amber} />
          <Text style={ss.ratingCount}>{numRatings} review{numRatings !== 1 ? 's' : ''}</Text>
        </View>
        {numRatings === 0 && <EmptyState icon="star-outline" text="No reviews yet." />}
      </View>
    </FadeUp>
  );

  const EmptyState = ({ icon, text }) => (
    <View style={ss.emptyState}>
      <Ionicons name={icon} size={44} color={C.hairline} />
      <Text style={ss.emptyStateText}>{text}</Text>
    </View>
  );

  return (
    <View style={ss.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Floating back button ────────────────────────────────────────── */}
      <Animated.View style={[ss.floatingHeader, { paddingTop: insets.top + 8, backgroundColor: C.surface, opacity: headerBgOpacity, borderBottomColor: C.hairline, borderBottomWidth: 1 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={ss.backBtnSolid}>
          <Ionicons name="chevron-back" size={20} color={C.charcoal} />
        </TouchableOpacity>
        <Text style={ss.floatingHeaderTitle} numberOfLines={1}>{userName}</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      {/* Transparent back button for top of scroll */}
      <View style={[ss.floatingHeader, { paddingTop: insets.top + 8, backgroundColor: 'transparent', borderBottomWidth: 0, zIndex: 10 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={ss.backBtnGlass}>
          <Ionicons name="chevron-back" size={20} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }}   // extra space for the fixed button
      >
        {/* ── Banner + Avatar ──────────────────────────────────────────── */}
        <View style={ss.bannerWrap}>
          {bannerImg
            ? <Image source={{ uri: bannerImg }} style={ss.bannerImg} resizeMode="cover" />
            : (
              <LinearGradient
                colors={[C.charcoal, C.inkMid, '#2D3A6B']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={ss.bannerImg}
              />
            )
          }
          <LinearGradient
            colors={['transparent', 'rgba(10,10,20,0.55)']}
            style={ss.bannerVignette}
          />
          <View style={ss.providerTag}>
            <Text style={ss.providerTagText}>
              {profile?.providerType === 'business' ? '🏢 Business' : '👤 Individual'}
            </Text>
          </View>
        </View>

        {/* ── Avatar row (overlapping banner) ─────────────────────────── */}
        <View style={ss.avatarRow}>
          <View style={ss.avatarRing}>
            {userImage
              ? <Image source={{ uri: userImage }} style={ss.avatar} />
              : (
                <LinearGradient colors={[C.inkMid, C.charcoal]} style={ss.avatar}>
                  <Text style={ss.avatarInitials}>{getInitials(userName)}</Text>
                </LinearGradient>
              )
            }
            {isVerified && (
              <View style={ss.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color={C.white} />
              </View>
            )}
          </View>

          {/* right side — rating pill */}
          <View style={{ flex: 1 }} />
          {rating > 0 && (
            <View style={ss.ratingPill}>
              <Ionicons name="star" size={13} color={C.amber} />
              <Text style={ss.ratingPillVal}>{rating.toFixed(1)}</Text>
              <Text style={ss.ratingPillCount}>({numRatings})</Text>
            </View>
          )}
        </View>

        {/* ── Name & meta ─────────────────────────────────────────────── */}
        <FadeUp delay={40}>
          <View style={ss.identityBlock}>
            <View style={ss.nameRow}>
              <Text style={ss.nameText}>{userName}</Text>
              {isVerified && (
                <View style={ss.verifiedChip}>
                  <Ionicons name="checkmark-circle" size={13} color={C.verified} />
                  <Text style={ss.verifiedChipText}>Verified</Text>
                </View>
              )}
            </View>
            {profile?.tagline
              ? <Text style={ss.tagline}>"{profile.tagline}"</Text>
              : null
            }
            {location
              ? (
                <View style={ss.locationRow}>
                  <Ionicons name="location-outline" size={13} color={C.mist} />
                  <Text style={ss.locationText}>{location}</Text>
                </View>
              )
              : null
            }
          </View>
        </FadeUp>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <View style={ss.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.tabBarInner}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[ss.tabBtn, activeTab === tab.id && ss.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={activeTab === tab.id ? C.white : C.mist}
                />
                <Text style={[ss.tabBtnText, activeTab === tab.id && ss.tabBtnTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Tab content ─────────────────────────────────────────────── */}
        <View style={ss.tabContent}>
          {activeTab === 'overview'  && <OverviewTab />}
          {activeTab === 'services'  && <ServicesTab />}
          {activeTab === 'portfolio' && <PortfolioTab />}
          {activeTab === 'reviews'   && <ReviewsTab />}
        </View>
      </Animated.ScrollView>

      {/* ── Fixed Book Now button ─────────────────────────────────────── */}
      <View style={ss.bookNowContainer}>
        <TouchableOpacity
          style={ss.bookNowButton}
          onPress={handleBookNow}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={[C.inkMid, C.charcoal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={ss.bookNowGradient}
          >
            <Ionicons name="calendar-outline" size={20} color={C.white} />
            <Text style={ss.bookNowText}>Book This Tasker</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ═══════════════════════════════════════════════════════════════
          MEDIA VIEWER MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showViewer} animationType="fade" transparent={false} onRequestClose={closeViewer}>
        <View style={ss.viewer}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />

          {/* header */}
          <View style={[ss.viewerHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={closeViewer} style={ss.viewerClose}>
              <Ionicons name="close" size={24} color={C.white} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={ss.viewerTitle} numberOfLines={1}>{selectedItem?.title || 'Project'}</Text>
              <Text style={ss.viewerCounter}>
                {selectedMediaIdx + 1} / {selectedItem?.images?.length || 0}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* media */}
          <View style={ss.viewerMediaWrap}>
            {selectedItem?.images?.map((url, i) =>
              i === selectedMediaIdx && (
                getFileType(url) === 'image'
                  ? <Image key={i} source={{ uri: url }} style={ss.viewerMedia} resizeMode="contain" />
                  : <Video key={i} ref={videoRef} source={{ uri: url }} style={ss.viewerMedia}
                      useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay={false} />
              )
            )}

            {/* nav arrows */}
            {selectedMediaIdx > 0 && (
              <TouchableOpacity style={[ss.viewerNav, ss.viewerNavLeft]} onPress={() => navigateMedia(-1)}>
                <Ionicons name="chevron-back" size={28} color={C.white} />
              </TouchableOpacity>
            )}
            {selectedMediaIdx < (selectedItem?.images?.length || 0) - 1 && (
              <TouchableOpacity style={[ss.viewerNav, ss.viewerNavRight]} onPress={() => navigateMedia(1)}>
                <Ionicons name="chevron-forward" size={28} color={C.white} />
              </TouchableOpacity>
            )}
          </View>

          {/* footer */}
          {selectedItem?.description ? (
            <View style={ss.viewerFooter}>
              <Text style={ss.viewerDesc} numberOfLines={3}>{selectedItem.description}</Text>
              {selectedItem.completedAt && (
                <Text style={ss.viewerDate}>{moment(selectedItem.completedAt).format('MMMM YYYY')}</Text>
              )}
            </View>
          ) : null}

          {/* dots */}
          {(selectedItem?.images?.length || 0) > 1 && (
            <View style={ss.viewerDots}>
              {selectedItem.images.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setSelectedMediaIdx(i)}>
                  <View style={[ss.viewerDot, i === selectedMediaIdx && ss.viewerDotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  safe:  { flex: 1, backgroundColor: C.bg },

  // Floating header (appears on scroll)
  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  floatingHeaderTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 16, fontWeight: '700', color: C.charcoal,
  },
  backBtnGlass: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnSolid: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.hairline,
    alignItems: 'center', justifyContent: 'center',
  },

  // Banner
  bannerWrap: {
    width: '100%', height: BANNER_H, position: 'relative',
  },
  bannerImg: {
    width: '100%', height: '100%',
  },
  bannerVignette: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: BANNER_H * 0.5,
  },
  providerTag: {
    position: 'absolute', bottom: 12, left: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  providerTagText: {
    color: C.white, fontSize: 12, fontWeight: '600',
  },

  // Avatar row
  avatarRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    marginTop: -AVATAR_OFFSET,
    paddingHorizontal: 18, paddingBottom: 4,
    zIndex: 5,
  },
  avatarRing: {
    width: AVATAR_SIZE + 6, height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    backgroundColor: C.bg,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 10,
  },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 30, fontWeight: '800', color: C.white, letterSpacing: 1,
  },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.verified,
    borderWidth: 2, borderColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.goldBg, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: C.amber + '30',
    marginBottom: 6,
  },
  ratingPillVal:   { fontSize: 14, fontWeight: '800', color: C.charcoal },
  ratingPillCount: { fontSize: 12, color: C.mist },

  // Identity
  identityBlock: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  nameText:  { fontSize: 26, fontWeight: '800', color: C.charcoal, letterSpacing: -0.5 },
  verifiedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E6FAF2', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: C.verified + '30',
  },
  verifiedChipText: { fontSize: 11, fontWeight: '700', color: C.verified },
  tagline:  {
    fontSize: 14, color: C.textSec, fontStyle: 'italic',
    lineHeight: 20, marginBottom: 8,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, color: C.mist },

  // Tab bar
  tabBar: {
    marginHorizontal: 8, marginTop: 20, marginBottom: 4,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.hairline,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  tabBarInner: {  paddingVertical: 6, gap:1, flexDirection: 'row' },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10,
  },
  tabBtnActive:    { backgroundColor: C.charcoal },
  tabBtnText:      { fontSize: 13, fontWeight: '600', color: C.mist },
  tabBtnTextActive:{ color: C.white },

  // Tab content
  tabContent: { paddingHorizontal: 16, paddingTop: 12 },

  // Section
  section: {
    backgroundColor: C.surface, borderRadius: 18,
    padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: C.hairline,
    shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.charcoal, flex: 1, letterSpacing: -0.2 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: C.sage, fontWeight: '600' },
  countBadge: {
    backgroundColor: C.inkMid + '14', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: C.inkMid },

  // Bio
  bioText: { fontSize: 15, color: C.textSec, lineHeight: 23 },

  // Stats strip
  statsStrip: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 18, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: C.hairline,
    shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  statStripItem:  { flex: 1, alignItems: 'center', gap: 4 },
  statStripDivider: { width: 1, backgroundColor: C.hairline, marginHorizontal: 8 },
  statStripVal:  { fontSize: 24, fontWeight: '800', color: C.charcoal },
  statStripLabel: { fontSize: 11, color: C.mist, textAlign: 'center' },
  statStripRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Service card
  serviceCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.bg, borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.hairline,
    borderLeftWidth: 3,
  },
  serviceIconDot: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  serviceBody: { flex: 1, marginRight: 8 },
  serviceName: { fontSize: 15, fontWeight: '700', color: C.charcoal, marginBottom: 3 },
  serviceDesc: { fontSize: 13, color: C.textSec, lineHeight: 18 },
  pricePill: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 70,
  },
  priceAmt:  { fontSize: 13, fontWeight: '800' },
  priceType: { fontSize: 11, fontWeight: '600', marginTop: 1 },

  // Details grid
  detailsGrid: { gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: { fontSize: 11, color: C.mist, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  detailVal:   { fontSize: 14, color: C.textPri, fontWeight: '600' },

  // Portfolio grid
  portfolioGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingBottom: 14,
  },
  portfolioThumb: {
    width: (width - 42) / 2,
    aspectRatio: 0.85,
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: C.hairline,
    position: 'relative',
  },
  portfolioThumbImg: { width: '100%', height: '100%' },
  portfolioThumbPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.hairline,
  },
  portfolioThumbOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingBottom: 12, paddingTop: 24,
  },
  portfolioThumbMore: {
    position: 'absolute', top: -60, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  portfolioThumbMoreText: { color: C.white, fontSize: 11, fontWeight: '700' },
  portfolioThumbTitle:    { color: C.white, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  portfolioThumbDate:     { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

  // Rating hero
  ratingHero: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  ratingBig:   { fontSize: 56, fontWeight: '800', color: C.charcoal, letterSpacing: -2 },
  ratingCount: { fontSize: 14, color: C.mist, marginTop: 4 },

  // Empty state
  emptyState: {
    alignItems: 'center', paddingVertical: 40, gap: 10,
  },
  emptyStateText: { fontSize: 15, color: C.textMut, textAlign: 'center' },

  // Media viewer
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  viewerClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  viewerTitle: { color: C.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  viewerCounter: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', marginTop: 2 },
  viewerMediaWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  viewerMedia:    { width, height: height * 0.62 },
  viewerNav: {
    position: 'absolute', top: '50%', marginTop: -24,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  viewerNavLeft:  { left: 12 },
  viewerNavRight: { right: 12 },
  viewerFooter: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  viewerDesc: { color: C.white, fontSize: 14, lineHeight: 20 },
  viewerDate: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  viewerDots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingBottom: 24, paddingTop: 12,
  },
  viewerDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  viewerDotActive: {
    width: 18, backgroundColor: C.white,
  },

  // Book Now button
  bookNowContainer: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 12,
    backgroundColor: '#ffff',
  },
  bookNowButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  bookNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  bookNowText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});