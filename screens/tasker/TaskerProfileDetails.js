import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  Alert,
  Dimensions,
  Animated,
  Modal,
  StatusBar,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

// ── API imports (adjust paths as needed) ──────────────────────────────────
import {
  taskerProfileUpdate,
  taskerGetMyProfile,
  uploadPortfolioFiles,
  addWorkSampleToProfile,
  removeWorkSampleFromProfile,
} from '../../api/taskerApi';
import { sendFileToS3 } from '../../api/commonApi';
import { uploadProfileImage } from '../../api/authApi';
import { AuthContext } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 "Pacific Indigo & Warm Gold" Light Theme
// ═══════════════════════════════════════════════════════════════════════════
const C = {
  bg: '#F9FAFC',
  surface: '#FFFFFF',
  cardAlt: '#F4F6FB',
  border: '#E4E8EE',
  overlay: 'rgba(15, 23, 42, 0.45)',

  primary: '#1E3A6E',
  primaryLight: '#DDE7F5',
  primaryMuted: '#6B85B0',

  accent: '#D49B3F',
  accentLight: '#FCF3E1',
  accentText: '#5C3D10',

  secondary: '#0F766E',
  secondaryLight: '#D1FAE5',
  secondaryText: '#134E4A',

  success: '#0D9488',
  successBg: '#D1FAE5',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  info: '#2563EB',
  infoBg: '#DBEAFE',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  shadow: '#1E3A6E14',
  skeleton: '#E2E8F0',
  star: '#FBBF24',
};

// Create a "T" alias for easy drop‑in
const T = {
  ...C,
  gold: C.accent,
  teal: C.secondary,
  purple: '#7E3AF2',
  coral: '#F87171',
  card: C.surface,
  cardLight: '#F1F4F9',
  badgeBg: C.border,
  white: '#FFFFFF',
};

// ─── Constants ────────────────────────────────────────────────────────────
const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern',
  'Northern', 'Upper East', 'Upper West', 'Volta', 'Oti',
  'Ahafo', 'Bono', 'Bono East', 'North East', 'Savannah', 'Western North',
];

const PRICE_TYPES = [
  { value: 'fixed',      label: 'Fixed',      icon: 'pricetag-outline' },
  { value: 'hourly',     label: 'Hourly',     icon: 'time-outline' },
  { value: 'starts_at',  label: 'Starts At',  icon: 'trending-up-outline' },
  { value: 'negotiable', label: 'Negotiable', icon: 'swap-horizontal-outline' },
];

const PROVIDER_TYPES = [
  { value: 'individual', label: 'Individual', icon: 'person-outline', color: T.accent },
  { value: 'business',   label: 'Business',   icon: 'business-outline', color: T.gold },
];

const VETTING_BADGES = {
  not_applied: { label: 'Not Applied', color: T.textMuted, bg: T.border,  icon: 'ellipse-outline' },
  pending:     { label: 'Pending',     color: T.warning,   bg: T.warningBg, icon: 'hourglass-outline' },
  approved:    { label: 'Approved',    color: T.success,   bg: T.successBg, icon: 'checkmark-circle' },
  rejected:    { label: 'Rejected',    color: T.danger,    bg: T.dangerBg,  icon: 'close-circle' },
};

// ─── Animation helper ─────────────────────────────────────────────────────
function FadeSlide({ delay = 0, children }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 55, friction: 11, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: op, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

function SectionHeader({ icon, title, accent = T.accent, right }) {
  return (
    <View style={ss.sectionHeader}>
      <View style={[ss.sectionIconWrap, { backgroundColor: accent + '18' }]}>
        <Ionicons name={icon} size={17} color={accent} />
      </View>
      <Text style={ss.sectionTitle}>{title}</Text>
      {right && <View style={{ marginLeft: 'auto' }}>{right}</View>}
    </View>
  );
}

function Chip({ label, active, onPress, color = T.accent }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[ss.chip, active && { backgroundColor: color + '20', borderColor: color + '60' }]}
      activeOpacity={0.75}
    >
      <Text style={[ss.chipText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InlineLabel({ text }) {
  return <Text style={ss.inlineLabel}>{text}</Text>;
}

function StarRating({ rating, count }) {
  const full = Math.floor(rating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= full ? 'star' : 'star-outline'}
          size={14}
          color={i <= full ? T.gold : T.textMuted}
        />
      ))}
      <Text style={{ color: T.textSecondary, fontSize: 12, marginLeft: 4 }}>
        {rating.toFixed(1)} ({count})
      </Text>
    </View>
  );
}

