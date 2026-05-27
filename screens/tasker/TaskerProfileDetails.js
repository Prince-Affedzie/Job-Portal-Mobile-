// screens/tasker/TaskerProfileEditScreen.js
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image,
  ActivityIndicator, TextInput, StyleSheet, Alert, Dimensions,
  Animated, Modal, FlatList, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  taskerProfileUpdate,
  taskerGetMyProfile,
} from '../../api/taskerApi';
import { sendFileToS3 } from '../../api/commonApi';
import { uploadProfileImage } from '../../api/authApi';
import { AuthContext } from '../../context/AuthContext';

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
  cardLight: '#F1F5FB',
};

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern',
  'Northern', 'Upper East', 'Upper West', 'Volta', 'Oti',
  'Ahafo', 'Bono', 'Bono East', 'North East', 'Savannah', 'Western North',
];

const PROVIDER_TYPES = [
  { value: 'individual', label: 'Individual', icon: 'person-outline',   color: C.primary,  bg: C.primaryLight, desc: 'Solo freelancer or tradesperson' },
  { value: 'business',   label: 'Business',   icon: 'business-outline', color: C.teal,     bg: C.tealLight,    desc: 'Registered business or agency' },
];

// ─── Animated entry ────────────────────────────────────────────────────────────
function FadeIn({ delay = 0, children, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 60, friction: 13, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

// ─── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, icon, children, delay = 0 }) {
  return (
    <FadeIn delay={delay} style={sectionStyles.card}>
      <View style={sectionStyles.header}>
        <View style={sectionStyles.iconBox}>
          <Ionicons name={icon} size={16} color={C.primary} />
        </View>
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      {children}
    </FadeIn>
  );
}
const sectionStyles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  iconBox: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.1 },
});

// ─── Field label ───────────────────────────────────────────────────────────────
function FieldLabel({ text, optional }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7, marginTop: 14 }}>
      <Text style={fieldStyles.label}>{text}</Text>
      {optional && <Text style={fieldStyles.optional}> · optional</Text>}
    </View>
  );
}
const fieldStyles = StyleSheet.create({
  label:    { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.7, textTransform: 'uppercase' },
  optional: { fontSize: 11, color: C.textMuted, fontStyle: 'italic' },
});

// ─── Styled TextInput ──────────────────────────────────────────────────────────
function Field({ value, onChangeText, placeholder, multiline, maxLength, editable = true, keyboardType, style }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[
        inputStyles.base,
        multiline && inputStyles.multiline,
        focused && inputStyles.focused,
        !editable && inputStyles.disabled,
        style,
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textMuted}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      maxLength={maxLength}
      editable={editable}
      keyboardType={keyboardType}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}
const inputStyles = StyleSheet.create({
  base: {
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: C.textPrimary,
  },
  focused: { borderColor: C.primary, backgroundColor: C.white },
  disabled: { opacity: 0.65, backgroundColor: C.cardLight },
  multiline: { minHeight: 110, paddingTop: 13 },
});

