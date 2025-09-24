import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import AvailableTasksScreen from "../screens/tasker/AvailableTasksScreen";
import TaskDetailsScreen from "../screens/tasker/TaskDetails";
import TaskerDashboard from "../screens/tasker/DashboardScreen";
import TaskerProfileScreen from "../screens/tasker/ProfileScreen";
import MyApplicationsScreen from "../screens/tasker/MyTasksScreen";
import NotificationsScreen from "../screens/tasker/NotificationsScreen";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TaskerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Available"
        component={AvailableTasksScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MyTasks"
        component={MyApplicationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Notification"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={TaskerDashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={TaskerProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function TaskerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tabs are the "home" of the tasker */}
      <Stack.Screen name="TaskerTabs" component={TaskerTabs} />
      
      {/* Global screen available across tabs */}
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
       <Stack.Screen name="Available" component={AvailableTasksScreen} />
    </Stack.Navigator>
  );
}
