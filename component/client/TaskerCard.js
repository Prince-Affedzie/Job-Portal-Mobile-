import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W } = Dimensions.get('window');

// ─── Design tokens (matches app-wide palette) ─────────────────────────────────
const C = {
  bg:           '#F4F6FB',
  surface:      '#FFFFFF',
  border:       '#E8ECF2',
  navy:         '#0F1E3D',
  navyMid:      '#1A3461',
  navyLight:    '#E8EEF9',
  gold:         '#C9891A',
  goldLight:    '#FDF3E0',
  teal:         '#0F766E',
  tealLight:    '#E0F5F2',
  textPrimary:  '#0D1B35',
  textSecondary:'#4A5B7A',
  textMuted:    '#8FA0BE',
  white:        '#FFFFFF',
  verified:     '#059669',
  verifiedBg:   '#D1FAE5',
};

// Pricing label helpers
const PRICE_TYPE_LABEL = {
  fixed:      (p, c) => `${c} ${p}`,
  hourly:     (p, c) => `${c} ${p}/hr`,
  starts_at:  (p, c) => `From ${c} ${p}`,
  negotiable: ()     => 'Negotiable',
};

function formatPrice(svc) {
  if (!svc) return null;
  const fmt = PRICE_TYPE_LABEL[svc.priceType];
  if (!fmt) return null;
  const currency = svc.currency || 'GHS';
  return fmt(svc.price, currency);
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

// Deterministic colour pair from name — ensures the same tasker always
// gets the same branded banner colours across sessions
const BRAND_PALETTES = [
  { from: '#0F1E3D', to: '#1A3461', accent: '#C9891A' }, // navy + gold
  { from: '#0F766E', to: '#134E4A', accent: '#34D399' }, // teal + mint
  { from: '#1E1B4B', to: '#3730A3', accent: '#818CF8' }, // indigo + lavender
  { from: '#7C2D12', to: '#9A3412', accent: '#FB923C' }, // burnt orange
  { from: '#14532D', to: '#166534', accent: '#4ADE80' }, // forest green
  { from: '#4A044E', to: '#701A75', accent: '#E879F9' }, // plum + pink
  { from: '#0C4A6E', to: '#075985', accent: '#38BDF8' }, // ocean blue
  { from: '#1C1917', to: '#292524', accent: '#D4A76A' }, // charcoal + tan
];

function getBrandPalette(name = '') {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % BRAND_PALETTES.length;
  return BRAND_PALETTES[idx];
}

// Split a business/person name into at most 2 lines for the branded banner
function splitBannerName(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return [words[0]];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

// ─── Branded fallback banner ───────────────────────────────────────────────────
// Shown when the tasker has no brandBanner image. Uses a deterministic gradient
// + decorative rings + the business name rendered in the centre.
function BrandedBanner({ name, palette }) {
  const lines    = splitBannerName(name);
  const initials = getInitials(name);

  return (
    <LinearGradient
      colors={[palette.from, palette.to]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      {/* Decorative background rings */}
      <View style={[bb.ring, bb.ring1, { borderColor: palette.accent + '22' }]} />
      <View style={[bb.ring, bb.ring2, { borderColor: palette.accent + '14' }]} />
      <View style={[bb.ring, bb.ring3, { borderColor: palette.accent + '0A' }]} />

      {/* Workaflow watermark — top right */}
      <View style={bb.watermark}>
        <Text style={bb.watermarkText}>Workaflow</Text>
      </View>

      {/* Centred business name block */}
      <View style={bb.nameBlock}>
        {/* Big translucent initials behind the text */}
        <Text style={[bb.bgInitials, { color: palette.accent + '18' }]}>{initials}</Text>

        {/* Accent rule */}
        <View style={[bb.rule, { backgroundColor: palette.accent }]} />

        {lines.map((line, i) => (
          <Text
            key={i}
            style={[bb.nameLine, i === 0 && bb.nameLineFirst, { color: C.white }]}
            numberOfLines={1}
          >
            {line}
          </Text>
        ))}

        {/* Subtitle */}
        <Text style={[bb.subtitle, { color: palette.accent }]}>Professional Tasker</Text>
      </View>
    </LinearGradient>
  );
}

const bb = StyleSheet.create({
  ring:  { position: 'absolute', borderRadius: 999, borderWidth: 1 },
  ring1: { width: 180, height: 180, top: -60, right: -50 },
  ring2: { width: 130, height: 130, top: -30, right: -20 },
  ring3: { width: 220, height: 220, bottom: -80, left: -60 },

  watermark: {
    position: 'absolute', top: 10, right: 12,
  },
  watermarkText: {
    fontSize: 9, fontWeight: '800', letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
  },

  nameBlock: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, position: 'relative',
  },
  bgInitials: {
    position: 'absolute',
    fontSize: 96, fontWeight: '900', letterSpacing: -4,
    // purely decorative — very low opacity set via color prop
  },
  rule: {
    width: 28, height: 2, borderRadius: 1, marginBottom: 8, opacity: 0.85,
  },
  nameLine: {
    fontSize: 18, fontWeight: '800', letterSpacing: -0.3,
    textAlign: 'center', lineHeight: 22, textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  nameLineFirst: { fontSize: 20 },
  subtitle: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', marginTop: 6, opacity: 0.9,
  },
});

/**
 * TaskerCard
 *
 * Props:
 *  tasker        – tasker profile object
 *  isSelected    – boolean
 *  onSelect      – (tasker) => void   (card tap)
 *  onViewProfile – (tasker) => void
 *  searchQuery   – string (optional, for highlighting matched service)
 */
const TaskerCard = ({ tasker, isSelected, onSelect, onViewProfile, searchQuery }) => {
  // ── Selection pulse animation ──────────────────────────────────────────────
  const borderAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSelected) {
      Animated.parallel([
        Animated.timing(borderAnim, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.sequence([
          Animated.spring(scaleAnim, { toValue: 0.975, tension: 200, friction: 10, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1,     tension: 200, friction: 10, useNativeDriver: true }),
        ]),
      ]).start();
    } else {
      Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
  }, [isSelected]);

  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.gold],
  });
  const animatedBorderWidth = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  // ── Derived values ─────────────────────────────────────────────────────────
  const displayName    = tasker.businessName || tasker.name || 'Professional Tasker';
  const services       = tasker.servicesOffered || [];
  const shownServices  = services.slice(0, 2);
  const extraCount     = Math.max(0, services.length - 2);
  const locationStr    = [tasker.location?.city, tasker.location?.region].filter(Boolean).join(', ') || 'Available Nationwide';
  const bannerUri      = tasker.brandBanner || null;
  const avatarUri      = tasker.profileImage || tasker.userId?.profileImage || null;
  const rating         = tasker.rating || 0;
  const numRatings     = tasker.numberOfRatings || 0;
  const palette        = getBrandPalette(displayName);

  return (
    <Animated.View style={[
      styles.cardWrap,
      { borderColor: animatedBorderColor, borderWidth: animatedBorderWidth },
      isSelected && styles.cardWrapSelected,
    ]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => onSelect(tasker)}
          style={styles.card}
        >

          {/* ── Banner + avatar ─────────────────────────────────────── */}
          <View style={styles.bannerSection}>
            {bannerUri ? (
              <Image source={{ uri: bannerUri }} style={styles.bannerImg} resizeMode="cover" />
            ) : (
              /* No banner — render the branded fallback */
              <View style={styles.bannerImg}>
                <BrandedBanner name={displayName} palette={palette} />
              </View>
            )}

            {/* Gradient fade at bottom for readability */}
            <LinearGradient
              colors={['transparent', 'rgba(10,16,40,0.65)']}
              style={styles.bannerGradient}
            />

            {/* Provider type tag */}
            <View style={styles.providerTag}>
              <Text style={styles.providerTagText}>
                {tasker.providerType === 'business' ? '🏢 Business' : '👤 Individual'}
              </Text>
            </View>

            {/* Rating pill */}
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={12} color={C.gold} />
              <Text style={styles.ratingVal}>
                {rating > 0 ? rating.toFixed(1) : 'New'}
              </Text>
              {numRatings > 0 && (
                <Text style={styles.ratingCount}>({numRatings})</Text>
              )}
            </View>

            {/* Distance pill */}
            {tasker.distance != null && (
              <View style={styles.distancePill}>
                <Ionicons name="navigate-outline" size={11} color={C.white} />
                <Text style={styles.distanceTxt}>
                  {typeof tasker.distance === 'number'
                    ? `${(tasker.distance / 1000).toFixed(1)} km`
                    : tasker.distance}
                </Text>
              </View>
            )}

            {/* Selected checkmark */}
            {isSelected && (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark" size={13} color={C.white} />
              </View>
            )}

            {/* Avatar — overlaps bottom of banner */}
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
              ) : (
                /* No profile photo — gradient avatar with initials, palette-matched */
                <LinearGradient
                  colors={[palette.accent, palette.from]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarInit}>{getInitials(displayName)}</Text>
                </LinearGradient>
              )}
              {tasker.isVerified && (
                <View style={styles.verifiedDot}>
                  <Ionicons name="checkmark" size={9} color={C.white} />
                </View>
              )}
            </View>
          </View>

          {/* ── Body ────────────────────────────────────────────────── */}
          <View style={styles.body}>

            {/* Name row */}
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              {tasker.isVerified && (
                <View style={styles.verifiedChip}>
                  <Ionicons name="shield-checkmark" size={11} color={C.verified} />
                  <Text style={styles.verifiedChipText}>Verified</Text>
                </View>
              )}
            </View>

            {/* Tagline */}
            {tasker.tagline ? (
              <Text style={styles.tagline} numberOfLines={1}>"{tasker.tagline}"</Text>
            ) : null}

            {/* Location */}
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={C.textMuted} />
              <Text style={styles.locationTxt} numberOfLines={1}>{locationStr}</Text>
            </View>

            {/* Services */}
            {shownServices.length > 0 && (
              <View style={styles.servicesSection}>
                <View style={styles.servicesList}>
                  {shownServices.map((svc, i) => {
                    const priceStr = formatPrice(svc);
                    const isMatch  = searchQuery &&
                      svc.name?.toLowerCase().includes(searchQuery.toLowerCase());
                    return (
                      <View key={i} style={[styles.serviceChip, isMatch && styles.serviceChipMatch]}>
                        <Ionicons
                          name="construct-outline"
                          size={11}
                          color={isMatch ? C.gold : C.navyMid}
                        />
                        <Text
                          style={[styles.serviceChipName, isMatch && styles.serviceChipNameMatch]}
                          numberOfLines={1}
                        >
                          {svc.name}
                        </Text>
                        {priceStr && (
                          <Text style={[styles.serviceChipPrice, isMatch && { color: C.gold }]}>
                            · {priceStr}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                  {extraCount > 0 && (
                    <View style={styles.moreChip}>
                      <Text style={styles.moreChipText}>+{extraCount} more</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Footer action */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => onViewProfile(tasker)}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={14} color={C.navyMid} />
                <Text style={styles.profileBtnText}>View Profile</Text>
              </TouchableOpacity>

              {/* Tap hint / selected indicator */}
              {isSelected ? (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={15} color={C.gold} />
                  <Text style={styles.selectedIndicatorText}>Selected</Text>
                </View>
              ) : (
                <View style={styles.tapHint}>
                  <Text style={styles.tapHintText}>Tap card to select</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const AVATAR_SIZE  = 54;
const AVATAR_OVERLAP = AVATAR_SIZE / 2 + 4; // how far the avatar overlaps the body

const styles = StyleSheet.create({
  // Card wrapper (handles animated border)
  cardWrap: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F1E3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  cardWrapSelected: {
    shadowOpacity: 0.18,
    elevation: 8,
    shadowColor: C.gold,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // ── Banner ──────────────────────────────────────────────────────────────────
  bannerSection: {
    height: 148,
    position: 'relative',
  },
  bannerImg:     { width: '100%', height: '100%' },
  bannerGradient:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },

  providerTag: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  providerTagText: { color: C.white, fontSize: 11, fontWeight: '600' },

  ratingPill: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
  },
  ratingVal:   { fontSize: 12, fontWeight: '800', color: C.textPrimary },
  ratingCount: { fontSize: 10, color: C.textMuted },

  distancePill: {
    position: 'absolute', top: 42, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
  },
  distanceTxt: { fontSize: 11, color: C.white, fontWeight: '600' },

  selectedBadge: {
    position: 'absolute', top: 10, left: 10,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.gold,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.white,
  },

  // Avatar overlapping banner bottom-left
  avatarWrap: {
    position: 'absolute',
    bottom: -AVATAR_SIZE / 2,    // half-bleed below banner
    left: 14,
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    backgroundColor: C.surface,  // white ring
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInit: { fontSize: 18, fontWeight: '800', color: C.white, letterSpacing: 0.5 },
  verifiedDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.verified,
    borderWidth: 2, borderColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Body ───────────────────────────────────────────────────────────────────
  body: {
    paddingTop: AVATAR_OVERLAP + 6,   // clear the avatar bleed
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  nameRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 3,
  },
  name: {
    fontSize: 17, fontWeight: '800',
    color: C.textPrimary, flex: 1, letterSpacing: -0.2,
  },
  verifiedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.verifiedBg,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 12, borderWidth: 1,
    borderColor: C.verified + '30',
  },
  verifiedChipText: { fontSize: 10, fontWeight: '700', color: C.verified },

  tagline: {
    fontSize: 12, color: C.textMuted,
    fontStyle: 'italic', marginBottom: 8, lineHeight: 17,
  },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12,
  },
  locationTxt: { fontSize: 12, color: C.textMuted, fontWeight: '500', flex: 1 },

  // Services
  servicesSection: { marginBottom: 14 },
  servicesList:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  serviceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.navyLight,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: C.navyMid + '20',
  },
  serviceChipMatch: {
    backgroundColor: C.goldLight,
    borderColor: C.gold + '40',
  },
  serviceChipName: {
    fontSize: 12, fontWeight: '700', color: C.navyMid, maxWidth: W * 0.35,
  },
  serviceChipNameMatch: { color: C.gold },
  serviceChipPrice: {
    fontSize: 11, color: C.textSecondary, fontWeight: '500',
  },
  moreChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
    justifyContent: 'center',
  },
  moreChipText: { fontSize: 11, color: C.textMuted, fontWeight: '700' },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  profileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface,
  },
  profileBtnText: { fontSize: 13, fontWeight: '700', color: C.navyMid },

  selectedIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 12, backgroundColor: C.goldLight,
    borderWidth: 1, borderColor: C.gold + '40',
  },
  selectedIndicatorText: {
    fontSize: 13, fontWeight: '700', color: C.gold,
  },

  tapHint: {
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 12, backgroundColor: C.bg,
  },
  tapHintText: { fontSize: 12, color: C.textMuted, fontWeight: '500' },
});

export default TaskerCard;