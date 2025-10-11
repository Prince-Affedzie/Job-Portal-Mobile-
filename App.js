import React from "react";
import Constants from "expo-constants";
import { AuthProvider } from "./context/AuthContext";
import { TaskerProvider } from "./context/TaskerContext";
import { PosterProvider } from "./context/PosterContext";
import {TaskerOnboardingProvider} from "./context/TaskerOnboardingContext"
import { NotificationProvider } from "./context/NotificationContext";
import RootNavigator from "./navigation/RootNavigator";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NotificationPopup from "./component/common/NotificationPopUp";
import usePushNotifications from "./hooks/usePushNotifications";
import { PaystackProvider } from "react-native-paystack-webview";
import { StatusBar } from "react-native";
const PayStack_Public_Key = Constants.expoConfig.extra?.EXPO_PayStack_publicKey;


function PushNotificationInitializer() {
  usePushNotifications();
  return null;
}

export default function App() {
  
  return (
     <SafeAreaProvider>
      <AuthProvider>
      <TaskerOnboardingProvider>
      <TaskerProvider>
        <PosterProvider>
          <NotificationProvider>
          <PaystackProvider debug 
           publicKey={PayStack_Public_Key}
           currency="GHS"
           defaultChannels={['card','mobile_money','bank']}
           >
          <PushNotificationInitializer />
           <NotificationPopup/>
          <RootNavigator />
          </PaystackProvider>
          </NotificationProvider>
        </PosterProvider>
      </TaskerProvider>
      </TaskerOnboardingProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}
