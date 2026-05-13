// src/screens/PaymentScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPaymentCallbacks } from '../../services/paymentCallbacks';

export default function PurchaseScreen({ route, navigation }) {
  const {
    authorization_url,
    reference,
    callbackId,
    callback_url,
    cancel_url,
  } = route.params;
  console.log(authorization_url)

  const webViewRef = useRef(null);
  const hasResolvedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ── DEBUG LOGGING ──
  useEffect(() => {
    console.log('[PAYSTACK DEBUG] Screen Mounted');
    console.log('[PAYSTACK DEBUG] Expected Callback URL:', callback_url);
    console.log('[PAYSTACK DEBUG] Expected Cancel URL:', cancel_url);
    console.log('[PAYSTACK DEBUG] Auth URL:', authorization_url);
  }, []);

  const handleSuccess = async () => {
    console.log('[PAYSTACK EVENT] handleSuccess triggered');
    if (hasResolvedRef.current) return;
    hasResolvedRef.current = true;

    const { onSuccess } = getPaymentCallbacks(callbackId);
    onSuccess?.({ reference });
    navigation.goBack();
  };

  const handleCancel = () => {
    console.log('[PAYSTACK EVENT] handleCancel triggered');
    if (hasResolvedRef.current) return;
    hasResolvedRef.current = true;

    const { onCancel } = getPaymentCallbacks(callbackId);
    onCancel?.();
    navigation.goBack();
  };


  const handleLoadEnd = () => {
  console.log('[PAYSTACK STATUS] Loading Finished');
  setLoading(false);
  // Workaround for iOS blank screen
  // If the WebView finished loading about:blank, force a redirect
  webViewRef.current?.injectJavaScript(`
    if (window.location.href === 'about:blank') {
      window.location.replace('${authorization_url}');
    }
  `);
};

  // Handle messages from the JS Bridge
 const handleMessage = (event) => {
    const data = event.nativeEvent.data;
    console.log('[PAYSTACK JS BRIDGE]:', data);
    
    if (data === 'PAYSTACK_CANCEL_INTERNAL') {
      handleCancel();
    }
    
    // NEW: Catch the success signal from our JS spy
    if (data === 'PAYSTACK_SUCCESS_INTERNAL') {
      console.log('[PAYSTACK MATCH] Success detected via JS Bridge');
      handleSuccess();
    }
  };

  const handleShouldStartLoad = (request) => {
    const url = request.url;
    console.log('[PAYSTACK URL CHECK]:', url);
   console.log('request',request)

    if (url === authorization_url) return true;

    if (url.startsWith(callback_url)) {
      console.log('[PAYSTACK MATCH] Found Callback URL');
      handleSuccess();
      return false;
    }

    if (url.startsWith(cancel_url)) {
      console.log('[PAYSTACK MATCH] Found Cancel URL');
      handleCancel();
      return false;
    }

    return true;
  };

  const handleNavigationStateChange = (navState) => {
    console.log('[PAYSTACK NAV STATE]:', navState.url, '| Loading:', navState.loading);
    
    const url = navState.url;
    if (!url || hasResolvedRef.current) return;

    if (url.startsWith(callback_url)) {
      handleSuccess();
    } else if (url.startsWith(cancel_url)) {
      handleCancel();
    }
  };

  // JS to spy on Paystack clicks and log them back to RN
  const injectedJS = `
    (function() {
      // Monitor clicks
      document.addEventListener('click', function(e) {
        var el = e.target;
        var text = (el.innerText || el.textContent || "").toLowerCase();
        window.ReactNativeWebView.postMessage("Click Detected: " + text);
        
        if (text.includes('cancel') || text.includes('close payment')) {
          window.ReactNativeWebView.postMessage("PAYSTACK_CANCEL_INTERNAL");
        }

        // Catch the 'I have completed payment' or 'Success' text
        if (text.includes("success") || text.includes("payment successful")) {
           window.ReactNativeWebView.postMessage("PAYSTACK_SUCCESS_INTERNAL");
        }
      });
      
      // PERIODIC CHECK: Sometimes Paystack shows a 'Success' screen without a click
      // We check the page content every 2 seconds for the word 'Successful'
      setInterval(function() {
        var bodyText = document.body.innerText || "";
        if (bodyText.includes("Success") && bodyText.includes("Successful")) {
          window.ReactNativeWebView.postMessage("PAYSTACK_SUCCESS_INTERNAL");
        }
        
        // Also watch for the URL change as a backup
        if (window.location.href.includes("order-success")) {
          window.ReactNativeWebView.postMessage("PAYSTACK_SUCCESS_INTERNAL");
        }
      }, 2000);
      
      window.ReactNativeWebView.postMessage("JS Bridge Initialized");
    })();
    true;
  `;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.navSafe}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setShowCancelModal(true)}>
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={styles.navCenter}>
            <Ionicons name="shield-checkmark" size={14} color="#2E7D32" />
            <Text style={styles.navTitle}>Secure Payment</Text>
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCancelModal(true)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Connecting to Paystack…</Text>
        </View>
      )}

      <WebView
        useWebKit={true}
        key={authorization_url}
        startInLoadingState={true}
        ref={webViewRef}
        source={{ uri: authorization_url }}
        style={styles.webView}
        setSupportMultipleWindows={false} 
        allowsBackForwardNavigationGestures={true}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleMessage}
        onContentProcessDidTerminate={() => webViewRef.current?.reload()}
        injectedJavaScript={injectedJS}
        
        // Critical iOS/Android stability flags
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
       
        
        onLoadStart={() => {
          console.log('[PAYSTACK STATUS] Loading Started');
          setLoading(true);
        }}
        onLoadEnd={handleLoadEnd}
        onError={(e) => {
          console.log('[PAYSTACK ERROR] WebView Error:', e.nativeEvent);
          setError(true);
          setLoading(false);
        }}
      />

      {/* Cancel confirmation modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBg}>
              <Ionicons name="close-circle-outline" size={28} color="#E53935" />
            </View>
            <Text style={styles.modalTitle}>Cancel Payment?</Text>
            <Text style={styles.modalSub}>
              Your order will not be placed if you cancel now.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalKeepBtn} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.modalKeepText}>Keep Going</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => {
                setShowCancelModal(false);
                handleCancel();
              }}>
                <Text style={styles.modalCancelText}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  navSafe: {  borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEBEB' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  navCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFEBEE' },
  cancelBtnText: { fontSize: 13, color: '#E53935', fontWeight: '700' },
  webView: { flex: 1,opacity: 0.99 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', zIndex: 10, gap: 14 },
  loadingText: { fontSize: 14, color: '#9E9E9E', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 320 },
  modalIconBg: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  modalSub: { fontSize: 13, color: '#9E9E9E', textAlign: 'center', lineHeight: 19, marginBottom: 22 },
  modalBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  modalKeepBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center' },
  modalKeepText: { color: '#424242', fontWeight: '700', fontSize: 14 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#E53935', alignItems: 'center' },
  modalCancelText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});