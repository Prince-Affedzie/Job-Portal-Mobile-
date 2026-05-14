import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image, Dimensions,
  Platform, StatusBar, Animated, Modal, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

// ── API — adjust paths ─────────────────────────────────────────────────────
import { taskMediaUpload } from '../../api/miniTaskApi';
import { sendFileToS3 }    from '../../api/commonApi';
import { bookService }     from '../../api/bookingApi';
import { navigate }        from '../../services/navigationService';

const { width } = Dimensions.get('window');

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:         '#F0F4FF',
  surface:    '#FFFFFF',
  navy:       '#0D1B4B',
  navyMid:    '#1A3270',
  blue:       '#1A56DB',
  blueSoft:   '#EBF2FF',
  blueBorder: '#C4D7FF',
  teal:       '#0E9F8A',
  tealSoft:   '#E6F9F6',
  amber:      '#E8A027',
  amberSoft:  '#FEF5E4',
  coral:      '#E8473A',
  coralSoft:  '#FEF0EF',
  sage:       '#2E7D6F',
  purple:     '#6C3FCF',
  purpleSoft: '#F0EBFF',
  textPri:    '#0D1B4B',
  textSec:    '#4A5578',
  textMut:    '#8B95B0',
  border:     '#DDE3F2',
  hairline:   '#EEF1FA',
  white:      '#FFFFFF',
  success:    '#12B886',
};

const PRICE_TYPE_CONFIG = {
  fixed:      { label: 'Fixed price',  suffix: '',     color: C.blue   },
  hourly:     { label: 'Per hour',     suffix: '/hr',  color: C.teal   },
  starts_at:  { label: 'Starting at',  suffix: '',     color: C.purple },
  negotiable: { label: 'Negotiable',   suffix: '',     color: C.amber  },
};

const DEFAULT_AVATAR =
  'https://res.cloudinary.com/duv3qvvjz/image/upload/v1760376396/male_avatar_fwgmfd.jpg';

