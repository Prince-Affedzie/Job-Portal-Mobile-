// component/tasker/ProfileCompletenessPopup.js
//
// Shows a minimal bottom-sheet nudge when a tasker's profile is incomplete.
//
// Field sources (corrected to match actual schemas):
//   user.profileImage          → User schema  (from AuthContext)
//   tasker.brandBanner         → TaskerProfile schema (from TaskerContext)
//   tasker.bio                 → TaskerProfile schema
//   tasker.servicesOffered[0]  → TaskerProfile schema (array of service objects)
//   tasker.workPortfolio[0]    → TaskerProfile schema (items have .files[])
//   tasker.location.city/region → TaskerProfile schema
//
// Only shows for role === 'tasker', once per session, when score < 100.

import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet,
  Modal, Dimensions,
} from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { TaskerContext } from '../../context/TaskerContext';
import { AuthContext }   from '../../context/AuthContext';
import { navigate }      from '../../services/navigationService';

const { height } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:          '#F8FAFF',
  surface:     '#FFFFFF',
  border:      '#E4E8EE',
  primary:     '#1E3A6E',
  primaryMid:  '#1A56DB',
  primaryGlow: '#EBF5FF',
  gold:        '#D49B3F',
  goldLight:   '#FCF3E1',
  green:       '#0E9F6E',
  greenLight:  '#E3FCEC',
  textPrimary: '#0F172A',
  textSec:     '#475569',
  textMuted:   '#94A3B8',
  white:       '#FFFFFF',
};

// ─── Build checks from BOTH contexts ─────────────────────────────────────────
// user    → AuthContext  (has .profileImage)
// tasker  → TaskerContext (has everything else)
const buildChecks = (user, tasker) => [
  {
    key:    'photo',
    label:  'Profile photo',
    desc:   'A clear photo builds trust with clients',
    icon:   'camera-outline',
    // profileImage lives on the User document, not TaskerProfile
    done:   !!user?.profileImage,
    route:  'TaskerProfile',       // Account screen where user edits their photo
    weight: 20,
  },
  {
    key:    'banner',
    label:  'Brand banner',
    desc:   'Stand out with a professional banner image',
    icon:   'image-outline',
    // brandBanner is on TaskerProfile
    done:   !!tasker?.brandBanner,
    route:  'TaskerProfileDetail', // Tasker profile detail screen
    weight: 10,
  },
  {
    key:    'bio',
    label:  'About / Bio',
    desc:   'Tell clients who you are and what you offer',
    icon:   'person-outline',
    // bio is on TaskerProfile
    done:   typeof tasker?.bio === 'string' && tasker.bio.trim().length >= 30,
    route:  'TaskerProfileDetail',
    weight: 20,
  },
  {
    key:    'service',
    label:  'Primary service',
    desc:   'Add at least one service you offer',
    icon:   'construct-outline',
    // servicesOffered is an array on TaskerProfile; check first element exists
    done:   Array.isArray(tasker?.servicesOffered) && tasker.servicesOffered.length > 0,
    route:  'TaskerServices',
    weight: 25,
  },
  {
    key:    'portfolio',
    label:  'Portfolio work',
    desc:   'Showcase past projects to win more jobs',
    icon:   'images-outline',
    // workPortfolio is an array on TaskerProfile
    // Each item has { title, description, files: [String], completedAt }
    done:   Array.isArray(tasker?.workPortfolio) && tasker.workPortfolio.length > 0,
    route:  'TaskerPortfolio',
    weight: 15,
  },
  {
    key:    'location',
    label:  'Location',
    desc:   'Help nearby clients discover you',
    icon:   'location-outline',
    // location.city and location.region are on TaskerProfile
    done:   !!(tasker?.location?.city || tasker?.location?.region),
    route:  'TaskerProfileDetail',
    weight: 10,
  },
];

// ─── Score 0–100 ──────────────────────────────────────────────────────────────
const computeScore = (checks) => {
  const total  = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter(c => c.done).reduce((s, c) => s + c.weight, 0);
  return Math.round((earned / total) * 100);
};

