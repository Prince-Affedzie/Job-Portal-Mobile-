import React, { useContext, useState, useEffect, useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NativeSplash from 'expo-splash-screen';

import AuthStack from "./AuthStack";
import TaskerStack from "./TaskerStack";
import PosterStack from "./PosterStack";
import SplashScreen from "../screens/SplashScreen";
import ChatWindowScreen from "../screens/Messaging/ChatWindowScreen";
import NotificationsScreen from "../screens/tasker/NotificationsScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import TaskPosterOnboarding from "../screens/auth/ClientOnboarding";
import { AuthContext } from "../context/AuthContext";
import { navigationRef } from '../services/navigationService';
import usePushNotifications from "../hooks/usePushNotifications";   
import NotificationPermissionBanner from "../component/common/NotificationPermissionBanner"

// Keep the native splash until we manually hide it
NativeSplash.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

// Component that triggers push notifications AFTER the app is ready
function PushNotificationSetup() {
  usePushNotifications();
  return null;
}

export default function RootNavigator() {
  const { user, loading } = useContext(AuthContext);
  const [splashDone, setSplashDone] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // Hide native splash as soon as the custom splash mounts
  useEffect(() => {
    NativeSplash.hideAsync();
  }, []);

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
  }, []);

  useEffect(() => {
    if (splashDone && !loading) {
      setAppReady(true);
    }
  }, [splashDone, loading]);

  // Show the custom splash until everything is ready
  if (!appReady) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        {/* 👇 Push notifications are set up only now — after splash is hidden */}
        <PushNotificationSetup />
        <NotificationPermissionBanner /> 
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="AuthStack" component={AuthStack} />
          ) : user.role === "tasker" ? (
            <Stack.Screen name="TaskerStack" component={TaskerStack} />
          ) : (
            <Stack.Screen name="PosterStack" component={PosterStack} />
          )}

          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ClientOnboarding" component={TaskPosterOnboarding} />
          <Stack.Screen
            name="ChatWindow"
            component={ChatWindowScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}