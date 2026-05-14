// screens/TermsOfServiceScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Animated, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W } = Dimensions.get('window');

// ─── Design tokens (same as Privacy Policy) ──────────────────────────────────
const C = {
  bg:           '#F4F6FB',
  surface:      '#FFFFFF',
  border:       '#E8ECF2',
  borderStrong: '#D1D9E6',
  navy:         '#0F1E3D',
  navyMid:      '#1A3461',
  navyLight:    '#E8EEF9',
  gold:         '#C9891A',
  goldLight:    '#FDF3E0',
  goldMid:      '#E8A730',
  teal:         '#0F766E',
  tealLight:    '#E0F5F2',
  textPrimary:  '#0D1B35',
  textSecondary:'#4A5B7A',
  textMuted:    '#8FA0BE',
  white:        '#FFFFFF',
};

// ─── Terms data ─────────────────────────────────────────────────────────────
const LAST_UPDATED = 'May 14, 2025';
const EFFECTIVE    = 'May 14, 2025';

const SECTIONS = [
  {
    id: 'overview',
    icon: 'document-text-outline',
    color: C.teal,
    bg: C.tealLight,
    title: 'Introduction',
    content: `Welcome to Workaflow! These Terms of Service ("Terms") govern your access to and use of the Workaflow platform, including our mobile application and any related services (collectively, the "Services").\n\nBy registering for or using the Services, you agree to be bound by these Terms. If you do not agree, please do not use Workaflow.`,
  },
  {
    id: 'eligibility',
    icon: 'people-outline',
    color: C.navyMid,
    bg: C.navyLight,
    title: 'Eligibility',
    content: `To use Workaflow, you must be at least 18 years old and capable of forming a legally binding contract. By creating an account, you represent and warrant that you meet these requirements.\n\nIf you are using the Services on behalf of a business or organisation, you further represent that you have the authority to bind that entity to these Terms.`,
  },
  {
    id: 'account',
    icon: 'person-circle-outline',
    color: C.gold,
    bg: C.goldLight,
    title: 'Account Responsibilities',
    bullets: [
      { heading: 'Accurate Information', text: 'You agree to provide accurate and complete information when creating your account and to keep it up to date.' },
      { heading: 'Account Security', text: 'You are responsible for safeguarding your password and for all activity that occurs under your account. Notify us immediately of any unauthorised access.' },
      { heading: 'One Account Per Person', text: 'You may not create more than one account without our prior written permission. Duplicate accounts may be suspended or terminated.' },
    ],
  },
  {
    id: 'services',
    icon: 'construct-outline',
    color: '#7C3AED',
    bg: '#EDE9FE',
    title: 'Using Our Services',
    bullets: [
      { heading: 'Service Listings', text: 'Taskers may post services they offer. All service descriptions, prices, and availability must be accurate and not misleading.' },
      { heading: 'Booking & Payment', text: 'When you book a service, you agree to pay the indicated price. Workaflow facilitates payments through third‑party processors and holds funds in escrow until the job is completed, unless otherwise agreed.' },
      { heading: 'Tasker–Client Relationship', text: 'Taskers are independent contractors, not employees of Workaflow. We are not responsible for the quality, safety, or legality of the services performed. Any disputes between users should be resolved between them, though we may assist.' },
      { heading: 'Prohibited Conduct', text: 'You may not use the platform for any illegal, fraudulent, or harmful activity. Harassment, discrimination, and abuse are strictly forbidden and will result in immediate account termination.' },
    ],
  },
  {
    id: 'payments',
    icon: 'card-outline',
    color: C.navyMid,
    bg: C.navyLight,
    title: 'Payments & Fees',
    content: `Workaflow may charge service fees for certain transactions. All fees are disclosed before you complete a booking. We reserve the right to change our fees with notice.\n\nYou authorise us to collect and remit payments on your behalf. Refunds are handled according to our cancellation and dispute policies.`,
  },
  {
    id: 'cancellations',
    icon: 'close-circle-outline',
    color: '#DC2626',
    bg: '#FEE2E2',
    title: 'Cancellation & Refund Policy',
    bullets: [
      { heading: 'Cancellation by Client', text: 'If you cancel a booking before the tasker has started, you may be eligible for a full or partial refund depending on the timing. Specific deadlines are shown before you confirm the booking.' },
      { heading: 'Cancellation by Tasker', text: 'If a tasker cancels a confirmed booking, you will receive a full refund. Frequent cancellations by a tasker may lead to account suspension.' },
      { heading: 'Disputes', text: 'If a completed job is not satisfactory, you may open a dispute within 48 hours. We will review the matter and may issue a partial or full refund at our discretion.' },
    ],
  },
  {
    id: 'disputes',
    icon: 'flame-outline',
    color: '#7C3AED',
    bg: '#EDE9FE',
    title: 'Dispute Resolution',
    content: `We encourage you to contact us first to resolve any issues. If informal resolution fails, you agree to binding arbitration in Accra, Ghana, under Ghanaian law. You waive the right to participate in a class action lawsuit.`,
  },
  {
    id: 'intellectual',
    icon: 'bulb-outline',
    color: C.gold,
    bg: C.goldLight,
    title: 'Intellectual Property',
    content: `Workaflow and its original content, features, and design are owned by us and protected by intellectual property laws. You may not copy, modify, distribute, or reverse‑engineer any part of the Services without our written permission.\n\nYou retain ownership of content you upload; however, you grant us a worldwide, non‑exclusive, royalty‑free licence to host and display that content solely for the purpose of operating the platform.`,
  },
  {
    id: 'disclaimers',
    icon: 'alert-circle-outline',
    color: C.navyMid,
    bg: C.navyLight,
    title: 'Disclaimers',
    content: `The Services are provided "as is" without any warranties, express or implied. We do not guarantee that the Services will be uninterrupted, error‑free, or completely secure.\n\nWorkaflow makes no representations about the quality, accuracy, or reliability of any user‑generated content. You use the platform at your own risk.`,
  },
  {
    id: 'liability',
    icon: 'scale-outline',
    color: C.gold,
    bg: C.goldLight,
    title: 'Limitation of Liability',
    content: `To the fullest extent permitted by law, Workaflow shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Services.\n\nOur total liability to you for any claim shall not exceed the amount paid by you to Workaflow in the twelve (12) months preceding the event giving rise to the claim.`,
  },
  {
    id: 'termination',
    icon: 'power-outline',
    color: '#DC2626',
    bg: '#FEE2E2',
    title: 'Termination',
    content: `We may suspend or terminate your account at any time, with or without notice, for any violation of these Terms or for any other reason at our sole discretion.\n\nUpon termination, your right to use the Services immediately ceases. You may delete your account at any time through the app settings.`,
  },
  {
    id: 'changes',
    icon: 'refresh-outline',
    color: C.navyMid,
    bg: C.navyLight,
    title: 'Changes to These Terms',
    content: `We may modify these Terms from time to time. We will notify you of material changes at least 14 days before they become effective by posting a notice within the app or by email.\n\nYour continued use of the Services after the effective date of any revised Terms constitutes your acceptance of those changes.`,
  },
  {
    id: 'contact',
    icon: 'mail-outline',
    color: C.gold,
    bg: C.goldLight,
    title: 'Contact Us',
    content: `If you have any questions about these Terms, please reach out:`,
    contact: [
      { icon: 'mail-outline',     label: 'Email',   value: 'legal@workaflow.app'     },
      { icon: 'globe-outline',    label: 'Website', value: 'www.workaflow.app'        },
      { icon: 'location-outline', label: 'Address', value: 'Accra, Ghana'            },
    ],
  },
];