// ─── Provider Type Selector ────────────────────────────────────────────────────
function ProviderTypeSelector({ value, onChange, editable }) {
  return (
    <View style={providerStyles.row}>
      {PROVIDER_TYPES.map(pt => {
        const active = value === pt.value;
        return (
          <TouchableOpacity
            key={pt.value}
            style={[providerStyles.tile, active && { borderColor: pt.color, backgroundColor: pt.bg }]}
            onPress={() => editable && onChange(pt.value)}
            activeOpacity={editable ? 0.8 : 1}
          >
            <View style={[providerStyles.iconCircle, { backgroundColor: active ? pt.color : C.border }]}>
              <Ionicons name={pt.icon} size={18} color={active ? C.white : C.textMuted} />
            </View>
            <Text style={[providerStyles.label, active && { color: pt.color }]}>{pt.label}</Text>
            <Text style={[providerStyles.desc, active && { color: pt.color, opacity: 0.75 }]}>{pt.desc}</Text>
            {active && (
              <View style={[providerStyles.checkBadge, { backgroundColor: pt.color }]}>
                <Ionicons name="checkmark" size={10} color={C.white} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const providerStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 10,
    borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface, position: 'relative', gap: 6,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
  desc: { fontSize: 11, color: C.textMuted, textAlign: 'center', lineHeight: 15 },
  checkBadge: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});

// ─── Region Picker Modal ───────────────────────────────────────────────────────
function RegionPickerModal({ visible, selected, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={regionStyles.overlay}>
        <View style={regionStyles.sheet}>
          <View style={regionStyles.handle} />
          <View style={regionStyles.header}>
            <View>
              <Text style={regionStyles.title}>Select Region</Text>
              <Text style={regionStyles.sub}>Ghana — 16 regions</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={regionStyles.closeBtn}>
              <Ionicons name="close" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={GHANA_REGIONS}
            keyExtractor={r => r}
            renderItem={({ item }) => {
              const active = selected === item;
              return (
                <TouchableOpacity
                  style={[regionStyles.item, active && regionStyles.itemActive]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <View style={[regionStyles.itemDot, active && { backgroundColor: C.teal }]} />
                  <Text style={[regionStyles.itemText, active && regionStyles.itemTextActive]}>{item}</Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color={C.teal} />}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.border, marginHorizontal: 20 }} />}
          />
        </View>
      </View>
    </Modal>
  );
}
const regionStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '75%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: 'center', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  sub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 12 },
  itemActive: { backgroundColor: C.tealLight },
  itemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  itemText: { flex: 1, fontSize: 15, color: C.textSecondary, fontWeight: '500' },
  itemTextActive: { color: C.teal, fontWeight: '700' },
});

// ─── Profile completion indicator ─────────────────────────────────────────────
function CompletionBar({ bio, tagline, businessName, locationRegion, locationCity, brandBanner }) {
  const fields = [bio, tagline, businessName, locationRegion, locationCity, brandBanner];
  const filled = fields.filter(Boolean).length;
  const pct = Math.round((filled / fields.length) * 100);
  const color = pct < 40 ? C.danger : pct < 75 ? C.accent : C.teal;

  return (
    <FadeIn delay={0} style={completionStyles.wrap}>
      <View style={completionStyles.left}>
        <Text style={completionStyles.label}>Profile Strength</Text>
        <Text style={[completionStyles.pct, { color }]}>{pct}%</Text>
      </View>
      <View style={completionStyles.barTrack}>
        <Animated.View style={[completionStyles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      {pct < 100 && (
        <Text style={completionStyles.tip}>
          {!brandBanner ? 'Add a banner image' : !tagline ? 'Add a tagline' : !bio ? 'Write a bio' : !locationRegion ? 'Set your region' : 'Complete your profile'}
        </Text>
      )}
    </FadeIn>
  );
}
const completionStyles = StyleSheet.create({
  wrap: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  left: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  pct: { fontSize: 15, fontWeight: '800' },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', borderRadius: 3 },
  tip: { fontSize: 12, color: C.textMuted },
});

// ─── Banner ────────────────────────────────────────────────────────────────────
function BannerSection({ uri, editing, uploading, onPress, delay = 0 }) {
  return (
    <FadeIn delay={delay} style={bannerStyles.wrap}>
      <TouchableOpacity onPress={onPress} activeOpacity={editing ? 0.85 : 1} style={bannerStyles.touchable}>
        {uri ? (
          <Image source={{ uri }} style={bannerStyles.image} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#E8EEF9', '#F4F6FB']} style={bannerStyles.placeholder}>
            <View style={bannerStyles.placeholderIcon}>
              <Ionicons name="image-outline" size={28} color={C.textMuted} />
            </View>
            <Text style={bannerStyles.placeholderTitle}>Brand Banner</Text>
            <Text style={bannerStyles.placeholderSub}>Recommended: 1200 × 375px</Text>
          </LinearGradient>
        )}

        {/* Gradient overlay at bottom */}
        {uri && (
          <LinearGradient
            colors={['transparent', 'rgba(13,27,53,0.55)']}
            style={bannerStyles.gradientOverlay}
          />
        )}

        {editing && (
          <View style={bannerStyles.editPill}>
            {uploading
              ? <ActivityIndicator size="small" color={C.white} />
              : <Ionicons name="camera-outline" size={15} color={C.white} />
            }
            <Text style={bannerStyles.editPillText}>
              {uploading ? 'Uploading…' : uri ? 'Change banner' : 'Add banner'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </FadeIn>
  );
}
const bannerStyles = StyleSheet.create({
  wrap: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  touchable: { position: 'relative' },
  image: { width: '100%', height: 170 },
  placeholder: { height: 170, alignItems: 'center', justifyContent: 'center', gap: 6 },
  placeholderIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderWidth: 1, borderColor: C.border },
  placeholderTitle: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
  placeholderSub: { fontSize: 12, color: C.textMuted },
  gradientOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  editPill: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(13,27,53,0.75)', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20 },
  editPillText: { color: C.white, fontSize: 13, fontWeight: '600' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function TaskerProfileDetailScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [editing, setEditing]           = useState(false);
  const [savedState, setSavedState]     = useState(null);
  const [showRegion, setShowRegion]     = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  // Form fields
  const [providerType, setProviderType]     = useState('individual');
  const [businessName, setBusinessName]     = useState('');
  const [brandBanner, setBrandBanner]       = useState(null);
  const [tagline, setTagline]               = useState('');
  const [bio, setBio]                       = useState('');
  const [businessRegNo, setBusinessRegNo]   = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [locationCity, setLocationCity]     = useState('');
  const [bannerChanged, setBannerChanged]   = useState(false);

  const hydrate = useCallback((p) => {
    if (!p) return;
    setProviderType(p.providerType || 'individual');
    setBusinessName(p.businessName || '');
    setBrandBanner(p.brandBanner || null);
    setTagline(p.tagline || '');
    setBio(p.bio || '');
    setBusinessRegNo(p.businessRegistrationNo || '');
    setLocationRegion(p.location?.region || '');
    setLocationCity(p.location?.city || '');
    setBannerChanged(false);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await taskerGetMyProfile();
        hydrate(res.data?.taskerProfile || res.data);
      } catch { Alert.alert('Error', 'Could not load profile.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const startEditing = () => {
    setSavedState({ providerType, businessName, brandBanner, tagline, bio, businessRegNo, locationRegion, locationCity });
    setEditing(true);
  };

  const cancelEditing = () => {
    if (savedState) {
      setProviderType(savedState.providerType);
      setBusinessName(savedState.businessName);
      setBrandBanner(savedState.brandBanner);
      setTagline(savedState.tagline);
      setBio(savedState.bio);
      setBusinessRegNo(savedState.businessRegNo);
      setLocationRegion(savedState.locationRegion);
      setLocationCity(savedState.locationCity);
      setBannerChanged(false);
    }
    setEditing(false);
  };

 const pickBanner = async () => {
  if (!editing) return;
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo access to add a banner.'); return; }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,  // disable native cropper
    quality: 1,
  });

  if (!result.canceled) {
    const asset = result.assets[0];

    // Crop to centered 16:9 rectangle
    const targetRatio = 16 / 9;
    const assetRatio = asset.width / asset.height;

    let cropWidth, cropHeight, originX, originY;

    if (assetRatio > targetRatio) {
      // Image is wider than 16:9 — constrain by height
      cropHeight = asset.height;
      cropWidth = cropHeight * targetRatio;
      originX = (asset.width - cropWidth) / 2;
      originY = 0;
    } else {
      // Image is taller than 16:9 — constrain by width
      cropWidth = asset.width;
      cropHeight = cropWidth / targetRatio;
      originX = 0;
      originY = (asset.height - cropHeight) / 2;
    }

    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [
        { crop: { originX, originY, width: cropWidth, height: cropHeight } },
        { resize: { width: 1280, height: 720 } },
      ],
      { compress: 0.87, format: ImageManipulator.SaveFormat.JPEG }
    );

    setBrandBanner(manipulated.uri);
    setBannerChanged(true);
  }
};

  const uploadBanner = async (uri) => {
    setBannerUploading(true);
    try {
      const filename = uri.split('/').pop();
      const ext = /\.(\w+)$/.exec(filename)?.[1] || 'jpeg';
      const file = { uri, name: filename, type: `image/${ext}` };
      const res = await uploadProfileImage({ filename: file.name, contentType: file.type });
      if (res.status !== 200) throw new Error();
      await sendFileToS3(res.data.fileUrl, file);
      return res.data.publicUrl;
    } finally { setBannerUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalBanner = brandBanner;
      if (bannerChanged && brandBanner && (brandBanner.startsWith('file://') || brandBanner.startsWith('content://'))) {
        finalBanner = await uploadBanner(brandBanner);
      }
      const form = new FormData();
      form.append('providerType', providerType);
      if (businessName.trim()) form.append('businessName', businessName.trim());
      if (finalBanner) form.append('brandBanner', finalBanner);
      if (tagline.trim()) form.append('tagline', tagline.trim());
      if (bio.trim()) form.append('bio', bio.trim());
      if (businessRegNo.trim()) form.append('businessRegistrationNo', businessRegNo.trim());
      form.append('location[region]', locationRegion);
      form.append('location[city]', locationCity);

      const res = await taskerProfileUpdate(form);
      if (res.status === 200) {
        hydrate(res.data.taskerProfile);
        setEditing(false);
        Alert.alert('Saved ✓', 'Your professional profile has been updated.');
      } else throw new Error();
    } catch { Alert.alert('Error', 'Could not save profile. Please try again.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Professional Profile</Text>
          <Text style={styles.headerSub}>{editing ? 'Editing…' : 'View & manage your profile'}</Text>
        </View>
        {!editing ? (
          <TouchableOpacity style={styles.editHeaderBtn} onPress={startEditing}>
            <Ionicons name="pencil-outline" size={16} color={C.accent} />
            <Text style={styles.editHeaderBtnText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.cancelHeaderBtn} onPress={cancelEditing}>
              <Text style={styles.cancelHeaderBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={C.white} />
                : <Text style={styles.saveHeaderBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Completion bar — only in view mode */}
        {!editing && (
          <CompletionBar
            bio={bio} tagline={tagline} businessName={businessName}
            locationRegion={locationRegion} locationCity={locationCity} brandBanner={brandBanner}
          />
        )}

        {/* Banner */}
        <BannerSection
          uri={brandBanner}
          editing={editing}
          uploading={bannerUploading}
          onPress={pickBanner}
          delay={60}
        />

        {/* Provider Type */}
        <SectionCard title="Provider Type" icon="person-circle-outline" delay={100}>
          <ProviderTypeSelector value={providerType} onChange={setProviderType} editable={editing} />
        </SectionCard>

        {/* Branding */}
        
      <SectionCard title="Branding & Identity" icon="sparkles-outline" delay={140}>
        {/* Business Name — shown for BOTH types */}
        <FieldLabel text={providerType === 'business' ? 'Business Name' : 'How would you like to name your brand or service?'} />
        <Field
          value={businessName}
          onChangeText={setBusinessName}
          placeholder={providerType === 'business' ? 'e.g. Kwame & Sons Electrical' : 'e.g. Kofi’s Handyman Services'}
          editable={editing}
        />

        <FieldLabel text="Tagline" optional />
        <Field
          value={tagline}
          onChangeText={setTagline}
          placeholder="e.g. Accra's most reliable handyman"
          maxLength={100}
          editable={editing}
        />
        <Text style={styles.charCount}>{tagline.length}/100</Text>

        <FieldLabel text="Bio / About You" optional />
        <Field
          value={bio}
          onChangeText={setBio}
          placeholder="Describe your skills, years of experience, specialities, and why clients should choose you…"
          multiline
          editable={editing}
        />

        {providerType === 'business' && (
          <>
            <FieldLabel text="Business Registration No." optional />
            <Field value={businessRegNo} onChangeText={setBusinessRegNo} placeholder="e.g. CS-12345" editable={editing} />
          </>
        )}
      </SectionCard>

        {/* Location */}
        <SectionCard title="Location" icon="location-outline" delay={180}>
          <FieldLabel text="Region" />
          <TouchableOpacity
            style={[inputStyles.base, styles.pickerRow, !editing && inputStyles.disabled]}
            onPress={() => editing && setShowRegion(true)}
            activeOpacity={editing ? 0.75 : 1}
          >
            <View style={styles.pickerLeft}>
              <Ionicons name="map-outline" size={16} color={locationRegion ? C.primary : C.textMuted} />
              <Text style={[styles.pickerText, !locationRegion && { color: C.textMuted }]}>
                {locationRegion || 'Select a region…'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={C.textMuted} />
          </TouchableOpacity>

          <FieldLabel text="City / Area" optional />
          <Field value={locationCity} onChangeText={setLocationCity} placeholder="e.g. Tema, Adabraka, Kumasi" editable={editing} />

          {/* Location display chip when filled */}
          {(locationRegion || locationCity) && !editing && (
            <View style={styles.locationChip}>
              <Ionicons name="location" size={14} color={C.teal} />
              <Text style={styles.locationChipText}>
                {[locationCity, locationRegion].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </SectionCard>

        {/* Save button — bottom of scroll for easy reach */}
        {editing && (
          <FadeIn delay={220} style={styles.bottomSaveWrap}>
            <TouchableOpacity
              style={[styles.bottomSaveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.white} />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
                    <Text style={styles.bottomSaveBtnText}>Save Profile</Text>
                  </>
              }
            </TouchableOpacity>
          </FadeIn>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <RegionPickerModal
        visible={showRegion}
        selected={locationRegion}
        onSelect={setLocationRegion}
        onClose={() => setShowRegion(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: C.textMuted },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  headerSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },

  editHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.accentLight, borderWidth: 1, borderColor: C.accent + '40',
  },
  editHeaderBtnText: { fontSize: 13, fontWeight: '700', color: C.accent },

  headerActions: { flexDirection: 'row', gap: 8 },
  cancelHeaderBtn: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: C.borderStrong, backgroundColor: C.surface },
  cancelHeaderBtnText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  saveHeaderBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: C.accent, minWidth: 58, alignItems: 'center' },
  saveHeaderBtnText: { fontSize: 13, fontWeight: '700', color: C.white },

  scroll: { padding: 16 },

  // Char count
  charCount: { fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 5 },

  // Picker row
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pickerText: { fontSize: 15, color: C.textPrimary },

  // Location chip
  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.tealLight, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, marginTop: 12, alignSelf: 'flex-start',
  },
  locationChipText: { fontSize: 13, fontWeight: '600', color: C.teal },

  // Bottom save
  bottomSaveWrap: { marginTop: 8, marginBottom: 8 },
  bottomSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.accent, paddingVertical: 16, borderRadius: 16,
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  bottomSaveBtnText: { fontSize: 16, fontWeight: '700', color: C.white },
});