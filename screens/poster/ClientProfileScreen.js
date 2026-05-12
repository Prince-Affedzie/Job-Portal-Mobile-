import React, { useState, useContext, useEffect, useRef } from 'react';
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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';
import { sendFileToS3 } from '../../api/commonApi';
import { uploadProfileImage, switchAccount } from '../../api/authApi';
import Header from '../../component/tasker/Header';

const { width } = Dimensions.get('window');

// ─── Palette (same as tasker profile) ─────────────────────────────────────
const T = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  navyDeep: '#0F1729',
  navyMid: '#1A2744',
  navyLight: '#243458',
  accentBlue: '#3B6FE8',
  accentTeal: '#00C2A8',
  accentGold: '#F5B731',
  textPrimary: '#0F1729',
  textSecondary: '#5A6480',
  textMuted: '#9BA3BB',
  border: '#E4E8F1',
  danger: '#E84B3B',
  success: '#10C98F',
  white: '#FFFFFF',
  cardShadow: '#1A274420',
};

const DEFAULT_IMAGE =
  'https://res.cloudinary.com/duv3qvvjz/image/upload/v1760376396/male_avatar_fwgmfd.jpg';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ─── Fade‑Slide Animation ─────────────────────────────────────────────────
function FadeSlide({ delay = 0, children }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 60, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Field Row (editable / read‑only) ─────────────────────────────────────
function FieldRow({ icon, label, value, editing, onChange, keyboardType, placeholder, editable = true }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIconWrap}>
        <Ionicons name={icon} size={16} color={T.accentBlue} />
      </View>
      <View style={styles.fieldBody}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {editing && editable ? (
          <TextInput
            style={styles.fieldInput}
            value={value}
            onChangeText={onChange}
            keyboardType={keyboardType || 'default'}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            placeholderTextColor={T.textMuted}
            autoCapitalize="none"
          />
        ) : (
          <Text style={[styles.fieldValue, !value && styles.fieldEmpty]}>
            {value || `No ${label.toLowerCase()} set`}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function ClientProfileScreen({ navigation }) {
  const { user, logout, updateProfile, setUser, removeAccount } = useContext(AuthContext);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    profileImage: DEFAULT_IMAGE,
    role: '',
  });
  const [originalData, setOriginalData] = useState({});
  const [originalImage, setOriginalImage] = useState(DEFAULT_IMAGE);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    if (!user) return;
    const base = {
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      profileImage: user.profileImage || DEFAULT_IMAGE,
      role: user.role || 'client',
    };
    setProfileData(base);
    setOriginalData(base);
    setOriginalImage(user.profileImage || DEFAULT_IMAGE);
  }, [user]);

  // ── Image Picker ───────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      setImgErr(false);
      setProfileData(p => ({ ...p, profileImage: result.assets[0].uri }));
    }
  };

  const uploadImageToS3 = async (uri) => {
    setImageUploading(true);
    try {
      const filename = uri.split('/').pop();
      const ext = /\.(\w+)$/.exec(filename)?.[1] || 'jpeg';
      const file = { uri, name: filename, type: `image/${ext}` };
      const res = await uploadProfileImage({ filename: file.name, contentType: file.type });
      if (res.status !== 200) throw new Error('Upload URL failed');
      const { fileUrl, publicUrl } = res.data;
      await sendFileToS3(fileUrl, file);
      return publicUrl;
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalImage = profileData.profileImage;
      const imageChanged =
        profileData.profileImage !== originalImage &&
        (profileData.profileImage.startsWith('file://') ||
         profileData.profileImage.startsWith('content://'));

      if (imageChanged) finalImage = await uploadImageToS3(profileData.profileImage);

      const form = new FormData();
      form.append('name', profileData.name.trim());
      form.append('email', profileData.email.trim());
      form.append('phone', profileData.phone.trim());
      if (imageChanged) form.append('profileImage', finalImage);

      const res = await updateProfile(form);
      if (res?.status === 200) {
        const updated = { ...profileData, profileImage: finalImage };
        setProfileData(updated);
        setOriginalData(updated);
        setOriginalImage(finalImage);
        setEditing(false);
        Alert.alert('Saved', 'Your account details have been updated.');
      } else {
        throw new Error('Server error');
      }
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setEditing(false);
  };

  const handleSwitch = () => {
    Alert.alert('Switch to Tasker Mode', 'You can switch back to Client mode at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: async () => {
          setSwitching(true);
          try {
            const res = await switchAccount();
            if (res.status === 200) setUser(res.data.user);
          } catch {
            Alert.alert('Error', 'Could not switch account. Try again.');
          } finally {
            setSwitching(false);
          }
        },
      },
    ]);
  };

  const handleLogout = () =>
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);

  const handleDelete = () =>
    Alert.alert('Delete Account', 'This action is permanent and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: removeAccount },
    ]);

  const imageChanged =
    profileData.profileImage !== originalImage &&
    (profileData.profileImage?.startsWith('file://') ||
     profileData.profileImage?.startsWith('content://'));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <Header title="My Account" showBack={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        scrollEventThrottle={16}
      >
        {/* ── Hero Banner ───────────────────────────────────────────────── */}
        <FadeSlide delay={0}>
          <View style={styles.heroBanner}>
            <LinearGradient
              colors={[T.navyDeep, T.navyMid, T.navyLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.ring1} />
              <View style={styles.ring2} />

              <View style={styles.heroContent}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {profileData.name || 'Your Name'}
                  </Text>
                  <Text style={styles.heroEmail} numberOfLines={1}>
                    {profileData.email || '—'}
                  </Text>
                  <View style={styles.heroPills}>
                    <View style={styles.rolePill}>
                      <Ionicons name="person-outline" size={11} color={T.accentTeal} />
                      <Text style={styles.rolePillText}>
                        {profileData.role === 'client' ? 'Client' : profileData.role || 'Client'}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={editing ? pickImage : undefined}
                  activeOpacity={editing ? 0.8 : 1}
                  style={styles.avatarWrap}
                >
                  {profileData.profileImage && !imgErr ? (
                    <Image
                      source={{ uri: profileData.profileImage }}
                      style={styles.avatar}
                      onError={() => setImgErr(true)}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitials}>{getInitials(profileData.name)}</Text>
                    </View>
                  )}
                  {editing && (
                    <View style={styles.avatarEditBadge}>
                      {imageUploading ? (
                        <ActivityIndicator size="small" color={T.white} />
                      ) : (
                        <Ionicons name="camera" size={13} color={T.white} />
                      )}
                    </View>
                  )}
                  {imageChanged && !editing && <View style={styles.avatarChangedDot} />}
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Edit / Save bar */}
            <View style={styles.editBar}>
              {!editing ? (
                <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                  <Ionicons name="create-outline" size={15} color={T.accentBlue} />
                  <Text style={styles.editBtnText}>Edit Account Info</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.editBarRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={T.white} />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </FadeSlide>

        {/* ── Switch to Tasker CTA ──────────────────────────────────────── */}
        <FadeSlide delay={100}>
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={styles.switchCta}
              onPress={handleSwitch}
              activeOpacity={0.85}
              delayPressIn={100}
            >
              <LinearGradient
                colors={[T.navyDeep, T.navyMid]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <View style={styles.ctaLeft}>
                  <View style={styles.ctaIconRing}>
                    <Ionicons name="swap-horizontal-outline" size={24} color={T.accentTeal} />
                  </View>
                  <View style={styles.ctaTextBlock}>
                    <Text style={styles.ctaTitle}>Switch to Tasker Mode</Text>
                    <Text style={styles.ctaSub}>Find jobs and earn money</Text>
                  </View>
                </View>
                <View style={styles.ctaArrowWrap}>
                  <Ionicons name="arrow-forward" size={18} color={T.accentTeal} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </FadeSlide>

        {/* ── Account Details Card ─────────────────────────────────────── */}
        <FadeSlide delay={180}>
          <View style={styles.sectionLabelWrap}>
            <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle-outline" size={18} color={T.accentBlue} />
              <Text style={styles.cardTitle}>Account Details</Text>
            </View>

            <FieldRow
              icon="person-outline"
              label="Full Name"
              value={profileData.name}
              editing={editing}
              onChange={t => setProfileData(p => ({ ...p, name: t }))}
              placeholder="Your full name"
            />
            <View style={styles.fieldDivider} />
            <FieldRow
              icon="mail-outline"
              label="Email Address"
              value={profileData.email}
              editing={editing}
              onChange={t => setProfileData(p => ({ ...p, email: t }))}
              keyboardType="email-address"
              placeholder="your@email.com"
            />
            <View style={styles.fieldDivider} />
            <FieldRow
              icon="call-outline"
              label="Phone Number"
              value={profileData.phone}
              editing={editing}
              onChange={t => setProfileData(p => ({ ...p, phone: t }))}
              keyboardType="phone-pad"
              placeholder="+233 XX XXX XXXX"
            />
            <View style={styles.fieldDivider} />
            <FieldRow
              icon="shield-checkmark-outline"
              label="Account Role"
              value={
                profileData.role
                  ? profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)
                  : ''
              }
              editing={false}
              editable={false}
            />
          </View>
        </FadeSlide>

        {/* ── Quick Access ─────────────────────────────────────────────── */}
        <FadeSlide delay={260}>
          <Text style={[styles.sectionLabel, { marginHorizontal: 18, marginTop: 28, marginBottom: 10 }]}>
            QUICK ACCESS
          </Text>
        </FadeSlide>

        <QuickNavCard
          icon="list-outline"
          label="My Posted Tasks"
          sublabel="View and manage your tasks"
          accent={T.accentBlue}
          delay={300}
          onPress={() => navigate('PostedTasks')}
        />
        <QuickNavCard
          icon="cash-outline"
          label="Payment History"
          sublabel="View your spending & receipts"
          accent={T.accentTeal}
          delay={340}
          onPress={() => navigate('Payments')}
        />
        <QuickNavCard
          icon="help-circle-outline"
          label="Help & Support"
          sublabel="FAQs, contact and feedback"
          accent="#7C6FE8"
          delay={380}
          onPress={() => navigate('ClientSupport')}
        />

        {/* ── Danger Zone ───────────────────────────────────────────────── */}
        <FadeSlide delay={450}>
          <View style={styles.dangerCard}>
            <TouchableOpacity
              style={styles.dangerRow}
              onPress={handleLogout}
              activeOpacity={0.7}
              delayPressIn={100}
            >
              <Ionicons name="log-out-outline" size={20} color={T.danger} />
              <Text style={styles.dangerText}>Log Out</Text>
            </TouchableOpacity>
            <View style={styles.dangerDivider} />
            <TouchableOpacity
              style={styles.dangerRow}
              onPress={handleDelete}
              activeOpacity={0.7}
              delayPressIn={100}
            >
              <Ionicons name="trash-outline" size={20} color={T.danger} />
              <Text style={styles.dangerText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </FadeSlide>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Quick Nav Card (reusable) ────────────────────────────────────────────
function QuickNavCard({ icon, label, sublabel, accent, delay, onPress }) {
  return (
    <FadeSlide delay={delay}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.navCard, { borderLeftColor: accent }]}
        delayPressIn={100}
      >
        <View style={[styles.navCardIcon, { backgroundColor: accent + '18' }]}>
          <Ionicons name={icon} size={22} color={accent} />
        </View>
        <View style={styles.navCardText}>
          <Text style={styles.navCardLabel}>{label}</Text>
          <Text style={styles.navCardSub}>{sublabel}</Text>
        </View>
        <View style={[styles.navCardArrow, { backgroundColor: accent + '12' }]}>
          <Ionicons name="chevron-forward" size={16} color={accent} />
        </View>
      </TouchableOpacity>
    </FadeSlide>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 24 },

  // ── Hero Banner ──────────────────────────────────────────────────────────
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    shadowColor: T.navyDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: T.surface,
  },
  heroGradient: {
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  ring1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FFFFFF08',
    top: -50,
    right: -50,
  },
  ring2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#FFFFFF06',
    bottom: -20,
    left: -30,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: {
    flex: 1,
    paddingRight: 16,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: T.white,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 14,
    letterSpacing: 0.1,
  },
  heroPills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.accentTeal + '50',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.accentTeal,
    letterSpacing: 0.2,
  },

  avatarWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: T.accentBlue + '30',
    borderWidth: 3,
    borderColor: T.accentBlue + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: T.accentBlue,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.accentBlue,
    borderWidth: 2,
    borderColor: T.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChangedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.accentTeal,
    borderWidth: 2,
    borderColor: T.navyMid,
  },

  // ── Edit bar ──────────────────────────────────────────────────────────────
  editBar: {
    backgroundColor: T.surface,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: T.accentBlue + '12',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: T.accentBlue + '30',
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: T.accentBlue },
  editBarRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: T.textSecondary },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: T.accentBlue,
    minWidth: 110,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: T.accentBlue + '60' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: T.white },

  // ── Switch CTA ────────────────────────────────────────────────────────────
  ctaSection: {
    marginHorizontal: 16,
    marginTop: 22,
  },
  switchCta: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: T.navyDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  ctaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ctaIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: T.accentTeal + '40',
    backgroundColor: T.accentTeal + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ctaTextBlock: { flex: 1 },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: T.white,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.2 },
  ctaArrowWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.accentTeal + '20',
    borderWidth: 1,
    borderColor: T.accentTeal + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // ── Section Label ─────────────────────────────────────────────────────────
  sectionLabelWrap: {
    marginHorizontal: 18,
    marginTop: 22,
    marginBottom: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 2,
  },

  // ── Account Details Card ─────────────────────────────────────────────────
  card: {
    backgroundColor: T.surface,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 20,
    paddingVertical: 8,
    shadowColor: T.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    marginBottom: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: T.textPrimary, letterSpacing: 0.1 },

  // ── Fields ────────────────────────────────────────────────────────────────
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  fieldIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.accentBlue + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  fieldBody: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fieldValue: { fontSize: 15, color: T.textPrimary, fontWeight: '500' },
  fieldEmpty: { color: T.textMuted, fontStyle: 'italic' },
  fieldInput: {
    fontSize: 15,
    color: T.textPrimary,
    fontWeight: '500',
    borderBottomWidth: 1.5,
    borderBottomColor: T.accentBlue + '60',
    paddingBottom: 4,
    paddingTop: 0,
  },
  fieldDivider: { height: 1, backgroundColor: T.border, marginHorizontal: 18 },

  // ── Quick Nav Cards ───────────────────────────────────────────────────────
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    shadowColor: T.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.border,
  },
  navCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  navCardText: { flex: 1 },
  navCardLabel: { fontSize: 15, fontWeight: '700', color: T.textPrimary, marginBottom: 2 },
  navCardSub: { fontSize: 12, color: T.textSecondary },
  navCardArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Danger Zone ───────────────────────────────────────────────────────────
  dangerCard: {
    backgroundColor: T.surface,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.danger + '20',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  dangerText: { fontSize: 15, fontWeight: '600', color: T.danger },
  dangerDivider: { height: 1, backgroundColor: T.danger + '15', marginHorizontal: 16 },
});