// ─── Animated section entry ──────────────────────────────────────────────────
function FadeIn({ delay = 0, children }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 58, friction: 13, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: op, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

// ─── TOC entry ───────────────────────────────────────────────────────────────
function TocItem({ section, index, onPress }) {
  return (
    <TouchableOpacity style={toc.item} onPress={onPress} activeOpacity={0.75}>
      <View style={[toc.numBox, { backgroundColor: section.bg }]}>
        <Text style={[toc.num, { color: section.color }]}>{String(index + 1).padStart(2, '0')}</Text>
      </View>
      <Text style={toc.label}>{section.title}</Text>
      <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
    </TouchableOpacity>
  );
}
const toc = StyleSheet.create({
  item:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  numBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  num:    { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  label:  { flex: 1, fontSize: 14, fontWeight: '600', color: C.textSecondary },
});

// ─── Policy section ──────────────────────────────────────────────────────────
function PolicySection({ section, index }) {
  const [expanded, setExpanded] = useState(true);
  const rotAnim = useRef(new Animated.Value(1)).current;

  const toggle = () => {
    Animated.spring(rotAnim, {
      toValue: expanded ? 0 : 1,
      tension: 60, friction: 12, useNativeDriver: true,
    }).start();
    setExpanded(e => !e);
  };

  const rotation = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <FadeIn delay={index * 40}>
      <View style={ps.card}>
        {/* Header */}
        <TouchableOpacity style={ps.header} onPress={toggle} activeOpacity={0.8}>
          <View style={[ps.iconBox, { backgroundColor: section.bg }]}>
            <Ionicons name={section.icon} size={18} color={section.color} />
          </View>
          <View style={ps.titleWrap}>
            <Text style={ps.num}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <Text style={ps.title}>{section.title}</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="chevron-down" size={18} color={C.textMuted} />
          </Animated.View>
        </TouchableOpacity>

        {/* Accent bar */}
        <View style={[ps.accentBar, { backgroundColor: section.color }]} />

        {/* Body */}
        {expanded && (
          <View style={ps.body}>
            {section.content ? (
              <Text style={ps.bodyText}>{section.content}</Text>
            ) : null}

            {section.bullets?.map((b, i) => (
              <View key={i} style={ps.bulletRow}>
                <View style={[ps.bulletDot, { backgroundColor: section.color }]} />
                <View style={ps.bulletContent}>
                  <Text style={ps.bulletHeading}>{b.heading}</Text>
                  <Text style={ps.bulletText}>{b.text}</Text>
                </View>
              </View>
            ))}

            {section.footer ? (
              <View style={[ps.footerNote, { borderLeftColor: section.color }]}>
                <Text style={ps.footerNoteText}>{section.footer}</Text>
              </View>
            ) : null}

            {section.contact ? (
              <View style={ps.contactGrid}>
                {section.contact.map((c, i) => (
                  <View key={i} style={ps.contactRow}>
                    <View style={[ps.contactIcon, { backgroundColor: section.bg }]}>
                      <Ionicons name={c.icon} size={15} color={section.color} />
                    </View>
                    <View>
                      <Text style={ps.contactLabel}>{c.label}</Text>
                      <Text style={ps.contactValue}>{c.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </FadeIn>
  );
}
const ps = StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: 18,
    marginBottom: 12, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#1A3461', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  header:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  iconBox:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleWrap:  { flex: 1, gap: 1 },
  num:        { fontSize: 10, fontWeight: '800', color: C.textMuted, letterSpacing: 1 },
  title:      { fontSize: 15, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  accentBar:  { height: 2, marginHorizontal: 16, borderRadius: 1, opacity: 0.5 },
  body:       { padding: 18, paddingTop: 14 },
  bodyText:   { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
  bulletRow:  { flexDirection: 'row', gap: 12, marginTop: 14 },
  bulletDot:  { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  bulletContent: { flex: 1 },
  bulletHeading: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
  bulletText:    { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
  footerNote: { marginTop: 16, paddingLeft: 14, borderLeftWidth: 3 },
  footerNoteText: { fontSize: 13, color: C.textSecondary, lineHeight: 19, fontStyle: 'italic' },
  contactGrid: { marginTop: 14, gap: 12 },
  contactRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  contactLabel:{ fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
  contactValue:{ fontSize: 14, fontWeight: '600', color: C.textPrimary },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function TermsOfServiceScreen({ navigation }) {
  const scrollRef = useRef(null);
  const sectionRefs = useRef({});
  const [showTOC, setShowTOC] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const scrollToSection = (id) => {
    setShowTOC(false);
    setTimeout(() => {
      sectionRefs.current[id]?.measureLayout(
        scrollRef.current?.getInnerViewNode?.() || null,
        (_, y) => scrollRef.current?.scrollTo({ y: y - 20, animated: true }),
        () => {}
      );
    }, 100);
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: headerAnim } } }],
    { useNativeDriver: false }
  );

  const headerElevation = headerAnim.interpolate({
    inputRange: [0, 50], outputRange: [0, 8], extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <Animated.View style={[s.header, { elevation: headerElevation }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms of Service</Text>
        <TouchableOpacity onPress={() => setShowTOC(true)} style={s.tocBtn}>
          <Ionicons name="list-outline" size={21} color={C.navyMid} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* ── Hero banner ───────────────────────────────────────────── */}
        <FadeIn delay={0}>
          <LinearGradient
            colors={[C.navy, C.navyMid, '#2D4480']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            {/* Decorative rings */}
            <View style={s.heroRing1} />
            <View style={s.heroRing2} />

            <View style={s.heroIconWrap}>
              <LinearGradient
                colors={[C.gold, C.goldMid]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.heroIconCircle}
              >
                <Ionicons name="document-text" size={32} color={C.white} />
              </LinearGradient>
            </View>

            <Text style={s.heroWordmark}>Workaflow</Text>
            <Text style={s.heroTitle}>Terms of Service</Text>
            <Text style={s.heroSub}>
              Please read these terms carefully before using our platform.
            </Text>

            <View style={s.heroDates}>
              <View style={s.heroDateChip}>
                <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={s.heroDateTxt}>Effective: {EFFECTIVE}</Text>
              </View>
              <View style={s.heroDateDivider} />
              <View style={s.heroDateChip}>
                <Ionicons name="refresh-outline" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={s.heroDateTxt}>Updated: {LAST_UPDATED}</Text>
              </View>
            </View>
          </LinearGradient>
        </FadeIn>

        {/* ── Quick trust chips ──────────────────────────────────────── */}
        <FadeIn delay={80}>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipsRow}
          >
            {[
              { icon: 'shield-checkmark-outline', label: 'Transparent Terms', color: C.teal,    bg: C.tealLight },
              { icon: 'lock-closed-outline',       label: 'User Protection',  color: C.navyMid, bg: C.navyLight },
              { icon: 'scale-outline',             label: 'Fair Disputes',    color: C.gold,    bg: C.goldLight },
              { icon: 'refresh-outline',           label: 'Regular Updates',  color: '#7C3AED', bg: '#EDE9FE' },
            ].map((chip, i) => (
              <View key={i} style={[s.chip, { backgroundColor: chip.bg }]}>
                <Ionicons name={chip.icon} size={14} color={chip.color} />
                <Text style={[s.chipTxt, { color: chip.color }]}>{chip.label}</Text>
              </View>
            ))}
          </ScrollView>
        </FadeIn>

        {/* ── Policy sections ───────────────────────────────────────── */}
        <View style={s.sectionsWrap}>
          {SECTIONS.map((section, i) => (
            <View
              key={section.id}
              ref={ref => { sectionRefs.current[section.id] = ref; }}
            >
              <PolicySection section={section} index={i} />
            </View>
          ))}
        </View>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <FadeIn delay={200}>
          <LinearGradient
            colors={[C.navy, C.navyMid]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.footer}
          >
            <Ionicons name="document-text" size={28} color={C.gold} style={{ marginBottom: 10 }} />
            <Text style={s.footerBrand}>Workaflow</Text>
            <Text style={s.footerTagline}>Connecting people. Building trust.</Text>
            <View style={s.footerDivider} />
            <Text style={s.footerCopy}>
              © {new Date().getFullYear()} Workaflow. All rights reserved.{'\n'}
              These terms are effective as of {EFFECTIVE}.
            </Text>
          </LinearGradient>
        </FadeIn>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* ── Table of contents modal overlay ───────────────────────── */}
      {showTOC && (
        <TouchableOpacity
          style={s.tocOverlay}
          activeOpacity={1}
          onPress={() => setShowTOC(false)}
        >
          <TouchableOpacity activeOpacity={1} style={s.tocSheet} onPress={() => {}}>
            <View style={s.tocHandle} />
            <View style={s.tocHeader}>
              <Text style={s.tocTitle}>Contents</Text>
              <TouchableOpacity onPress={() => setShowTOC(false)} style={s.tocClose}>
                <Ionicons name="close" size={20} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {SECTIONS.map((sec, i) => (
                <TocItem
                  key={sec.id}
                  section={sec}
                  index={i}
                  onPress={() => scrollToSection(sec.id)}
                />
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ─── Styles (identical to Privacy Policy) ────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  tocBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.navyLight, alignItems: 'center', justifyContent: 'center',
  },

  // Hero
  hero: {
    margin: 16, borderTopRightRadius: 24,borderTopLeftRadius: 24, padding: 28, alignItems: 'center',
    overflow: 'hidden', position: 'relative',
  },
  heroRing1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    top: -60, right: -60,
  },
  heroRing2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    bottom: -40, left: -30,
  },
  heroIconWrap:   { marginBottom: 14 },
  heroIconCircle: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heroWordmark:   { fontSize: 13, fontWeight: '800', color: C.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  heroTitle:      { fontSize: 28, fontWeight: '800', color: C.white, letterSpacing: -0.5, textAlign: 'center', marginBottom: 10 },
  heroSub:        { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20, marginBottom: 20, maxWidth: 260 },
  heroDates:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroDateChip:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroDateTxt:    { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  heroDateDivider:{ width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Trust chips
  chipsRow: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  chipTxt: { fontSize: 12, fontWeight: '700' },

  // Sections
  sectionsWrap: { paddingHorizontal: 16 },

  // Footer
  footer: {
    margin: 16, borderRadius: 20, padding: 28,
    alignItems: 'center',
  },
  footerBrand:   { fontSize: 20, fontWeight: '800', color: C.white, letterSpacing: 0.5, marginBottom: 4 },
  footerTagline: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 20 },
  footerDivider: { width: 40, height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 16 },
  footerCopy:    { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 19 },

  // TOC overlay
  tocOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(13,27,53,0.6)',
    justifyContent: 'flex-end',
  },
  tocSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '75%',
  },
  tocHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.borderStrong, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  tocHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 4,
  },
  tocTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  tocClose: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
});