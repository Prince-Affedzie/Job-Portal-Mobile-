// screens/guest/GuestBrowseTaskersScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Dimensions,
  StatusBar, TextInput, Animated, FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { navigate } from '../../services/navigationService';
import { searchTaskers } from '../../api/bidApi';
import { useLocationSearch } from '../../hooks/useLocationSearch';
import LocationModal from '../../component/client/LocationSearchModal';

const { width, height } = Dimensions.get('window');

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
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  white:         '#FFFFFF',
};

const formatAddress = (loc) => {
  if (!loc) return null;
  return [loc.suburb, loc.city, loc.region].filter(Boolean).join(', ') || null;
};

const formatRate = (tasker) => {
  if (tasker.hourlyRate) return `₵${tasker.hourlyRate}/hr`;
  if (tasker.primaryService?.price) return `From ₵${tasker.primaryService.price}`;
  return 'Rate varies';
};

// ─── Fade-in animation ────────────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: op, transform: [{ translateY: ty }] }]}>
      {children}
    </Animated.View>
  );
};

// ─── Tasker card (cleaner & more professional) ────────────────────────────────
const TaskerCard = ({ tasker, onBook }) => {
  const displayName = tasker.name || tasker.businessName || 'Tasker';
  const initials = displayName[0]?.toUpperCase() || 'T';
  const services = tasker.servicesOffered || [];
  const primaryService = services[0]?.name || tasker.primaryService?.serviceName || '';
  const locationStr = formatAddress(tasker.location);

  return (
    <View style={s.taskerCard}>
      {/* Top section: avatar + info */}
      <View style={s.cardTop}>
        <View style={s.avatarWrap}>
          {tasker.profileImage ? (
            <Image source={{ uri: tasker.profileImage }} style={s.avatarImg} />
          ) : (
            <View style={s.avatarFallback}>
              <Text style={s.avatarInitial}>{initials}</Text>
            </View>
          )}
          {tasker.isVerified && (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark" size={9} color={C.white} />
            </View>
          )}
        </View>

        <View style={s.cardInfo}>
          {/* Name row */}
          <View style={s.nameRow}>
            <Text style={s.taskerName} numberOfLines={1}>{displayName}</Text>
            {tasker.isPro && (
              <View style={s.proBadge}><Text style={s.proBadgeText}>PRO</Text></View>
            )}
          </View>

          {/* Primary service */}
          {primaryService ? (
            <Text style={s.serviceText} numberOfLines={1}>{primaryService}</Text>
          ) : null}

          {/* Rating + jobs */}
          <View style={s.metaRow}>
            <View style={s.ratingWrap}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={s.ratingText}>
                {tasker.rating?.toFixed(1) || 'New'}
              </Text>
              {tasker.numberOfRatings > 0 && (
                <Text style={s.ratingCount}>({tasker.numberOfRatings})</Text>
              )}
            </View>
            {tasker.completedJobs > 0 && (
              <>
                <View style={s.metaDot} />
                <Text style={s.metaText}>{tasker.completedJobs} jobs done</Text>
              </>
            )}
            {locationStr && (
              <>
                <View style={s.metaDot} />
                <Ionicons name="location-outline" size={11} color={C.textMuted} />
                <Text style={s.metaText} numberOfLines={1}>{locationStr}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Rate badge */}
      <View style={s.rateBar}>
        <Ionicons name="cash-outline" size={14} color={C.green} />
        <Text style={s.rateText}>{formatRate(tasker)}</Text>
      </View>

      {/* Action buttons */}
      <View style={s.cardActions}>
        <TouchableOpacity
          style={s.viewProfileBtn}
          onPress={() => navigate('GuestTaskerProfile', { taskerId: tasker._id })}
          activeOpacity={0.8}
        >
          <Text style={s.viewProfileBtnText}>View Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bookBtn} onPress={onBook} activeOpacity={0.88}>
          <Ionicons name="calendar-outline" size={14} color={C.white} />
          <Text style={s.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Empty states ─────────────────────────────────────────────────────────────
const EmptySearch = () => (
  <View style={s.emptyWrap}>
    <View style={s.emptyIconWrap}>
      <Ionicons name="search-outline" size={36} color={C.primaryMid} />
    </View>
    <Text style={s.emptyTitle}>Find Taskers Near You</Text>
    <Text style={s.emptyDesc}>
      Enter a service you need and your location to discover skilled professionals.
    </Text>
  </View>
);

const NoResults = ({ query }) => (
  <View style={s.emptyWrap}>
    <View style={[s.emptyIconWrap, { backgroundColor: C.goldLight }]}>
      <Ionicons name="person-remove-outline" size={36} color={C.gold} />
    </View>
    <Text style={s.emptyTitle}>No Taskers Found</Text>
    <Text style={s.emptyDesc}>
      No results for "{query}". Try a different service or broader location.
    </Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GuestBrowseTaskersScreen() {
  const [serviceQuery, setServiceQuery] = useState('');
  const [location, setLocation] = useState('');
  const [locationDetails, setLocationDetails] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);

  // Location modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const locationSearch = useLocationSearch();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // ── Location modal animations ──────────────────────────────────────────────
  useEffect(() => {
    if (showLocationModal) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [showLocationModal]);

  // ── Location debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    locationSearch.debouncedSearch(locationSearch.locationQuery);
  }, [locationSearch.locationQuery]);

  // ── Reset search state when inputs cleared ─────────────────────────────────
  useEffect(() => {
    if (!serviceQuery.trim() && !location.trim()) {
      setHasSearched(false);
      setResults([]);
      setError(null);
    }
  }, [serviceQuery, location]);

  // ── Search handler (requires both inputs) ──────────────────────────────────
  const handleSearch = useCallback(async () => {
    const sq = serviceQuery.trim();
    const lq = location.trim();

    if (!sq || !lq) {
      setError('Please enter both a service and your location');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setError(null);
    setResults([]);
    setShowLocationModal(false);

    try {
      const res = await searchTaskers({
        searchQuery: sq,
        address: locationDetails || { suburb: lq, city: lq, region: lq },
      });
      if (res.data?.success) {
        setResults(res.data.data || []);
      } else {
        setResults([]);
      }
    } catch {
      setError('Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [serviceQuery, location, locationDetails]);

  // ── Service input handler ──────────────────────────────────────────────────
  const handleSkillChange = (text) => {
    setServiceQuery(text);
    setError(null);
    if (!text.trim() && !location.trim()) {
      setHasSearched(false);
      setResults([]);
    }
  };

  // ── Location handlers ──────────────────────────────────────────────────────
  const handleLocationFocus = () => setShowLocationModal(true);

  const handleLocationQueryChange = (text) => {
    locationSearch.setLocationQuery(text);
    setError(null);
    if (!text.trim()) {
      setLocation('');
      setLocationDetails(null);
    }
  };

  const handleLocationSelect = (suggestion) => {
    const { suburb, city, town, village, county, state, region } = suggestion.address;
    const addressString = `${suburb || town || village || ''}, ${city || county || ''}, ${state || region || ''}`
      .trim()
      .replace(/^, |, $/g, '');

    setLocation(addressString);
    locationSearch.setLocationQuery(addressString);
    setLocationDetails({
      suburb: suburb || town || village,
      city: city || county,
      region: state || region,
      coordinates: [suggestion.lat, suggestion.lon],
    });
    setShowLocationModal(false);
  };

  const clearAllInputs = () => {
    setServiceQuery('');
    setLocation('');
    locationSearch.clearSearch();
    setLocationDetails(null);
    setResults([]);
    setHasSearched(false);
    setError(null);
    setShowLocationModal(false);
  };

  const handleBookAttempt = () => {
    navigate('Register', { redirectAfter: 'Booking' });
  };

  const isSearchDisabled = !serviceQuery.trim() || !location.trim();

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigate('Guest')} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Find Taskers</Text>
          <Text style={s.headerSub}>Browse without an account</Text>
        </View>
        <TouchableOpacity
          style={s.signInBtn}
          onPress={() => navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={s.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Card ─────────────────────────────────────────────── */}
      <View style={s.searchCard}>
        {/* Service input */}
        <View style={s.searchField}>
          <Ionicons name="construct-outline" size={18} color={C.primaryMid} />
          <TextInput
            style={s.searchFieldInput}
            placeholder="Service needed (e.g. Plumbing)"
            placeholderTextColor={C.textMuted}
            value={serviceQuery}
            onChangeText={handleSkillChange}
            returnKeyType="next"
          />
          {serviceQuery.length > 0 && (
            <TouchableOpacity onPress={() => setServiceQuery('')}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={s.searchDivider} />

        {/* Location input */}
        <View style={s.searchField}>
          <Ionicons name="location-outline" size={18} color={C.green} />
          <TextInput
            style={s.searchFieldInput}
            placeholder="Your location (e.g. Accra)"
            placeholderTextColor={C.textMuted}
            value={location}
            onChangeText={handleLocationQueryChange}
            onFocus={handleLocationFocus}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {location.length > 0 && (
            <TouchableOpacity onPress={() => { setLocation(''); setLocationDetails(null); }}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Error message */}
        {error && !loading && (
          <Text style={s.errorText}>{error}</Text>
        )}

        {/* Action buttons */}
        <View style={s.searchActions}>
          {hasSearched && (
            <TouchableOpacity style={s.clearBtn} onPress={clearAllInputs}>
              <Text style={s.clearBtnText}>Clear</Text>
            </TouchableOpacity>)}
          <TouchableOpacity
            style={[s.searchSubmitBtn, (loading || isSearchDisabled) && { opacity: 0.6 }]}
            onPress={handleSearch}
            disabled={loading || isSearchDisabled}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <>
                <Ionicons name="search" size={17} color={C.white} />
                <Text style={s.searchSubmitText}>Search</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Results ─────────────────────────────────────────────────── */}
      <FlatList
        data={results}
        keyExtractor={(item, idx) => item._id || String(idx)}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          hasSearched && !loading && results.length > 0 ? (
            <FadeIn style={s.resultsHeader}>
              <Text style={s.resultsCount}>
                {results.length} tasker{results.length !== 1 ? 's' : ''} found
              </Text>
              <Text style={s.resultsSubtitle}>
                for "{serviceQuery}" {location ? `near ${location}` : ''}
              </Text>
              <View style={s.nudgeBanner}>
                <Ionicons name="information-circle-outline" size={14} color={C.primaryMid} />
                <Text style={s.nudgeText}>
                  Sign up to book, message, and track taskers.
                </Text>
              </View>
            </FadeIn>
          ) : null
        }
        renderItem={({ item, index }) => (
          <FadeIn delay={index * 50} style={s.cardWrap}>
            <TaskerCard tasker={item} onBook={handleBookAttempt} />
          </FadeIn>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={C.primaryMid} />
              <Text style={s.loadingText}>Finding taskers near you…</Text>
            </View>
          ) : hasSearched ? (
            <NoResults query={serviceQuery || location} />
          ) : (
            <EmptySearch />
          )
        }
        ListFooterComponent={
          hasSearched && results.length > 0 ? (
            <TouchableOpacity style={s.signUpFooter} onPress={() => navigate('Register')} activeOpacity={0.88}>
              <View style={s.signUpFooterInner}>
                <View>
                  <Text style={s.signUpFooterTitle}>Ready to book?</Text>
                  <Text style={s.signUpFooterSub}>Create a free account in 2 minutes.</Text>
                </View>
                <View style={s.signUpFooterBtn}>
                  <Text style={s.signUpFooterBtnText}>Sign Up Free</Text>
                  <Ionicons name="arrow-forward" size={14} color={C.white} />
                </View>
              </View>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* ── Location Modal ──────────────────────────────────────────── */}
      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        locationQuery={locationSearch.locationQuery}
        onLocationQueryChange={handleLocationQueryChange}
        locationSuggestions={locationSearch.locationSuggestions}
        searchingLocations={locationSearch.searchingLocations}
        onLocationSelect={handleLocationSelect}
        slideAnim={slideAnim}
        backdropAnim={backdropAnim}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 2, fontWeight: '500' },
  signInBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.primaryMid, backgroundColor: C.primaryGlow,
  },
  signInBtnText: { fontSize: 13, fontWeight: '700', color: C.primaryMid },

  // Search card
  searchCard: {
    backgroundColor: C.surface,
    marginHorizontal: 16, marginBottom: 14,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
  },
  searchField: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 10, paddingHorizontal: 4,
  },
  searchFieldInput: { flex: 1, fontSize: 15, color: C.textPrimary },
  searchDivider: { height: 1, backgroundColor: C.borderLight, marginHorizontal: 4, marginVertical: 2 },
  errorText: {
    fontSize: 12, color: C.red, fontWeight: '500',
    marginTop: 6, marginHorizontal: 4,
  },
  searchActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  clearBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
  },
  clearBtnText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  searchSubmitBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primaryMid, borderRadius: 12, paddingVertical: 13, gap: 7,
    shadowColor: C.primaryMid, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22, shadowRadius: 8, elevation: 4,
  },
  searchSubmitText: { fontSize: 15, fontWeight: '700', color: C.white },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Results header
  resultsHeader: { marginBottom: 14 },
  resultsCount: { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 2 },
  resultsSubtitle: { fontSize: 13, color: C.textMuted, marginBottom: 10 },
  nudgeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primaryGlow, padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  nudgeText: { flex: 1, fontSize: 12, color: C.primary, fontWeight: '500' },

  // Tasker card (redesigned)
  cardWrap: { marginBottom: 12 },
  taskerCard: {
    backgroundColor: C.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', gap: 14 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.border },
  avatarFallback: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primaryMid, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: C.white },
  verifiedBadge: {
    position: 'absolute', bottom: 1, right: 1,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.green, borderWidth: 2, borderColor: C.white,
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  taskerName: { fontSize: 16, fontWeight: '700', color: C.textPrimary, flex: 1 },
  proBadge: {
    backgroundColor: C.goldLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  proBadgeText: { fontSize: 9, fontWeight: '800', color: '#92400E', letterSpacing: 0.4 },
  serviceText: { fontSize: 13, color: C.primaryMid, fontWeight: '600', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  ratingCount: { fontSize: 11, color: C.textMuted },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.textMuted },
  metaText: { fontSize: 12, color: C.textMuted, flexShrink: 1 },
  rateBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.greenLight, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12, marginTop: 12,
  },
  rateText: { fontSize: 14, fontWeight: '700', color: C.green },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  viewProfileBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
  },
  viewProfileBtnText: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  bookBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, backgroundColor: C.primaryMid, gap: 6,
  },
  bookBtnText: { fontSize: 13, fontWeight: '700', color: C.white },

  // Loading / empty states
  loadingWrap: { alignItems: 'center', paddingTop: 60, gap: 14 },
  loadingText: { fontSize: 14, color: C.textMuted },
  emptyWrap: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 24, gap: 10 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  emptyDesc: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 21 },
  retryBtn: {
    marginTop: 10, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: C.primaryMid, borderRadius: 12,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: C.white },

  // Sign-up footer
  signUpFooter: {
    marginTop: 8, marginBottom: 16,
    backgroundColor: C.primary, borderRadius: 16, overflow: 'hidden',
  },
  signUpFooterInner: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 18,
  },
  signUpFooterTitle: { fontSize: 15, fontWeight: '800', color: C.white, marginBottom: 2 },
  signUpFooterSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  signUpFooterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
  },
  signUpFooterBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },
});