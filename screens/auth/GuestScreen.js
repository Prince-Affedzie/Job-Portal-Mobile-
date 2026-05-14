// screens/GuestScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { navigate } from '../../services/navigationService';
import { getPublicTasks } from '../../api/miniTaskApi';

const { width } = Dimensions.get('window');

// ─── Theme (Pacific Indigo & Warm Gold) ──────────────────────────────────────
const C = {
  bg:            '#F8FAFF',
  surface:       '#FFFFFF',
  border:        '#E4E8EE',
  primary:       '#1E3A6E',
  primaryMid:    '#1A56DB',
  primaryDark:   '#152C4F',
  primaryGlow:   '#EBF5FF',
  gold:          '#D49B3F',
  goldLight:     '#FCF3E1',
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  white:         '#FFFFFF',
  green:         '#0E9F6E',
  greenLight:    '#E3FCEC',
};

// ─── Comprehensive Services ───────────────────────────────────────────────────
const SERVICES = [
  { icon: 'hammer-outline',       label: 'Carpentry'     },
  { icon: 'water-outline',        label: 'Plumbing'      },
  { icon: 'flash-outline',        label: 'Electrical'    },
  { icon: 'brush-outline',        label: 'Painting'      },
  { icon: 'leaf-outline',         label: 'Gardening'     },
  { icon: 'sparkles-outline',     label: 'Cleaning'      },
  { icon: 'construct-outline',    label: 'Repairs'       },
  { icon: 'desktop-outline',      label: 'Tech Help'     },
  { icon: 'calendar-outline',     label: 'Event Planning' },
  { icon: 'color-palette-outline',label: 'Graphic Design' },
  { icon: 'megaphone-outline',    label: 'Digital Marketing' },
  { icon: 'camera-outline',       label: 'Photography'   },
  { icon: 'restaurant-outline',   label: 'Catering'      },
  { icon: 'shirt-outline',        label: 'Fashion Design' },
  { icon: 'school-outline',       label: 'Tutoring'      },
  { icon: 'cut-outline',          label: 'Makeup'        },
];

// ─── How It Works ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    title: 'Search',
    desc: 'Describe what you need and drop your location.',
    icon: 'search-outline',
    color: C.primaryMid,
    bg: C.primaryGlow,
  },
  {
    num: '02',
    title: 'Choose',
    desc: 'Browse vetted taskers, compare ratings & rates.',
    icon: 'people-outline',
    color: C.green,
    bg: C.greenLight,
  },
  {
    num: '03',
    title: 'Book',
    desc: 'Confirm your booking with secure payment.',
    icon: 'calendar-outline',
    color: C.gold,
    bg: C.goldLight,
  },
];

