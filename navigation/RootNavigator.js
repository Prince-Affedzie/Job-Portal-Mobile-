import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthStack from "./AuthStack";
import TaskerStack from "./TaskerStack";
import PosterStack from "./PosterStack";
import TaskerProfileScreen from "../screens/tasker/ProfileScreen";
import AvailableTasksScreen from "../screens/tasker/AvailableTasksScreen";
import MyApplicationsScreen from "../screens/tasker/MyTasksScreen";
import TaskDetailsScreen from "../screens/tasker/TaskDetails";
import { AuthContext } from "../context/AuthContext";
import { navigationRef } from '../services/navigationService';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return null; // or a splash screen component
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : user.role === "job_seeker" ? (
          <Stack.Screen name="Tasker" component={TaskerStack} />
        ) : (
          <Stack.Screen name="Poster" component={PosterStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
