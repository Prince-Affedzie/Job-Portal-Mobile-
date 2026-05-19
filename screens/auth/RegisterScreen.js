/**
 * RegisterScreen.jsx
 *
 * Social auth (Google + Apple) + email/password registration.
 * Role selection is REQUIRED for ALL signup paths — shown upfront
 * before any social button is tappable, and validated before submit.
 *
 * Backend expectations:
 *   Google  → POST /auth/google  { token, role }
 *   Apple   → POST /auth/apple   { token, appleUserId, email, firstName, lastName, role }
 *   Email   → register()         { name, email, password, confirmPassword, role }
 */

import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Alert, Animated, Image, Dimensions, StatusBar, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';

const WorkaFlowLogo = require('../../assets/workaflow_icon.png');
const GoogleLogo    = require('../../assets/Google-logo.png');

const { width } = Dimensions.get('window');

// ─── THEME: Pacific Indigo & Warm Gold (Light) ─────────────────────────────
const C = {
  bg:           '#F8FAFF',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F1F4F9',
  border:       '#E4E8EE',
  borderLight:  '#E2E8F0',
  primary:      '#1E3A6E',
  primaryLight: '#DDE7F5',
  primaryDark:  '#14274A',
  primaryGlow:  '#EBF5FF',
  gold:         '#D49B3F',
  goldLight:    '#FCF3E1',
  emerald:      '#0F766E',
  emeraldBg:    '#D1FAE5',
  coral:        '#DC2626',
  coralBg:      '#FEE2E2',
  amber:        '#F59E0B',
  textPrimary:  '#0F172A',
  textSecondary:'#475569',
  textMuted:    '#94A3B8',
  white:        '#FFFFFF',
};

// ─── Role config ────────────────────────────────────────────────────────────
const ROLES = [
  {
    value:    'tasker',
    label:    'Service Provider',
    subtitle: 'Offer skills, earn income',
    icon:     'briefcase-outline',
    activeIcon: 'briefcase',
    color:    C.primary,
  },
  {
    value:    'client',
    label:    'I Want to Hire',
    subtitle: 'Find & book taskers',
    icon:     'search-outline',
    activeIcon: 'search',
    color:    C.gold,
  },
];

// ─── Animation helper ───────────────────────────────────────────────────────
function useMount(delay = 0) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 55, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity: op, transform: [{ translateY: ty }] };
}

