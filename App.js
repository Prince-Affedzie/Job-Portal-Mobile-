import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { TaskerProvider } from "./context/TaskerContext";
import { PosterProvider } from "./context/PosterContext";
import { NotificationProvider } from "./context/NotificationContext";
import RootNavigator from "./navigation/RootNavigator";


export default function App() {
  return (
    <AuthProvider>
      <TaskerProvider>
        <PosterProvider>
          <NotificationProvider>
          <RootNavigator />
          </NotificationProvider>
        </PosterProvider>
      </TaskerProvider>
    </AuthProvider>
  );
}
