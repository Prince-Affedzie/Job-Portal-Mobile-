// screens/TaskerOnboardingScreen.js
import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Image, StyleSheet, Alert, ActivityIndicator, Dimensions,
  Animated, StatusBar, KeyboardAvoidingView, Platform, FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { taskerOnboarding, uploadProfileImage } from '../../api/authApi';
import { sendFileToS3 } from '../../api/commonApi';
import { AuthContext } from '../../context/AuthContext';
import {SERVICES_CATALOGUE} from '../../data/services'


const { width, height } = Dimensions.get('window');

// ─── Theme: Pacific Indigo & Warm Gold ────────────────────────────────────────
const C = {
  bg: '#F9FAFC', surface: '#FFFFFF', border: '#E4E8EE',
  accent: '#1E3A6E', accentLight: '#DDE7F5', gold: '#D49B3F', goldLight: '#FCF3E1',
  green: '#0F766E', greenLight: '#D1FAE5', red: '#DC2626', redLight: '#FEE2E2',
  textPrimary: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8',
  white: '#FFFFFF',
};


const ALL_SUGGESTIONS = SERVICES_CATALOGUE.flatMap(cat =>
  cat.subServices.map(sub => ({ ...sub, category: cat.category, categoryIcon: cat.icon }))
);

// ─── Constants ────────────────────────────────────────────────────────────────
const GHANA_REGIONS = [
  'Greater Accra','Ashanti','Western','Central','Eastern',
  'Northern','Upper East','Upper West','Volta','Oti',
  'Ahafo','Bono','Bono East','North East','Savannah','Western North',
];

const PRICE_TYPES = [
  { value: 'fixed',      label: 'Fixed',      desc: 'One flat price',    icon: 'pricetag' },
  { value: 'hourly',     label: 'Per Hour',   desc: 'Billed by time',    icon: 'time' },
  { value: 'starts_at',  label: 'Starts At',  desc: 'Minimum starting',  icon: 'trending-up' },
  { value: 'negotiable', label: 'Negotiable', desc: 'Agree with client', icon: 'chatbubbles' },
];

const STEPS = [
  { id: 1, title: 'Your Photo',    icon: 'camera-outline'    },
  { id: 2, title: 'Identity',      icon: 'person-outline'    },
  { id: 3, title: 'Your Story',    icon: 'create-outline'    },
  { id: 4, title: 'Services',      icon: 'construct-outline' },
  { id: 5, title: 'Location',      icon: 'location-outline'  },
];

// ─── Animation helper ─────────────────────────────────────────────────────────
function useEntrance(delay = 0) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 480, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 52, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity: op, transform: [{ translateY: ty }] };
}

// ─── Common sub‑components ────────────────────────────────────────────────────
function Label({ text, required }) {
  return <Text style={s.label}>{text}{required && <Text style={{ color: C.red }}> *</Text>}</Text>;
}
function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType, maxLength, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[s.input, multiline && s.inputMulti, focused && s.inputFocus, error && s.inputErr]}
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={C.textMuted} multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'} keyboardType={keyboardType || 'default'}
      maxLength={maxLength} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      returnKeyType={multiline ? 'default' : 'next'}
    />
  );
}
function FieldWrap({ label, required, hint, error, children }) {
  return (
    <View style={s.fieldWrap}>
      <Label text={label} required={required} />
      {hint && <Text style={s.hint}>{hint}</Text>}
      {children}
      {error && <View style={s.errRow}><Ionicons name="alert-circle-outline" size={13} color={C.red} /><Text style={s.errText}>{error}</Text></View>}
    </View>
  );
}
function ProgressBar({ current, total }) {
  const pct = ((current - 1) / (total - 1)) * 100;
  return (
    <View style={s.progressWrap}>
      <View style={s.progressTrack}><Animated.View style={[s.progressFill, { width: `${pct}%` }]} /></View>
      <Text style={s.progressLabel}>{current} of {total}</Text>
    </View>
  );
}

