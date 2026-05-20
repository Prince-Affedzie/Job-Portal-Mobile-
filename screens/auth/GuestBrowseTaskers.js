// screens/guest/GuestBrowseTaskersScreen.js
//
// Apple Guideline 5.1.1(v) compliant — fully functional without login.
// Registration is only prompted when attempting to book.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Dimensions,
  StatusBar, TextInput, Animated, FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { navigate } from '../../services/navigationService';
import { searchTaskers } from '../../api/bidApi';
import { useLocationSearch } from '../../hooks/useLocationSearch';
import LocationModal from '../../component/client/LocationSearchModal';

const { width, height } = Dimensions.get('window');

const C = {
  bg:            '#F8FAFF',
  surface:       '#FFFFFF',
  border:        '#E8EDF5',
  borderLight:   '#F0F4FA',
  primary:       '#1E3A6E',
  primaryMid:    '#1A56DB',
  primaryGlow:   '#EBF5FF',
  primaryDark:   '#152C4F',
  gold:          '#D49B3F',
  goldLight:     '#FDF6E7',
  green:         '#0E9F6E',
  greenLight:    '#EDFAF5',
  red:           '#DC2626',
  textPrimary:   '#0A1628',
  textSecondary: '#4A5568',
  textMuted:     '#9AA5B4',
  white:         '#FFFFFF',
};

const POPULAR_SERVICES = [
  { icon: 'water-outline',         label: 'Plumbing',    color: '#3B82F6' },
  { icon: 'flash-outline',         label: 'Electrical',  color: '#F59E0B' },
  { icon: 'hammer-outline',        label: 'Carpentry',   color: '#8B5CF6' },
  { icon: 'brush-outline',         label: 'Painting',    color: '#EC4899' },
  { icon: 'sparkles-outline',      label: 'Cleaning',    color: '#06B6D4' },
  { icon: 'desktop-outline',       label: 'Tech Help',   color: '#6366F1' },
  { icon: 'color-palette-outline', label: 'Design',      color: '#F43F5E' },
  { icon: 'camera-outline',        label: 'Photography', color: '#10B981' },
  { icon: 'cut-outline',           label: 'Beauty',      color: '#A855F7' },
  { icon: 'restaurant-outline',    label: 'Catering',    color: '#EF4444' },
  { icon: 'leaf-outline',          label: 'Gardening',   color: '#22C55E' },
  { icon: 'calendar-outline',      label: 'Events',      color: '#F97316' },
];

const formatAddress = (loc) => {
  if (!loc) return null;
  return [loc.suburb, loc.city, loc.region].filter(Boolean).join(', ') || null;
};

const formatRate = (tasker) => {
  if (tasker.hourlyRate)             return `GHS ${tasker.hourlyRate}/hr`;
  if (tasker.primaryService?.price)  return `From GHS ${tasker.primaryService.price}`;
  return 'Negotiable';
};

// Fade + spring entrance animation
const FadeIn = ({ children, delay = 0, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, damping: 20, stiffness: 160, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: op, transform: [{ translateY: ty }] }]}>
      {children}
    </Animated.View>
  );
};

const StarRating = ({ rating, count }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
    {[1,2,3,4,5].map((i) => (
      <Ionicons
        key={i}
        name={i <= Math.round(rating || 0) ? 'star' : 'star-outline'}
        size={10}
        color="#F59E0B"
      />
    ))}
    <Text style={{ fontSize: 12, fontWeight: '700', color: C.textPrimary, marginLeft: 3 }}>
      {rating?.toFixed(1) || 'New'}
    </Text>
    {count > 0 && (
      <Text style={{ fontSize: 11, color: C.textMuted }}>({count})</Text>
    )}
  </View>
);

// Tasker card
const AVATAR_COLORS = [C.primaryMid, '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2'];

