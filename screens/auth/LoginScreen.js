import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { navigate } from '../../services/navigationService';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

const WorkaFlowLogo = require('../../assets/workaflow_icon.png');
const GoogleLogo    = require('../../assets/Google-logo.png');
const { width }     = Dimensions.get('window');

// ─── Theme: Pacific Indigo & Warm Gold ──────────────────────────────────────
const C = {
  bg:           '#F8FAFF',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F1F4F9',
  border:       '#E4E8EE',
  primary:      '#1E3A6E',
  primaryDark:  '#152C4F',
  primaryGlow:  '#EBF5FF',
  gold:         '#D49B3F',
  goldLight:    '#FCF3E1',
  emerald:      '#0F766E',
  coral:        '#DC2626',
  coralBg:      '#FEE2E2',
  amber:        '#F59E0B',
  textPrimary:  '#0F172A',
  textSecondary:'#475569',
  textMuted:    '#94A3B8',
  white:        '#FFFFFF',
};

// ─── Social Button ──────────────────────────────────────────────────────────
const SocialButton = ({ logo, label, onPress, loading, disabled, dark }) => (
  <TouchableOpacity
    style={[
      socialStyles.btn,
      dark && socialStyles.btnDark,
      disabled && socialStyles.btnDisabled,
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator size="small" color={dark ? C.white : C.primary} style={{ marginRight: 10 }} />
    ) : typeof logo === 'string' ? (
      <Ionicons name={logo} size={20} color={dark ? C.white : C.textPrimary} style={{ marginRight: 10 }} />
    ) : (
      <Image source={logo} style={socialStyles.logo} />
    )}
    <Text style={[socialStyles.text, dark && { color: C.white }]}>
      {loading ? 'Connecting…' : label}
    </Text>
  </TouchableOpacity>
);

const socialStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface,
    borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 12,
  },
  btnDark:     { backgroundColor: C.textPrimary, borderColor: C.textPrimary },
  btnDisabled: { opacity: 0.5 },
  logo:        { width: 40, height: 40, resizeMode: 'contain', marginRight: 10 },
  text:        { fontSize: 15, fontWeight: '600', color: C.textPrimary },
});