// ─── SVG progress ring ────────────────────────────────────────────────────────
const ProgressRing = ({ score, size = 52 }) => {
  const r          = (size - 6) / 2;
  const circ       = 2 * Math.PI * r;
  const dashOffset = circ - (score / 100) * circ;
  const ringColor  = score >= 80 ? C.green : score >= 50 ? C.gold : C.primaryMid;

  return (
   <View style={{ width: size, height: size }}>
  <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <Circle cx={size/2} cy={size/2} r={r}
      fill="none" stroke={C.border} strokeWidth={5} />
    <Circle cx={size/2} cy={size/2} r={r}
      fill="none" stroke={ringColor} strokeWidth={5}
      strokeDasharray={circ} strokeDashoffset={dashOffset}
      strokeLinecap="round"
      transform={`rotate(-90 ${size/2} ${size/2})`} />
  </Svg>
  <View style={pr.labelWrap}>
    <Text style={[pr.score, { color: ringColor }]}>{score}</Text>
    <Text style={pr.pct}>%</Text>
  </View>
</View>
  );
};

const pr = StyleSheet.create({
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 0,
  },
  score: { fontSize: 13, fontWeight: '800', lineHeight: 16 },
  pct:   { fontSize: 9,  fontWeight: '700', color: C.textMuted, lineHeight: 16, marginTop: 1 },
});

