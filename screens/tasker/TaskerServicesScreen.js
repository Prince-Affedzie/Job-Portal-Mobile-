// screens/tasker/TaskerServicesScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  TextInput, StyleSheet, Alert, Modal, Dimensions,
  Animated, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { taskerProfileUpdate, taskerGetMyProfile } from '../../api/taskerApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  border: '#E8ECF2',
  borderStrong: '#D1D9E6',
  primary: '#1A3461',
  primaryLight: '#E8EEF9',
  accent: '#C9891A',
  accentLight: '#FDF3E0',
  accentMid: '#E8A730',
  teal: '#0F766E',
  tealLight: '#E0F5F2',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  textPrimary: '#0D1B35',
  textSecondary: '#4A5B7A',
  textMuted: '#8FA0BE',
  white: '#FFFFFF',
  overlay: 'rgba(13,27,53,0.72)',
};

// ─── Price type config ─────────────────────────────────────────────────────────
const PRICE_TYPES = [
  {
    value: 'fixed',
    label: 'Fixed Price',
    shortLabel: 'Fixed',
    icon: 'pricetag-outline',
    color: C.primary,
    bg: C.primaryLight,
    description: 'One flat rate for the service',
  },
  {
    value: 'hourly',
    label: 'Hourly Rate',
    shortLabel: 'Hourly',
    icon: 'time-outline',
    color: C.teal,
    bg: C.tealLight,
    description: 'Charge per hour of work',
  },
  {
    value: 'starts_at',
    label: 'Starts At',
    shortLabel: 'Starts At',
    icon: 'trending-up-outline',
    color: '#7C3AED',
    bg: '#EDE9FE',
    description: 'Minimum price, may vary',
  },
  {
    value: 'negotiable',
    label: 'Negotiable',
    shortLabel: 'Negotiable',
    icon: 'chatbubble-ellipses-outline',
    color: C.accent,
    bg: C.accentLight,
    description: 'Discuss price with client',
  },
];

function getPriceConfig(value) {
  return PRICE_TYPES.find(p => p.value === value) || PRICE_TYPES[3];
}