// ─── Role Selector ──────────────────────────────────────────────────────────
function RoleSelector({ selected, onChange, error }) {
  return (
    <View style={s.roleWrap}>
      <Text style={s.roleHeading}>I am signing up as…</Text>
      <View style={s.roleRow}>
        {ROLES.map(r => {
          const active = selected === r.value;
          return (
            <TouchableOpacity
              key={r.value}
              onPress={() => onChange(r.value)}
              activeOpacity={0.8}
              style={[
                s.roleCard,
                active && { borderColor: r.color, backgroundColor: r.color + '18' },
              ]}
            >
              <View style={[s.roleIconWrap, { backgroundColor: active ? r.color + '22' : C.surfaceAlt }]}>
                <Ionicons name={active ? r.activeIcon : r.icon} size={22} color={active ? r.color : C.textMuted} />
              </View>
              <Text style={[s.roleLabel, active && { color: r.color }]}>{r.label}</Text>
              <Text style={s.roleSub}>{r.subtitle}</Text>
              {active && (
                <View style={[s.roleCheck, { backgroundColor: r.color }]}>
                  <Ionicons name="checkmark" size={10} color={C.white} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {error && (
        <View style={s.errRow}>
          <Ionicons name="alert-circle-outline" size={13} color={C.coral} />
          <Text style={s.errText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styled Input ────────────────────────────────────────────────────────────
function Field({ label, icon, value, onChange, placeholder, secure, onEyePress,
                 showEye, keyboard, autoCapitalize, returnKey, onSubmit, inputRef,
                 error, disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[
        s.fieldBox,
        focused && s.fieldBoxFocus,
        error  && s.fieldBoxErr,
      ]}>
        <Ionicons name={icon} size={18} color={focused ? C.primary : C.textMuted} style={s.fieldIcon} />
        <TextInput
          ref={inputRef}
          style={s.fieldInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          secureTextEntry={secure}
          keyboardType={keyboard || 'default'}
          autoCapitalize={autoCapitalize || 'none'}
          returnKeyType={returnKey || 'next'}
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!disabled}
        />
        {showEye && (
          <TouchableOpacity onPress={onEyePress} style={s.eyeBtn} disabled={disabled}>
            <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={18}
              color={focused ? C.primary : C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <View style={s.errRow}>
          <Ionicons name="alert-circle-outline" size={12} color={C.coral} />
          <Text style={s.errText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Password strength ──────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: '8+ characters',  ok: password.length >= 8 },
    { label: 'Uppercase',       ok: /[A-Z]/.test(password) },
    { label: 'Number',          ok: /[0-9]/.test(password) },
    { label: 'Special char',    ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const barColor = score <= 1 ? C.coral : score <= 2 ? C.amber : score <= 3 ? C.primary : C.emerald;
  return (
    <View style={s.strengthWrap}>
      <View style={s.strengthBars}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[s.strengthBar, i < score && { backgroundColor: barColor }]} />
        ))}
      </View>
      <View style={s.strengthChecks}>
        {checks.map(c => (
          <View key={c.label} style={s.strengthCheckRow}>
            <Ionicons name={c.ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={13} color={c.ok ? C.emerald : C.textMuted} />
            <Text style={[s.strengthCheckText, c.ok && { color: C.emerald }]}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Social Button ───────────────────────────────────────────────────────────
function SocialBtn({ logo, label, onPress, loading, disabled, dark }) {
  return (
    <TouchableOpacity
      style={[
        s.socialBtn,
        dark && s.socialBtnDark,
        disabled && s.socialBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={dark ? C.white : C.primary} />
      ) : typeof logo === 'string' ? (
        <Ionicons name={logo} size={20} color={dark ? C.white : C.textPrimary} style={{ marginRight: 10 }} />
      ) : (
        <Image source={logo} style={s.socialLogo} />
      )}
      <Text style={[s.socialBtnText, dark && { color: C.white }]}>
        {loading ? 'Connecting…' : label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function Divider({ label }) {
  return (
    <View style={s.dividerRow}>
      <View style={s.dividerLine} />
      <Text style={s.dividerLabel}>{label}</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════
export default function RegisterScreen({ navigation }) {
  const { register, google_signup, apple_signup } = useContext(AuthContext);

  // ── form state ──────────────────────────────────────────────────────────
  const [role,            setRole]            = useState('');
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showCPw,         setShowCPw]         = useState(false);
  const [showStrength,    setShowStrength]    = useState(false);
  const [errors,          setErrors]          = useState({});

  // ── EULA consent ────────────────────────────────────────────────────────
  const [eulaAccepted, setEulaAccepted] = useState(false);

  // ── loading states ──────────────────────────────────────────────────────
  const [loadingEmail,  setLoadingEmail]  = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple,  setLoadingApple]  = useState(false);
  const busy = loadingEmail || loadingGoogle || loadingApple;

  // ── refs ────────────────────────────────────────────────────────────────
  const emailRef   = useRef();
  const pwRef      = useRef();
  const cpwRef     = useRef();

  // ── animations ──────────────────────────────────────────────────────────
  const logoAnim   = useMount(0);
  const formAnim   = useMount(120);
  const socialAnim = useMount(220);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '830161939039-chcube7voaggltt861nrga6g7uq13ndl.apps.googleusercontent.com',
    });
  }, []);

  // ── role guard — both social buttons require a role first ──────────────
  const guardRole = () => {
    if (!role) {
      setErrors(e => ({ ...e, role: 'Please select a role before continuing' }));
      return false;
    }
    setErrors(e => ({ ...e, role: undefined }));
    return true;
  };

  // ── redirect after success ──────────────────────────────────────────────
  const redirectAfterSignUp = (userRole) => {
    if (userRole === 'client') {
      navigation.navigate('ClientOnboarding');
    } else {
      navigation.navigate('OnboardTasker');
    }
  };

  // ── Google ──────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    if (!guardRole()) return;
    setLoadingGoogle(true);
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      try { await GoogleSignin.signOut(); } catch (_) {}

      const res  = await GoogleSignin.signIn();
      const token = res.data.idToken;

      const response = await google_signup({ token, role });

      if (response?.success || response?.status === 200) {
        const userRole = response?.data?.role || role;
        setTimeout(() => {
          Alert.alert('Welcome! 🎉', 'Your account has been created successfully.');
          redirectAfterSignUp(userRole);
        }, 100);
      } else {
        Alert.alert('Sign-Up Failed', response?.message || 'Please try again.');
      }
    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (err.code === statusCodes.IN_PROGRESS) return;
      Alert.alert('Google Error', err.message || 'Could not sign in with Google.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  // ── Apple ───────────────────────────────────────────────────────────────
  const handleApple = async () => {
    if (!guardRole()) return;
    setLoadingApple(true);
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        Alert.alert('Not Available', 'Apple Sign-In is only available on iOS.');
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, email: appleEmail, fullName, user: appleUserId } = credential;
      if (!identityToken) throw new Error('No identity token received.');

      const response = await apple_signup({
        token:       identityToken,
        appleUserId,
        email:       appleEmail || undefined,
        firstName:   fullName?.givenName || '',
        lastName:    fullName?.familyName || '',
        role,
      });

      if (response?.success || response?.status === 200) {
        const userRole = response?.data?.role || role;
        setTimeout(() => {
          Alert.alert('Welcome! 🎉', 'Your account has been created successfully.');
          redirectAfterSignUp(userRole);
        }, 100);
      } else {
        Alert.alert('Sign-Up Failed', response?.message || 'Please try again.');
      }
    } catch (err) {
      if (err.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Apple Error', err.message || 'Could not sign in with Apple.');
    } finally {
      setLoadingApple(false);
    }
  };

  // ── Email validation ─────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!role)                              e.role    = 'Please select your role';
    if (!name.trim())                       e.name    = 'Full name is required';
    else if (name.trim().length < 2)        e.name    = 'Name is too short';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email))
                                            e.email   = 'Enter a valid email address';
    if (!password)                          e.password = 'Password is required';
    else if (password.length < 8)           e.password = 'Must be at least 8 characters';
    else if (!/[A-Z]/.test(password))       e.password = 'Must include an uppercase letter';
    else if (!/[0-9]/.test(password))       e.password = 'Must include a number';
    else if (!/[^A-Za-z0-9]/.test(password))e.password = 'Must include a special character';
    if (!confirmPassword)                   e.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword)  e.confirmPassword = 'Passwords do not match';
    
    // ── EULA check ────────────────────────────────────────────────────────
    if (!eulaAccepted)                      e.eula = 'You must accept the Terms of Service and Privacy Policy';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Email submit ─────────────────────────────────────────────────────────
  const handleEmailSignUp = async () => {
    if (busy) return;
    if (!validate()) return;
    setLoadingEmail(true);
    try {
      const response = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role,
        eulaAccepted: true,
      });
      if (response?.status === 200) {
        const userRole = response?.data?.role || role;
        setTimeout(() => {
          Alert.alert('Welcome! 🎉', 'Account created successfully.');
          redirectAfterSignUp(userRole);
        }, 100);
      } else {
        Alert.alert('Registration Failed', response?.data?.message || response?.message || 'Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >

          {/* ── Logo & headline ─────────────────────────────────────── */}
          <Animated.View style={[s.header, logoAnim]}>
            <View style={s.logoWrap}>
              <View style={s.logoRing}>
                <Image source={WorkaFlowLogo} style={s.logo} resizeMode="contain" />
              </View>
              <View style={s.logoGlow} />
            </View>
            <Text style={s.headline}>Create Account</Text>
            <Text style={s.tagline}>Join Workaflow — connect, work, earn.</Text>
          </Animated.View>

          {/* ── Role selector (required for all paths) ──────────────── */}
          <Animated.View style={[{ marginHorizontal: 20 }, socialAnim]}>
            <RoleSelector selected={role} onChange={r => { setRole(r); setErrors(e => ({ ...e, role: undefined })); }} error={errors.role} />
          </Animated.View>

          {/* ── Social auth ─────────────────────────────────────────── */}
          <Animated.View style={[s.socialSection, socialAnim]}>
            <SocialBtn
              logo={GoogleLogo}
              label="Continue with Google"
              onPress={handleGoogle}
              loading={loadingGoogle}
              disabled={busy}
            />
            {Platform.OS === 'ios' && (
              <SocialBtn
                logo="logo-apple"
                label="Continue with Apple"
                onPress={handleApple}
                loading={loadingApple}
                disabled={busy}
                dark
              />
            )}
            {!role && (
              <View style={s.socialBlockedNote}>
                <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                <Text style={s.socialBlockedText}>Select a role above to enable social sign-up</Text>
              </View>
            )}
          </Animated.View>

          <Animated.View style={formAnim}>
            <Divider label="or sign up with email" />

            {/* ── Form ──────────────────────────────────────────────── */}
            <View style={s.form}>
              <Field
                label="FULL NAME"
                icon="person-outline"
                value={name}
                onChange={setName}
                placeholder="Your full name"
                autoCapitalize="words"
                returnKey="next"
                onSubmit={() => emailRef.current?.focus()}
                error={errors.name}
                disabled={busy}
              />

              <Field
                label="EMAIL"
                icon="mail-outline"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                keyboard="email-address"
                returnKey="next"
                onSubmit={() => pwRef.current?.focus()}
                inputRef={emailRef}
                error={errors.email}
                disabled={busy}
              />

              <Field
                label="PASSWORD"
                icon="lock-closed-outline"
                value={password}
                onChange={v => { setPassword(v); setShowStrength(true); }}
                placeholder="Create a strong password"
                secure={!showPw}
                showEye
                onEyePress={() => setShowPw(p => !p)}
                returnKey="next"
                onSubmit={() => cpwRef.current?.focus()}
                inputRef={pwRef}
                error={errors.password}
                disabled={busy}
              />
              {showStrength && <PasswordStrength password={password} />}

              <Field
                label="CONFIRM PASSWORD"
                icon="lock-closed-outline"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repeat your password"
                secure={!showCPw}
                showEye
                onEyePress={() => setShowCPw(p => !p)}
                returnKey="done"
                onSubmit={handleEmailSignUp}
                inputRef={cpwRef}
                error={errors.confirmPassword}
                disabled={busy}
              />

              {/* ── EULA Consent Checkbox ──────────────────────────────── */}
              <View style={s.eulaContainer}>
                <TouchableOpacity
                  style={[s.eulaCheckbox, eulaAccepted && s.eulaCheckboxActive]}
                  onPress={() => {
                    setEulaAccepted(v => !v);
                    setErrors(e => ({ ...e, eula: undefined }));
                  }}
                  activeOpacity={0.8}
                  disabled={busy}
                >
                  {eulaAccepted && (
                    <Ionicons name="checkmark" size={14} color={C.white} />
                  )}
                </TouchableOpacity>
                <View style={s.eulaTextContainer}>
                  <Text style={s.eulaText}>
                    I agree to the{' '}
                    <Text
                      style={s.eulaLink}
                      onPress={() => navigation.navigate('TermsOfService')}
                    >
                      Terms of Service
                    </Text>
                    {' '}and{' '}
                    <Text
                      style={s.eulaLink}
                      onPress={() => navigation.navigate('PrivacyPolicy')}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </View>
              </View>
              {errors.eula && (
                <View style={s.errRow}>
                  <Ionicons name="alert-circle-outline" size={12} color={C.coral} />
                  <Text style={s.errText}>{errors.eula}</Text>
                </View>
              )}

              {/* ── Submit Button (disabled until EULA accepted) ──────── */}
              <TouchableOpacity
                style={[
                  s.submitBtn,
                  (busy || !eulaAccepted) && s.submitBtnDisabled,
                ]}
                onPress={handleEmailSignUp}
                disabled={busy || !eulaAccepted}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={
                    busy || !eulaAccepted
                      ? [C.textMuted, C.textMuted]
                      : [C.primary, C.primaryDark]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.submitGradient}
                >
                  {loadingEmail ? (
                    <>
                      <ActivityIndicator color={C.white} size="small" />
                      <Text style={s.submitText}>Creating account…</Text>
                    </>
                  ) : (
                    <>
                      <Text style={s.submitText}>Create Account</Text>
                      <Ionicons name="arrow-forward" size={18} color={C.white} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign in link */}
              <View style={s.signinRow}>
                <Text style={s.signinText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={busy}>
                  <Text style={s.signinLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 50 },

  // Header
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 28, paddingHorizontal: 24 },
  logoWrap: { position: 'relative', marginBottom: 20 },
  logoRing: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  logo:     { width: 68, height: 68 },
  logoGlow: {
    position: 'absolute', width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.primaryGlow,
    top: 0, left: 0,
    zIndex: -1,
  },
  headline: { fontSize: 28, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.6, marginBottom: 6 },
  tagline:  { fontSize: 14, color: C.textSecondary, textAlign: 'center' },

  // Role selector
  roleWrap:    { marginBottom: 20 },
  roleHeading: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  roleRow:     { flexDirection: 'row', gap: 12 },
  roleCard: {
    flex: 1, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface,
    paddingVertical: 18, paddingHorizontal: 12,
    alignItems: 'center', gap: 6,
    position: 'relative',
  },
  roleIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleLabel:    { fontSize: 14, fontWeight: '700', color: C.textSecondary, textAlign: 'center' },
  roleSub:      { fontSize: 11, color: C.textMuted, textAlign: 'center' },
  roleCheck:    {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // Social
  socialSection:     { paddingHorizontal: 20, gap: 12, marginBottom: 4 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface, borderRadius: 14,
    paddingVertical: 14, borderWidth: 1, borderColor: C.border, gap: 10,
  },
  socialBtnDark:     { backgroundColor: C.textPrimary, borderColor: C.textPrimary },
  socialBtnDisabled: { opacity: 0.5 },
  socialLogo:        { width: 40, height: 40, resizeMode: 'contain' },
  socialBtnText:     { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  socialBlockedNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 4, marginTop: -4,
  },
  socialBlockedText: { fontSize: 12, color: C.textMuted },

  // Divider
  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerLabel:{ fontSize: 12, color: C.textMuted, fontWeight: '500' },

  // Form
  form: { paddingHorizontal: 20 },

  fieldWrap: { marginBottom: 16 },
  fieldLabel:{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 },
  fieldBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 13,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, minHeight: 52,
  },
  fieldBoxFocus: { borderColor: C.primary, backgroundColor: C.primaryGlow },
  fieldBoxErr:   { borderColor: C.coral,   backgroundColor: C.coralBg },
  fieldIcon:     { marginRight: 10 },
  fieldInput:    { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 12 },
  eyeBtn:        { padding: 6 },

  // Errors
  errRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  errText: { fontSize: 12, color: C.coral, fontWeight: '500' },

  // Password strength
  strengthWrap: { backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14, marginBottom: 14, marginTop: -6 },
  strengthBars: { flexDirection: 'row', gap: 5, marginBottom: 10 },
  strengthBar:  { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.border },
  strengthChecks:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  strengthCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  strengthCheckText:{ fontSize: 11, color: C.textMuted },

  // ── EULA Consent ───────────────────────────────────────────────────────
  eulaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    marginTop: 4,
    paddingVertical: 4,
  },
  eulaCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  eulaCheckboxActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  eulaTextContainer: {
    flex: 1,
  },
  eulaText: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 20,
  },
  eulaLink: {
    color: C.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Submit
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 22 },
  submitBtnDisabled: { opacity: 0.6 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 10 },
  submitText:{ color: C.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },

  // Sign-in link
  signinRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  signinText: { fontSize: 15, color: C.textSecondary },
  signinLink: { fontSize: 15, fontWeight: '700', color: C.primary },
});