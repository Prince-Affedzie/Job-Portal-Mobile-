import React, {useEffect} from "react";
import Constants from "expo-constants";
import { AuthProvider } from "./context/AuthContext";
import { TaskerProvider } from "./context/TaskerContext";
import { PosterProvider } from "./context/PosterContext";
import {TaskerOnboardingProvider} from "./context/TaskerOnboardingContext"
import { NotificationProvider } from "./context/NotificationContext";
import {ServiceRequestProvider} from "./context/ServiceRequestContext"
import RootNavigator from "./navigation/RootNavigator";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NotificationPopup from "./component/common/NotificationPopUp";
import usePushNotifications from "./hooks/usePushNotifications";
import { PaystackProvider } from "react-native-paystack-webview";
import { StatusBar } from "react-native";
import * as Updates from 'expo-updates';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
const PayStack_Public_Key = Constants.expoConfig.extra?.EXPO_PayStack_publicKey;
import VerificationBanner from "./component/common/VerificationBanner";


function PushNotificationInitializer() {
  usePushNotifications();
  return null;
}

export default function App() {


   useEffect(()=>{
          GoogleSignin.configure({
           webClientId:'830161939039-chcube7voaggltt861nrga6g7uq13ndl.apps.googleusercontent.com',
          })
      },[])
  


  useEffect(() => {
    async function checkUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log("Update error:", e);
      }
    }

    checkUpdates();
  }, []);
  
  return (
     <SafeAreaProvider>
      <AuthProvider>
      <TaskerOnboardingProvider>
      <TaskerProvider>
        <PosterProvider>
          <NotificationProvider>
            <ServiceRequestProvider>
          <PaystackProvider debug 
           publicKey={PayStack_Public_Key}
           currency="GHS"
           defaultChannels={['card','mobile_money','bank']}
           >
          <PushNotificationInitializer />
           <NotificationPopup/>
           <VerificationBanner position="top" autoHideDuration={10000} />
           <SafeAreaView style={{ flex: 1, backgroundColor: '#1E3A6E' }} edges={['top']}>
          <RootNavigator />
          </SafeAreaView>
          </PaystackProvider>
          </ServiceRequestProvider>
          </NotificationProvider>
        </PosterProvider>
      </TaskerProvider>
      </TaskerOnboardingProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}
