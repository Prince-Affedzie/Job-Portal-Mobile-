import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { TaskerProvider } from "./context/TaskerContext";
import { PosterProvider } from "./context/PosterContext";
import {TaskerOnboardingProvider} from "./context/TaskerOnboardingContext"
import { NotificationProvider } from "./context/NotificationContext";
import RootNavigator from "./navigation/RootNavigator";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NotificationPopup from "./component/common/NotificationPopUp";
import { PaystackProvider } from "react-native-paystack-webview";




export default function App() {
  return (
     <SafeAreaProvider>
      <AuthProvider>
      <TaskerOnboardingProvider>
      <TaskerProvider>
        <PosterProvider>
          
         
          <PaystackProvider debug 
           publicKey="pk_test_31e53267e9515cb94801b1fbf13c80c5d1ff89a1"
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
