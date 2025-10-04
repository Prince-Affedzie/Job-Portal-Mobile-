import axios from "axios";
import { usePaystack } from "react-native-paystack-webview";
import { Alert } from "react-native";
import { initializeTaskPayment } from "../api/paymentApi";
import { verifyTaskPayment } from "../api/paymentApi";


export const triggerPayment = async ({ popup, email, amount, taskId, beneficiary }) => {
  try {
    const initRes = await initializeTaskPayment({
      taskId,
      beneficiary,
      amount: amount ,
    });
    const { reference } = initRes.data;

    return new Promise((resolve) => {
      popup.newTransaction({
        email,
        amount: amount,
        reference,
        onSuccess: async (res) => {
          console.log("Payment Success!");

          try {
            const verifyRes = await verifyTaskPayment(reference);
           
            if (verifyRes.status === 200) {
              Alert.alert("Payment Successful", "Funds secured in escrow.");
              resolve(true);
            } else {
              Alert.alert("Verification Failed", "We couldn’t verify this payment.");
              resolve(false);
            }
          } catch (err) {
            console.error("Verification Error:", err);
            Alert.alert("Error", "Payment verification failed.");
            resolve(false);
          }
        },
        onCancel: () => {
          Alert.alert("Payment Cancelled", "No funds were charged.");
          resolve(false);
        },
        onError: (err) => {
          console.error("Paystack Error:", err);
          Alert.alert("Payment Error", "An issue occurred during payment.");
          resolve(false);
        },
      });
    });
  } catch (err) {
    console.error("Error starting payment:", err);
    Alert.alert("Error", "Could not start payment.");
    return false;
  }
};
