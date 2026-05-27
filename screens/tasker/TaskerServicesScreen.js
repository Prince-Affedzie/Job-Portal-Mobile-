// screens/tasker/TaskerServicesScreen.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  TextInput, StyleSheet, Alert, Modal, Dimensions,
  Animated, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { taskerProfileUpdate, taskerGetMyProfile } from '../../api/taskerApi';
import {SERVICES_CATALOGUE} from '../../data/services'

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Services catalogue ────────────────────────────────────────────────────────


// Flat list of all sub-services for quick search
const ALL_SUGGESTIONS = SERVICES_CATALOGUE.flatMap(cat =>
  cat.subServices.map(sub => ({
    ...sub,
    category:     cat.category,
    categoryIcon: cat.icon,
  }))
);

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:           '#F4F6FB',
  surface:      '#FFFFFF',
  border:       '#E8ECF2',
  borderStrong: '#D1D9E6',
  primary:      '#1A3461',
  primaryLight: '#E8EEF9',
  accent:       '#C9891A',
  accentLight:  '#FDF3E0',
  accentMid:    '#E8A730',
  teal:         '#0F766E',
  tealLight:    '#E0F5F2',
  danger:       '#DC2626',
  dangerLight:  '#FEE2E2',
  textPrimary:  '#0D1B35',
  textSecondary:'#4A5B7A',
  textMuted:    '#8FA0BE',
  white:        '#FFFFFF',
  overlay:      'rgba(13,27,53,0.72)',
};

// ─── Price type config ─────────────────────────────────────────────────────────
const PRICE_TYPES = [
  { value: 'fixed',      label: 'Fixed Price', shortLabel: 'Fixed',      icon: 'pricetag-outline',            color: C.primary, bg: C.primaryLight, description: 'One flat rate for the service' },
  { value: 'hourly',     label: 'Hourly Rate', shortLabel: 'Hourly',     icon: 'time-outline',                color: C.teal,    bg: C.tealLight,    description: 'Charge per hour of work'       },
  { value: 'starts_at',  label: 'Starts At',   shortLabel: 'Starts At',  icon: 'trending-up-outline',         color: '#7C3AED', bg: '#EDE9FE',       description: 'Minimum price, may vary'       },
  { value: 'negotiable', label: 'Negotiable',  shortLabel: 'Negotiable', icon: 'chatbubble-ellipses-outline', color: C.accent,  bg: C.accentLight,  description: 'Discuss price with client'     },
];
function getPriceConfig(value) { return PRICE_TYPES.find(p => p.value === value) || PRICE_TYPES[3]; }

