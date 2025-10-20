import React, { useContext,useState,useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NotificationProvider } from "../context/NotificationContext";
import NotificationPopup from "../component/common/NotificationPopUp";


import AuthStack from "./AuthStack";
import TaskerStack from "./TaskerStack";
import PosterStack from "./PosterStack";
import TaskerProfileScreen from "../screens/tasker/ProfileScreen";
import AvailableTasksScreen from "../screens/tasker/AvailableTasksScreen";
import MyApplicationsScreen from "../screens/tasker/MyTasksScreen";
import TaskDetailsScreen from "../screens/tasker/TaskDetails";
import SplashScreen from "../screens/SplashScreen";


import TaskerOnboardingStack from './TaskerOnboardingStack'
import TaskPosterOnboarding from "../screens/auth/ClientOnboarding";
import { AuthContext } from "../context/AuthContext";
import { navigationRef } from '../services/navigationService';


const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useContext(AuthContext);
   const [isSplashVisible, setIsSplashVisible] = useState(true);

    useEffect(() => {
    // Hide splash screen when auth check is complete AND minimum time has passed
    const minSplashTime = 3000; // Minimum 2 seconds
    const timer = setTimeout(() => {
      if (!loading) {
        setIsSplashVisible(false);
      }
    }, minSplashTime);

    return () => clearTimeout(timer);
  }, [loading]);

  if (isSplashVisible) {
    return <SplashScreen onAnimationComplete={() => {}} />
  }

 return (
   <SafeAreaProvider>
     <NotificationProvider>
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          //  Auth flow
          <Stack.Screen name="AuthStack" component={AuthStack} />
        ) : user.role === "job_seeker" ? (
          //  Tasker flow
         
           
          <Stack.Screen name="TaskerStack" component={TaskerStack} />
         
        ) : (
          //  Poster flow
          
          <Stack.Screen name="PosterStack" component={PosterStack} />
          
        )}

        {/* Shared/global routes */}
        <Stack.Screen name="TaskerOnboarding" component={TaskerOnboardingStack} />
        <Stack.Screen name="ClientOnboarding" component={TaskPosterOnboarding} />
      </Stack.Navigator>
    </NavigationContainer>
    </NotificationProvider>
    </SafeAreaProvider>
  );
}
