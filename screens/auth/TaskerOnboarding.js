import React, { useState, useRef, useEffect, useContext } from 'react';
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

import { taskerOnboarding, uploadProfileImage } from '../../api/authApi';
import { sendFileToS3 } from '../../api/commonApi';
import { AuthContext } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

// ─── Theme: Pacific Indigo & Warm Gold (same as TaskerProfileDetailScreen) ───
const C = {
  bg: '#F9FAFC',
  surface: '#FFFFFF',
  border: '#E4E8EE',
  accent: '#1E3A6E',         // deep indigo
  accentLight: '#DDE7F5',
  gold: '#D49B3F',           // warm gold
  goldLight: '#FCF3E1',
  green: '#0F766E',
  greenLight: '#D1FAE5',
  red: '#DC2626',
  redLight: '#FEE2E2',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
  shadow: '#1E3A6E14',
};

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

// ─── Animation helpers ────────────────────────────────────────────────────────
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

function Label({ text, required }) {
  return (
    <Text style={s.label}>
      {text}{required && <Text style={{ color: C.red }}> *</Text>}
    </Text>
  );
}

function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType, maxLength, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[s.input, multiline && s.inputMulti, focused && s.inputFocus, error && s.inputErr]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textMuted}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      keyboardType={keyboardType || 'default'}
      maxLength={maxLength}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
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
      {error && (
        <View style={s.errRow}>
          <Ionicons name="alert-circle-outline" size={13} color={C.red} />
          <Text style={s.errText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function ProgressBar({ current, total }) {
  const pct = ((current - 1) / (total - 1)) * 100;
  return (
    <View style={s.progressWrap}>
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={s.progressLabel}>{current} of {total}</Text>
    </View>
  );
}

// ─── Step Components (defined OUTSIDE to avoid re‑mounts) ─────────────────────

// ── Step 1: Photo ─────────────────────────────────────────────────────────────
function Step1Photo({ photoUri, imgUploading, pickPhoto, goNext }) {
  const a0 = useEntrance(0);
  const a1 = useEntrance(100);
  const a2 = useEntrance(200);
  return (
    <ScrollView contentContainerStyle={s.stepScroll} showsVerticalScrollIndicator={false}>
      <Animated.View style={[s.photoHero, a0]}>
        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={s.photoCircleWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={s.photoCircle} />
          ) : (
            <LinearGradient colors={[C.accentLight, C.surface]} style={s.photoCircle}>
              <Ionicons name="person" size={52} color={C.textMuted} />
            </LinearGradient>
          )}
          <View style={s.photoEditBadge}>
            {imgUploading ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <Ionicons name="camera" size={18} color={C.white} />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={a1}>
        <Text style={s.heroTitle}>First impressions{'\n'}matter.</Text>
        <Text style={s.heroSub}>
          A clear, professional photo helps clients trust and choose you.
          Tap the circle to upload yours.
        </Text>
      </Animated.View>

      <Animated.View style={[s.tipCard, a2]}>
        <Ionicons name="bulb-outline" size={18} color={C.gold} />
        <Text style={s.tipText}>
          Taskers with professional photos get{' '}
          <Text style={{ fontWeight: '800', color: C.accent }}>3× more bookings</Text>.
          Use a well-lit, front‑facing photo.
        </Text>
      </Animated.View>

      <Animated.View style={[s.skipRow, a2]}>
        <TouchableOpacity onPress={goNext} style={s.skipBtn}>
          <Text style={s.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// ── Step 2: Identity ──────────────────────────────────────────────────────────
function Step2Identity({
  phone, setPhone,
  providerType, setProviderType,
  businessName, setBusinessName,
  errors,
}) {
  const a0 = useEntrance(0);
  const a1 = useEntrance(80);
  const a2 = useEntrance(160);
  return (
    <ScrollView contentContainerStyle={s.stepScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Animated.View style={a0}>
        <FieldWrap label="Phone Number" required error={errors.phone}
          hint="Clients use this to coordinate with you after booking">
          <View style={s.phoneRow}>
            <View style={s.phonePrefix}>
              <Text style={s.phonePrefixText}>🇬🇭 +233</Text>
            </View>
            <TextInput
              style={[s.phoneInput, errors.phone && s.inputErr]}
              value={phone}
              onChangeText={setPhone}
              placeholder="XX XXX XXXX"
              placeholderTextColor={C.textMuted}
              keyboardType="phone-pad"
              maxLength={12}
            />
          </View>
        </FieldWrap>
      </Animated.View>

      <Animated.View style={a1}>
        <Text style={s.subSectionTitle}>I am a…</Text>
        <View style={s.providerRow}>
          {[
            { value: 'individual', label: 'Individual',  emoji: '🙋', desc: 'Solo professional' },
            { value: 'business',   label: 'Business',    emoji: '🏢', desc: 'Company or team'   },
          ].map(pt => (
            <TouchableOpacity
              key={pt.value}
              style={[s.providerCard, providerType === pt.value && s.providerCardActive]}
              onPress={() => setProviderType(pt.value)}
              activeOpacity={0.8}
            >
              <Text style={s.providerEmoji}>{pt.emoji}</Text>
              <Text style={[s.providerLabel, providerType === pt.value && { color: C.accent }]}>
                {pt.label}
              </Text>
              <Text style={s.providerDesc}>{pt.desc}</Text>
              {providerType === pt.value && (
                <View style={s.providerCheck}>
                  <Ionicons name="checkmark" size={11} color={C.white} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Business Name now visible for ALL */}
      <Animated.View style={a2}>
        <FieldWrap label="Business Name" required error={errors.businessName}>
          <StyledInput
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. Kofi & Sons Electrical"
            error={errors.businessName}
          />
        </FieldWrap>
      </Animated.View>
    </ScrollView>
  );
}

// ── Step 3: Story ─────────────────────────────────────────────────────────────
function Step3Story({ bio, setBio, tagline, setTagline, errors }) {
  const a0 = useEntrance(0);
  const a1 = useEntrance(100);
  return (
    <ScrollView contentContainerStyle={s.stepScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Animated.View style={a0}>
        <FieldWrap label="About You" required
          hint="Write in first person. What can you do? What sets you apart?"
          error={errors.bio}>
          <StyledInput
            multiline
            value={bio}
            onChangeText={setBio}
            placeholder="e.g. I'm a certified electrician with 8 years of experience across Accra. I specialize in residential wiring, repairs, and safety inspections. My clients love my punctuality and clean workmanship…"
            maxLength={600}
            error={errors.bio}
          />
          <Text style={s.charCount}>{bio.length}/600</Text>
        </FieldWrap>
      </Animated.View>

      <Animated.View style={a1}>
        <FieldWrap label="Tagline" hint="One punchy sentence clients see first (optional)">
          <StyledInput
            value={tagline}
            onChangeText={setTagline}
            placeholder="e.g. Accra's most reliable electrician"
            maxLength={80}
          />
          <Text style={s.charCount}>{tagline.length}/80</Text>
        </FieldWrap>
      </Animated.View>

      <Animated.View style={[s.tipCard, { marginTop: 8 }, useEntrance(200)]}>
        <Ionicons name="sparkles-outline" size={18} color={C.gold} />
        <Text style={s.tipText}>
          Profiles with detailed bios receive{' '}
          <Text style={{ fontWeight: '800', color: C.accent }}>60% more enquiries</Text>.
          Be honest, specific, and warm.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

// ── Step 4: Services ──────────────────────────────────────────────────────────
function Step4Services({ services, errors, openSvcModal, removeSvc }) {
  const a0 = useEntrance(0);
  return (
    <ScrollView contentContainerStyle={s.stepScroll} showsVerticalScrollIndicator={false}>
      <Animated.View style={a0}>
        {services.length === 0 ? (
          <View style={s.svcEmpty}>
            <View style={s.svcEmptyIcon}>
              <Ionicons name="construct-outline" size={38} color={C.textMuted} />
            </View>
            <Text style={s.svcEmptyTitle}>No services yet</Text>
            <Text style={s.svcEmptyDesc}>
              Add the services you offer — clients use these to find and book you.
            </Text>
          </View>
        ) : (
          <View style={s.svcList}>
            {services.map((svc, i) => {
              const pt = PRICE_TYPES.find(p => p.value === svc.priceType) || PRICE_TYPES[3];
              return (
                <View key={i} style={s.svcItem}>
                  <View style={s.svcItemLeft}>
                    <View style={s.svcItemIconWrap}>
                      <Ionicons name={pt.icon} size={15} color={C.accent} />
                    </View>
                    <View style={s.svcItemBody}>
                      <Text style={s.svcItemName}>{svc.name}</Text>
                      {svc.description ? (
                        <Text style={s.svcItemDesc} numberOfLines={1}>{svc.description}</Text>
                      ) : null}
                      <View style={s.svcPricePill}>
                        <Text style={s.svcPricePillText}>
                          {pt.label}{svc.price > 0 && svc.priceType !== 'negotiable' ? ` · GHS ${svc.price}` : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={s.svcItemActions}>
                    <TouchableOpacity onPress={() => openSvcModal(svc)} style={s.svcActionBtn}>
                      <Ionicons name="create-outline" size={16} color={C.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeSvc(svc)} style={s.svcActionBtn}>
                      <Ionicons name="trash-outline" size={16} color={C.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {errors.services && (
          <View style={[s.errRow, { marginTop: 8 }]}>
            <Ionicons name="alert-circle-outline" size={13} color={C.red} />
            <Text style={s.errText}>{errors.services}</Text>
          </View>
        )}

        <TouchableOpacity style={s.addSvcBtn} onPress={() => openSvcModal()} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={20} color={C.accent} />
          <Text style={s.addSvcBtnText}>Add a Service</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// ── Step 5: Location ──────────────────────────────────────────────────────────
function Step5Location({ region, setRegion, city, setCity, errors, setShowRegion }) {
  const a0 = useEntrance(0);
  const a1 = useEntrance(100);
  return (
    <ScrollView contentContainerStyle={s.stepScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Animated.View style={a0}>
        <FieldWrap label="Region" required error={errors.region}>
          <TouchableOpacity
            style={[s.input, s.pickerRow, errors.region && s.inputErr]}
            onPress={() => setShowRegion(true)}
          >
            <Text style={region ? s.pickerVal : s.pickerPlaceholder}>
              {region || 'Select your region…'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </FieldWrap>
      </Animated.View>

      <Animated.View style={a1}>
        <FieldWrap label="City / Area" required error={errors.city}
          hint="The area where you primarily operate">
          <StyledInput
            value={city}
            onChangeText={setCity}
            placeholder="e.g. East Legon, Tema, Kumasi"
            error={errors.city}
          />
        </FieldWrap>

        <View style={s.geoNote}>
          <Ionicons name="navigate-circle-outline" size={16} color={C.green} />
          <Text style={s.geoNoteText}>
            Clients nearby will find you based on this location.
            Coordinates are set automatically.
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
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
  const [photoUri,     setPhotoUri]     = useState(null);
  const [photoUrl,     setPhotoUrl]     = useState('');

  // Step 2
  const [phone,        setPhone]        = useState('');
  const [providerType, setProviderType] = useState('individual');
  const [businessName, setBusinessName] = useState('');

  // Step 3
  const [bio,          setBio]          = useState('');
  const [tagline,      setTagline]      = useState('');

  // Step 4
  const [services,     setServices]     = useState([]);
  const [showSvcModal, setShowSvcModal] = useState(false);
  const [editingSvc,   setEditingSvc]   = useState(null);
  const [svcForm,      setSvcForm]      = useState({ name:'', description:'', priceType:'negotiable', price:'' });

  // Step 5
  const [region,       setRegion]       = useState('');
  const [city,         setCity]         = useState('');
  const [showRegion,   setShowRegion]   = useState(false);

  const [errors,       setErrors]       = useState({});

  // slide animation
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
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
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
    } finally {
      setImgUploading(false);
    }
  };

  // ── Service modal ────────────────────────────────────────────────────────
  const openSvcModal = (svc = null) => {
    setSvcForm(svc
      ? { name: svc.name, description: svc.description, priceType: svc.priceType, price: svc.price ? String(svc.price) : '' }
      : { name: '', description: '', priceType: 'negotiable', price: '' }
    );
    setEditingSvc(svc);
    setShowSvcModal(true);
  };

  const saveSvc = () => {
    if (!svcForm.name.trim()) { Alert.alert('Required', 'Service name is required.'); return; }
    const newSvc = {
      name: svcForm.name.trim(),
      description: svcForm.description.trim(),
      priceType: svcForm.priceType,
      price: parseFloat(svcForm.price) || 0,
      currency: 'GHS',
    };
    if (editingSvc) {
      setServices(prev => prev.map(s => s === editingSvc ? newSvc : s));
    } else {
      setServices(prev => [...prev, newSvc]);
    }
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

      const form = new FormData();
      if (phone.trim())          form.append('phone', phone.trim());
      if (finalPhotoUrl)         form.append('profileImage', finalPhotoUrl);
      form.append('providerType', providerType);
      form.append('businessName', businessName.trim());
      if (tagline.trim())        form.append('tagline', tagline.trim());
      if (bio.trim())            form.append('bio', bio.trim());
      form.append('location[region]', region);
      form.append('location[city]',   city.trim());
      form.append('servicesOffered', JSON.stringify(services));

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

  // Render current step component (stable identity → no re‑mounts)
  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Photo photoUri={photoUri} imgUploading={imgUploading} pickPhoto={pickPhoto} goNext={goNext} />;
      case 2:
        return (
          <Step2Identity
            phone={phone} setPhone={setPhone}
            providerType={providerType} setProviderType={setProviderType}
            businessName={businessName} setBusinessName={setBusinessName}
            errors={errors}
          />
        );
      case 3:
        return <Step3Story bio={bio} setBio={setBio} tagline={tagline} setTagline={setTagline} errors={errors} />;
      case 4:
        return <Step4Services services={services} errors={errors} openSvcModal={openSvcModal} removeSvc={removeSvc} />;
      case 5:
        return <Step5Location region={region} setRegion={setRegion} city={city} setCity={setCity} errors={errors} setShowRegion={setShowRegion} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Top bar (light, indigo accent) ────────────────────────────── */}
      <View style={s.topBar}>
        <View style={s.topBarInner}>
          {step > 1 ? (
            <TouchableOpacity onPress={goBack} style={s.topBackBtn}>
              <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}

          <View style={s.stepDots}>
            {STEPS.map(st => (
              <View
                key={st.id}
                style={[
                  s.stepDot,
                  st.id === step   && s.stepDotActive,
                  st.id < step     && s.stepDotDone,
                ]}
              />
            ))}
          </View>

          {step === 1 ? (
            <TouchableOpacity onPress={() => navigation?.goBack?.()} style={s.topActionBtn}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>
        <ProgressBar current={step} total={STEPS.length} />
      </View>

      {/* ── Step header ───────────────────────────────────────────────── */}
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

      {/* ── Step content (no unmounting) ──────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideX }] }]}>
          {renderStep()}
        </Animated.View>

        {/* ── Bottom CTA bar ──────────────────────────────────────────── */}
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
                  <Text style={s.ctaBtnText}>
                    {imgUploading ? 'Uploading photo…' : 'Setting up your profile…'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={s.ctaBtnText}>
                    {isLastStep ? 'Complete Setup' : 'Continue'}
                  </Text>
                  <Ionicons
                    name={isLastStep ? 'checkmark-circle' : 'arrow-forward'}
                    size={20} color={C.white}
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: Service
      ═════════════════════════════════════════════════════════════════ */}
      <Modal visible={showSvcModal} animationType="slide" transparent onRequestClose={() => setShowSvcModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>{editingSvc ? 'Edit Service' : 'New Service'}</Text>
              <TouchableOpacity onPress={() => setShowSvcModal(false)}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody}  contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Label text="Service Name" required />
              <StyledInput value={svcForm.name} onChangeText={t => setSvcForm(f => ({ ...f, name: t }))} placeholder="e.g. Electrical Wiring, Plumbing, House Cleaning…" />
              <View style={{ height: 14 }} />
              <Label text="Description" />
              <StyledInput multiline value={svcForm.description} onChangeText={t => setSvcForm(f => ({ ...f, description: t }))} placeholder="What does this service include? Any special tools or expertise?" />
              <View style={{ height: 14 }} />
              <Label text="Pricing Model" />
              <View style={s.priceGrid}>
                {PRICE_TYPES.map(pt => (
                  <TouchableOpacity key={pt.value} style={[s.priceCard, svcForm.priceType === pt.value && s.priceCardActive]} onPress={() => setSvcForm(f => ({ ...f, priceType: pt.value }))} activeOpacity={0.8}>
                    <Ionicons name={pt.icon} size={18} color={svcForm.priceType === pt.value ? C.accent : C.textMuted} />
                    <Text style={[s.priceCardLabel, svcForm.priceType === pt.value && { color: C.accent }]}>{pt.label}</Text>
                    <Text style={s.priceCardDesc}>{pt.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {svcForm.priceType !== 'negotiable' && (
                <>
                  <View style={{ height: 14 }} />
                  <Label text={`Price (GHS)${svcForm.priceType === 'starts_at' ? ' — minimum' : svcForm.priceType === 'hourly' ? ' — per hour' : ''}`} />
                  <StyledInput value={svcForm.price} onChangeText={t => setSvcForm(f => ({ ...f, price: t }))} placeholder="0.00" keyboardType="numeric" />
                </>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
            <View style={s.modalFoot}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowSvcModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSaveBtn} onPress={saveSvc}>
                <Text style={s.modalSaveText}>{editingSvc ? 'Update' : 'Add Service'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: Region Picker
      ═════════════════════════════════════════════════════════════════ */}
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
  topBar: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 12,
  },
  topBarInner: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, marginBottom: 10,
  },
  topBackBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  topActionBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },

  // Step dots
  stepDots: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 7, alignItems: 'center',
  },
  stepDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: C.border,
  },
  stepDotActive: {
    width: 22, height: 6, borderRadius: 3, backgroundColor: C.accent,
  },
  stepDotDone: {
    backgroundColor: C.accent + '80',
  },

  // Progress bar
  progressWrap: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10,
  },
  progressTrack: {
    flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: C.accent, borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5,
  },

  // Step header card
  stepHeadCard: {
    backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6,
  },
  stepHeaderTop: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  stepIconWrap: {
    width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
  },
  stepHeaderText: {},
  stepNum: {
    fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2,
  },
  stepTitle: {
    fontSize: 22, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5,
  },

  // Step scroll
  stepScroll: { padding: 20, paddingBottom: 40 },

  // Step 1 — photo
  photoHero: { alignItems: 'center', marginBottom: 30, marginTop: 12 },
  photoCircleWrap: { position: 'relative' },
  photoCircle: {
    width: 150, height: 150, borderRadius: 75,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    borderWidth: 3, borderColor: C.border,
  },
  photoEditBadge: {
    position: 'absolute', bottom: 6, right: 6,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.accent, borderWidth: 3, borderColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 30, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.8, lineHeight: 36, marginBottom: 12 },
  heroSub: { fontSize: 15, color: C.textSecondary, lineHeight: 23, marginBottom: 24 },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.goldLight, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E8C97A',
  },
  tipText: { flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 19 },
  skipRow: { alignItems: 'center', marginTop: 20 },
  skipBtn: { padding: 12 },
  skipText: { fontSize: 14, color: C.textMuted, fontWeight: '600' },

  // Step 2 — identity
  phoneRow: { flexDirection: 'row', gap: 10 },
  phonePrefix: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center',
  },
  phonePrefixText: { fontSize: 15, color: C.textPrimary, fontWeight: '600' },
  phoneInput: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: C.textPrimary,
  },
  subSectionTitle: {
    fontSize: 13, fontWeight: '700', color: C.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, marginTop: 8,
  },
  providerRow: { flexDirection: 'row', gap: 12 },
  providerCard: {
    flex: 1, alignItems: 'center', paddingVertical: 20, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
    position: 'relative', gap: 4,
  },
  providerCardActive: { borderColor: C.accent, backgroundColor: C.accentLight },
  providerEmoji: { fontSize: 28 },
  providerLabel: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  providerDesc: { fontSize: 12, color: C.textMuted },
  providerCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
  },

  // Step 4 — services
  svcEmpty: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  svcEmptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  svcEmptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  svcEmptyDesc: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 21 },
  svcList: { gap: 10, marginBottom: 14 },
  svcItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  svcItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  svcItemIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center',
  },
  svcItemBody: { flex: 1 },
  svcItemName: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  svcItemDesc: { fontSize: 13, color: C.textSecondary, marginBottom: 6 },
  svcPricePill: {
    backgroundColor: C.accentLight, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start',
  },
  svcPricePillText: { fontSize: 11, fontWeight: '700', color: C.accent },
  svcItemActions: { flexDirection: 'row', gap: 6 },
  svcActionBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  addSvcBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 2, borderColor: C.accent, borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 16, marginTop: 4,
  },
  addSvcBtnText: { fontSize: 15, fontWeight: '700', color: C.accent },

  // Step 5 — location
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerVal: { fontSize: 15, color: C.textPrimary, fontWeight: '500' },
  pickerPlaceholder: { fontSize: 15, color: C.textMuted },
  geoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.greenLight, borderRadius: 12, padding: 12, marginTop: 4,
  },
  geoNoteText: { flex: 1, fontSize: 13, color: C.green, lineHeight: 19 },

  // Shared inputs
  fieldWrap: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 6, letterSpacing: 0.1 },
  hint: { fontSize: 12, color: C.textMuted, marginBottom: 8, lineHeight: 17 },
  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: C.textPrimary,
  },
  inputMulti: { minHeight: 120, textAlignVertical: 'top' },
  inputFocus: { borderColor: C.accent, backgroundColor: '#F5F9FF' },
  inputErr: { borderColor: C.red },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  errText: { fontSize: 12, color: C.red, fontWeight: '500' },
  charCount: { fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 4 },

  // Bottom CTA bar
  bottomBar: {
    backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  ctaBtn: { borderRadius: 16, overflow: 'hidden' },
  ctaBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, gap: 10,
  },
  ctaBtnDisabled: { opacity: 0.65 },
  ctaBtnText: { color: C.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%',
    borderWidth: 1, borderColor: C.border,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginTop: 10,
  },
  modalHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  modalBody: { padding: 20 },
  modalFoot: {
    flexDirection: 'row', gap: 12, padding: 20,
    borderTopWidth: 1, borderTopColor: C.border,
    bottom:24,
  },
  modalCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface,
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: C.textSecondary },
  modalSaveBtn: {
    flex: 2, alignItems: 'center', paddingVertical: 14,
    borderRadius: 12, backgroundColor: C.accent,
  },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: C.white },

  // Price grid (service modal)
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  priceCard: {
    width: (width - 80) / 2, alignItems: 'center', paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface, gap: 4,
  },
  priceCardActive: { borderColor: C.accent, backgroundColor: C.accentLight },
  priceCardLabel: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  priceCardDesc: { fontSize: 11, color: C.textMuted, textAlign: 'center' },

  // Region picker
  regionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  regionRowActive: { backgroundColor: C.greenLight },
  regionText: { flex: 1, fontSize: 15, color: C.textSecondary, fontWeight: '500' },
});