const TaskerCard = ({ tasker, onBook, index }) => {
  const displayName = tasker.name || tasker.businessName || 'Tasker';
  const initial     = displayName[0]?.toUpperCase() || 'T';
  const primarySvc  = tasker.servicesOffered?.[0]?.name || tasker.primaryService?.serviceName || '';
  const locationStr = formatAddress(tasker.location);
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <View style={card.wrap}>
      <View style={[card.accent, { backgroundColor: avatarColor }]} />
      <View style={card.body}>
        {/* Top row */}
        <View style={card.topRow}>
          <View style={card.avatarWrap}>
            {tasker.profileImage ? (
              <Image source={{ uri: tasker.profileImage }} style={card.avatarImg} />
            ) : (
              <View style={[card.avatarFallback, { backgroundColor: avatarColor }]}>
                <Text style={card.avatarInitial}>{initial}</Text>
              </View>
            )}
            {tasker.isVerified && (
              <View style={card.verifiedBadge}>
                <Ionicons name="checkmark" size={8} color={C.white} />
              </View>
            )}
            {tasker.isOnline && <View style={card.onlineDot} />}
          </View>

          <View style={card.infoCol}>
            <View style={card.nameRow}>
              <Text style={card.name} numberOfLines={1}>{displayName}</Text>
              {tasker.isPro && (
                <View style={card.proBadge}>
                  <Text style={card.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            {primarySvc ? <Text style={card.serviceLabel} numberOfLines={1}>{primarySvc}</Text> : null}
            <StarRating rating={tasker.rating} count={tasker.numberOfRatings} />
          </View>

          <View style={card.ratePill}>
            <Text style={card.rateText}>{formatRate(tasker)}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={card.statsRow}>
          {tasker.completedJobs > 0 && (
            <View style={card.statChip}>
              <Ionicons name="checkmark-done-outline" size={11} color={C.green} />
              <Text style={card.statText}>{tasker.completedJobs} jobs</Text>
            </View>
          )}
          {tasker.responseRate && (
            <View style={card.statChip}>
              <Ionicons name="chatbubble-outline" size={11} color={C.primaryMid} />
              <Text style={card.statText}>{tasker.responseRate}% response</Text>
            </View>
          )}
          {locationStr && (
            <View style={card.statChip}>
              <Ionicons name="location-outline" size={11} color={C.textMuted} />
              <Text style={[card.statText, { flexShrink: 1 }]} numberOfLines={1}>{locationStr}</Text>
            </View>
          )}
        </View>

        {tasker.Bio ? (
          <Text style={card.bio} numberOfLines={2}>{tasker.Bio}</Text>
        ) : null}

        <View style={card.divider} />

        {/* Actions */}
        <View style={card.actions}>
          <TouchableOpacity
            style={card.profileBtn}
            onPress={() => navigate('GuestTaskerProfile', { taskerId: tasker._id })}
            activeOpacity={0.75}
          >
            <Ionicons name="person-outline" size={13} color={C.primary} />
            <Text style={card.profileBtnText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={card.bookBtn} onPress={onBook} activeOpacity={0.88}>
            <LinearGradient
              colors={[C.primaryMid, C.primary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={card.bookBtnGrad}
            >
              <Ionicons name="calendar-outline" size={13} color={C.white} />
              <Text style={card.bookBtnText}>Book Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 18, marginBottom: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(10,22,40,0.09)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1,
    shadowRadius: 12, elevation: 4,
  },
  accent: { width: 4 },
  body:   { flex: 1, padding: 16 },
  topRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatarImg:  { width: 54, height: 54, borderRadius: 27, backgroundColor: C.border },
  avatarFallback: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarInitial:  { fontSize: 22, fontWeight: '800', color: C.white },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.green, borderWidth: 2, borderColor: C.white,
    alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', top: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.green, borderWidth: 2, borderColor: C.white,
  },
  infoCol:      { flex: 1, gap: 4 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name:         { fontSize: 15, fontWeight: '800', color: C.textPrimary, flex: 1 },
  proBadge:     { backgroundColor: C.goldLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  proBadgeText: { fontSize: 9, fontWeight: '800', color: '#92400E', letterSpacing: 0.5 },
  serviceLabel: { fontSize: 12, color: C.primaryMid, fontWeight: '600' },
  ratePill: {
    backgroundColor: C.greenLight, paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 9, alignSelf: 'flex-start', flexShrink: 0,
  },
  rateText: { fontSize: 11, fontWeight: '800', color: C.green },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: C.borderLight,
  },
  statText: { fontSize: 11, color: C.textSecondary, fontWeight: '500' },
  bio:     { fontSize: 13, color: C.textSecondary, lineHeight: 19, marginBottom: 10 },
  divider: { height: 1, backgroundColor: C.borderLight, marginBottom: 12 },
  actions:    { flexDirection: 'row', gap: 8 },
  profileBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border,
  },
  profileBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },
  bookBtn:        { flex: 1.3, borderRadius: 10, overflow: 'hidden' },
  bookBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  bookBtnText: { fontSize: 13, fontWeight: '700', color: C.white },
});

// Empty / no-results states
const EmptySearch = ({ onServicePress }) => (
  <FadeIn style={{ paddingTop: 8 }}>
    <View style={es.hintCard}>
      <Ionicons name="sparkles" size={18} color={C.gold} />
      <Text style={es.hintText}>
        Enter a service and your location above to discover skilled taskers in your area.
      </Text>
    </View>
    <Text style={es.sectionLabel}>POPULAR SERVICES</Text>
    <View style={es.grid}>
      {POPULAR_SERVICES.map((svc) => (
        <TouchableOpacity
          key={svc.label} style={es.chip}
          onPress={() => onServicePress(svc.label)} activeOpacity={0.75}
        >
          <View style={[es.chipIcon, { backgroundColor: svc.color + '1A' }]}>
            <Ionicons name={svc.icon} size={18} color={svc.color} />
          </View>
          <Text style={es.chipLabel}>{svc.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </FadeIn>
);

const NoResults = ({ query }) => (
  <FadeIn style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, gap: 12 }}>
    <View style={[es.icon, { backgroundColor: C.goldLight }]}>
      <Ionicons name="search-outline" size={34} color={C.gold} />
    </View>
    <Text style={{ fontSize: 19, fontWeight: '800', color: C.textPrimary }}>No Taskers Found</Text>
    <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 21 }}>
      No results for "{query}". Try a broader location or a different service.
    </Text>
  </FadeIn>
);

const es = StyleSheet.create({
  hintCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 11,
    backgroundColor: C.goldLight, borderRadius: 14, padding: 14, marginBottom: 22,
    borderWidth: 1, borderColor: '#F0D9A8',
  },
  hintText:     { flex: 1, fontSize: 14, color: '#7C5C1A', lineHeight: 21, fontWeight: '500' },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: {
    width: (width - 32 - 36) / 3,
    alignItems: 'center', gap: 7,
    backgroundColor: C.surface, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 6,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(10,22,40,0.06)',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1,
    shadowRadius: 6, elevation: 2,
  },
  chipIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, textAlign: 'center' },
  icon:      { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

// Main screen
export default function GuestBrowseTaskersScreen() {
  const [serviceQuery,    setServiceQuery]    = useState('');
  const [location,        setLocation]        = useState('');
  const [locationDetails, setLocationDetails] = useState(null);
  const [results,         setResults]         = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [hasSearched,     setHasSearched]     = useState(false);
  const [error,           setError]           = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const locationSearch = useLocationSearch();
  const slideAnim      = useRef(new Animated.Value(height)).current;
  const backdropAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: showLocationModal ? 1 : 0,
        duration: showLocationModal ? 300 : 250, useNativeDriver: true,
      }),
      showLocationModal
        ? Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 200, useNativeDriver: true })
        : Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [showLocationModal]);

  useEffect(() => {
    locationSearch.debouncedSearch(locationSearch.locationQuery);
  }, [locationSearch.locationQuery]);

  useEffect(() => {
    if (!serviceQuery.trim() && !location.trim()) {
      setHasSearched(false); setResults([]); setError(null);
    }
  }, [serviceQuery, location]);

  const handleSearch = useCallback(async (overrideService) => {
    const sq = (overrideService || serviceQuery).trim();
    const lq = location.trim();
    if (!sq || !lq) { setError(!sq ? 'Please enter a service' : 'Please enter your location'); return; }

    setLoading(true); setHasSearched(true); setError(null); setResults([]); setShowLocationModal(false);
    try {
      const res = await searchTaskers({
        searchQuery: sq,
        address: locationDetails || { suburb: lq, city: lq, region: lq },
      });
      setResults(res.data?.success ? (res.data.data || []) : []);
    } catch { setError('Something went wrong. Please check your connection.'); }
    finally { setLoading(false); }
  }, [serviceQuery, location, locationDetails]);

  const handleServiceTap = (label) => {
    setServiceQuery(label); setError(null);
    if (location.trim()) setTimeout(() => handleSearch(label), 50);
  };

  const handleLocationQueryChange = (text) => {
    locationSearch.setLocationQuery(text); setError(null);
    if (!text.trim()) { setLocation(''); setLocationDetails(null); }
  };

  const handleLocationSelect = (suggestion) => {
    const { suburb, city, town, village, county, state, region } = suggestion.address;
    const str = `${suburb || town || village || ''}, ${city || county || ''}, ${state || region || ''}`
      .trim().replace(/^, |, $/g, '');
    setLocation(str);
    locationSearch.setLocationQuery(str);
    setLocationDetails({ suburb: suburb || town || village, city: city || county, region: state || region, coordinates: [suggestion.lat, suggestion.lon] });
    setShowLocationModal(false);
  };

  const clearAll = () => {
    setServiceQuery(''); setLocation(''); locationSearch.clearSearch();
    setLocationDetails(null); setResults([]); setHasSearched(false); setError(null); setShowLocationModal(false);
  };

  const isDisabled = loading || !serviceQuery.trim() || !location.trim();

  return (
    <SafeAreaView style={sc.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={sc.header}>
        <TouchableOpacity style={sc.backBtn} onPress={() => navigate('Guest')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={sc.headerTitle}>Find Taskers</Text>
          <Text style={sc.headerSub}>No account required</Text>
        </View>
        <TouchableOpacity style={sc.signInBtn} onPress={() => navigate('Login')} activeOpacity={0.8}>
          <Text style={sc.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      {/* Search panel */}
      <View style={sc.searchPanel}>
        {/* Service */}
        <View style={sc.inputRow}>
          <View style={sc.inputIconWrap}>
            <Ionicons name="construct-outline" size={16} color={C.primaryMid} />
          </View>
          <TextInput
            style={sc.inputText}
            placeholder="What service do you need?"
            placeholderTextColor={C.textMuted}
            value={serviceQuery}
            onChangeText={(t) => { setServiceQuery(t); setError(null); }}
            returnKeyType="next"
            onSubmitEditing={() => setShowLocationModal(true)}
          />
          {serviceQuery.length > 0 && (
            <TouchableOpacity onPress={() => setServiceQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={sc.inputDivider} />

        {/* Location */}
        <TouchableOpacity style={sc.inputRow} onPress={() => setShowLocationModal(true)} activeOpacity={0.9}>
          <View style={[sc.inputIconWrap, { backgroundColor: C.greenLight }]}>
            <Ionicons name="location-outline" size={16} color={C.green} />
          </View>
          <Text style={[sc.inputText, !location && { color: C.textMuted }]} numberOfLines={1}>
            {location || 'Your location (e.g. Accra)'}
          </Text>
          {location.length > 0 && (
            <TouchableOpacity onPress={() => { setLocation(''); setLocationDetails(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {error && !loading && (
          <View style={sc.errorRow}>
            <Ionicons name="alert-circle-outline" size={13} color={C.red} />
            <Text style={sc.errorText}>{error}</Text>
          </View>
        )}

        <View style={sc.btnRow}>
          {hasSearched && (
            <TouchableOpacity style={sc.clearBtn} onPress={clearAll} activeOpacity={0.75}>
              <Ionicons name="refresh-outline" size={14} color={C.textSecondary} />
              <Text style={sc.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[sc.searchBtn, isDisabled && sc.searchBtnDisabled]}
            onPress={() => handleSearch()} disabled={isDisabled} activeOpacity={0.88}
          >
            {loading ? <ActivityIndicator size="small" color={C.white} /> : (
              <>
                <Ionicons name="search" size={15} color={C.white} />
                <Text style={sc.searchBtnText}>Search</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item, idx) => item._id || String(idx)}
        contentContainerStyle={sc.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          hasSearched && !loading && results.length > 0 ? (
            <FadeIn style={sc.resultsHeader}>
              <View style={sc.resultsTopRow}>
                <View>
                  <Text style={sc.resultsCount}>{results.length} tasker{results.length !== 1 ? 's' : ''} found</Text>
                  <Text style={sc.resultsSub}>"{serviceQuery}" near {location}</Text>
                </View>
                <View style={sc.filterHint}>
                  <Ionicons name="options-outline" size={13} color={C.textMuted} />
                  <Text style={sc.filterHintText}>Best match</Text>
                </View>
              </View>
              <View style={sc.nudgeBanner}>
                <View style={sc.nudgeIconWrap}>
                  <Ionicons name="lock-open-outline" size={13} color={C.primaryMid} />
                </View>
                <Text style={sc.nudgeText}>Sign up to book, message & track taskers for free.</Text>
                <TouchableOpacity onPress={() => navigate('Register')} style={sc.nudgeBtn}>
                  <Text style={sc.nudgeBtnText}>Join Free</Text>
                </TouchableOpacity>
              </View>
            </FadeIn>
          ) : null
        }
        renderItem={({ item, index }) => (
          <FadeIn delay={Math.min(index * 60, 300)} style={{ paddingHorizontal: 16 }}>
            <TaskerCard tasker={item} onBook={() => navigate('Register', { redirectAfter: 'Booking' })} index={index} />
          </FadeIn>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={sc.loadingWrap}>
              <ActivityIndicator size="large" color={C.primaryMid} />
              <Text style={sc.loadingText}>Searching for taskers…</Text>
            </View>
          ) : hasSearched ? (
            <View style={{ paddingHorizontal: 16 }}><NoResults query={serviceQuery || location} /></View>
          ) : (
            <View style={{ paddingHorizontal: 16 }}><EmptySearch onServicePress={handleServiceTap} /></View>
          )
        }
        ListFooterComponent={
          hasSearched && results.length > 0 ? (
            <FadeIn style={sc.signUpFooter}>
              <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sc.signUpFooterGrad}>
                <View style={sc.signUpFooterCircle} />
                <View style={{ flex: 1 }}>
                  <Text style={sc.signUpFooterTitle}>Ready to book?</Text>
                  <Text style={sc.signUpFooterSub}>Free account, takes 2 minutes.</Text>
                </View>
                <TouchableOpacity style={sc.signUpFooterBtn} onPress={() => navigate('Register')} activeOpacity={0.85}>
                  <Text style={sc.signUpFooterBtnText}>Sign Up</Text>
                  <Ionicons name="arrow-forward" size={13} color={C.primary} />
                </TouchableOpacity>
              </LinearGradient>
            </FadeIn>
          ) : null
        }
      />

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

const sc = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  headerSub:   { fontSize: 11, color: C.textMuted, fontWeight: '500', marginTop: 1 },
  signInBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: C.primaryMid, backgroundColor: C.primaryGlow },
  signInBtnText: { fontSize: 13, fontWeight: '700', color: C.primaryMid },

  searchPanel: {
    backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(10,22,40,0.08)', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 5,
  },
  inputRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 2 },
  inputIconWrap: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  inputText:   { flex: 1, fontSize: 15, color: C.textPrimary, fontWeight: '500' },
  inputDivider: { height: 1, backgroundColor: C.borderLight, marginVertical: 4, marginHorizontal: 2 },
  errorRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginHorizontal: 2 },
  errorText:   { fontSize: 12, color: C.red, fontWeight: '500' },
  btnRow:      { flexDirection: 'row', gap: 8, marginTop: 12 },
  clearBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  searchBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 12, backgroundColor: C.primaryMid, shadowColor: C.primaryMid, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  searchBtnDisabled: { backgroundColor: C.textMuted, shadowOpacity: 0, elevation: 0 },
  searchBtnText: { fontSize: 15, fontWeight: '700', color: C.white },

  listContent: { paddingBottom: 48 },

  resultsHeader: { paddingHorizontal: 16, marginBottom: 14 },
  resultsTopRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  resultsCount:  { fontSize: 18, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  resultsSub:    { fontSize: 12, color: C.textMuted, marginTop: 2 },
  filterHint:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: C.border },
  filterHintText: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  nudgeBanner:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primaryGlow, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: '#DBEAFE' },
  nudgeIconWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nudgeText:     { flex: 1, fontSize: 12, color: C.primary, fontWeight: '500', lineHeight: 17 },
  nudgeBtn:      { backgroundColor: C.primaryMid, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, flexShrink: 0 },
  nudgeBtnText:  { fontSize: 12, fontWeight: '700', color: C.white },

  loadingWrap: { alignItems: 'center', paddingTop: 60, gap: 14 },
  loadingText: { fontSize: 14, color: C.textMuted, fontWeight: '500' },

  signUpFooter:     { paddingHorizontal: 16, marginTop: 6, marginBottom: 20 },
  signUpFooterGrad: { borderRadius: 18, padding: 20, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', position: 'relative', gap: 12 },
  signUpFooterCircle: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' },
  signUpFooterTitle: { fontSize: 15, fontWeight: '800', color: C.white },
  signUpFooterSub:   { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  signUpFooterBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, flexShrink: 0 },
  signUpFooterBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },
});