// ─── Animated entry ────────────────────────────────────────────────────────────
function FadeIn({ delay = 0, children, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 360, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 65, friction: 13, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Price badge ───────────────────────────────────────────────────────────────
function PriceBadge({ priceType, price, currency = 'GHS' }) {
  const cfg = getPriceConfig(priceType);
  const showPrice = price > 0 && priceType !== 'negotiable';
  return (
    <View style={[priceBadgeStyles.wrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={13} color={cfg.color} />
      <Text style={[priceBadgeStyles.label, { color: cfg.color }]}>
        {showPrice
          ? priceType === 'hourly'
            ? `${currency} ${price}/hr`
            : priceType === 'starts_at'
            ? `From ${currency} ${price}`
            : `${currency} ${price}`
          : cfg.shortLabel
        }
      </Text>
    </View>
  );
}
const priceBadgeStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});

// ─── Service card ──────────────────────────────────────────────────────────────
const SERVICE_ICONS = [
  'hammer-outline', 'brush-outline', 'construct-outline', 'cut-outline',
  'car-outline', 'leaf-outline', 'water-outline', 'home-outline',
  'desktop-outline', 'fitness-outline', 'restaurant-outline', 'school-outline',
];

function getServiceIcon(name = '') {
  // deterministically pick an icon from the name string
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % SERVICE_ICONS.length;
  return SERVICE_ICONS[idx];
}

function ServiceCard({ svc, index, onEdit, onRemove }) {
  const cfg = getPriceConfig(svc.priceType);
  const icon = getServiceIcon(svc.name);

  return (
    <FadeIn delay={index * 55} style={serviceCardStyles.wrap}>
      {/* Left accent strip */}
      <View style={[serviceCardStyles.strip, { backgroundColor: cfg.color }]} />

      <View style={serviceCardStyles.iconBox}>
        <View style={[serviceCardStyles.iconCircle, { backgroundColor: cfg.bg }]}>
          <Ionicons name={icon} size={22} color={cfg.color} />
        </View>
      </View>

      <View style={serviceCardStyles.body}>
        <Text style={serviceCardStyles.name}>{svc.name}</Text>
        {svc.description ? (
          <Text style={serviceCardStyles.desc} numberOfLines={2}>{svc.description}</Text>
        ) : null}
        <View style={{ marginTop: 8 }}>
          <PriceBadge priceType={svc.priceType} price={svc.price} currency={svc.currency} />
        </View>
      </View>

      <View style={serviceCardStyles.actions}>
        <TouchableOpacity style={[serviceCardStyles.actionBtn, serviceCardStyles.editBtn]} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pencil-outline" size={16} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[serviceCardStyles.actionBtn, serviceCardStyles.deleteBtn]} onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={16} color={C.danger} />
        </TouchableOpacity>
      </View>
    </FadeIn>
  );
}

const serviceCardStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  strip: { width: 4, alignSelf: 'stretch' },
  iconBox: { paddingHorizontal: 14, paddingVertical: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingVertical: 14, paddingRight: 8 },
  name: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
  desc: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  actions: { flexDirection: 'column', gap: 8, paddingRight: 14, paddingVertical: 14 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  editBtn: { backgroundColor: C.primaryLight },
  deleteBtn: { backgroundColor: C.dangerLight },
});

// ─── Pricing Type Selector ─────────────────────────────────────────────────────
function PricingTypeSelector({ value, onChange }) {
  return (
    <View style={pricingStyles.grid}>
      {PRICE_TYPES.map(pt => {
        const active = value === pt.value;
        return (
          <TouchableOpacity
            key={pt.value}
            style={[pricingStyles.tile, active && { borderColor: pt.color, backgroundColor: pt.bg }]}
            onPress={() => onChange(pt.value)}
            activeOpacity={0.8}
          >
            <View style={[pricingStyles.tileIcon, { backgroundColor: active ? pt.color : C.border }]}>
              <Ionicons name={pt.icon} size={16} color={active ? C.white : C.textMuted} />
            </View>
            <Text style={[pricingStyles.tileLabel, active && { color: pt.color }]}>{pt.shortLabel}</Text>
            {active && (
              <View style={[pricingStyles.checkDot, { backgroundColor: pt.color }]}>
                <Ionicons name="checkmark" size={9} color={C.white} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const pricingStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: (SCREEN_WIDTH - 40 - 10 * 3) / 4,
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface, position: 'relative',
  },
  tileIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textAlign: 'center' },
  checkDot: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

// ─── Add/Edit Modal ────────────────────────────────────────────────────────────
function ServiceModal({ visible, onClose, onSave, editing, saving }) {
  const [form, setForm] = useState({ name: '', description: '', priceType: 'negotiable', price: '', currency: 'GHS' });

  useEffect(() => {
    if (visible) {
      setForm(editing
        ? { name: editing.name || '', description: editing.description || '', priceType: editing.priceType || 'negotiable', price: editing.price != null ? String(editing.price) : '', currency: editing.currency || 'GHS' }
        : { name: '', description: '', priceType: 'negotiable', price: '', currency: 'GHS' }
      );
    }
  }, [visible, editing]);

  const showPrice = form.priceType !== 'negotiable';
  const cfg = getPriceConfig(form.priceType);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />

          <View style={modalStyles.header}>
            <View>
              <Text style={modalStyles.headerTitle}>{editing ? 'Edit Service' : 'Add New Service'}</Text>
              <Text style={modalStyles.headerSub}>{editing ? 'Update your service details' : 'What do you offer clients?'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Service name */}
            <Text style={modalStyles.label}>Service Name <Text style={{ color: C.danger }}>*</Text></Text>
            <TextInput
              style={modalStyles.input}
              value={form.name}
              onChangeText={t => setForm(f => ({ ...f, name: t }))}
              placeholder="e.g. Deep Carpet Cleaning"
              placeholderTextColor={C.textMuted}
            />

            {/* Description */}
            <Text style={modalStyles.label}>Description</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.textarea]}
              value={form.description}
              onChangeText={t => setForm(f => ({ ...f, description: t }))}
              placeholder="What does this service include? Any guarantees, duration, equipment?"
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Pricing type */}
            <Text style={modalStyles.label}>Pricing Type</Text>
            <PricingTypeSelector value={form.priceType} onChange={v => setForm(f => ({ ...f, priceType: v }))} />

            <View style={[modalStyles.descTip, { backgroundColor: cfg.bg }]}>
              <Ionicons name="information-circle-outline" size={14} color={cfg.color} />
              <Text style={[modalStyles.descTipText, { color: cfg.color }]}>{cfg.description}</Text>
            </View>

            {/* Price input */}
            {showPrice && (
              <>
                <Text style={modalStyles.label}>
                  {form.priceType === 'hourly' ? 'Rate per Hour (GHS)' : form.priceType === 'starts_at' ? 'Starting From (GHS)' : 'Price (GHS)'}
                </Text>
                <View style={modalStyles.priceInputRow}>
                  <View style={modalStyles.currencyBox}>
                    <Text style={modalStyles.currencyText}>GHS</Text>
                  </View>
                  <TextInput
                    style={[modalStyles.input, modalStyles.priceInput]}
                    value={form.price}
                    onChangeText={t => setForm(f => ({ ...f, price: t.replace(/[^0-9.]/g, '') }))}
                    placeholder="0.00"
                    placeholderTextColor={C.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={modalStyles.footer}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.saveBtn, saving && { opacity: 0.65 }]}
              onPress={() => onSave(form)}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.white} />
                : <>
                    <Ionicons name={editing ? 'checkmark-circle-outline' : 'add-circle-outline'} size={18} color={C.white} />
                    <Text style={modalStyles.saveText}>{editing ? 'Update Service' : 'Add Service'}</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: 'center', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  label: { fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 18, marginBottom: 8 },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.textPrimary },
  textarea: { minHeight: 110, textAlignVertical: 'top', paddingTop: 13 },
  descTip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, marginTop: 10 },
  descTipText: { fontSize: 12, fontWeight: '500', flex: 1 },
  priceInputRow: { flexDirection: 'row', gap: 10 },
  currencyBox: { height: 50, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.primaryLight, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  currencyText: { fontSize: 14, fontWeight: '700', color: C.primary },
  priceInput: { flex: 1, height: 50 },
  footer: { bottom:25,flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: C.borderStrong },
  cancelText: { fontSize: 15, fontWeight: '600', color: C.textSecondary },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: C.accent },
  saveText: { fontSize: 15, fontWeight: '700', color: C.white },
});

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <FadeIn delay={100} style={styles.emptyWrap}>
      <View style={styles.emptyIconRing}>
        <Ionicons name="briefcase-outline" size={40} color={C.accent} />
      </View>
      <Text style={styles.emptyTitle}>No services added yet</Text>
      <Text style={styles.emptySub}>
        List the services you offer so clients can find and book you. Add pricing, descriptions, and more.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onAdd}>
        <Ionicons name="add" size={18} color={C.white} />
        <Text style={styles.emptyBtnText}>Add Your First Service</Text>
      </TouchableOpacity>
    </FadeIn>
  );
}