function PortfolioCard({ item, onRemove, removing }) {
  const firstImg = item.images?.[0];
  return (
    <View style={ss.portfolioCard}>
      <View style={ss.portfolioImgWrap}>
        {firstImg ? (
          <Image source={{ uri: firstImg }} style={ss.portfolioImg} resizeMode="cover" />
        ) : (
          <View style={ss.portfolioImgPlaceholder}>
            <Ionicons name="images-outline" size={28} color={T.textMuted} />
          </View>
        )}
        {item.images?.length > 1 && (
          <View style={ss.portfolioImgCount}>
            <Text style={ss.portfolioImgCountText}>+{item.images.length - 1}</Text>
          </View>
        )}
        <TouchableOpacity style={ss.portfolioRemoveBtn} onPress={onRemove} disabled={removing}>
          {removing ? (
            <ActivityIndicator size="small" color={T.white} />
          ) : (
            <Ionicons name="trash-outline" size={14} color={T.white} />
          )}
        </TouchableOpacity>
      </View>
      <View style={ss.portfolioInfo}>
        <Text style={ss.portfolioTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        {item.description
          ? <Text style={ss.portfolioDesc} numberOfLines={2}>{item.description}</Text>
          : null}
        {item.completedAt && (
          <Text style={ss.portfolioDate}>
            {new Date(item.completedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen Component ────────────────────────────────────────────────
export default function TaskerProfileDetailScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  // ── state ───────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [providerType, setProviderType] = useState('individual');
  const [businessName, setBusinessName] = useState('');
  const [brandBanner, setBrandBanner] = useState(null);
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [businessRegNo, setBusinessRegNo] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [servicesOffered, setServicesOffered] = useState([]);

  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerChanged, setBannerChanged] = useState(false);

  const [portfolio, setPortfolio] = useState([]);
  const [showAddWork, setShowAddWork] = useState(false);
  const [workForm, setWorkForm] = useState({ title: '', description: '', images: [] });
  const [workSaving, setWorkSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    priceType: 'negotiable',
    price: '',
    currency: 'GHS',
  });

  const [showRegionPicker, setShowRegionPicker] = useState(false);

  // ── Edit mode control ──────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [savedState, setSavedState] = useState(null);

  // ── fetch on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await taskerGetMyProfile();
      const p = res.data?.taskerProfile || res.data;
      hydrate(p);
      setProfile(p);
    } catch {
      Alert.alert('Error', 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }

  function hydrate(p) {
    if (!p) return;
    setProviderType(p.providerType || 'individual');
    setBusinessName(p.businessName || '');
    setBrandBanner(p.brandBanner || null);
    setTagline(p.tagline || '');
    setBio(p.bio || '');
    setBusinessRegNo(p.businessRegistrationNo || '');
    setLocationRegion(p.location?.region || '');
    setLocationCity(p.location?.city || '');
    setServicesOffered(p.servicesOffered || []);
    setPortfolio(p.workPortfolio || []);
    setBannerChanged(false);
  }

  // ── Snapshot for Cancel ────────────────────────────────────────────────
  const startEditing = () => {
    setSavedState({
      providerType,
      businessName,
      brandBanner,
      tagline,
      bio,
      businessRegNo,
      locationRegion,
      locationCity,
    });
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

  // ── banner handling (only active while editing) ────────────────────────
  const pickBanner = async () => {
    if (!editing) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 5],
      quality: 0.85,
    });
    if (!result.canceled) {
      setBrandBanner(result.assets[0].uri);
      setBannerChanged(true);
    }
  };

  const uploadBannerToS3 = async (uri) => {
    setBannerUploading(true);
    try {
      const filename = uri.split('/').pop();
      const ext = /\.(\w+)$/.exec(filename)?.[1] || 'jpeg';
      const file = { uri, name: filename, type: `image/${ext}` };
      const res = await uploadProfileImage({ filename: file.name, contentType: file.type });
      if (res.status !== 200) throw new Error();
      await sendFileToS3(res.data.fileUrl, file);
      return res.data.publicUrl;
    } finally {
      setBannerUploading(false);
    }
  };

  // ── save profile ───────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      let finalBanner = brandBanner;
      if (bannerChanged && brandBanner &&
          (brandBanner.startsWith('file://') || brandBanner.startsWith('content://'))) {
        finalBanner = await uploadBannerToS3(brandBanner);
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
      form.append('servicesOffered', JSON.stringify(servicesOffered));

      const res = await taskerProfileUpdate(form);
      if (res.status === 200) {
        const updated = res.data.taskerProfile;
        hydrate(updated);
        setProfile(updated);
        setEditing(false);
        Alert.alert('Saved ✓', 'Your professional profile has been updated.');
      } else {
        throw new Error();
      }
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── service actions ────────────────────────────────────────────────────
  const openServiceModal = (svc = null) => {
    if (svc) {
      setServiceForm({
        name: svc.name || '',
        description: svc.description || '',
        priceType: svc.priceType || 'negotiable',
        price: svc.price != null ? String(svc.price) : '',
        currency: svc.currency || 'GHS',
      });
      setEditingService(svc);
    } else {
      setServiceForm({ name: '', description: '', priceType: 'negotiable', price: '', currency: 'GHS' });
      setEditingService(null);
    }
    setShowServiceModal(true);
  };

  const saveService = () => {
    if (!serviceForm.name.trim()) { Alert.alert('Required', 'Service name is required.'); return; }
    const newSvc = {
      ...editingService,
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim(),
      priceType: serviceForm.priceType,
      price: parseFloat(serviceForm.price) || 0,
      currency: serviceForm.currency,
    };
    if (editingService) {
      setServicesOffered(prev => prev.map(s => s === editingService ? newSvc : s));
    } else {
      setServicesOffered(prev => [...prev, newSvc]);
    }
    setShowServiceModal(false);
  };

  const removeService = (svc) => {
    Alert.alert('Remove Service', `Remove "${svc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () =>
          setServicesOffered(prev => prev.filter(s => s !== svc)) },
    ]);
  };

  // ── portfolio actions ──────────────────────────────────────────────────
  const pickWorkImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setWorkForm(f => ({ ...f, images: [...f.images, ...uris].slice(0, 6) }));
    }
  };

  const removeWorkImage = (uri) =>
    setWorkForm(f => ({ ...f, images: f.images.filter(u => u !== uri) }));

  const saveWorkSample = async () => {
    if (!workForm.title.trim()) { Alert.alert('Required', 'Please enter a project title.'); return; }
    setWorkSaving(true);
    try {
      let uploadedUrls = [];
      if (workForm.images.length > 0) {
        const formData = new FormData();
        workForm.images.forEach((uri) => {
          const filename = uri.split('/').pop();
          const ext = /\.(\w+)$/.exec(filename)?.[1] || 'jpeg';
          formData.append('files', { uri, name: filename, type: `image/${ext}` });
        });
        const uploadRes = await uploadPortfolioFiles(formData);
        uploadedUrls = uploadRes.data?.urls || uploadRes.data?.fileUrls || [];
      }
      const payload = {
        title: workForm.title.trim(),
        description: workForm.description.trim(),
        images: uploadedUrls,
        completedAt: new Date().toISOString(),
      };
      const res = await addWorkSampleToProfile(payload);
      if (res.status === 200 || res.status === 201) {
        const newSample = res.data?.workSample || payload;
        setPortfolio(prev => [newSample, ...prev]);
        setWorkForm({ title: '', description: '', images: [] });
        setShowAddWork(false);
        Alert.alert('Added ✓', 'Work sample added to your portfolio.');
      } else {
        throw new Error();
      }
    } catch {
      Alert.alert('Error', 'Could not upload work sample. Try again.');
    } finally {
      setWorkSaving(false);
    }
  };

  const handleRemoveWork = async (item) => {
    const id = item._id || item.id;
    Alert.alert('Remove Project', `Remove "${item.title || 'this project'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setRemovingId(id);
          try {
            await removeWorkSampleFromProfile(id);
            setPortfolio(prev => prev.filter(p => (p._id || p.id) !== id));
          } catch {
            Alert.alert('Error', 'Could not remove this sample.');
          } finally {
            setRemovingId(null);
          }
        },
      },
    ]);
  };

  // ── loading state ──────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={[ss.safe, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={T.accent} />
      <Text style={{ color: T.textSecondary, marginTop: 12, fontSize: 14 }}>Loading profile…</Text>
    </SafeAreaView>
  );

  const vetting = VETTING_BADGES[profile?.vettingStatus || 'not_applied'];

  return (
    <SafeAreaView style={ss.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <View style={ss.topBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={ss.backBtn}>
          <Ionicons name="chevron-back" size={22} color={T.textPrimary} />
        </TouchableOpacity>
        <Text style={ss.topBarTitle}>Professional Profile</Text>

        {!editing ? (
          <TouchableOpacity style={ss.editBtn} onPress={startEditing}>
            <Ionicons name="create-outline" size={18} color={T.accent} />
          </TouchableOpacity>
        ) : (
          <View style={ss.editActionsRow}>
            <TouchableOpacity style={ss.cancelBtn} onPress={cancelEditing}>
              <Text style={ss.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ss.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={T.white} />
              ) : (
                <Text style={ss.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll}>

        {/* ── Brand Banner ────────────────────────────────────────────── */}
        <FadeSlide delay={0}>
          <TouchableOpacity onPress={pickBanner} activeOpacity={editing ? 0.85 : 1} style={ss.bannerWrap}>
            {brandBanner
              ? <Image source={{ uri: brandBanner }} style={ss.banner} resizeMode="cover" />
              : (
                <LinearGradient
                  colors={[T.surface, T.cardLight]}
                  style={ss.bannerPlaceholder}
                >
                  <Ionicons name="image-outline" size={34} color={T.textMuted} />
                  <Text style={ss.bannerPlaceholderText}>Tap to add a brand banner</Text>
                  <Text style={ss.bannerPlaceholderSub}>Recommended: 1200 × 380px</Text>
                </LinearGradient>
              )
            }
            {editing && (
              <View style={ss.bannerEditChip}>
                {bannerUploading
                  ? <ActivityIndicator size="small" color={T.white} />
                  : <Ionicons name="camera-outline" size={14} color={T.white} />
                }
                <Text style={ss.bannerEditChipText}>
                  {bannerUploading ? 'Uploading…' : brandBanner ? 'Change' : 'Add'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </FadeSlide>

        {/* ── Provider Type ───────────────────────────────────────────── */}
        <FadeSlide delay={60}>
          <View style={ss.card}>
            <SectionHeader icon="people-outline" title="Provider Type" accent={T.accent} />
            <View style={ss.providerRow}>
              {PROVIDER_TYPES.map(pt => {
                const isSelected = providerType === pt.value;
                return (
                  <TouchableOpacity
                    key={pt.value}
                    style={[
                      ss.providerOption,
                      isSelected && {
                        backgroundColor: pt.color + '18',
                        borderColor: pt.color + '60',
                      },
                      !editing && { opacity: 0.9 },
                    ]}
                    onPress={() => editing && setProviderType(pt.value)}
                    activeOpacity={editing ? 0.7 : 1}
                  >
                    <Ionicons name={pt.icon} size={22} color={isSelected ? pt.color : T.textMuted} />
                    <Text style={[ss.providerLabel, isSelected && { color: pt.color }]}>
                      {pt.label}
                    </Text>
                    {isSelected && (
                      <View style={[ss.providerCheck, { backgroundColor: pt.color }]}>
                        <Ionicons name="checkmark" size={10} color={T.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </FadeSlide>

        {/* ── Branding ─────────────────────────────────────────────────── */}
        <FadeSlide delay={110}>
          <View style={ss.card}>
            <SectionHeader icon="storefront-outline" title="Branding" accent={T.gold} />

            <InlineLabel text="Business Name" />
            <TextInput
              style={ss.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Kwame & Sons Electrical"
              placeholderTextColor={T.textMuted}
              editable={editing}
            />

            <InlineLabel text="Tagline" />
            <TextInput
              style={ss.input}
              value={tagline}
              onChangeText={setTagline}
              placeholder="e.g. Accra's most reliable handyman"
              placeholderTextColor={T.textMuted}
              maxLength={100}
              editable={editing}
            />
            <Text style={ss.charCount}>{tagline.length}/100</Text>

            <InlineLabel text="Bio / About" />
            <TextInput
              style={[ss.input, ss.textarea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Describe your skills, experience, and what makes you stand out…"
              placeholderTextColor={T.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={editing}
            />

            {providerType === 'business' && (
              <>
                <InlineLabel text="Business Registration Number" />
                <TextInput
                  style={ss.input}
                  value={businessRegNo}
                  onChangeText={setBusinessRegNo}
                  placeholder="e.g. CS-12345"
                  placeholderTextColor={T.textMuted}
                  editable={editing}
                />
              </>
            )}
          </View>
        </FadeSlide>

        {/* ── Location ─────────────────────────────────────────────────── */}
        <FadeSlide delay={160}>
          <View style={ss.card}>
            <SectionHeader icon="location-outline" title="Location" accent={T.teal} />

            <InlineLabel text="Region" />
            <TouchableOpacity
              style={[ss.input, ss.pickerBtn]}
              onPress={() => editing && setShowRegionPicker(true)}
              activeOpacity={editing ? 0.7 : 1}
            >
              <Text style={locationRegion ? ss.pickerBtnText : ss.pickerBtnPlaceholder}>
                {locationRegion || 'Select region…'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={T.textMuted} />
            </TouchableOpacity>

            <InlineLabel text="City / Area" />
            <TextInput
              style={ss.input}
              value={locationCity}
              onChangeText={setLocationCity}
              placeholder="e.g. Tema, Adabraka, Kumasi"
              placeholderTextColor={T.textMuted}
              editable={editing}
            />
            <View style={ss.geoNote}>
              <Ionicons name="information-circle-outline" size={14} color={T.primary} />
              <Text style={ss.geoNoteText}>Coordinates will be auto-set from your city & region.</Text>
            </View>
          </View>
        </FadeSlide>

        {/* ── Services Offered ──────────────────────────────────────────── */}
        <FadeSlide delay={210}>
          <View style={ss.card}>
            <SectionHeader
              icon="construct-outline"
              title="Services Offered"
              accent={T.purple}
              right={
                <TouchableOpacity style={ss.addChipBtn} onPress={() => openServiceModal()}>
                  <Ionicons name="add" size={15} color={T.purple} />
                  <Text style={[ss.addChipBtnText, { color: T.purple }]}>Add</Text>
                </TouchableOpacity>
              }
            />

            {servicesOffered.length === 0 ? (
              <TouchableOpacity style={ss.emptyState} onPress={() => openServiceModal()}>
                <Ionicons name="briefcase-outline" size={36} color={T.textMuted} />
                <Text style={ss.emptyStateText}>No services yet</Text>
                <Text style={ss.emptyStateSub}>Add the services you offer to attract clients</Text>
              </TouchableOpacity>
            ) : (
              servicesOffered.map((svc, idx) => (
                <View key={idx} style={ss.serviceItem}>
                  <View style={ss.serviceLeft}>
                    <Text style={ss.serviceName}>{svc.name}</Text>
                    {svc.description
                      ? <Text style={ss.serviceDesc} numberOfLines={2}>{svc.description}</Text>
                      : null}
                    <View style={ss.servicePriceRow}>
                      <View style={ss.servicePricePill}>
                        <Ionicons
                          name={PRICE_TYPES.find(p => p.value === svc.priceType)?.icon || 'pricetag-outline'}
                          size={11} color={T.gold}
                        />
                        <Text style={ss.servicePriceType}>
                          {PRICE_TYPES.find(p => p.value === svc.priceType)?.label || svc.priceType}
                        </Text>
                        {svc.price > 0 && (
                          <Text style={ss.servicePriceAmount}>
                            · {svc.currency} {svc.price.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={ss.serviceActions}>
                    <TouchableOpacity onPress={() => openServiceModal(svc)} style={ss.svcActionBtn}>
                      <Ionicons name="create-outline" size={16} color={T.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeService(svc)} style={ss.svcActionBtn}>
                      <Ionicons name="trash-outline" size={16} color={T.coral} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </FadeSlide>

        {/* ── Work Portfolio ────────────────────────────────────────────── */}
        <FadeSlide delay={260}>
          <View style={ss.card}>
            <SectionHeader
              icon="images-outline"
              title="Work Portfolio"
              accent={T.teal}
              right={
                <TouchableOpacity
                  style={[ss.addChipBtn, { borderColor: T.teal + '40' }]}
                  onPress={() => { setWorkForm({ title:'', description:'', images:[] }); setShowAddWork(true); }}
                >
                  <Ionicons name="add" size={15} color={T.teal} />
                  <Text style={[ss.addChipBtnText, { color: T.teal }]}>Add Project</Text>
                </TouchableOpacity>
              }
            />

            {portfolio.length === 0 ? (
              <TouchableOpacity
                style={ss.emptyState}
                onPress={() => { setWorkForm({ title:'', description:'', images:[] }); setShowAddWork(true); }}
              >
                <Ionicons name="trophy-outline" size={36} color={T.textMuted} />
                <Text style={ss.emptyStateText}>Portfolio is empty</Text>
                <Text style={ss.emptyStateSub}>Showcase your best projects to win more clients</Text>
              </TouchableOpacity>
            ) : (
              <View style={ss.portfolioGrid}>
                {portfolio.map((item, idx) => (
                  <PortfolioCard
                    key={item._id || idx}
                    item={item}
                    removing={removingId === (item._id || item.id)}
                    onRemove={() => handleRemoveWork(item)}
                  />
                ))}
              </View>
            )}
          </View>
        </FadeSlide>

        {/* ── Trust & Stats ─────────────────────────────────────────────── */}
        <FadeSlide delay={310}>
          <View style={ss.card}>
            <SectionHeader icon="shield-checkmark-outline" title="Trust & Stats" accent={T.coral} />

            <View style={ss.statsGrid}>
              <View style={ss.statBox}>
                <Text style={ss.statValue}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
                <Text style={ss.statLabel}>Rating</Text>
                <StarRating rating={profile?.rating || 0} count={profile?.numberOfRatings || 0} />
              </View>
              <View style={ss.statDivider} />
              <View style={ss.statBox}>
                <Text style={ss.statValue}>{profile?.credits ?? 0}</Text>
                <Text style={ss.statLabel}>Credits</Text>
                <Text style={ss.statSub}>For bidding</Text>
              </View>
              <View style={ss.statDivider} />
              <View style={ss.statBox}>
                <Text style={ss.statValue}>{profile?.score ?? 0}</Text>
                <Text style={ss.statLabel}>Score</Text>
                <Text style={ss.statSub}>Platform rank</Text>
              </View>
            </View>

            <View style={ss.vettingRow}>
              <View style={[ss.vettingBadge, { backgroundColor: vetting.bg, borderColor: vetting.color + '40' }]}>
                <Ionicons name={vetting.icon} size={14} color={vetting.color} />
                <Text style={[ss.vettingText, { color: vetting.color }]}>{vetting.label}</Text>
              </View>
              <Text style={ss.vettingHint}>
                {profile?.isVerified ? '✓ Verified Tasker' : 'Verification pending'}
              </Text>
            </View>
          </View>
        </FadeSlide>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════ */}

      {/* ─── Add / Edit Service Modal ───────────────────────────────────── */}
      <Modal visible={showServiceModal} animationType="slide" transparent onRequestClose={() => setShowServiceModal(false)}>
        <View style={ss.modalOverlay}>
          <View style={ss.modalSheet}>
            <View style={ss.modalHandle} />
            <View style={ss.modalHeader}>
              <Text style={ss.modalTitle}>{editingService ? 'Edit Service' : 'Add Service'}</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={22} color={T.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={ss.modalBody} showsVerticalScrollIndicator={false}>
              <InlineLabel text="Service Name *" />
              <TextInput
                style={ss.input}
                value={serviceForm.name}
                onChangeText={t => setServiceForm(f => ({ ...f, name: t }))}
                placeholder="e.g. Deep Carpet Cleaning"
                placeholderTextColor={T.textMuted}
              />
              <InlineLabel text="Description" />
              <TextInput
                style={[ss.input, ss.textarea]}
                value={serviceForm.description}
                onChangeText={t => setServiceForm(f => ({ ...f, description: t }))}
                placeholder="Describe what this service includes…"
                placeholderTextColor={T.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <InlineLabel text="Pricing Type" />
              <View style={ss.priceTypeRow}>
                {PRICE_TYPES.map(pt => (
                  <Chip
                    key={pt.value}
                    label={pt.label}
                    active={serviceForm.priceType === pt.value}
                    onPress={() => setServiceForm(f => ({ ...f, priceType: pt.value }))}
                    color={T.gold}
                  />
                ))}
              </View>
              {serviceForm.priceType !== 'negotiable' && (
                <>
                  <InlineLabel text="Price (GHS)" />
                  <TextInput
                    style={ss.input}
                    value={serviceForm.price}
                    onChangeText={t => setServiceForm(f => ({ ...f, price: t }))}
                    placeholder="0.00"
                    placeholderTextColor={T.textMuted}
                    keyboardType="numeric"
                  />
                </>
              )}
            </ScrollView>
            <View style={ss.modalFooter}>
              <TouchableOpacity style={ss.modalCancelBtn} onPress={() => setShowServiceModal(false)}>
                <Text style={ss.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ss.modalSaveBtn} onPress={saveService}>
                <Text style={ss.modalSaveText}>{editingService ? 'Update' : 'Add Service'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Add Work Sample Modal ──────────────────────────────────────── */}
      <Modal visible={showAddWork} animationType="slide" transparent onRequestClose={() => setShowAddWork(false)}>
        <View style={ss.modalOverlay}>
          <View style={ss.modalSheet}>
            <View style={ss.modalHandle} />
            <View style={ss.modalHeader}>
              <Text style={ss.modalTitle}>Add Work Sample</Text>
              <TouchableOpacity onPress={() => setShowAddWork(false)}>
                <Ionicons name="close" size={22} color={T.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={ss.modalBody} showsVerticalScrollIndicator={false}>
              <InlineLabel text="Project Title *" />
              <TextInput
                style={ss.input}
                value={workForm.title}
                onChangeText={t => setWorkForm(f => ({ ...f, title: t }))}
                placeholder="e.g. Living Room Renovation"
                placeholderTextColor={T.textMuted}
              />
              <InlineLabel text="Description" />
              <TextInput
                style={[ss.input, ss.textarea]}
                value={workForm.description}
                onChangeText={t => setWorkForm(f => ({ ...f, description: t }))}
                placeholder="What did this project involve?"
                placeholderTextColor={T.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <InlineLabel text={`Photos (${workForm.images.length}/6)`} />
              <View style={ss.workImagesRow}>
                {workForm.images.map((uri, i) => (
                  <View key={i} style={ss.workImgThumb}>
                    <Image source={{ uri }} style={ss.workImgThumbImg} />
                    <TouchableOpacity style={ss.workImgRemove} onPress={() => removeWorkImage(uri)}>
                      <Ionicons name="close-circle" size={18} color={T.coral} />
                    </TouchableOpacity>
                  </View>
                ))}
                {workForm.images.length < 6 && (
                  <TouchableOpacity style={ss.workImgAdd} onPress={pickWorkImages}>
                    <Ionicons name="add" size={24} color={T.teal} />
                    <Text style={ss.workImgAddText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
            <View style={ss.modalFooter}>
              <TouchableOpacity style={ss.modalCancelBtn} onPress={() => setShowAddWork(false)}>
                <Text style={ss.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ss.modalSaveBtn, workSaving && { opacity: 0.6 }]}
                onPress={saveWorkSample}
                disabled={workSaving}
              >
                {workSaving
                  ? <ActivityIndicator size="small" color={T.white} />
                  : <Text style={ss.modalSaveText}>Upload & Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Region Picker Modal ────────────────────────────────────────── */}
      <Modal visible={showRegionPicker} animationType="slide" transparent onRequestClose={() => setShowRegionPicker(false)}>
        <View style={ss.modalOverlay}>
          <View style={[ss.modalSheet, { maxHeight: '70%' }]}>
            <View style={ss.modalHandle} />
            <View style={ss.modalHeader}>
              <Text style={ss.modalTitle}>Select Region</Text>
              <TouchableOpacity onPress={() => setShowRegionPicker(false)}>
                <Ionicons name="close" size={22} color={T.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={GHANA_REGIONS}
              keyExtractor={r => r}
              style={{ marginBottom: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[ss.regionItem, locationRegion === item && ss.regionItemActive]}
                  onPress={() => { setLocationRegion(item); setShowRegionPicker(false); }}
                >
                  <Text style={[ss.regionItemText, locationRegion === item && { color: T.teal }]}>
                    {item}
                  </Text>
                  {locationRegion === item && <Ionicons name="checkmark" size={18} color={T.teal} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 30 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.bg,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: T.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 16, fontWeight: '700', color: T.textPrimary,
    letterSpacing: 0.2,
  },

  // Edit / Cancel / Save buttons
  editBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: T.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  editActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: T.accent,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: T.white,
  },

  // Banner
  bannerWrap: {
    marginHorizontal: 16, marginTop: 14,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: T.border,
    minHeight: 130,
  },
  banner: { width: '100%', height: 150 },
  bannerPlaceholder: {
    height: 150, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  bannerPlaceholderText: { color: T.textSecondary, fontSize: 14, fontWeight: '600' },
  bannerPlaceholderSub:  { color: T.textMuted, fontSize: 11 },
  bannerEditChip: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  bannerEditChipText: { color: T.white, fontSize: 12, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: T.surface,
    marginHorizontal: 16, marginTop: 14,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: T.border,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 16, gap: 10,
  },
  sectionIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: T.textPrimary, letterSpacing: 0.1,
  },

  // Provider type
  providerRow: { flexDirection: 'row', gap: 12 },
  providerOption: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: T.border,
    gap: 6, position: 'relative',
  },
  providerLabel: { fontSize: 14, fontWeight: '600', color: T.textSecondary },
  providerCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // Inputs
  inlineLabel: {
    fontSize: 11, fontWeight: '700', color: T.textMuted,
    letterSpacing: 0.9, textTransform: 'uppercase',
    marginBottom: 6, marginTop: 14,
  },
  input: {
    backgroundColor: T.card,
    borderWidth: 1, borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: T.textPrimary,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: T.textMuted, textAlign: 'right', marginTop: 4 },

  // Picker button
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerBtnText:        { fontSize: 15, color: T.textPrimary },
  pickerBtnPlaceholder: { fontSize: 15, color: T.textMuted },

  // Geo note
  geoNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingHorizontal: 2,
  },
  geoNoteText: { fontSize: 12, color: T.textMuted, flex: 1 },

  // Services
  addChipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: T.purple + '40',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  addChipBtnText: { fontSize: 13, fontWeight: '600' },
  emptyState: {
    alignItems: 'center', paddingVertical: 32,
    backgroundColor: T.card, borderRadius: 14, gap: 6,
  },
  emptyStateText: { fontSize: 15, fontWeight: '600', color: T.textSecondary },
  emptyStateSub:  { fontSize: 12, color: T.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  serviceItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: T.card, borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: T.border,
  },
  serviceLeft:  { flex: 1 },
  serviceName:  { fontSize: 15, fontWeight: '700', color: T.textPrimary, marginBottom: 4 },
  serviceDesc:  { fontSize: 13, color: T.textSecondary, lineHeight: 19, marginBottom: 8 },
  servicePriceRow: { flexDirection: 'row' },
  servicePricePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.cardLight, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  servicePriceType:   { fontSize: 12, color: T.gold, fontWeight: '600' },
  servicePriceAmount: { fontSize: 12, color: T.textSecondary },
  serviceActions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  svcActionBtn:   { padding: 6 },

  // Portfolio
  portfolioGrid: { gap: 12 },
  portfolioCard: {
    backgroundColor: T.card,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: T.border,
  },
  portfolioImgWrap: { width: '100%', height: 160, position: 'relative' },
  portfolioImg:     { width: '100%', height: '100%' },
  portfolioImgPlaceholder: {
    flex: 1, backgroundColor: T.cardLight,
    alignItems: 'center', justifyContent: 'center',
  },
  portfolioImgCount: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  portfolioImgCountText: { color: T.white, fontSize: 12, fontWeight: '700' },
  portfolioRemoveBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(220,38,38,0.85)',
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  portfolioInfo: { padding: 14 },
  portfolioTitle: { fontSize: 15, fontWeight: '700', color: T.textPrimary, marginBottom: 4 },
  portfolioDesc:  { fontSize: 13, color: T.textSecondary, lineHeight: 18, marginBottom: 6 },
  portfolioDate:  { fontSize: 11, color: T.textMuted },

  // Stats
  statsGrid: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.card, borderRadius: 16, padding: 18,
    marginBottom: 14,
  },
  statBox:     { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 50, backgroundColor: T.border },
  statValue:   { fontSize: 26, fontWeight: '800', color: T.textPrimary },
  statLabel:   { fontSize: 11, color: T.textMuted, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  statSub:     { fontSize: 11, color: T.textMuted },

  vettingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vettingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  vettingText: { fontSize: 13, fontWeight: '700' },
  vettingHint: { fontSize: 13, color: T.textSecondary },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '88%',
    borderWidth: 1, borderColor: T.border,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: T.border, alignSelf: 'center', marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: T.textPrimary },
  modalBody:   { padding: 20 },
  modalFooter: {
    flexDirection: 'row', gap: 12,
    padding: 20, borderTopWidth: 1, borderTopColor: T.border,
  },
  modalCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, borderColor: T.border,
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: T.textSecondary },
  modalSaveBtn: {
    flex: 2, alignItems: 'center', paddingVertical: 14,
    borderRadius: 12, backgroundColor: T.accent,
  },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: T.white },

  // Price type chips
  priceTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: T.border,
    backgroundColor: T.card,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: T.textSecondary },

  // Work images
  workImagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  workImgThumb: {
    width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative',
  },
  workImgThumbImg: { width: '100%', height: '100%' },
  workImgRemove: {
    position: 'absolute', top: 3, right: 3,
  },
  workImgAdd: {
    width: 80, height: 80, borderRadius: 10,
    borderWidth: 2, borderColor: T.teal + '50', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  workImgAddText: { fontSize: 11, color: T.teal, fontWeight: '600' },

  // Region picker
  regionItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  regionItemActive: { backgroundColor: T.teal + '10' },
  regionItemText: { fontSize: 15, color: T.textSecondary, fontWeight: '500' },
});