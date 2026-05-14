import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Animated, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W } = Dimensions.get('window');

// ─── Design tokens ─────────────────────────────────────────────────────────────
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

// ─── Privacy policy data ───────────────────────────────────────────────────────
const LAST_UPDATED = 'May 14, 2025';
const EFFECTIVE    = 'May 14, 2025';

const SECTIONS = [
  {
    id: 'overview',
    icon: 'shield-checkmark-outline',
    color: C.teal,
    bg: C.tealLight,
    title: 'Overview',
    content: `Welcome to Workaflow ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Workaflow platform — including our mobile application and related services.\n\nBy using Workaflow, you agree to the collection and use of information in accordance with this policy. If you do not agree with the terms described here, please discontinue use of our services.`,
  },
  {
    id: 'collect',
    icon: 'layers-outline',
    color: C.navyMid,
    bg: C.navyLight,
    title: 'Information We Collect',
    bullets: [
      {
        heading: 'Account Information',
        text: 'When you register, we collect your name, email address, phone number, password, and profile photo.',
      },
      {
        heading: 'Profile & Professional Data',
        text: 'Taskers may provide work history, certifications, portfolio files, service listings, and location details to enable bookings.',
      },
      {
        heading: 'Transaction Data',
        text: 'We collect information about payments, bookings, task completions, and related financial records necessary to operate the platform.',
      },
      {
        heading: 'Usage Data',
        text: 'We automatically collect data on how you interact with our app — pages visited, features used, session duration, and device information.',
      },
      {
        heading: 'Location Data',
        text: 'With your permission, we collect precise or approximate location data to match clients with nearby taskers and improve service relevance.',
      },
      {
        heading: 'Communications',
        text: 'Messages sent through our in-app chat, support requests, and feedback submissions are stored to facilitate services and resolve disputes.',
      },
    ],
  },
  {
    id: 'use',
    icon: 'settings-outline',
    color: C.gold,
    bg: C.goldLight,
    title: 'How We Use Your Information',
    bullets: [
      { heading: 'Providing Services', text: 'To create and manage your account, process bookings, facilitate payments, and connect clients with taskers.' },
      { heading: 'Communication', text: 'To send you notifications, updates, receipts, and service-related messages. You may opt out of non-essential communications at any time.' },
      { heading: 'Safety & Trust', text: 'To verify identities, conduct background checks (where applicable), detect fraud, and enforce our Terms of Service.' },
      { heading: 'Improvement', text: 'To analyse usage patterns, troubleshoot issues, and improve the functionality, design, and performance of Workaflow.' },
      { heading: 'Legal Compliance', text: 'To comply with applicable laws, regulations, and legal processes in Ghana and any other jurisdiction in which we operate.' },
    ],
  },
  {
    id: 'sharing',
    icon: 'share-social-outline',
    color: '#7C3AED',
    bg: '#EDE9FE',
    title: 'Sharing Your Information',
    content: 'We do not sell your personal data. We may share information in the following limited circumstances:',
    bullets: [
      { heading: 'Between Users', text: 'Clients can see a tasker\'s public profile, ratings, and portfolio. Taskers can see task details and client contact information once a booking is confirmed.' },
      { heading: 'Service Providers', text: 'We engage trusted third-party vendors for payment processing, cloud storage, analytics, and customer support. These parties are bound by confidentiality obligations.' },
      { heading: 'Legal Requirements', text: 'We may disclose information if required by law, court order, or government authority, or to protect the rights, property, or safety of Workaflow or its users.' },
      { heading: 'Business Transfers', text: 'In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you before such a transfer.' },
    ],
  },
  {
    id: 'storage',
    icon: 'server-outline',
    color: '#0F766E',
    bg: '#E0F5F2',
    title: 'Data Storage & Retention',
    content: `Your data is stored on secure servers. We retain your personal information for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements.\n\nWhen you delete your account, we will delete or anonymise your personal data within 30 days, except where retention is required by law or for legitimate business purposes such as fraud prevention.`,
  },
  {
    id: 'security',
    icon: 'lock-closed-outline',
    color: C.navyMid,
    bg: C.navyLight,
    title: 'Security',
    content: `We implement industry-standard technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. These include:\n\n• End-to-end encryption for sensitive communications\n• Secure HTTPS connections across all platform surfaces\n• Regular security audits and vulnerability assessments\n• Strict access controls and employee training\n\nHowever, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.`,
  },
  {
    id: 'rights',
    icon: 'hand-left-outline',
    color: C.gold,
    bg: C.goldLight,
    title: 'Your Rights',
    content: 'Subject to applicable law, you have the following rights regarding your personal data:',
    bullets: [
      { heading: 'Access', text: 'You may request a copy of the personal information we hold about you.' },
      { heading: 'Correction', text: 'You may request that we correct inaccurate or incomplete information.' },
      { heading: 'Deletion', text: 'You may request deletion of your personal data, subject to legal retention requirements.' },
      { heading: 'Portability', text: 'You may request your data in a structured, machine-readable format.' },
      { heading: 'Objection', text: 'You may object to certain processing activities, including direct marketing.' },
      { heading: 'Withdrawal of Consent', text: 'Where processing is based on consent, you may withdraw it at any time without affecting prior lawful processing.' },
    ],
    footer: 'To exercise any of these rights, contact us at privacy@workaflow.app. We will respond within 30 days.',
  },
  {
    id: 'cookies',
    icon: 'radio-button-on-outline',
    color: '#7C3AED',
    bg: '#EDE9FE',
    title: 'Cookies & Tracking',
    content: `Our mobile application may use local storage, device identifiers, and analytics SDKs to improve your experience, remember preferences, and understand usage patterns.\n\nYou can control data collection through your device's privacy settings or by adjusting permissions for the Workaflow app. Disabling certain tracking may limit functionality.`,
  },
  {
    id: 'children',
    icon: 'people-outline',
    color: C.teal,
    bg: C.tealLight,
    title: 'Children\'s Privacy',
    content: `Workaflow is not directed at children under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us immediately and we will take steps to delete such information promptly.`,
  },
  {
    id: 'changes',
    icon: 'refresh-outline',
    color: C.navyMid,
    bg: C.navyLight,
    title: 'Changes to This Policy',
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of material changes through the app or by email at least 14 days before the changes take effect.\n\nContinued use of Workaflow after the effective date of any revised policy constitutes your acceptance of those changes.`,
  },
  {
    id: 'contact',
    icon: 'mail-outline',
    color: C.gold,
    bg: C.goldLight,
    title: 'Contact Us',
    content: `If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please reach out:`,
    contact: [
      { icon: 'mail-outline',     label: 'Email',   value: 'privacy@workaflow.app'   },
      { icon: 'globe-outline',    label: 'Website', value: 'www.workaflow.app'        },
      { icon: 'location-outline', label: 'Address', value: 'Accra, Ghana'            },
    ],
  },
];

// ─── Animated section entry ────────────────────────────────────────────────────
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

// ─── TOC entry ─────────────────────────────────────────────────────────────────
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

// ─── Policy section ────────────────────────────────────────────────────────────
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

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function PrivacyPolicyScreen({ navigation }) {
  const scrollRef = useRef(null);
  const sectionRefs = useRef({});
  const [showTOC, setShowTOC] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const scrollToSection = (id) => {
    setShowTOC(false);
    // Small delay to allow modal close animation
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

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Animated.View style={[s.header, { elevation: headerElevation }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
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
        {/* ── Hero banner ─────────────────────────────────────────────── */}
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
                <Ionicons name="shield-checkmark" size={32} color={C.white} />
              </LinearGradient>
            </View>

            <Text style={s.heroWordmark}>Workaflow</Text>
            <Text style={s.heroTitle}>Privacy Policy</Text>
            <Text style={s.heroSub}>
              We believe privacy is a right, not a feature. Read how we protect your data.
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

        {/* ── Quick trust chips ────────────────────────────────────────── */}
        <FadeIn delay={80}>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipsRow}
          >
            {[
              { icon: 'ban-outline',           label: 'No Data Selling',      color: C.teal,    bg: C.tealLight   },
              { icon: 'lock-closed-outline',   label: 'End-to-End Encrypted', color: C.navyMid, bg: C.navyLight   },
              { icon: 'person-outline',        label: 'You Own Your Data',    color: C.gold,    bg: C.goldLight   },
              { icon: 'eye-off-outline',       label: 'No Ads Tracking',      color: '#7C3AED', bg: '#EDE9FE'     },
            ].map((chip, i) => (
              <View key={i} style={[s.chip, { backgroundColor: chip.bg }]}>
                <Ionicons name={chip.icon} size={14} color={chip.color} />
                <Text style={[s.chipTxt, { color: chip.color }]}>{chip.label}</Text>
              </View>
            ))}
          </ScrollView>
        </FadeIn>

        {/* ── Policy sections ─────────────────────────────────────────── */}
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

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <FadeIn delay={200}>
          <LinearGradient
            colors={[C.navy, C.navyMid]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.footer}
          >
            <Ionicons name="shield-checkmark" size={28} color={C.gold} style={{ marginBottom: 10 }} />
            <Text style={s.footerBrand}>Workaflow</Text>
            <Text style={s.footerTagline}>Connecting people. Building trust.</Text>
            <View style={s.footerDivider} />
            <Text style={s.footerCopy}>
              © {new Date().getFullYear()} Workaflow. All rights reserved.{'\n'}
              This policy is effective as of {EFFECTIVE}.
            </Text>
          </LinearGradient>
        </FadeIn>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* ── Table of contents modal overlay ─────────────────────────── */}
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

// ─── Styles ────────────────────────────────────────────────────────────────────
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