// ─── Animation helper ─────────────────────────────────────────────────────────
function FadeSlide({ delay = 0, children }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.spring(ty,  { toValue: 0, tension: 55, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: op, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDot({ num, active, done }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[
        ss.stepDot,
        active && ss.stepDotActive,
        done   && ss.stepDotDone,
      ]}>
        {done
          ? <Ionicons name="checkmark" size={11} color={C.white} />
          : <Text style={[ss.stepDotNum, (active || done) && { color: C.white }]}>{num}</Text>
        }
      </View>
    </View>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, accent = C.blue, children, delay = 0 }) {
  return (
    <FadeSlide delay={delay}>
      <View style={ss.section}>
        <View style={ss.sectionHead}>
          <View style={[ss.sectionIconWrap, { backgroundColor: accent + '1A' }]}>
            <Ionicons name={icon} size={17} color={accent} />
          </View>
          <Text style={ss.sectionTitle}>{title}</Text>
        </View>
        <View style={ss.sectionBody}>{children}</View>
      </View>
    </FadeSlide>
  );
}

// ─── Labelled Input ───────────────────────────────────────────────────────────
function LabelInput({ label, required, children, error, hint }) {
  return (
    <View style={ss.fieldWrap}>
      <Text style={ss.fieldLabel}>
        {label}{required && <Text style={{ color: C.coral }}> *</Text>}
      </Text>
      {hint && <Text style={ss.fieldHint}>{hint}</Text>}
      {children}
      {error && (
        <View style={ss.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={C.coral} />
          <Text style={ss.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styled TextInput ─────────────────────────────────────────────────────────
function StyledInput({ multiline, value, onChangeText, placeholder, keyboardType, maxLength, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[
        ss.input,
        multiline && ss.inputMulti,
        focused    && ss.inputFocused,
        error      && ss.inputError,
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textMut}
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

// ─── Date/Time Row ────────────────────────────────────────────────────────────
function DateTimeRow({ icon, label, value, placeholder, onPress, accent = C.blue }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={ss.dtRow}>
      <View style={[ss.dtIconWrap, { backgroundColor: accent + '14' }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={ss.dtBody}>
        <Text style={ss.dtLabel}>{label}</Text>
        <Text style={[ss.dtValue, !value && { color: C.textMut }]}>
          {value || placeholder}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.textMut} />
    </TouchableOpacity>
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────
function ServiceCard({ svc, selected, onSelect, index }) {
  const cfg    = PRICE_TYPE_CONFIG[svc.priceType] || PRICE_TYPE_CONFIG.negotiable;
  const hasAmt = svc.price > 0 && svc.priceType !== 'negotiable';

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pIn  = () => Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true }).start();
  const pOut = () => Animated.spring(scaleAnim, { toValue: 1,     useNativeDriver: true }).start();

  const accentPalette = [C.blue, C.teal, C.purple, C.sage, C.amber];
  const accent = accentPalette[index % accentPalette.length];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 10 }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={pIn}
        onPressOut={pOut}
        onPress={onSelect}
        style={[
          ss.svcCard,
          selected && { borderColor: accent, backgroundColor: accent + '08' },
        ]}
      >
        {/* left accent bar */}
        <View style={[ss.svcBar, { backgroundColor: selected ? accent : C.border }]} />

        <View style={ss.svcContent}>
          <View style={ss.svcTop}>
            {/* radio */}
            <View style={[ss.radio, selected && { borderColor: accent }]}>
              {selected && <View style={[ss.radioDot, { backgroundColor: accent }]} />}
            </View>

            <View style={ss.svcInfo}>
              <Text style={[ss.svcName, selected && { color: accent }]}>{svc.name}</Text>
              {svc.description
                ? <Text style={ss.svcDesc} numberOfLines={2}>{svc.description}</Text>
                : null}
            </View>

            {/* price chip */}
            <View style={[ss.priceChip, { backgroundColor: cfg.color + '12', borderColor: cfg.color + '30' }]}>
              {hasAmt ? (
                <>
                  <Text style={[ss.priceAmt, { color: cfg.color }]}>
                    GHS {svc.price}{cfg.suffix}
                  </Text>
                </>
              ) : (
                <Text style={[ss.priceType, { color: cfg.color }]}>{cfg.label}</Text>
              )}
            </View>
          </View>

          {/* price sub-label if has amount */}
          {hasAmt && (
            <View style={ss.svcPriceSub}>
              <Text style={[ss.priceSuffix, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          )}
        </View>

        {/* selected check */}
        {selected && (
          <View style={[ss.svcCheck, { backgroundColor: accent }]}>
            <Ionicons name="checkmark" size={12} color={C.white} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Media Thumb ──────────────────────────────────────────────────────────────
function MediaThumb({ item, onRemove }) {
  return (
    <View style={ss.mediaThumb}>
      {item.type === 'image'
        ? <Image source={{ uri: item.uri }} style={ss.mediaThumbImg} />
        : (
          <View style={ss.mediaThumbVideo}>
            <Ionicons name="videocam" size={22} color={C.blue} />
            <Text style={ss.mediaThumbVideoLabel}>Video</Text>
          </View>
        )
      }
      <TouchableOpacity style={ss.mediaThumbRemove} onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={20} color={C.coral} />
      </TouchableOpacity>
      <View style={ss.mediaThumbBadge}>
        <Text style={ss.mediaThumbBadgeText}>{item.type === 'image' ? 'IMG' : 'VID'}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingScreen({ route }) {
  const insets = useSafeAreaInsets();

  // ── Route params ─────────────────────────────────────────────────────────
  // Supports both: { taskerProfile, user } or legacy { selectedTasker }
  const {
    taskerProfile: _taskerProfile,
    user: _user,
    selectedTasker,        // legacy
    location: routeLocation,
  } = route.params || {};

  // Normalise — new shape: taskerProfile (TaskerProfile doc) + user (User doc)
  // Legacy shape: selectedTasker contains mixed fields
  const taskerProfile = _taskerProfile || selectedTasker || {};
  const userDoc       = _user || taskerProfile.userId || {};

  // Identity
  const displayName  = taskerProfile.businessName || userDoc.name || 'Tasker';
  const avatarUri    = userDoc.profileImage || DEFAULT_AVATAR;
  const bannerUri    = taskerProfile.brandBanner || null;
  const rating       = taskerProfile.rating  || 0;
  const numRatings   = taskerProfile.numberOfRatings || 0;
  const isVerified   = taskerProfile.isVerified || false;
  const tagline      = taskerProfile.tagline || '';
  const locationStr  = [
    taskerProfile.location?.city,
    taskerProfile.location?.region,
  ].filter(Boolean).join(', ');

  // ── Services — from new schema: servicesOffered[] ─────────────────────────
  const services = useMemo(() => {
    // New schema shape
    if (Array.isArray(taskerProfile.servicesOffered) && taskerProfile.servicesOffered.length > 0) {
      return taskerProfile.servicesOffered;
    }
    // Legacy fallback
    const list = [];
    if (taskerProfile.primaryService?.serviceId) {
      list.push({
        serviceId:   taskerProfile.primaryService.serviceId,
        name:        taskerProfile.primaryService.serviceName,
        priceType:   'negotiable',
        price:       0,
        currency:    'GHS',
      });
    }
    (taskerProfile.secondaryServices || []).forEach(s => {
      if (s.serviceId) list.push({ serviceId: s.serviceId, name: s.serviceName, priceType: 'negotiable', price: 0, currency: 'GHS' });
    });
    return list;
  }, [taskerProfile]);

  // Pre-select if only one service exists
  const [selectedService, setSelectedService] = useState(
    services.length === 1 ? services[0] : null
  );

  // ── Form state ────────────────────────────────────────────────────────────
  const [description,    setDescription]    = useState('');
  const [preferredDate,  setPreferredDate]  = useState(new Date(Date.now() + 86_400_000));
  const [preferredTime,  setPreferredTime]  = useState('');
  const [address,        setAddress]        = useState(() => {
    if (!routeLocation) return '';
    return [routeLocation.suburb, routeLocation.city, routeLocation.region]
      .filter(Boolean).join(', ');
  });
  const [media,          setMedia]          = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [errors,         setErrors]         = useState({});

  // ── Formatted display helpers ─────────────────────────────────────────────
  const formattedDate = preferredDate.toLocaleDateString('en-GH', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });

  const formattedTime = (() => {
    if (!preferredTime) return '';
    const [h, m] = preferredTime.split(':');
    const d = new Date(); d.setHours(+h, +m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  })();

  // ── Media ─────────────────────────────────────────────────────────────────
  const pickMedia = async (type) => {
    if (media.length >= 3) { Alert.alert('Limit Reached', 'Maximum 3 files allowed.'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Please allow photo access.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: type === 'image' ? [4, 3] : [16, 9],
      quality: 0.8,
      ...(type === 'video' && { videoMaxDuration: 45 }),
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset   = result.assets[0];
      const info    = await FileSystem.getInfoAsync(asset.uri);
      const sizeMB  = (info.size || asset.fileSize || 0) / (1024 * 1024);
      if (sizeMB > 10) { Alert.alert('File Too Large', 'Please pick a file under 10 MB.'); return; }
      setMedia(prev => [...prev, {
        uri: asset.uri, type,
        name: asset.fileName || `media_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
        tempId: Date.now(),
      }]);
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!selectedService)                e.service     = 'Please select a service';
    if (!description.trim())             e.description = 'Please describe what you need';
    if (description.trim().length < 20)  e.description = 'Be more specific — at least 20 characters';
    if (!address.trim())                 e.address     = 'Service location is required';
    if (!preferredTime)                  e.time        = 'Please pick a preferred time';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Upload media
      const uploadedMedia = [];
      for (const item of media) {
        if (item.uri) {
          const file = { uri: item.uri, name: item.name, type: item.type === 'image' ? 'image/jpeg' : 'video/mp4' };
          const res  = await taskMediaUpload({ filename: file.name, contentType: file.type });
          if (res.status !== 200) throw new Error('Media upload failed');
          await sendFileToS3(res.data.fileUrl, file);
          uploadedMedia.push({ url: res.data.publicUrl, type: item.type });
        }
      }

      const payload = {
        tasker:         taskerProfile._id,
        service:       selectedService.serviceId || selectedService._id,
        description:   description.trim(),
        address:       routeLocation || { suburb: address, city: address, region: address },
        preferredDate: preferredDate.toISOString().split('T')[0],
        preferredTime: preferredTime,
        scheduledAt:   (() => {
          const d = new Date(preferredDate);
          if (preferredTime) { const [h, m] = preferredTime.split(':'); d.setHours(+h, +m, 0, 0); }
          return d.toISOString();
        })(),
        media: uploadedMedia,
      };

      const res = await bookService(payload);
      if (res.status === 201) {
        Alert.alert(
          '🎉 Booking Sent!',
          `Your request has been sent to ${displayName}. You'll be notified once they respond.`,
          [{ text: 'View My Bookings', onPress: () => navigate('MainTabs',{screen:'MyBookings'}) }]
        );
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to send booking.');
      }
    } catch (err) {
      console.error('Booking error:', err);
      Alert.alert('Error', 'Could not send booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Completion progress ───────────────────────────────────────────────────
  const steps = [
    !!selectedService,
    description.trim().length >= 20,
    !!address.trim(),
    !!preferredTime,
  ];
  const completedSteps = steps.filter(Boolean).length;

  return (
    <SafeAreaView style={ss.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <View style={ss.topBar}>
        <TouchableOpacity onPress={() => navigate(-1)} style={ss.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.textPri} />
        </TouchableOpacity>
        <View style={ss.topBarCenter}>
          <Text style={ss.topBarTitle}>Book Service</Text>
          <Text style={ss.topBarSub}>{completedSteps} of 4 steps done</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <View style={ss.progressBar}>
        <View style={[ss.progressFill, { width: `${(completedSteps / 4) * 100}%` }]} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[ss.scroll, { paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled"
      >

        {/* ═══════════════════════════════════════════════════════════════
            TASKER IDENTITY CARD
        ════════════════════════════════════════════════════════════════ */}
        <FadeSlide delay={0}>
          <View style={ss.taskerCard}>
            {/* Banner strip */}
            {bannerUri ? (
              <Image source={{ uri: bannerUri }} style={ss.taskerBanner} resizeMode="cover" />
            ) : (
              <LinearGradient colors={[C.navy, C.navyMid]} style={ss.taskerBanner} />
            )}
            <LinearGradient colors={['transparent', 'rgba(13,27,75,0.55)']} style={ss.taskerBannerVig} />

            {/* Avatar overlapping banner */}
            <View style={ss.taskerAvatarRow}>
              <View style={ss.taskerAvatarRing}>
                <Image source={{ uri: avatarUri }} style={ss.taskerAvatar} />
              </View>
              {isVerified && (
                <View style={ss.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={11} color={C.white} />
                  <Text style={ss.verifiedText}>Verified</Text>
                </View>
              )}
            </View>

            {/* Identity text */}
            <View style={ss.taskerIdentity}>
              <Text style={ss.taskerName}>{displayName}</Text>
              {tagline ? <Text style={ss.taskerTagline}>"{tagline}"</Text> : null}

              <View style={ss.taskerMeta}>
                {rating > 0 && (
                  <View style={ss.metaPill}>
                    <Ionicons name="star" size={12} color={C.amber} />
                    <Text style={ss.metaPillText}>{rating.toFixed(1)}</Text>
                    <Text style={ss.metaPillSub}>({numRatings})</Text>
                  </View>
                )}
                {locationStr ? (
                  <View style={ss.metaPill}>
                    <Ionicons name="location-outline" size={12} color={C.textMut} />
                    <Text style={[ss.metaPillText, { color: C.textSec }]}>{locationStr}</Text>
                  </View>
                ) : null}
                <View style={ss.metaPill}>
                  <Ionicons name="construct-outline" size={12} color={C.blue} />
                  <Text style={[ss.metaPillText, { color: C.blue }]}>{services.length} service{services.length !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </View>
          </View>
        </FadeSlide>

        {/* ═══════════════════════════════════════════════════════════════
            SERVICE SELECTION
        ════════════════════════════════════════════════════════════════ */}
        <Section title="Choose a Service" icon="construct-outline" accent={C.blue} delay={60}>
          {services.length === 0 ? (
            <View style={ss.emptyServices}>
              <Ionicons name="construct-outline" size={36} color={C.border} />
              <Text style={ss.emptyServicesText}>No services listed</Text>
            </View>
          ) : (
            <>
              <Text style={ss.svcHint}>
                Select the service you need — pricing and type shown on each card
              </Text>
              {services.map((svc, i) => (
                <ServiceCard
                  key={svc._id || svc.serviceId || i}
                  svc={svc}
                  index={i}
                  selected={
                    selectedService
                      ? (selectedService._id || selectedService.serviceId || i) ===
                        (svc._id || svc.serviceId || i)
                      : false
                  }
                  onSelect={() => {
                    setSelectedService(svc);
                    setErrors(e => ({ ...e, service: undefined }));
                  }}
                />
              ))}
              {errors.service && (
                <View style={ss.errorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color={C.coral} />
                  <Text style={ss.errorText}>{errors.service}</Text>
                </View>
              )}
            </>
          )}
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            JOB DESCRIPTION
        ════════════════════════════════════════════════════════════════ */}
        <Section title="Job Details" icon="document-text-outline" accent={C.purple} delay={100}>
          <LabelInput
            label="Describe what you need"
            required
            hint="Be specific — include size, materials, and any special requirements"
            error={errors.description}
          >
            <StyledInput
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. I need my 3-bedroom apartment painted. Walls are in good condition, just need a fresh coat in a light grey colour..."
              maxLength={1000}
              error={errors.description}
            />
            <Text style={ss.charCount}>{description.length}/1000</Text>
          </LabelInput>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            SCHEDULE
        ════════════════════════════════════════════════════════════════ */}
        <Section title="Schedule" icon="calendar-outline" accent={C.teal} delay={140}>
          <DateTimeRow
            icon="calendar-outline"
            label="Preferred Date"
            value={formattedDate}
            placeholder="Pick a date"
            onPress={() => setShowDatePicker(true)}
            accent={C.teal}
          />

          <DateTimeRow
            icon="time-outline"
            label="Preferred Time"
            value={formattedTime}
            placeholder="Pick a time"
            onPress={() => setShowTimePicker(true)}
            accent={C.teal}
          />
          {errors.time && (
            <View style={[ss.errorRow, { marginTop: -6 }]}>
              <Ionicons name="alert-circle-outline" size={13} color={C.coral} />
              <Text style={ss.errorText}>{errors.time}</Text>
            </View>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={preferredDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(_, date) => { setShowDatePicker(false); if (date) setPreferredDate(date); }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={(() => {
                const d = new Date();
                if (preferredTime) { const [h, m] = preferredTime.split(':'); d.setHours(+h, +m, 0, 0); }
                return d;
              })()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowTimePicker(false);
                if (date) {
                  const hh = String(date.getHours()).padStart(2, '0');
                  const mm = String(date.getMinutes()).padStart(2, '0');
                  setPreferredTime(`${hh}:${mm}`);
                  setErrors(e => ({ ...e, time: undefined }));
                }
              }}
            />
          )}
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            LOCATION
        ════════════════════════════════════════════════════════════════ */}
        <Section title="Service Location" icon="location-outline" accent={C.amber} delay={180}>
          <LabelInput label="Full Address" required error={errors.address}>
            <StyledInput
              multiline
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. 12 Independence Ave, East Legon, Accra"
              error={errors.address}
            />
          </LabelInput>
          <View style={ss.locationNote}>
            <Ionicons name="information-circle-outline" size={14} color={C.amber} />
            <Text style={ss.locationNoteText}>
              Your precise location will only be shared with the tasker once booking is accepted.
            </Text>
          </View>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            MEDIA
        ════════════════════════════════════════════════════════════════ */}
        <Section title="Photos & Videos" icon="images-outline" accent={C.sage} delay={220}>
          <Text style={ss.mediaHint}>
            Optional — help the tasker understand the job scope ({media.length}/3 added)
          </Text>

          <View style={ss.mediaBtnRow}>
            <TouchableOpacity
              style={[ss.mediaAddBtn, media.length >= 3 && ss.mediaAddBtnDisabled]}
              onPress={() => pickMedia('image')}
              disabled={media.length >= 3}
              activeOpacity={0.8}
            >
              <View style={[ss.mediaAddBtnIcon, { backgroundColor: C.sage + '18' }]}>
                <Ionicons name="image-outline" size={20} color={C.sage} />
              </View>
              <Text style={[ss.mediaAddBtnText, { color: C.sage }]}>Add Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ss.mediaAddBtn, media.length >= 3 && ss.mediaAddBtnDisabled]}
              onPress={() => pickMedia('video')}
              disabled={media.length >= 3}
              activeOpacity={0.8}
            >
              <View style={[ss.mediaAddBtnIcon, { backgroundColor: C.blue + '18' }]}>
                <Ionicons name="videocam-outline" size={20} color={C.blue} />
              </View>
              <Text style={[ss.mediaAddBtnText, { color: C.blue }]}>Add Video</Text>
            </TouchableOpacity>
          </View>

          {media.length > 0 && (
            <View style={ss.mediaGrid}>
              {media.map((item, i) => (
                <MediaThumb
                  key={item.tempId || i}
                  item={item}
                  onRemove={() => setMedia(prev => prev.filter((_, idx) => idx !== i))}
                />
              ))}
              {/* ghost slots */}
              {Array.from({ length: 3 - media.length }).map((_, i) => (
                <View key={`ghost-${i}`} style={ss.mediaThumbGhost} />
              ))}
            </View>
          )}
        </Section>

      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════
          STICKY BOTTOM CONFIRM BAR
      ══════════════════════════════════════════════════════════════════ */}
      <View style={[ss.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {/* Selected service summary */}
        <View style={ss.bottomSummary}>
          {selectedService ? (
            <>
              <View style={ss.bottomSvcDot} />
              <Text style={ss.bottomSvcName} numberOfLines={1}>{selectedService.name}</Text>
              {selectedService.price > 0 && selectedService.priceType !== 'negotiable' && (
                <Text style={ss.bottomSvcPrice}>
                  · GHS {selectedService.price}
                  {selectedService.priceType === 'hourly' ? '/hr' : ''}
                </Text>
              )}
              {selectedService.priceType === 'negotiable' && (
                <Text style={ss.bottomSvcPrice}>· Negotiable</Text>
              )}
            </>
          ) : (
            <Text style={ss.bottomNoSvc}>No service selected yet</Text>
          )}
        </View>

        {/* Confirm CTA */}
        <TouchableOpacity
          style={[ss.confirmBtn, (!selectedService || loading) && ss.confirmBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedService || loading}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={(!selectedService || loading) ? [C.textMut, C.textMut] : [C.navy, C.navyMid]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={ss.confirmBtnGradient}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : (
                <>
                  <Ionicons name="calendar-outline" size={20} color={C.white} />
                  <Text style={ss.confirmBtnText}>Confirm Booking</Text>
                </>
              )
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16 },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle:  { fontSize: 16, fontWeight: '800', color: C.textPri, letterSpacing: -0.3 },
  topBarSub:    { fontSize: 12, color: C.textMut, marginTop: 1 },

  // Progress
  progressBar: { height: 3, backgroundColor: C.hairline, marginHorizontal: 16, borderRadius: 2, marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: C.blue, borderRadius: 2 },

  // Tasker card
  taskerCard: {
    backgroundColor: C.surface, borderRadius: 20,
    marginBottom: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 14, elevation: 4,
  },
  taskerBanner: { width: '100%', height: 90 },
  taskerBannerVig: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 90,
  },
  taskerAvatarRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    marginTop: -26, paddingHorizontal: 16,
    marginBottom: 8, gap: 10,
  },
  taskerAvatarRing: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 3, borderColor: C.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
    backgroundColor: C.bg,
  },
  taskerAvatar: { width: 50, height: 50, borderRadius: 25, margin: 3 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.success, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    marginBottom: 4,
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: C.white },
  taskerIdentity: { paddingHorizontal: 16, paddingBottom: 16 },
  taskerName: { fontSize: 20, fontWeight: '800', color: C.textPri, letterSpacing: -0.4, marginBottom: 3 },
  taskerTagline: { fontSize: 13, color: C.textSec, fontStyle: 'italic', marginBottom: 10 },
  taskerMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.hairline, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  metaPillText:  { fontSize: 12, fontWeight: '600', color: C.textPri },
  metaPillSub:   { fontSize: 11, color: C.textMut },

  // Section
  section: {
    backgroundColor: C.surface, borderRadius: 18,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    overflow: 'hidden',
  },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.hairline,
  },
  sectionIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.textPri, letterSpacing: -0.2 },
  sectionBody:  { padding: 16 },

  // Field
  fieldWrap:  { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: C.textPri, marginBottom: 4, letterSpacing: 0.1 },
  fieldHint:  { fontSize: 12, color: C.textMut, marginBottom: 8, lineHeight: 17 },
  errorRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  errorText:  { fontSize: 12, color: C.coral, fontWeight: '500' },
  charCount:  { fontSize: 11, color: C.textMut, textAlign: 'right', marginTop: 4 },

  // Input
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: C.textPri, backgroundColor: C.surface,
  },
  inputMulti:   { minHeight: 120, textAlignVertical: 'top' },
  inputFocused: { borderColor: C.blue, backgroundColor: '#F8FBFF' },
  inputError:   { borderColor: C.coral, backgroundColor: '#FEF8F8' },

  // Date/time row
  dtRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    padding: 14, marginBottom: 10, backgroundColor: C.surface,
    gap: 12,
  },
  dtIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dtBody:     { flex: 1 },
  dtLabel:    { fontSize: 11, fontWeight: '700', color: C.textMut, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2 },
  dtValue:    { fontSize: 15, fontWeight: '600', color: C.textPri },

  // Service cards
  svcHint: { fontSize: 13, color: C.textMut, marginBottom: 12, lineHeight: 18 },
  svcCard: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    flexDirection: 'row', overflow: 'hidden', backgroundColor: C.surface,
  },
  svcBar:  { width: 4 },
  svcContent: { flex: 1, padding: 14 },
  svcTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  svcInfo: { flex: 1 },
  svcName: { fontSize: 15, fontWeight: '700', color: C.textPri, marginBottom: 3 },
  svcDesc: { fontSize: 13, color: C.textSec, lineHeight: 18 },
  svcPriceSub: { marginTop: 6 },
  priceSuffix: { fontSize: 11, fontWeight: '600' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
  priceChip: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    alignItems: 'center', minWidth: 68,
  },
  priceAmt:  { fontSize: 13, fontWeight: '800' },
  priceType: { fontSize: 11, fontWeight: '600' },
  svcCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyServices: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyServicesText: { fontSize: 14, color: C.textMut },

  // Location note
  locationNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: C.amberSoft, borderRadius: 10,
    padding: 12, marginTop: 4,
  },
  locationNoteText: { fontSize: 12, color: C.textSec, flex: 1, lineHeight: 17 },

  // Media
  mediaHint:    { fontSize: 13, color: C.textMut, marginBottom: 14, lineHeight: 18 },
  mediaBtnRow:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  mediaAddBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface,
  },
  mediaAddBtnDisabled: { opacity: 0.4 },
  mediaAddBtnIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mediaAddBtnText: { fontSize: 13, fontWeight: '700' },
  mediaGrid: { flexDirection: 'row', gap: 10 },
  mediaThumb: {
    width: 80, height: 80, borderRadius: 12,
    overflow: 'hidden', backgroundColor: C.hairline, position: 'relative',
  },
  mediaThumbImg:  { width: '100%', height: '100%' },
  mediaThumbVideo: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 4, backgroundColor: C.blueSoft,
  },
  mediaThumbVideoLabel: { fontSize: 10, fontWeight: '700', color: C.blue },
  mediaThumbRemove: {
    position: 'absolute', top: 3, right: 3,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10,
  },
  mediaThumbBadge: {
    position: 'absolute', bottom: 5, left: 5,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  mediaThumbBadgeText: { fontSize: 9, fontWeight: '800', color: C.white, letterSpacing: 0.5 },
  mediaThumbGhost: {
    width: 80, height: 80, borderRadius: 12,
    backgroundColor: C.hairline, opacity: 0.4,
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingHorizontal: 16, paddingTop: 12,
    gap: 10,
  },
  bottomSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  bottomSvcDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: C.success,
  },
  bottomSvcName:  { fontSize: 13, fontWeight: '700', color: C.textPri, flex: 1 },
  bottomSvcPrice: { fontSize: 13, color: C.textSec },
  bottomNoSvc:    { fontSize: 13, color: C.textMut, fontStyle: 'italic' },
  confirmBtn:     { borderRadius: 16, overflow: 'hidden' },
  confirmBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 17, gap: 10,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: C.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
});