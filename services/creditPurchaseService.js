// src/services/paymentService.js
import { Alert } from 'react-native';
import { initializeCreditPurchase, verifyCreditPurchase} from '../api/paymentApi';
import { setPaymentCallbacks, clearPaymentCallbacks } from './paymentCallbacks';

export const triggerCreditPurchase = async ({ navigation, email, phone, amount }) => {
  return new Promise(async (resolve) => {
    try {
      const initRes = await initializeCreditPurchase({ email, phone, amount });
      const { authorization_url, reference } = initRes.data; 

      const callbackId = reference; // unique per transaction

      // Store callbacks by reference — survives navigation
      setPaymentCallbacks(callbackId, {
        onSuccess: (result) => {
          clearPaymentCallbacks(callbackId);
          resolve({ success: true, reference, ...result });
        },
        onCancel: () => {
          clearPaymentCallbacks(callbackId);
          resolve({ success: false, cancelled: true });
        },
        onError: () => {
          clearPaymentCallbacks(callbackId);
          resolve({ success: false });
        },
      });

      navigation.navigate('PurchaseCredit', {
        authorization_url,
        reference,
        callbackId,
        callback_url: 'https://workaflow.vercel.app/order-success',
        cancel_url:   'https://workaflow.vercel.app/',
      });

    } catch (err) {
      console.error('Payment init error:', err);
      Alert.alert('Error', 'Could not start payment.');
      resolve({ success: false });
    }
  });
};