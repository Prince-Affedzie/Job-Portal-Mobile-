import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ClientOnboarding from '../screens/auth/ClientOnboarding'
import TaskerOnboarding from '../screens/auth/TaskerOnboarding'
import TaskerOnboardingStack from './TaskerOnboardingStack'
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen'
import VerifyResetScreen from '../screens/auth/VerifyResetScreen'
import TaskerStack from "./TaskerStack";
import PosterStack from "./PosterStack";


const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
       <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
       <Stack.Screen name="VerifyReset" component={VerifyResetScreen} />
       <Stack.Screen name="TaskerStack" component={TaskerStack} />
       <Stack.Screen name="PosterStack" component={PosterStack} />
    </Stack.Navigator>
  );
}