// ─── Summary strip ─────────────────────────────────────────────────────────────
function SummaryStrip({ services }) {
  if (services.length === 0) return null;
  const typeCounts = PRICE_TYPES.map(pt => ({
    ...pt,
    count: services.filter(s => s.priceType === pt.value).length,
  })).filter(p => p.count > 0);

  return (
    <FadeIn style={styles.summaryStrip}>
      {typeCounts.map(tc => (
        <View key={tc.value} style={[styles.summaryChip, { backgroundColor: tc.bg }]}>
          <Ionicons name={tc.icon} size={13} color={tc.color} />
          <Text style={[styles.summaryChipText, { color: tc.color }]}>{tc.count} {tc.shortLabel}</Text>
        </View>
      ))}
    </FadeIn>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function TaskerServicesScreen({ navigation }) {
  const [services, setServices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskerGetMyProfile();
      const p = res.data?.taskerProfile || res.data;
      setServices(p?.servicesOffered || []);
    } catch {
      Alert.alert('Error', 'Could not load services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, []);

  const persist = async (updated) => {
    const formData = new FormData();
    formData.append('servicesOffered', JSON.stringify(updated));
    await taskerProfileUpdate(formData);
  };

  const openAdd  = () => { setEditing(null); setShowModal(true); };
  const openEdit = (svc) => { setEditing(svc); setShowModal(true); };

  const handleSave = async (form) => {
    if (!form.name.trim()) { Alert.alert('Required', 'Service name is required.'); return; }
    setSaving(true);
    try {
      const newSvc = {
        ...(editing || {}),
        name: form.name.trim(),
        description: form.description.trim(),
        priceType: form.priceType,
        price: parseFloat(form.price) || 0,
        currency: form.currency,
      };
      const updated = editing
        ? services.map(s => s === editing ? newSvc : s)
        : [...services, newSvc];

      setServices(updated);
      setShowModal(false);
      await persist(updated);
    } catch {
      Alert.alert('Error', 'Failed to save service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (svc) => {
    Alert.alert(
      'Remove Service',
      `Remove "${svc.name}" from your services?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          const updated = services.filter(s => s !== svc);
          setServices(updated);
          try { await persist(updated); }
          catch { Alert.alert('Error', 'Failed to remove service.'); }
        }},
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Services</Text>
          {services.length > 0 && (
            <Text style={styles.headerSub}>{services.length} service{services.length !== 1 ? 's' : ''} listed</Text>
          )}
        </View>
        <TouchableOpacity style={styles.addHeaderBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color={C.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading services…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {services.length === 0 ? (
            <EmptyState onAdd={openAdd} />
          ) : (
            <>
              <SummaryStrip services={services} />
              <View style={styles.listSection}>
                {services.map((svc, idx) => (
                  <ServiceCard
                    key={svc._id || svc.id || idx}
                    svc={svc}
                    index={idx}
                    onEdit={() => openEdit(svc)}
                    onRemove={() => handleRemove(svc)}
                  />
                ))}
              </View>
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB */}
      {!loading && services.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={26} color={C.white} />
        </TouchableOpacity>
      )}

      <ServiceModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        editing={editing}
        saving={saving}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  addHeaderBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: C.textMuted },

  scrollContent: { padding: 16 },

  summaryStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  summaryChipText: { fontSize: 12, fontWeight: '700' },

  listSection: { gap: 2 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingTop: 60 },
  emptyIconRing: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary, marginBottom: 10, textAlign: 'center' },
  emptySub: { fontSize: 14, color: C.textSecondary, lineHeight: 21, textAlign: 'center', marginBottom: 28 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: C.white },

  fab: {
    position: 'absolute', bottom: 98, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});