// ─── Step 1: Photo ─────────────────────────────────────────────────────────────
function Step1Photo({ photoUri, imgUploading, pickPhoto, goNext }) {
  const a0 = useEntrance(0), a1 = useEntrance(100), a2 = useEntrance(200);
  return (
    <ScrollView contentContainerStyle={s.stepScroll} showsVerticalScrollIndicator={false}>
      <Animated.View style={[s.photoHero, a0]}>
        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={s.photoCircleWrap}>
          {photoUri ? <Image source={{ uri: photoUri }} style={s.photoCircle} /> : (
            <LinearGradient colors={[C.accentLight, C.surface]} style={s.photoCircle}>
              <Ionicons name="person" size={52} color={C.textMuted} />
            </LinearGradient>
          )}
          <View style={s.photoEditBadge}>
            {imgUploading ? <ActivityIndicator size="small" color={C.white} /> : <Ionicons name="camera" size={18} color={C.white} />}
          </View>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={a1}>
        <Text style={s.heroTitle}>First impressions{'\n'}matter.</Text>
        <Text style={s.heroSub}>A clear, professional photo helps clients trust and choose you. Tap the circle to upload yours.</Text>
      </Animated.View>
      <Animated.View style={[s.tipCard, a2]}>
        <Ionicons name="bulb-outline" size={18} color={C.gold} />
        <Text style={s.tipText}>Taskers with professional photos get{' '}
          <Text style={{ fontWeight: '800', color: C.accent }}>3× more bookings</Text>. Use a well-lit, front‑facing photo.
        </Text>
      </Animated.View>
      <Animated.View style={[s.skipRow, a2]}>
        <TouchableOpacity onPress={goNext} style={s.skipBtn}><Text style={s.skipText}>Skip for now</Text></TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Step 2: Identity ──────────────────────────────────────────────────────────
function Step2Identity({ phone, setPhone, providerType, setProviderType, businessName, setBusinessName, errors }) {
  const a0 = useEntrance(0), a1 = useEntrance(80), a2 = useEntrance(160);
  return (
    <ScrollView contentContainerStyle={s.stepScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Animated.View style={a0}>
        <FieldWrap label="Phone Number" required error={errors.phone} hint="Clients use this to coordinate with you after booking">
          <View style={s.phoneRow}>
            <View style={s.phonePrefix}><Text style={s.phonePrefixText}>🇬🇭 +233</Text></View>
            <TextInput style={[s.phoneInput, errors.phone && s.inputErr]} value={phone} onChangeText={setPhone} placeholder="XX XXX XXXX" placeholderTextColor={C.textMuted} keyboardType="phone-pad" maxLength={12} />
          </View>
        </FieldWrap>
      </Animated.View>
      <Animated.View style={a1}>
        <Text style={s.subSectionTitle}>I am a…</Text>
        <View style={s.providerRow}>
          {[{ value: 'individual', label: 'Individual', emoji: '🙋', desc: 'Solo professional' },{ value: 'business', label: 'Business', emoji: '🏢', desc: 'Company or team' }].map(pt => (
            <TouchableOpacity key={pt.value} style={[s.providerCard, providerType === pt.value && s.providerCardActive]} onPress={() => setProviderType(pt.value)} activeOpacity={0.8}>
              <Text style={s.providerEmoji}>{pt.emoji}</Text>
              <Text style={[s.providerLabel, providerType === pt.value && { color: C.accent }]}>{pt.label}</Text>
              <Text style={s.providerDesc}>{pt.desc}</Text>
              {providerType === pt.value && <View style={s.providerCheck}><Ionicons name="checkmark" size={11} color={C.white} /></View>}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
      <Animated.View style={a2}>
        <FieldWrap label="Business Name" required error={errors.businessName}>
          <StyledInput value={businessName} onChangeText={setBusinessName} placeholder="e.g. Kofi & Sons Electrical" error={errors.businessName} />
        </FieldWrap>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Step 3: Story ─────────────────────────────────────────────────────────────
function Step3Story({ bio, setBio, tagline, setTagline, errors }) {
  const a0 = useEntrance(0), a1 = useEntrance(100);
  return (
    <ScrollView contentContainerStyle={s.stepScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Animated.View style={a0}>
        <FieldWrap label="About You" required hint="Write in first person. What can you do? What sets you apart?" error={errors.bio}>
          <StyledInput multiline value={bio} onChangeText={setBio} placeholder="e.g. I'm a certified electrician with 8 years of experience across Accra…" maxLength={600} error={errors.bio} />
          <Text style={s.charCount}>{bio.length}/600</Text>
        </FieldWrap>
      </Animated.View>
      <Animated.View style={a1}>
        <FieldWrap label="Tagline" hint="One punchy sentence clients see first (optional)">
          <StyledInput value={tagline} onChangeText={setTagline} placeholder="e.g. Accra's most reliable electrician" maxLength={80} />
          <Text style={s.charCount}>{tagline.length}/80</Text>
        </FieldWrap>
      </Animated.View>
      <Animated.View style={[s.tipCard, { marginTop: 8 }, useEntrance(200)]}>
        <Ionicons name="sparkles-outline" size={18} color={C.gold} />
        <Text style={s.tipText}>Profiles with detailed bios receive{' '}
          <Text style={{ fontWeight: '800', color: C.accent }}>60% more enquiries</Text>. Be honest, specific, and warm.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Step 4: Services ──────────────────────────────────────────────────────────
function Step4Services({ services, errors, openSvcModal, removeSvc }) {
  const a0 = useEntrance(0);
  return (
    <ScrollView contentContainerStyle={s.stepScroll} showsVerticalScrollIndicator={false}>
      <Animated.View style={a0}>
        {services.length === 0 ? (
          <View style={s.svcEmpty}>
            <View style={s.svcEmptyIcon}><Ionicons name="construct-outline" size={38} color={C.textMuted} /></View>
            <Text style={s.svcEmptyTitle}>No services yet</Text>
            <Text style={s.svcEmptyDesc}>Add the services you offer — clients use these to find and book you.</Text>
          </View>
        ) : (
          <View style={s.svcList}>
            {services.map((svc, i) => {
              const pt = PRICE_TYPES.find(p => p.value === svc.priceType) || PRICE_TYPES[3];
              return (
                <View key={i} style={s.svcItem}>
                  <View style={s.svcItemLeft}>
                    <View style={s.svcItemIconWrap}><Ionicons name={pt.icon} size={15} color={C.accent} /></View>
                    <View style={s.svcItemBody}>
                      <Text style={s.svcItemName}>{svc.name}</Text>
                      {svc.description ? <Text style={s.svcItemDesc} numberOfLines={1}>{svc.description}</Text> : null}
                      <View style={s.svcPricePill}>
                        <Text style={s.svcPricePillText}>{pt.label}{svc.price > 0 && svc.priceType !== 'negotiable' ? ` · GHS ${svc.price}` : ''}</Text>
                      </View>
                      {svc.tags?.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 5 }}>
                          {svc.tags.map((tag, idx) => (
                            <View key={idx} style={s.tagPill}><Text style={s.tagText}>{tag}</Text></View>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>
                  <View style={s.svcItemActions}>
                    <TouchableOpacity onPress={() => openSvcModal(svc)} style={s.svcActionBtn}><Ionicons name="create-outline" size={16} color={C.accent} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => removeSvc(svc)} style={s.svcActionBtn}><Ionicons name="trash-outline" size={16} color={C.red} /></TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {errors.services && <View style={[s.errRow, { marginTop: 8 }]}><Ionicons name="alert-circle-outline" size={13} color={C.red} /><Text style={s.errText}>{errors.services}</Text></View>}
        <TouchableOpacity style={s.addSvcBtn} onPress={() => openSvcModal()} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={20} color={C.accent} /><Text style={s.addSvcBtnText}>Add a Service</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Step 5: Location ──────────────────────────────────────────────────────────
function Step5Location({ region, setRegion, city, setCity, errors, setShowRegion }) {
  const a0 = useEntrance(0), a1 = useEntrance(100);
  return (
    <ScrollView contentContainerStyle={s.stepScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Animated.View style={a0}>
        <FieldWrap label="Region" required error={errors.region}>
          <TouchableOpacity style={[s.input, s.pickerRow, errors.region && s.inputErr]} onPress={() => setShowRegion(true)}>
            <Text style={region ? s.pickerVal : s.pickerPlaceholder}>{region || 'Select your region…'}</Text>
            <Ionicons name="chevron-down" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </FieldWrap>
      </Animated.View>
      <Animated.View style={a1}>
        <FieldWrap label="City / Area" required error={errors.city} hint="The area where you primarily operate">
          <StyledInput value={city} onChangeText={setCity} placeholder="e.g. East Legon, Tema, Kumasi" error={errors.city} />
        </FieldWrap>
        <View style={s.geoNote}><Ionicons name="navigate-circle-outline" size={16} color={C.green} /><Text style={s.geoNoteText}>Clients nearby will find you based on this location. Coordinates are set automatically.</Text></View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Enhanced Service Modal (used during onboarding) ──────────────────────────
function ServiceModal({ visible, editingSvc, svcForm, setSvcForm, onClose, onSave, saving }) {
  const [query, setQuery]                   = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fromSuggestion, setFromSuggestion] = useState(false);
 
  // Track whether the name input is currently focused so we never
  // hide the dropdown while the user is still typing.
  const inputFocused = useRef(false);
 
  // Tag input ref so we can clear it programmatically
  const tagInputRef = useRef(null);
 
  // ── Reset ONLY when the modal opens ──────────────────────────────────────
  // Removing svcForm.name from the dep array is intentional:
  // we only want to seed the query once from the form when the sheet appears.
  useEffect(() => {
    if (!visible) return;
    // seed from the form value that was set before opening
    setQuery(svcForm.name || '');
    setFromSuggestion(false);
    setShowSuggestions(false);
    inputFocused.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
 
  // ── Live suggestions filtered from catalogue ──────────────────────────────
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return ALL_SUGGESTIONS.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [query]);
 
  // When the filtered list becomes non-empty while the field is focused,
  // make sure the dropdown is shown.
  useEffect(() => {
    if (suggestions.length > 0 && inputFocused.current) {
      setShowSuggestions(true);
    }
  }, [suggestions]);
 
  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleNameChange = (text) => {
    setQuery(text);
    // Keep the form in sync so the parent has the latest value
    setSvcForm(f => ({ ...f, name: text }));
    setFromSuggestion(false);
    // Show dropdown only when there's something to show
    if (text.trim().length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };
 
  const handleSelectSuggestion = (item) => {
    setSvcForm(f => ({
      ...f,
      name: item.name,
      tags: [...new Set([...f.tags, ...item.tags])],
    }));
    setQuery(item.name);
    setShowSuggestions(false);
    setFromSuggestion(true);
  };
 
  const handleUseCustom = () => {
    // Keep whatever the user typed, just close the dropdown
    setSvcForm(f => ({ ...f, name: query }));
    setShowSuggestions(false);
  };
 
  const handleClearName = () => {
    setQuery('');
    setSvcForm(f => ({ ...f, name: '', tags: [] }));
    setShowSuggestions(false);
    setFromSuggestion(false);
  };
 
  // Only hide on blur if the user hasn't interacted with the list yet.
  // A small delay lets a suggestion tap register before we hide.
  const handleInputBlur = () => {
    inputFocused.current = false;
    setTimeout(() => {
      // If still not focused after 200 ms, hide the dropdown
      if (!inputFocused.current) {
        setShowSuggestions(false);
      }
    }, 200);
  };
 
  const handleInputFocus = () => {
    inputFocused.current = true;
    if (query.trim().length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };
 
  const addTag = (text) => {
    const tag = text.trim().toLowerCase();
    if (tag && !svcForm.tags.includes(tag)) {
      setSvcForm(f => ({ ...f, tags: [...f.tags, tag] }));
    }
  };
 
  const removeTag = (tag) => {
    setSvcForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };
 
  const showPrice = svcForm.priceType !== 'negotiable';
 
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
 
          {/* Header */}
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>{editingSvc ? 'Edit Service' : 'New Service'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
 
          <ScrollView
            style={s.modalBody}
            contentContainerStyle={{ paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"   // ← critical: lets taps on suggestions fire
          >
            {/* ── Service name + suggestions ── */}
            <Label text="Service Name" required />
            <View style={s.nameRow}>
              <Ionicons name="search-outline" size={17} color={C.textMuted} />
              <TextInput
                style={s.nameInput}
                value={query}
                onChangeText={handleNameChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="e.g. Plumbing, Graphic Design…"
                placeholderTextColor={C.textMuted}
                returnKeyType="done"
                onSubmitEditing={() => setShowSuggestions(false)}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={handleClearName} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
 
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <View style={s.suggBox}>
                <View style={s.suggBanner}>
                  <Ionicons name="flash-outline" size={13} color={C.gold} />
                  <Text style={s.suggBannerText}>Suggestions — tap to auto-fill tags</Text>
                </View>
 
                {suggestions.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.suggRow}
                    // onPress fires before onBlur thanks to keyboardShouldPersistTaps="handled"
                    onPress={() => handleSelectSuggestion(item)}
                    activeOpacity={0.75}
                  >
                    <View style={s.suggIconBox}>
                      <Ionicons name={item.categoryIcon} size={16} color={C.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.suggName}>{item.name}</Text>
                      <Text style={s.suggCat}>{item.category}</Text>
                    </View>
                    <View style={s.suggTags}>
                      {item.tags.slice(0, 2).map((t, idx) => (
                        <View key={idx} style={s.suggTagChip}>
                          <Text style={s.suggTagText}>{t}</Text>
                        </View>
                      ))}
                      {item.tags.length > 2 && (
                        <Text style={s.suggMore}>+{item.tags.length - 2}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                ))}
 
                <TouchableOpacity style={s.customRow} onPress={handleUseCustom}>
                  <Ionicons name="pencil-outline" size={14} color={C.green} />
                  <Text style={s.customRowText}>Use "{query}" as a custom service</Text>
                </TouchableOpacity>
              </View>
            )}
 
            {/* Auto-fill confirmation banner */}
            {fromSuggestion && svcForm.tags.length > 0 && (
              <View style={s.autoFillBanner}>
                <Ionicons name="checkmark-circle" size={15} color={C.green} />
                <Text style={s.autoFillText}>
                  {svcForm.tags.length} tags auto-filled — edit below
                </Text>
              </View>
            )}
 
            {/* Description */}
            <View style={{ height: 14 }} />
            <Label text="Description" />
            <StyledInput
              multiline
              value={svcForm.description}
              onChangeText={t => setSvcForm(f => ({ ...f, description: t }))}
              placeholder="What does this service include?"
            />


            {/* Pricing model */}
            <View style={{ height: 14 }} />
            <Label text="Pricing Model" />
            <View style={s.priceGrid}>
              {PRICE_TYPES.map(pt => (
                <TouchableOpacity
                  key={pt.value}
                  style={[s.priceCard, svcForm.priceType === pt.value && s.priceCardActive]}
                  onPress={() => setSvcForm(f => ({ ...f, priceType: pt.value }))}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={pt.icon}
                    size={18}
                    color={svcForm.priceType === pt.value ? C.accent : C.textMuted}
                  />
                  <Text style={[s.priceCardLabel, svcForm.priceType === pt.value && { color: C.accent }]}>
                    {pt.label}
                  </Text>
                  <Text style={s.priceCardDesc}>{pt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
 
            {showPrice && (
              <>
                <View style={{ height: 14 }} />
                <Label
                  text={
                    svcForm.priceType === 'starts_at' ? 'Minimum Price (GHS)' :
                    svcForm.priceType === 'hourly'    ? 'Hourly Rate (GHS)'   :
                    'Price (GHS)'
                  }
                />
                <StyledInput
                  value={svcForm.price}
                  onChangeText={t => setSvcForm(f => ({ ...f, price: t.replace(/[^0-9.]/g, '') }))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </>
            )}
 
            <View style={{ height: 20 }} />
 
            {/* Tags editor */}
            <View style={{ height: 14 }} />
            <Label text="Tags" />
            <View style={s.tagsWrap}>
              {svcForm.tags.map((tag, i) => (
                <View key={i} style={s.tagChip}>
                  <Text style={s.tagChipText}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="close" size={12} color={C.accent} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={s.tagInputRow}>
              <TextInput
                ref={tagInputRef}
                style={s.tagInput}
                placeholder="Add tag and press return…"
                placeholderTextColor={C.textMuted}
                returnKeyType="done"
                onSubmitEditing={(e) => {
                  addTag(e.nativeEvent.text);
                  // clear the native input
                  if (tagInputRef.current) tagInputRef.current.clear();
                }}
              />
              <TouchableOpacity
                style={s.tagAddBtn}
                onPress={() => {
                  if (tagInputRef.current) {
                    // programmatic add isn't directly possible without controlled value;
                    // the submit handler above handles the real work
                    tagInputRef.current.focus();
                  }
                }}
              >
                <Ionicons name="add" size={16} color={C.white} />
              </TouchableOpacity>
            </View>
            <Text style={s.hint}>Tags help clients find your service when searching</Text>
 
            
          </ScrollView>
 
          {/* Footer */}
          <View style={s.modalFoot}>
            <TouchableOpacity style={s.modalCancelBtn} onPress={onClose}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalSaveBtn, saving && { opacity: 0.6 }]}
              onPress={() => onSave(svcForm)}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.white} />
                : <Text style={s.modalSaveText}>{editingSvc ? 'Update' : 'Add Service'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TaskerOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { setUser } = useContext(AuthContext);

  const [step,         setStep]         = useState(1);
  const [submitting,   setSubmitting]   = useState(false);
  const [imgUploading, setImgUploading] = useState(false);

  // Step 1
  const [photoUri, setPhotoUri] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');

  // Step 2
  const [phone,        setPhone]        = useState('');
  const [providerType, setProviderType] = useState('individual');
  const [businessName, setBusinessName] = useState('');

  // Step 3
  const [bio,     setBio]     = useState('');
  const [tagline, setTagline] = useState('');

  // Step 4
  const [services,     setServices]     = useState([]);
  const [showSvcModal, setShowSvcModal] = useState(false);
  const [editingSvc,   setEditingSvc]   = useState(null);
  const [svcForm,      setSvcForm]      = useState({ name: '', description: '', priceType: 'negotiable', price: '', tags: [] });
  const [savingSvc,    setSavingSvc]    = useState(false);

  // Step 5
  const [region,     setRegion]     = useState('');
  const [city,       setCity]       = useState('');
  const [showRegion, setShowRegion] = useState(false);

  const [errors, setErrors] = useState({});

  // Slide animation between steps
  const slideX = useRef(new Animated.Value(0)).current;
  const animateIn = (dir = 1) => {
    slideX.setValue(dir * width * 0.35);
    Animated.spring(slideX, { toValue: 0, tension: 60, friction: 14, useNativeDriver: true }).start();
  };

  const goNext = () => {
    if (!validateStep()) return;
    setErrors({});
    animateIn(1);
    setStep(s => Math.min(s + 1, STEPS.length));
  };

  const goBack = () => {
    setErrors({});
    animateIn(-1);
    setStep(s => Math.max(s - 1, 1));
  };

  const validateStep = () => {
    const e = {};
    if (step === 2) {
      if (!phone.trim())            e.phone = 'Phone number is required';
      else if (phone.trim().length < 10) e.phone = 'Enter a valid phone number';
      if (!businessName.trim())     e.businessName = 'Business name is required';
    }
    if (step === 3) {
      if (!bio.trim())              e.bio = 'Please tell clients about yourself';
      if (bio.trim().length < 30)   e.bio = 'Be more descriptive — at least 30 characters';
    }
    if (step === 4) {
      if (services.length === 0)    e.services = 'Add at least one service';
    }
    if (step === 5) {
      if (!region)                  e.region = 'Please select your region';
      if (!city.trim())             e.city   = 'Please enter your city or area';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Photo handlers ───────────────────────────────────────────────────────
 const pickPhoto = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access.'); return; }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,  // disable native cropper
    quality: 1,
  });

  if (!result.canceled) {
    const asset = result.assets[0];

    const size = Math.min(asset.width, asset.height);
    const originX = (asset.width - size) / 2;
    const originY = (asset.height - size) / 2;

    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [
        { crop: { originX, originY, width: size, height: size } },
        { resize: { width: 400, height: 400 } },
      ],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );

    setPhotoUri(manipulated.uri);
  }
};

  const uploadPhoto = async (uri) => {
    setImgUploading(true);
    try {
      const filename = uri.split('/').pop();
      const ext = /\.(\w+)$/.exec(filename)?.[1] || 'jpeg';
      const file = { uri, name: filename, type: `image/${ext}` };
      const res = await uploadProfileImage({ filename: file.name, contentType: file.type });
      if (res.status !== 200) throw new Error('Presign failed');
      await sendFileToS3(res.data.fileUrl, file);
      return res.data.publicUrl;
    } finally { setImgUploading(false); }
  };

  // ── Service modal actions ────────────────────────────────────────────────
  const openSvcModal = (svc = null) => {
    if (svc) {
      setSvcForm({
        name: svc.name || '',
        description: svc.description || '',
        priceType: svc.priceType || 'negotiable',
        price: svc.price != null ? String(svc.price) : '',
        tags: svc.tags || [],
      });
      setEditingSvc(svc);
    } else {
      setSvcForm({ name: '', description: '', priceType: 'negotiable', price: '', tags: [] });
      setEditingSvc(null);
    }
    setShowSvcModal(true);
  };

  const saveSvc = () => {
    if (!svcForm.name.trim()) { Alert.alert('Required', 'Service name is required.'); return; }
    const newSvc = {
      ...(editingSvc || {}),
      name: svcForm.name.trim(),
      description: svcForm.description.trim(),
      priceType: svcForm.priceType,
      price: parseFloat(svcForm.price) || 0,
      currency: 'GHS',
      tags: svcForm.tags,
    };
    const updated = editingSvc
      ? services.map(s => s === editingSvc ? newSvc : s)
      : [...services, newSvc];
    setServices(updated);
    setShowSvcModal(false);
  };

  const removeSvc = (svc) => {
    Alert.alert('Remove Service', `Remove "${svc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setServices(p => p.filter(s => s !== svc)) },
    ]);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      let finalPhotoUrl = photoUrl;
      if (photoUri && !finalPhotoUrl) {
        finalPhotoUrl = await uploadPhoto(photoUri);
        setPhotoUrl(finalPhotoUrl);
      }

      // Strip tags from services and collect unique tags
      const cleanServices = services.map(({ tags, ...svc }) => svc);
      const allTags = [...new Set(services.flatMap(svc => svc.tags || []))];

      const form = new FormData();
      if (phone.trim())          form.append('phone', phone.trim());
      if (finalPhotoUrl)         form.append('profileImage', finalPhotoUrl);
      form.append('providerType', providerType);
      form.append('businessName', businessName.trim());
      if (tagline.trim())        form.append('tagline', tagline.trim());
      if (bio.trim())            form.append('bio', bio.trim());
      form.append('location[region]', region);
      form.append('location[city]',   city.trim());
      form.append('servicesOffered',  JSON.stringify(cleanServices));
      form.append('tags',             JSON.stringify(allTags));

      const res = await taskerOnboarding(form);
      if (res.status === 200) {
        if (setUser && res.data.user) setUser(res.data.user);
        navigation.reset({
          index: 0,
          routes: [{ name: 'TaskerStack', params: { screen: 'AvailableTab' } }],
        });
      } else {
        Alert.alert('Error', res.data?.message || 'Something went wrong.');
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      const msg = err.response?.data?.message || 'Could not complete setup. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = step === STEPS.length;

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1Photo photoUri={photoUri} imgUploading={imgUploading} pickPhoto={pickPhoto} goNext={goNext} />;
      case 2: return <Step2Identity phone={phone} setPhone={setPhone} providerType={providerType} setProviderType={setProviderType} businessName={businessName} setBusinessName={setBusinessName} errors={errors} />;
      case 3: return <Step3Story bio={bio} setBio={setBio} tagline={tagline} setTagline={setTagline} errors={errors} />;
      case 4: return <Step4Services services={services} errors={errors} openSvcModal={openSvcModal} removeSvc={removeSvc} />;
      case 5: return <Step5Location region={region} setRegion={setRegion} city={city} setCity={setCity} errors={errors} setShowRegion={setShowRegion} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <View style={s.topBar}>
        <View style={s.topBarInner}>
          {step > 1 ? (
            <TouchableOpacity onPress={goBack} style={s.topBackBtn}>
              <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          ) : <View style={{ width: 38 }} />}

          <View style={s.stepDots}>
            {STEPS.map(st => (
              <View key={st.id} style={[s.stepDot, st.id === step && s.stepDotActive, st.id < step && s.stepDotDone]} />
            ))}
          </View>

          {step === 1 ? (
            <TouchableOpacity onPress={() => navigation?.goBack?.()} style={s.topActionBtn}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          ) : <View style={{ width: 38 }} />}
        </View>
        <ProgressBar current={step} total={STEPS.length} />
      </View>

      {/* ── Step header ──────────────────────────────────────────────── */}
      <View style={s.stepHeadCard}>
        <View style={s.stepHeaderTop}>
          <View style={[s.stepIconWrap, { backgroundColor: C.accentLight }]}>
            <Ionicons name={STEPS[step-1].icon} size={20} color={C.accent} />
          </View>
          <View style={s.stepHeaderText}>
            <Text style={s.stepNum}>Step {step} of {STEPS.length}</Text>
            <Text style={s.stepTitle}>{STEPS[step-1].title}</Text>
          </View>
        </View>
      </View>

      {/* ── Step content ─────────────────────────────────────────────── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideX }] }]}>
          {renderStep()}
        </Animated.View>

        {/* ── Bottom CTA ─────────────────────────────────────────────── */}
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[s.ctaBtn, (submitting || imgUploading) && s.ctaBtnDisabled]}
            onPress={isLastStep ? handleSubmit : goNext}
            disabled={submitting || imgUploading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={(submitting || imgUploading) ? [C.textMuted, C.textMuted] : [C.accent, '#152C4F']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.ctaBtnGradient}
            >
              {submitting || imgUploading ? (
                <>
                  <ActivityIndicator color={C.white} size="small" />
                  <Text style={s.ctaBtnText}>{imgUploading ? 'Uploading photo…' : 'Setting up your profile…'}</Text>
                </>
              ) : (
                <>
                  <Text style={s.ctaBtnText}>{isLastStep ? 'Complete Setup' : 'Continue'}</Text>
                  <Ionicons name={isLastStep ? 'checkmark-circle' : 'arrow-forward'} size={20} color={C.white} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════ */}

      {/* Enhanced Service Modal */}
      <ServiceModal
        visible={showSvcModal}
        editingSvc={editingSvc}
        svcForm={svcForm}
        setSvcForm={setSvcForm}
        onClose={() => setShowSvcModal(false)}
        onSave={saveSvc}
        saving={savingSvc}
      />

      {/* Region Picker Modal */}
      <Modal visible={showRegion} animationType="slide" transparent onRequestClose={() => setShowRegion(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { maxHeight: '72%' }]}>
            <View style={s.modalHandle} />
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Select Region</Text>
              <TouchableOpacity onPress={() => setShowRegion(false)}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={GHANA_REGIONS}
              keyExtractor={r => r}
              style={{ marginBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.regionRow, region === item && s.regionRowActive]}
                  onPress={() => { setRegion(item); setErrors(e => ({ ...e, region: undefined })); setShowRegion(false); }}
                >
                  <Ionicons name="location" size={16} color={region === item ? C.green : C.textMuted} style={{ marginRight: 12 }} />
                  <Text style={[s.regionText, region === item && { color: C.green, fontWeight: '700' }]}>{item}</Text>
                  {region === item && <Ionicons name="checkmark" size={18} color={C.green} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  // Top bar
  topBar: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12 },
  topBarInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, marginBottom: 10 },
  topBackBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  topActionBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  stepDots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 7, alignItems: 'center' },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  stepDotActive: { width: 22, height: 6, borderRadius: 3, backgroundColor: C.accent },
  stepDotDone: { backgroundColor: C.accent + '80' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  progressTrack: { flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.accent, borderRadius: 2 },
  progressLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  stepHeadCard: { backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
  stepHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  stepScroll: { padding: 20, paddingBottom: 40 },
  // Step 1 — photo
  photoHero: { alignItems: 'center', marginBottom: 30, marginTop: 12 },
  photoCircleWrap: { position: 'relative' },
  photoCircle: { width: 150, height: 150, borderRadius: 75, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3, borderColor: C.border },
  photoEditBadge: { position: 'absolute', bottom: 6, right: 6, width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent, borderWidth: 3, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 30, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.8, lineHeight: 36, marginBottom: 12 },
  heroSub: { fontSize: 15, color: C.textSecondary, lineHeight: 23, marginBottom: 24 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: C.goldLight, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E8C97A' },
  tipText: { flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 19 },
  skipRow: { alignItems: 'center', marginTop: 20 },
  skipBtn: { padding: 12 },
  skipText: { fontSize: 14, color: C.textMuted, fontWeight: '600' },
  // Step 2 — identity
  phoneRow: { flexDirection: 'row', gap: 10 },
  phonePrefix: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  phonePrefixText: { fontSize: 15, color: C.textPrimary, fontWeight: '600' },
  phoneInput: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: C.textPrimary },
  subSectionTitle: { fontSize: 13, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },
  providerRow: { flexDirection: 'row', gap: 12 },
  providerCard: { flex: 1, alignItems: 'center', paddingVertical: 20, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, position: 'relative', gap: 4 },
  providerCardActive: { borderColor: C.accent, backgroundColor: C.accentLight },
  providerEmoji: { fontSize: 28 },
  providerLabel: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  providerDesc: { fontSize: 12, color: C.textMuted },
  providerCheck: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  // Step 4 — services
  svcEmpty: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  svcEmptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  svcEmptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  svcEmptyDesc: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 21 },
  svcList: { gap: 10, marginBottom: 14 },
  svcItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  svcItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  svcItemIconWrap: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center' },
  svcItemBody: { flex: 1 },
  svcItemName: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  svcItemDesc: { fontSize: 13, color: C.textSecondary, marginBottom: 6 },
  svcPricePill: { backgroundColor: C.accentLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  svcPricePillText: { fontSize: 11, fontWeight: '700', color: C.accent },
  svcItemActions: { flexDirection: 'row', gap: 6 },
  svcActionBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  addSvcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderColor: C.accent, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 16, marginTop: 4 },
  addSvcBtnText: { fontSize: 15, fontWeight: '700', color: C.accent },
  // New styles for enhanced service modal
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 13, height: 50 },
  nameInput: { flex: 1, fontSize: 15, color: C.textPrimary },
  suggBox: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, marginTop: 6, overflow: 'hidden' },
  suggBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.goldLight, borderBottomWidth: 1, borderBottomColor: C.border },
  suggBannerText: { fontSize: 11, fontWeight: '700', color: C.gold, letterSpacing: 0.4 },
  suggRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  suggIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center' },
  suggName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  suggCat: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  suggTags: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  suggTagChip: { backgroundColor: C.accentLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  suggTagText: { fontSize: 10, color: C.accent, fontWeight: '600' },
  suggMore: { fontSize: 10, color: C.textMuted, fontWeight: '600' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center', paddingVertical: 12, backgroundColor: C.greenLight },
  customRowText: { fontSize: 13, color: C.green, fontWeight: '600' },
  autoFillBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.greenLight, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: C.green + '30' },
  autoFillText: { flex: 1, fontSize: 13, color: C.green, fontWeight: '600' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accentLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.accent + '30' },
  tagChipText: { fontSize: 12, color: C.accent, fontWeight: '600' },
  tagInputRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tagInput: { flex: 1, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: C.textPrimary },
  tagAddBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  tagPill: { backgroundColor: C.accentLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 11, color: C.accent, fontWeight: '600' },
  // Step 5 — location
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerVal: { fontSize: 15, color: C.textPrimary, fontWeight: '500' },
  pickerPlaceholder: { fontSize: 15, color: C.textMuted },
  geoNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.greenLight, borderRadius: 12, padding: 12, marginTop: 4 },
  geoNoteText: { flex: 1, fontSize: 13, color: C.green, lineHeight: 19 },
  // Shared inputs
  fieldWrap: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 6, letterSpacing: 0.1 },
  hint: { fontSize: 12, color: C.textMuted, marginBottom: 8, lineHeight: 17 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.textPrimary },
  inputMulti: { minHeight: 120, textAlignVertical: 'top' },
  inputFocus: { borderColor: C.accent, backgroundColor: '#F5F9FF' },
  inputErr: { borderColor: C.red },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  errText: { fontSize: 12, color: C.red, fontWeight: '500' },
  charCount: { fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 4 },
  // Bottom CTA bar
  bottomBar: { backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  ctaBtn: { borderRadius: 16, overflow: 'hidden' },
  ctaBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  ctaBtnDisabled: { opacity: 0.65 },
  ctaBtnText: { color: C.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', borderWidth: 1, borderColor: C.border },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 10 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  modalBody: { padding: 20 },
  modalFoot: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: C.border, bottom: 24 },
  modalCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: C.textSecondary },
  modalSaveBtn: { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: C.accent },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: C.white },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  priceCard: { width: (width - 80) / 2, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, gap: 4 },
  priceCardActive: { borderColor: C.accent, backgroundColor: C.accentLight },
  priceCardLabel: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  priceCardDesc: { fontSize: 11, color: C.textMuted, textAlign: 'center' },
  regionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  regionRowActive: { backgroundColor: C.greenLight },
  regionText: { flex: 1, fontSize: 15, color: C.textSecondary, fontWeight: '500' },
});