// ─── Divider ────────────────────────────────────────────────────────────────
const Divider = ({ label }) => (
  <View style={styles.dividerRow}>
    <View style={styles.dividerLine} />
    <Text style={styles.dividerLabel}>{label}</Text>
    <View style={styles.dividerLine} />
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
const Login = ({ navigation }) => {
  const { login, google_login, apple_signup, setUser } = useContext(AuthContext);

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [loadingEmail,  setLoadingEmail]  = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple,  setLoadingApple]  = useState(false);
  const busy = loadingEmail || loadingGoogle || loadingApple;

  // ── animations ──────────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0)).current;

  const passwordRef = useRef(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '830161939039-chcube7voaggltt861nrga6g7uq13ndl.apps.googleusercontent.com',
    });
  }, []);

  useEffect(() => {
    Animated.spring(logoScale, { toValue: 1, tension: 100, friction: 8, delay: 150, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 550, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Email login ──────────────────────────────────────────────────────────
  const handleEmailLogin = async () => {
    if (busy) return;
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setLoadingEmail(true);
    try {
      const response = await login({ email: email.trim(), password: password.trim() });
      if (response?.success) {
        // setUser is called inside AuthContext, no manual redirect needed
        Alert.alert('Success', 'Login successful!');
      } else {
        Alert.alert('Error', response?.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'An unexpected error occurred.');
    } finally {
      setLoadingEmail(false);
    }
  };

  // ── Google login ─────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    if (busy) return;
    setLoadingGoogle(true);
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      try { await GoogleSignin.signOut(); } catch (_) {}

      const result  = await GoogleSignin.signIn();
      const idToken = result?.data?.idToken;
      if (!idToken) throw new Error('No ID token returned from Google.');

      const response = await google_login({ token: idToken });
      if (response?.status === 200 || response?.success) {
        Alert.alert('Welcome back! 👋', 'Signed in with Google.');
      } else {
        Alert.alert('Error', response?.data?.message || response?.message || 'Account not found. Please sign up first.');
      }
    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (err.code === statusCodes.IN_PROGRESS) return;
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Google sign-in failed.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  // ── Apple login (existing users only) ────────────────────────────────────
  const handleAppleLogin = async () => {
    if (busy) return;
    setLoadingApple(true);
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        Alert.alert('Not Available', 'Apple Sign‑In is only available on iOS.');
        setLoadingApple(false);
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, email: appleEmail, fullName, user: appleUserId } = credential;
      if (!identityToken) throw new Error('No identity token received from Apple.');

      // Login screen is for existing accounts – skip role, Apple will only be returning user
      const payload = {
        token:       identityToken,
        appleUserId,
        email:       appleEmail     || undefined,
        firstName:   fullName?.givenName  || '',
        lastName:    fullName?.familyName || '',
      };

      const response = await apple_signup(payload); // handles both login and signup on backend
      if (response?.status === 200 || response?.success) {
        setUser(response.data.user)
        Alert.alert('Welcome back! 👋', 'Signed in with Apple.');
      } else {
        Alert.alert('Error', response?.data?.message || response?.message || 'Apple authentication failed.');
      }
    } catch (err) {
      if (err.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Error', err?.message || 'Apple sign-in failed.');
    } finally {
      setLoadingApple(false);
    }
  };

  const isFormValid = email.trim() && password.trim();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Header ──────────────────────────────────────────────── */}
            <View style={styles.header}>
              <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
                <View style={styles.logoInnerContainer}>
                  <Image source={WorkaFlowLogo} style={styles.logoImage} resizeMode="contain" />
                </View>
                <View style={styles.logoGlow} />
              </Animated.View>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to your Workaflow account</Text>
              </View>
            </View>

            {/* ── Social login ─────────────────────────────────────────── */}
            <View style={{ paddingHorizontal: 0, marginBottom: 0 }}>
              <SocialButton
                logo={GoogleLogo}
                label="Continue with Google"
                onPress={handleGoogleLogin}
                loading={loadingGoogle}
                disabled={busy}
              />
              {Platform.OS === 'ios' && (
                <SocialButton
                  logo="logo-apple"
                  label="Continue with Apple"
                  onPress={handleAppleLogin}
                  loading={loadingApple}
                  disabled={busy}
                  dark
                />
              )}
            </View>

            <Divider label="or sign in with email" />

            {/* ── Email form ───────────────────────────────────────────── */}
            <View style={styles.formContainer}>
              {/* Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                ]}>
                  <Ionicons name="mail-outline" size={20}
                    color={focusedField === 'email' ? C.primary : C.textMuted}
                    style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={C.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!busy}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                ]}>
                  <Ionicons name="lock-closed-outline" size={20}
                    color={focusedField === 'password' ? C.primary : C.textMuted}
                    style={styles.inputIcon} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={C.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!busy}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onSubmitEditing={handleEmailLogin}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(p => !p)}
                    disabled={busy}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={focusedField === 'password' ? C.primary : C.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity onPress={() => navigate('ForgotPassword')} disabled={busy}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In button */}
              <Animated.View>
                <TouchableOpacity
                  style={[styles.loginButton, (!isFormValid || busy) && styles.loginButtonDisabled]}
                  onPress={handleEmailLogin}
                  disabled={!isFormValid || busy}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={isFormValid && !busy ? [C.primary, C.primaryDark] : [C.border, C.border]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    {loadingEmail ? (
                      <ActivityIndicator color={C.white} size="small" />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.loginButtonText}>Sign In</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Sign Up link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigate('Register')} disabled={busy}>
                <LinearGradient
                  colors={[C.primary, C.primaryDark]}
                  style={styles.signUpGradient}
                >
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 110,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    position: 'relative',
  },
  logoInnerContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: 100, height: 100 },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: C.primaryGlow,
    zIndex: -1,
  },
  titleContainer: { alignItems: 'center' },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    maxWidth: 260,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerLabel: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '500',
  },

  formContainer: { marginBottom: 28 },
  inputContainer: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 16,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    borderColor: C.primary,
    backgroundColor: C.primaryGlow,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: C.textPrimary,
    fontWeight: '500',
  },
  eyeIcon: { padding: 8, marginLeft: 8 },

  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 22,
  },
  forgotPasswordText: {
    fontSize: 15,
    color: C.primary,
    fontWeight: '600',
  },

  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loginButtonDisabled: { opacity: 0.6 },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  signUpText: {
    fontSize: 16,
    color: C.textSecondary,
    fontWeight: '500',
  },
  signUpGradient: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  signUpLink: {
    fontSize: 16,
    color: C.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default Login;