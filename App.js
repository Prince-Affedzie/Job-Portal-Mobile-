import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { TaskerProvider } from "./context/TaskerContext";
import { PosterProvider } from "./context/PosterContext";
import {TaskerOnboardingProvider} from "./context/TaskerOnboardingContext"
import { NotificationProvider } from "./context/NotificationContext";
import RootNavigator from "./navigation/RootNavigator";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';




export default function App() {
  return (
     <SafeAreaProvider>
    <AuthProvider>
      <TaskerOnboardingProvider>
      <TaskerProvider>
        <PosterProvider>
          <NotificationProvider>
          <RootNavigator />
          </NotificationProvider>
        </PosterProvider>
      </TaskerProvider>
      </TaskerOnboardingProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}