// ─── Stats Highlight ──────────────────────────────────────────────────────────
const TRUST_STATS = [
  { value: '2,400+', label: 'Verified Taskers' },
  { value: '98%',    label: 'Satisfaction Rate' },
  { value: '12K+',   label: 'Jobs Completed'    },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: 'Abena K.',
    role: 'Homeowner, Accra',
    text: 'Found a reliable plumber within 20 minutes. The booking process was seamless!',
    rating: 5,
    initials: 'AK',
    color: '#1A56DB',
  },
  {
    name: 'Kofi M.',
    role: 'Tasker, Kumasi',
    text: "I've tripled my monthly income since joining Workaflow. The platform just works.",
    rating: 5,
    initials: 'KM',
    color: '#0E9F6E',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatAddress = (address) => {
  if (!address) return 'Remote';
  return [address.suburb, address.city, address.region]
    .filter(Boolean)
    .join(', ') || 'Remote';
};

const Stars = ({ count = 5 }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {Array.from({ length: count }).map((_, i) => (
      <Ionicons key={i} name="star" size={12} color="#F59E0B" />
    ))}
  </View>
);

// ─── Fade‑in animation wrapper ────────────────────────────────────────────────
const FadeInView = ({ children, delay = 0, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 500, delay, useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 500, delay, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GuestScreen() {
  const [publicTasks, setPublicTasks] = useState([]);
  const [loadingGigs, setLoadingGigs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPublicTasks();
        if (res.status === 200) setPublicTasks(res.data.slice(0, 5));
      } catch {
        // silently fail
      } finally {
        setLoadingGigs(false);
      }
    })();
  }, []);

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      // For guest, navigate to register with a hint
      navigate('Register');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HERO (Matches the provided HeroSection style) ── */}
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={['#1A1F3B', '#1A2744', '#243458']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Decorative blobs */}
            <View style={styles.decorationOrb1} />
            <View style={styles.decorationOrb2} />

            <FadeInView delay={0} style={styles.heroContent}>
              {/* Headline */}
              <Text style={styles.heroHeadline}>
                Get Any Task{'\n'}
                <Text style={styles.heroHeadlineAccent}>Done Today.</Text>
              </Text>

              <Text style={styles.heroSub}>
                Book skilled professionals for any job — from plumbing to painting.
                Trusted by thousands across Ghana.
              </Text>

              {/* Trust pill 
              <View style={styles.trustPill}>
                <View style={styles.trustAvatarStack}>
                  {['#1E3A6E', '#D49B3F', '#0E9F6E'].map((bg, i) => (
                    <View
                      key={i}
                      style={[styles.trustAvatar, { backgroundColor: bg, marginLeft: i > 0 ? -10 : 0 }]}
                    >
                      <Ionicons name="person" size={10} color="#fff" />
                    </View>
                  ))}
                </View>
                <Text style={styles.trustPillText}>
                  <Text style={{ fontWeight: '700', color: C.primary }}>2,400+</Text>
                  {' '}vetted taskers ready
                </Text>
              </View>
              */}

              {/* Search bar (like the original HeroSection)
              <View style={styles.searchContainer}>
                <View style={[
                  styles.searchCard,
                  isSearchFocused && styles.searchCardFocused
                ]}>
                  <Ionicons name="search" size={18} color={isSearchFocused ? C.primaryMid : '#8B9CB1'} style={styles.searchIcon} />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Search for a service..."
                    placeholderTextColor="#64748B"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                  <View style={styles.searchActions}>
                    {searchQuery && (
                      <>
                        <TouchableOpacity onPress={handleClearSearch} style={styles.searchActionButton}>
                          <Ionicons name="close-circle" size={20} color="#8B9CB1" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchSubmitButton}>
                          <LinearGradient colors={[C.primaryMid, C.primary]} style={styles.searchSubmitGradient}>
                            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                          </LinearGradient>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View> */}

              {/* CTA buttons */}
              <View style={styles.heroCtas}>
                <TouchableOpacity
                  style={styles.heroCtaPrimary}
                  onPress={() => navigate('Register')}
                  activeOpacity={0.88}
                >
                 
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.heroCtaSecondary}
                  onPress={() => navigate('Login')}
                  activeOpacity={0.75}
                >
                  <Text style={styles.heroCtaSecondaryText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </FadeInView>
          </LinearGradient>
        </View>

        {/* ── STATS STRIP ──────────────────────────────────────────────── */}
        <FadeInView delay={100}>
          <View style={styles.statsStrip}>
            {TRUST_STATS.map((s, i) => (
              <React.Fragment key={s.label}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
                {i < TRUST_STATS.length - 1 && (
                  <View style={styles.statDivider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </FadeInView>

        {/* ── SERVICES GRID (now includes professional services) ──────── */}
        <FadeInView delay={150} style={styles.section}>
          <Text style={styles.sectionLabel}>WHAT WE OFFER</Text>
          <Text style={styles.sectionHeading}>Any Service,{'\n'}One Platform</Text>
          <View style={styles.servicesGrid}>
            {SERVICES.map((svc) => (
              <TouchableOpacity
                key={svc.label}
                style={styles.serviceChip}
                onPress={() => navigate('Register')}
                activeOpacity={0.75}
              >
                <View style={styles.serviceChipIcon}>
                  <Ionicons name={svc.icon} size={20} color={C.primaryMid} />
                </View>
                <Text style={styles.serviceChipLabel}>{svc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.moreServices}
            onPress={() => navigate('Register')}
          >
            <Text style={styles.moreServicesText}>+ Many more services</Text>
            <Ionicons name="chevron-forward" size={14} color={C.primaryMid} />
          </TouchableOpacity>
        </FadeInView>

        {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
        <FadeInView delay={200} style={styles.section}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <Text style={styles.sectionHeading}>Book in Under{'\n'}3 Minutes</Text>
          {STEPS.map((step, i) => (
            <View key={step.num} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View style={[styles.stepIconWrap, { backgroundColor: step.bg }]}>
                  <Ionicons name={step.icon} size={22} color={step.color} />
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepConnector} />}
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepNumRow}>
                  <Text style={[styles.stepNum, { color: step.color }]}>{step.num}</Text>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                </View>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </FadeInView>

        {/* ── LIVE GIGS ────────────────────────────────────────────────── */}
        <FadeInView delay={250} style={styles.section}>
          <Text style={styles.sectionLabel}>LIVE OPPORTUNITIES</Text>
          <Text style={styles.sectionHeading}>Gigs Posted{'\n'}Right Now</Text>

          {loadingGigs ? (
            <View style={styles.gigsLoading}>
              <ActivityIndicator size="small" color={C.primaryMid} />
              <Text style={styles.gigsLoadingText}>Fetching live gigs…</Text>
            </View>
          ) : publicTasks.length > 0 ? (
            <>
              {publicTasks.map((task, idx) => (
                <View key={task._id} style={styles.gigCard}>
                  <View style={[styles.gigAccent, { backgroundColor: idx % 2 === 0 ? C.primaryMid : C.gold }]} />
                  <View style={styles.gigCardInner}>
                    <View style={styles.gigCardTop}>
                      <View style={styles.gigClientRow}>
                        <View style={[styles.gigAvatar, { backgroundColor: idx % 2 === 0 ? C.primary : C.gold }]}>
                          <Text style={styles.gigAvatarText}>
                            {task.employer?.name?.charAt(0)?.toUpperCase() || 'C'}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.gigClientName}>{"Anonymous user"}</Text>
                          <Text style={styles.gigPostedTime}>
                            {task.deadline
                              ? new Date(task.deadline).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })
                              : 'Flexible'}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.gigBudget, { backgroundColor: C.greenLight }]}>
                        <Text style={[styles.gigBudgetText, { color: C.green }]}>₵{task.budget}</Text>
                      </View>
                    </View>
                    <Text style={styles.gigTitle} numberOfLines={2}>{task.title}</Text>
                    <Text style={styles.gigDesc} numberOfLines={2}>{task.description}</Text>
                    <View style={styles.gigFooter}>
                      <View style={styles.gigLocationRow}>
                        <Ionicons name="location-outline" size={12} color={C.textSecondary} />
                        <Text style={styles.gigLocation} numberOfLines={1}>{formatAddress(task.address)}</Text>
                      </View>
                      {task.category && (
                        <View style={styles.gigCategoryPill}>
                          <Text style={styles.gigCategoryText}>{task.category}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.viewAllGigs} onPress={() => navigate('Register')} activeOpacity={0.8}>
                <Text style={styles.viewAllGigsText}>Sign Up to See All Gigs</Text>
                <Ionicons name="arrow-forward" size={15} color={C.primaryMid} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noGigs}>
              <Ionicons name="briefcase-outline" size={36} color={C.textMuted} />
              <Text style={styles.noGigsText}>No public gigs right now.{'\n'}Check back soon!</Text>
            </View>
          )}
        </FadeInView>

        {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
        <FadeInView delay={300} style={styles.section}>
          <Text style={styles.sectionLabel}>WHAT PEOPLE SAY</Text>
          <Text style={styles.sectionHeading}>Loved by Clients{'\n'}& Taskers Alike</Text>
          {TESTIMONIALS.map((t) => (
            <View key={t.name} style={styles.testimonialCard}>
              <Stars count={t.rating} />
              <Text style={styles.testimonialText}>"{t.text}"</Text>
              <View style={styles.testimonialAuthor}>
                <View style={[styles.testimonialAvatar, { backgroundColor: t.color }]}>
                  <Text style={styles.testimonialInitials}>{t.initials}</Text>
                </View>
                <View>
                  <Text style={styles.testimonialName}>{t.name}</Text>
                  <Text style={styles.testimonialRole}>{t.role}</Text>
                </View>
              </View>
            </View>
          ))}
        </FadeInView>

        {/* ── FOR TASKERS ──────────────────────────────────────────────── */}
        <FadeInView delay={350} style={styles.section}>
          <View style={styles.taskerBanner}>
            <LinearGradient
              colors={[C.primary, '#1A3A7A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.taskerBannerGradient}
            >
              <View style={styles.bannerCircle} />
              <View style={styles.taskerBannerContent}>
                <View style={styles.taskerBannerBadge}>
                  <Text style={styles.taskerBannerBadgeText}>FOR PROFESSIONALS</Text>
                </View>
                <Text style={styles.taskerBannerHeading}>
                  Turn Your Skills{'\n'}Into Income
                </Text>
                <Text style={styles.taskerBannerSub}>
                  Join 2,400+ taskers earning on their own schedule.
                  Set your rates, choose your clients.
                </Text>
                <View style={styles.taskerPerks}>
                  {['Set your own rates', 'Get paid securely', 'Build your reputation'].map((perk) => (
                    <View key={perk} style={styles.taskerPerkRow}>
                      <View style={styles.taskerPerkCheck}>
                        <Ionicons name="checkmark" size={12} color={C.primary} />
                      </View>
                      <Text style={styles.taskerPerkText}>{perk}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.taskerBannerBtn}
                  onPress={() => navigate('Register')}
                  activeOpacity={0.88}
                >
                  <Text style={styles.taskerBannerBtnText}>Join as a Tasker</Text>
                  <Ionicons name="arrow-forward" size={15} color={C.primary} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </FadeInView>

        {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
        <FadeInView delay={400} style={styles.finalCta}>
          <Text style={styles.finalCtaHeading}>Ready to get started?</Text>
          <Text style={styles.finalCtaSub}>
            Join thousands of Ghanaians who get things done with Workaflow.
          </Text>
          <TouchableOpacity
            style={styles.finalCtaBtn}
            onPress={() => navigate('Register')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[C.primary, C.primaryMid]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.finalCtaGradient}
            >
              <Text style={styles.finalCtaBtnText}>Create Free Account</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signInLink}
            onPress={() => navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.signInLinkText}>Already have an account? </Text>
            <Text style={[styles.signInLinkText, { color: C.primaryMid, fontWeight: '700' }]}>Sign In</Text>
          </TouchableOpacity>
          
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { paddingBottom: 48 },

  // Hero wrapper and card (matching HeroSection look)
  heroWrapper: {
    marginHorizontal: 5,
    marginTop: 12,
    borderTopLeftRadius:12,
    borderTopRightRadius:12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  decorationOrb1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    zIndex: 1,
  },
  decorationOrb2: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    zIndex: 1,
  },
  heroContent: {
    padding: 22,
    position: 'relative',
    zIndex: 2,
  },
  heroHeadline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 8,
  },
  heroHeadlineAccent: {
    color: C.primaryMid,
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: 18,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  trustAvatarStack: { flexDirection: 'row', alignItems: 'center' },
  trustAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustPillText: { fontSize: 13, color: C.textSecondary },

  // Search bar inside hero
  searchContainer: {
    marginBottom: 16,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchCardFocused: {
    borderColor: C.primaryMid,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    padding: 0,
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchActionButton: {
    padding: 4,
  },
  searchSubmitButton: {
    padding: 2,
  },
  searchSubmitGradient: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroCtas: { gap: 10 },
  heroCtaPrimary: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  heroCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  heroCtaPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  heroCtaSecondary: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  heroCtaSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    marginHorizontal: 22,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 10,
    marginTop: 24,
    marginBottom: 36,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 7,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Generic section
  section: { paddingHorizontal: 22, marginBottom: 40 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primaryMid,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 34,
    marginBottom: 20,
  },

  // Services grid (now accommodates more items)
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceChip: {
    width: (width - 44 - 30) / 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: C.border,
    gap: 7,
  },
  serviceChipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSecondary,
    textAlign: 'center',
  },
  moreServices: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 14,
  },
  moreServicesText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primaryMid,
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  stepLeft: { alignItems: 'center', width: 48 },
  stepIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepConnector: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: C.border,
    marginVertical: 4,
  },
  stepContent: { flex: 1, paddingBottom: 20, paddingTop: 4 },
  stepNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepNum: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  stepTitle: { fontSize: 17, fontWeight: '700', color: C.textPrimary },
  stepDesc: { fontSize: 14, color: C.textSecondary, lineHeight: 20 },

  // Gig cards
  gigsLoading: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  gigsLoadingText: { fontSize: 14, color: C.textMuted },
  gigCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
  },
  gigAccent: { width: 4, borderRadius: 2 },
  gigCardInner: { flex: 1, padding: 14 },
  gigCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gigClientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  gigAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gigAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  gigClientName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  gigPostedTime: { fontSize: 11, color: C.textMuted },
  gigBudget: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
  },
  gigBudgetText: { fontSize: 13, fontWeight: '700' },
  gigTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 5, lineHeight: 22 },
  gigDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 19, marginBottom: 10 },
  gigFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  gigLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  gigLocation: { fontSize: 12, color: C.textSecondary, fontWeight: '500', flex: 1 },
  gigCategoryPill: {
    backgroundColor: C.primaryGlow,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  gigCategoryText: { fontSize: 11, fontWeight: '600', color: C.primaryMid },
  noGigs: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  noGigsText: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 21 },
  viewAllGigs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.primaryGlow,
    backgroundColor: C.primaryGlow,
  },
  viewAllGigsText: { fontSize: 14, fontWeight: '700', color: C.primaryMid },

  // Testimonials
  testimonialCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  testimonialText: {
    fontSize: 15,
    color: C.textPrimary,
    lineHeight: 23,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  testimonialAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  testimonialAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialInitials: { color: '#fff', fontWeight: '700', fontSize: 13 },
  testimonialName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  testimonialRole: { fontSize: 12, color: C.textMuted },

  // Tasker banner
  taskerBanner: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  taskerBannerGradient: { padding: 24, overflow: 'hidden', position: 'relative' },
  bannerCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  taskerBannerContent: { position: 'relative', zIndex: 1 },
  taskerBannerBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  taskerBannerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.2,
  },
  taskerBannerHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 10,
  },
  taskerBannerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 21,
    marginBottom: 18,
  },
  taskerPerks: { gap: 8, marginBottom: 22 },
  taskerPerkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskerPerkCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskerPerkText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  taskerBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
  },
  taskerBannerBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
  },

  // Final CTA
  finalCta: {
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  finalCtaHeading: {
    fontSize: 26,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  finalCtaSub: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  finalCtaBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
  },
  finalCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 8,
  },
  finalCtaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  signInLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  signInLinkText: { fontSize: 14, color: C.textSecondary, fontWeight: '500' },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: C.textMuted,
    marginTop: 20,
  },
});