// ─── Main component ───────────────────────────────────────────────────────────
const ProfileCompletenessPopup = () => {
  const { user }   = useContext(AuthContext);
  const { tasker } = useContext(TaskerContext);

  const [visible,  setVisible]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const shownRef  = useRef(false);

  useEffect(() => {
    if (user?.role !== 'tasker') return;
    if (!tasker)                  return;
    if (shownRef.current)         return;

    const checks = buildChecks(user, tasker);
    const score  = computeScore(checks);
    if (score >= 100) return;

    const timer = setTimeout(() => {
      shownRef.current = true;
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0, damping: 22, stiffness: 180, useNativeDriver: true,
      }).start();
    }, 1800);

    return () => clearTimeout(timer);
  }, [tasker, user]);

  const dismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 300, duration: 240, useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [slideAnim]);

  const handleItemPress = useCallback((route) => {
    dismiss();
    setTimeout(() => navigate(route), 300);
  }, [dismiss]);

  if (!visible || user?.role !== 'tasker') return null;

  const checks     = buildChecks(user, tasker);
  const score      = computeScore(checks);
  const incomplete = checks.filter(c => !c.done);
  const nextItem   = incomplete[0];

  const scoreColor = score >= 80 ? C.green : score >= 50 ? C.gold : C.primaryMid;
  const scoreLabel = score >= 80 ? 'Almost there!'
    : score >= 50 ? 'Good progress'
    : 'Needs attention';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={dismiss} />

      <Animated.View style={[st.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={st.handle} />

        {/* Header */}
        <View style={st.header}>
          <ProgressRing score={score} size={52} />
          <View style={st.headerText}>
            <Text style={st.headerTitle}>Complete your profile</Text>
            <Text style={[st.headerScore, { color: scoreColor }]}>
              {scoreLabel} · {incomplete.length} item{incomplete.length !== 1 ? 's' : ''} left
            </Text>
          </View>
          <TouchableOpacity
            style={st.closeBtn} onPress={dismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Why it matters */}
        <View style={st.whyRow}>
          <Ionicons name="trending-up-outline" size={14} color={C.gold} />
          <Text style={st.whyText}>
            Taskers with complete profiles get{' '}
            <Text style={st.whyBold}>3× more bookings</Text>
          </Text>
        </View>

        {/* ── Collapsed: next step only ── */}
        {!expanded && nextItem && (
          <TouchableOpacity
            style={st.nextCard}
            onPress={() => handleItemPress(nextItem.route)}
            activeOpacity={0.85}
          >
            <View style={st.nextIconWrap}>
              <Ionicons name={nextItem.icon} size={19} color={C.primaryMid} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.nextLabel}>Next: {nextItem.label}</Text>
              <Text style={st.nextDesc}>{nextItem.desc}</Text>
            </View>
            <View style={st.nextWeightBadge}>
              <Text style={st.nextWeightText}>+{nextItem.weight}%</Text>
            </View>
            <Ionicons name="arrow-forward" size={15} color={C.primaryMid} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}

        {/* ── Expanded: all items ── */}
        {expanded && (
          <View style={st.checkList}>
            {checks.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[st.checkRow, item.done && st.checkRowDone]}
                onPress={() => !item.done && handleItemPress(item.route)}
                activeOpacity={item.done ? 1 : 0.8}
                disabled={item.done}
              >
                <View style={[st.checkIcon, item.done ? st.checkIconDone : st.checkIconTodo]}>
                  <Ionicons
                    name={item.done ? 'checkmark' : item.icon}
                    size={13}
                    color={item.done ? C.white : C.primaryMid}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.checkLabel, item.done && st.checkLabelDone]}>
                    {item.label}
                  </Text>
                  {!item.done && (
                    <Text style={st.checkDesc}>{item.desc}</Text>
                  )}
                </View>
                {!item.done && (
                  <View style={st.weightBadge}>
                    <Text style={st.weightText}>+{item.weight}%</Text>
                  </View>
                )}
                {item.done && (
                  <Ionicons name="checkmark-circle" size={16} color={C.green} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={st.footer}>
          <TouchableOpacity
            style={st.expandBtn}
            onPress={() => setExpanded(e => !e)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={13} color={C.textSec}
            />
            <Text style={st.expandText}>
              {expanded
                ? 'Show less'
                : `See all ${incomplete.length} item${incomplete.length !== 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.laterBtn} onPress={dismiss} activeOpacity={0.75}>
            <Text style={st.laterText}>Later</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  sheet: {
    position: 'absolute', bottom: 15, left: 0, right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 16,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerText:  { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  headerScore: { fontSize: 12, fontWeight: '600' },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F1F4F9',
    alignItems: 'center', justifyContent: 'center',
  },

  // Why row
  whyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginHorizontal: 18, marginTop: 12, marginBottom: 8,
    backgroundColor: C.goldLight, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#F0D9A8',
  },
  whyText: { flex: 1, fontSize: 12, color: '#7C5C1A', lineHeight: 17 },
  whyBold: { fontWeight: '700', color: '#7C5C1A' },

  // Next step card (collapsed)
  nextCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 18, marginTop: 6,
    backgroundColor: C.primaryGlow, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  nextIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  nextLabel: { fontSize: 13, fontWeight: '700', color: C.primary, marginBottom: 2 },
  nextDesc:  { fontSize: 12, color: C.textSec, lineHeight: 17 },
  nextWeightBadge: {
    backgroundColor: C.greenLight,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8,
  },
  nextWeightText: { fontSize: 11, fontWeight: '700', color: C.green },

  // Checklist (expanded)
  checkList: { marginHorizontal: 18, marginTop: 8 },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg, marginBottom: 6,
  },
  checkRowDone: { opacity: 0.5 },
  checkIcon: {
    width: 27, height: 27, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  checkIconDone: { backgroundColor: C.green },
  checkIconTodo: { backgroundColor: C.primaryGlow, borderWidth: 1, borderColor: '#DBEAFE' },
  checkLabel:     { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  checkLabelDone: { textDecorationLine: 'line-through', color: C.textMuted },
  checkDesc:      { fontSize: 11, color: C.textMuted, marginTop: 1 },
  weightBadge: {
    backgroundColor: C.greenLight,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  weightText: { fontSize: 11, fontWeight: '700', color: C.green },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 14,
  },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface,
  },
  expandText: { fontSize: 12, fontWeight: '600', color: C.textSec },
  laterBtn:   { paddingVertical: 8, paddingHorizontal: 14 },
  laterText:  { fontSize: 13, fontWeight: '600', color: C.textMuted },
});

export default ProfileCompletenessPopup;