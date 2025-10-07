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
import { PaystackProvider } from "react-native-paystack-webview";
const PayStack_Public_Key = Constants.expoConfig.extra?.EXPO_PayStack_publicKey;




export default function App() {
  return (
     <SafeAreaProvider>
      <AuthProvider>
      <TaskerOnboardingProvider>
      <TaskerProvider>
        <PosterProvider>
          
         
          <PaystackProvider debug 
           publicKey={PayStack_Public_Key}
           currency="GHS"
           defaultChannels={['card','mobile_money']}
           >
          <RootNavigator />
          </PaystackProvider>
          
        </PosterProvider>
      </TaskerProvider>
      </TaskerOnboardingProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}
