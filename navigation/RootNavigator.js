import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';


import AuthStack from "./AuthStack";
import TaskerStack from "./TaskerStack";
import PosterStack from "./PosterStack";
import TaskerProfileScreen from "../screens/tasker/ProfileScreen";
import AvailableTasksScreen from "../screens/tasker/AvailableTasksScreen";
import MyApplicationsScreen from "../screens/tasker/MyTasksScreen";
import TaskDetailsScreen from "../screens/tasker/TaskDetails";


import TaskerOnboardingStack from './TaskerOnboardingStack'
import TaskPosterOnboarding from "../screens/auth/ClientOnboarding";
import { AuthContext } from "../context/AuthContext";
import { navigationRef } from '../services/navigationService';


const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return null; // or a splash screen component
  }

 return (
   <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