// ─── Animated entry ────────────────────────────────────────────────────────────
function FadeIn({ delay = 0, children, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 360, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 65, friction: 13, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

// ─── Price badge ───────────────────────────────────────────────────────────────
function PriceBadge({ priceType, price, currency = 'GHS' }) {
  const cfg = getPriceConfig(priceType);
  const showPrice = price > 0 && priceType !== 'negotiable';
  return (
    <View style={[pbSt.wrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={13} color={cfg.color} />
      <Text style={[pbSt.label, { color: cfg.color }]}>
        {showPrice
          ? priceType === 'hourly'    ? `${currency} ${price}/hr`
          : priceType === 'starts_at' ? `From ${currency} ${price}`
          : `${currency} ${price}`
          : cfg.shortLabel}
      </Text>
    </View>
  );
}
const pbSt = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});

// ─── Service icon helpers ──────────────────────────────────────────────────────
const SERVICE_ICONS = [
  'hammer-outline','brush-outline','construct-outline','cut-outline',
  'car-outline','leaf-outline','water-outline','home-outline',
  'desktop-outline','fitness-outline','restaurant-outline','school-outline',
];
function getServiceIcon(name = '') {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % SERVICE_ICONS.length;
  return SERVICE_ICONS[idx];
}

// ─── Service card ──────────────────────────────────────────────────────────────
function ServiceCard({ svc, index, onEdit, onRemove }) {
  const cfg  = getPriceConfig(svc.priceType);
  const icon = getServiceIcon(svc.name);
  return (
    <FadeIn delay={index * 55} style={scSt.wrap}>
      <View style={[scSt.strip, { backgroundColor: cfg.color }]} />
      <View style={scSt.iconBox}>
        <View style={[scSt.iconCircle, { backgroundColor: cfg.bg }]}>
          <Ionicons name={icon} size={22} color={cfg.color} />
        </View>
      </View>
      <View style={scSt.body}>
        <Text style={scSt.name}>{svc.name}</Text>
        {svc.description
          ? <Text style={scSt.desc} numberOfLines={2}>{svc.description}</Text>
          : null}
        {svc.tags?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 5 }}>
            {svc.tags.slice(0, 4).map((tag, i) => (
              <View key={i} style={scSt.tagPill}>
                <Text style={scSt.tagText}>{tag}</Text>
              </View>
            ))}
            {svc.tags.length > 4 && (
              <View style={scSt.tagPill}>
                <Text style={scSt.tagText}>+{svc.tags.length - 4}</Text>
              </View>
            )}
          </ScrollView>
        )}
        <View style={{ marginTop: 8 }}>
          <PriceBadge priceType={svc.priceType} price={svc.price} currency={svc.currency} />
        </View>
      </View>
      <View style={scSt.actions}>
        <TouchableOpacity style={[scSt.actionBtn, scSt.editBtn]} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pencil-outline" size={16} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[scSt.actionBtn, scSt.deleteBtn]} onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={16} color={C.danger} />
        </TouchableOpacity>
      </View>
    </FadeIn>
  );
}
const scSt = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  strip:      { width: 4, alignSelf: 'stretch' },
  iconBox:    { paddingHorizontal: 14, paddingVertical: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body:       { flex: 1, paddingVertical: 14, paddingRight: 8 },
  name:       { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
  desc:       { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  tagPill:    { backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText:    { fontSize: 11, color: C.primary, fontWeight: '600' },
  actions:    { flexDirection: 'column', gap: 8, paddingRight: 14, paddingVertical: 14 },
  actionBtn:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  editBtn:    { backgroundColor: C.primaryLight },
  deleteBtn:  { backgroundColor: C.dangerLight },
});

// ─── Pricing type selector ─────────────────────────────────────────────────────
function PricingTypeSelector({ value, onChange }) {
  return (
    <View style={ptSt.grid}>
      {PRICE_TYPES.map(pt => {
        const active = value === pt.value;
        return (
          <TouchableOpacity
            key={pt.value}
            style={[ptSt.tile, active && { borderColor: pt.color, backgroundColor: pt.bg }]}
            onPress={() => onChange(pt.value)}
            activeOpacity={0.8}
          >
            <View style={[ptSt.tileIcon, { backgroundColor: active ? pt.color : C.border }]}>
              <Ionicons name={pt.icon} size={16} color={active ? C.white : C.textMuted} />
            </View>
            <Text style={[ptSt.tileLabel, active && { color: pt.color }]}>{pt.shortLabel}</Text>
            {active && (
              <View style={[ptSt.checkDot, { backgroundColor: pt.color }]}>
                <Ionicons name="checkmark" size={9} color={C.white} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const ptSt = StyleSheet.create({
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile:      { width: (SCREEN_WIDTH - 40 - 30) / 4, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, position: 'relative' },
  tileIcon:  { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textAlign: 'center' },
  checkDot:  { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

// ─── Suggestion row ────────────────────────────────────────────────────────────
function SuggestionRow({ item, onSelect }) {
  return (
    <TouchableOpacity style={srSt.row} onPress={() => onSelect(item)} activeOpacity={0.75}>
      <View style={srSt.iconBox}>
        <Ionicons name={item.categoryIcon} size={16} color={C.primary} />
      </View>
      <View style={srSt.info}>
        <Text style={srSt.name}>{item.name}</Text>
        <Text style={srSt.cat}>{item.category}</Text>
      </View>
      <View style={srSt.tagPreview}>
        {item.tags.slice(0, 2).map((t, i) => (
          <View key={i} style={srSt.tagChip}>
            <Text style={srSt.tagChipText}>{t}</Text>
          </View>
        ))}
        {item.tags.length > 2 && (
          <Text style={srSt.more}>+{item.tags.length - 2}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
const srSt = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  iconBox:     { width: 34, height: 34, borderRadius: 10, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  info:        { flex: 1 },
  name:        { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  cat:         { fontSize: 11, color: C.textMuted, marginTop: 1 },
  tagPreview:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagChip:     { backgroundColor: C.primaryLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  tagChipText: { fontSize: 10, color: C.primary, fontWeight: '600' },
  more:        { fontSize: 10, color: C.textMuted, fontWeight: '600' },
});

// ─── Tags editor ───────────────────────────────────────────────────────────────
function TagsEditor({ tags, onChange }) {
  const [input, setInput] = useState('');

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (!tags.includes(tag)) onChange([...tags, tag]);
    setInput('');
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));

  return (
    <View style={teSt.wrap}>
      {tags.length > 0 && (
        <View style={teSt.chipsWrap}>
          {tags.map((tag, i) => (
            <View key={i} style={teSt.chip}>
              <Text style={teSt.chipText}>{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="close" size={12} color={C.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <View style={teSt.inputRow}>
        <TextInput
          style={teSt.input}
          value={input}
          onChangeText={setInput}
          placeholder="Add a custom tag…"
          placeholderTextColor={C.textMuted}
          returnKeyType="done"
          onSubmitEditing={() => addTag(input)}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[teSt.addBtn, !input.trim() && { opacity: 0.4 }]}
          onPress={() => addTag(input)}
          disabled={!input.trim()}
        >
          <Ionicons name="add" size={18} color={C.white} />
        </TouchableOpacity>
      </View>
      <Text style={teSt.hint}>Tags help clients find your service when searching</Text>
    </View>
  );
}
const teSt = StyleSheet.create({
  wrap:      { marginTop: 4 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.primary + '30' },
  chipText:  { fontSize: 12, color: C.primary, fontWeight: '600' },
  inputRow:  { flexDirection: 'row', gap: 8 },
  input:     { flex: 1, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: C.textPrimary },
  addBtn:    { width: 44, height: 44, borderRadius: 12, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' },
  hint:      { fontSize: 11, color: C.textMuted, marginTop: 7, fontStyle: 'italic' },
});

// ─── Add / Edit Modal ──────────────────────────────────────────────────────────
function ServiceModal({ visible, onClose, onSave, editing, saving }) {
  const [form, setForm] = useState({
    name: '', description: '', priceType: 'negotiable', price: '', currency: 'GHS', tags: [],
  });
  const [query,          setQuery]          = useState('');
  const [showSuggs,      setShowSuggs]      = useState(false);
  const [fromSuggestion, setFromSuggestion] = useState(false);

  // Reset on open
  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setForm({
        name:        editing.name        || '',
        description: editing.description || '',
        priceType:   editing.priceType   || 'negotiable',
        price:       editing.price != null ? String(editing.price) : '',
        currency:    editing.currency    || 'GHS',
        tags:        editing.tags        || [],
      });
      setQuery(editing.name || '');
    } else {
      setForm({ name: '', description: '', priceType: 'negotiable', price: '', currency: 'GHS', tags: [] });
      setQuery('');
    }
    setShowSuggs(false);
    setFromSuggestion(false);
  }, [visible, editing]);

  // Live-filter suggestions
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return ALL_SUGGESTIONS.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [query]);

  const handleNameChange = (text) => {
    setQuery(text);
    setForm(f => ({ ...f, name: text }));
    setFromSuggestion(false);
    setShowSuggs(text.trim().length >= 2);
  };

  const handleSelectSuggestion = (item) => {
    setForm(f => ({
      ...f,
      name: item.name,
      tags: [...new Set([...f.tags, ...item.tags])],
    }));
    setQuery(item.name);
    setShowSuggs(false);
    setFromSuggestion(true);
  };

  const showPrice = form.priceType !== 'negotiable';
  const cfg       = getPriceConfig(form.priceType);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mSt.overlay}>
        <View style={mSt.sheet}>
          <View style={mSt.handle} />

          {/* Header */}
          <View style={mSt.header}>
            <View>
              <Text style={mSt.headerTitle}>{editing ? 'Edit Service' : 'Add New Service'}</Text>
              <Text style={mSt.headerSub}>{editing ? 'Update your service details' : 'What do you offer clients?'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={mSt.closeBtn}>
              <Ionicons name="close" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={mSt.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ── Service name + live suggestions ──────────────────────── */}
            <Text style={mSt.label}>Service Name <Text style={{ color: C.danger }}>*</Text></Text>
            <View>
              {/* Input row */}
              <View style={mSt.nameRow}>
                <Ionicons name="search-outline" size={17} color={C.textMuted} />
                <TextInput
                  style={mSt.nameInput}
                  value={query}
                  onChangeText={handleNameChange}
                  onFocus={() => { if (query.trim().length >= 2) setShowSuggs(true); }}
                  placeholder="e.g. Plumbing, Graphic Design…"
                  placeholderTextColor={C.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={() => setShowSuggs(false)}
                />
                {query.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setQuery('');
                      setForm(f => ({ ...f, name: '', tags: [] }));
                      setShowSuggs(false);
                      setFromSuggestion(false);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dropdown suggestions */}
              {showSuggs && suggestions.length > 0 && (
                <View style={mSt.suggBox}>
                  {/* Header strip */}
                  <View style={mSt.suggBanner}>
                    <Ionicons name="flash-outline" size={13} color={C.accent} />
                    <Text style={mSt.suggBannerText}>Suggestions — tap to auto-fill tags</Text>
                  </View>

                  {suggestions.map((item, i) => (
                    <SuggestionRow key={i} item={item} onSelect={handleSelectSuggestion} />
                  ))}

                  {/* "Use as custom" escape hatch */}
                  <TouchableOpacity style={mSt.customRow} onPress={() => setShowSuggs(false)}>
                    <Ionicons name="pencil-outline" size={14} color={C.teal} />
                    <Text style={mSt.customRowText}>Use "{query}" as a custom service</Text>
                    <Ionicons name="chevron-forward" size={13} color={C.teal} />
                  </TouchableOpacity>
                </View>
              )}

              {/* No match hint */}
              {showSuggs && suggestions.length === 0 && query.trim().length >= 2 && (
                <View style={mSt.noMatchBox}>
                  <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                  <Text style={mSt.noMatchText}>
                    No preset match — you can still use "{query}" and add custom tags below.
                  </Text>
                </View>
              )}
            </View>

            {/* Auto-fill confirmation banner */}
            {fromSuggestion && form.tags.length > 0 && (
              <View style={mSt.autoFillBanner}>
                <Ionicons name="checkmark-circle" size={15} color={C.teal} />
                <Text style={mSt.autoFillText}>
                  {form.tags.length} tags auto-filled — edit or add more below
                </Text>
              </View>
            )}

            {/* Description */}
            <Text style={mSt.label}>Description</Text>
            <TextInput
              style={[mSt.input, mSt.textarea]}
              value={form.description}
              onChangeText={t => setForm(f => ({ ...f, description: t }))}
              placeholder="What does this service include? Duration, equipment, guarantees…"
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />


            {/* Pricing type */}
            <Text style={[mSt.label, { marginTop: 20 }]}>Pricing Type</Text>
            <PricingTypeSelector value={form.priceType} onChange={v => setForm(f => ({ ...f, priceType: v }))} />

            <View style={[mSt.descTip, { backgroundColor: cfg.bg }]}>
              <Ionicons name="information-circle-outline" size={14} color={cfg.color} />
              <Text style={[mSt.descTipText, { color: cfg.color }]}>{cfg.description}</Text>
            </View>

            {/* Price amount */}
            {showPrice && (
              <>
                <Text style={mSt.label}>
                  {form.priceType === 'hourly' ? 'Rate per Hour (GHS)' : form.priceType === 'starts_at' ? 'Starting From (GHS)' : 'Price (GHS)'}
                </Text>
                <View style={mSt.priceRow}>
                  <View style={mSt.currencyBox}>
                    <Text style={mSt.currencyText}>GHS</Text>
                  </View>
                  <TextInput
                    style={[mSt.input, mSt.priceInput]}
                    value={form.price}
                    onChangeText={t => setForm(f => ({ ...f, price: t.replace(/[^0-9.]/g, '') }))}
                    placeholder="0.00"
                    placeholderTextColor={C.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </>
            )}

            {/* Tags */}
            <View style={mSt.labelRow}>
              <Text style={mSt.label}>Service Tags</Text>
              {form.tags.length > 0 && (
                <View style={mSt.tagCountBadge}>
                  <Text style={mSt.tagCountText}>{form.tags.length}</Text>
                </View>
              )}
            </View>
            <TagsEditor
              tags={form.tags}
              onChange={tags => setForm(f => ({ ...f, tags }))}
            />

            

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Footer */}
          <View style={mSt.footer}>
            <TouchableOpacity style={mSt.cancelBtn} onPress={onClose}>
              <Text style={mSt.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[mSt.saveBtn, saving && { opacity: 0.65 }]}
              onPress={() => onSave(form)}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.white} />
                : <>
                    <Ionicons name={editing ? 'checkmark-circle-outline' : 'add-circle-outline'} size={18} color={C.white} />
                    <Text style={mSt.saveText}>{editing ? 'Update Service' : 'Add Service'}</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const mSt = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  sheet:    { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '95%' },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: 'center', marginTop: 12 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  headerSub:   { fontSize: 13, color: C.textMuted, marginTop: 2 },
  closeBtn:    { width: 32, height: 32, borderRadius: 8, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  body:     { paddingHorizontal: 20, paddingTop: 4 },
  label:    { fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 18, marginBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 8 },
  tagCountBadge: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  tagCountText:  { fontSize: 10, fontWeight: '800', color: C.white },

  input:    { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.textPrimary },
  textarea: { minHeight: 110, textAlignVertical: 'top', paddingTop: 13 },

  // Name search row
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 13, height: 50 },
  nameInput: { flex: 1, fontSize: 15, color: C.textPrimary },

  // Suggestions dropdown
  suggBox:        { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, marginTop: 6, overflow: 'hidden', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 8 },
  suggBanner:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.accentLight, borderBottomWidth: 1, borderBottomColor: C.border },
  suggBannerText: { fontSize: 11, fontWeight: '700', color: C.accent, letterSpacing: 0.4 },
  customRow:      { flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: C.tealLight },
  customRowText:  { flex: 1, fontSize: 13, color: C.teal, fontWeight: '600' },

  noMatchBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 8, backgroundColor: C.bg, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  noMatchText: { flex: 1, fontSize: 12, color: C.textMuted, lineHeight: 18 },

  autoFillBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.tealLight, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: C.teal + '30' },
  autoFillText:   { flex: 1, fontSize: 13, color: C.teal, fontWeight: '600' },

  descTip:     { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, marginTop: 10 },
  descTipText: { fontSize: 12, fontWeight: '500', flex: 1 },

  priceRow:     { flexDirection: 'row', gap: 10 },
  currencyBox:  { height: 50, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.primaryLight, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  currencyText: { fontSize: 14, fontWeight: '700', color: C.primary },
  priceInput:   { flex: 1, height: 50 },

  footer:     { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === 'ios' ? 32 : 16,bottom:25 },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: C.borderStrong },
  cancelText: { fontSize: 15, fontWeight: '600', color: C.textSecondary },
  saveBtn:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: C.accent },
  saveText:   { fontSize: 15, fontWeight: '700', color: C.white },
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
  const typeCounts = PRICE_TYPES
    .map(pt => ({ ...pt, count: services.filter(s => s.priceType === pt.value).length }))
    .filter(p => p.count > 0);
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
  const [services,  setServices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [saving,    setSaving]    = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskerGetMyProfile();
      const p   = res.data?.taskerProfile || res.data;
      setServices(p?.servicesOffered || []);
    } catch {
      Alert.alert('Error', 'Could not load services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, []);

 const persist = async (updated) => {
  // 1. Remove tags from each service object
  const cleanServices = updated.map(({ tags, ...svc }) => svc);
  // 2. Collect all unique tags from all services
  const allTags = [...new Set(updated.flatMap(svc => svc.tags || []))];

  const formData = new FormData();
  formData.append('servicesOffered', JSON.stringify(cleanServices));
  formData.append('tags', JSON.stringify(allTags));          // top‑level field
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
        name:        form.name.trim(),
        description: form.description.trim(),
        priceType:   form.priceType,
        price:       parseFloat(form.price) || 0,
        currency:    form.currency,
        tags:        form.tags || [],       // ← tags sent to backend
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
  backBtn:        { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerCenter:   { flex: 1, alignItems: 'center' },
  headerTitle:    { fontSize: 17, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  headerSub:      { fontSize: 12, color: C.textMuted, marginTop: 1 },
  addHeaderBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },

  loadingBox:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:    { fontSize: 14, color: C.textMuted },

  scrollContent:  { padding: 16 },
  summaryStrip:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  summaryChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  summaryChipText:{ fontSize: 12, fontWeight: '700' },
  listSection:    { gap: 2 },

  emptyWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingTop: 60 },
  emptyIconRing:  { width: 90, height: 90, borderRadius: 45, backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle:     { fontSize: 20, fontWeight: '800', color: C.textPrimary, marginBottom: 10, textAlign: 'center' },
  emptySub:       { fontSize: 14, color: C.textSecondary, lineHeight: 21, textAlign: 'center', marginBottom: 28 },
  emptyBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText:   { fontSize: 15, fontWeight: '700', color: C.white },

  fab: {
    position: 'absolute', bottom: 98, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});