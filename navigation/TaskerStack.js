import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import { createStackNavigator } from "@react-navigation/stack";
import AvailableTasksScreen from "../screens/tasker/AvailableTasksScreen";
import TaskDetailsScreen from "../screens/tasker/TaskDetails";
import TaskerDashboard from "../screens/tasker/DashboardScreen";
import TaskerProfileScreen from "../screens/tasker/ProfileScreen";
import MyApplicationsScreen from "../screens/tasker/MyTasksScreen";
import NotificationsScreen from "../screens/tasker/NotificationsScreen";
import AppliedTaskDetailsScreen from "../screens/tasker/AppliedTaskDetailScreen";
import SubmissionsScreen from "../screens/tasker/TaskSubmissionsScreen";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Available Tasks Stack
function AvailableStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AvailableTasks" component={AvailableTasksScreen} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
    </Stack.Navigator>
  );
}

// My Tasks Stack
function MyTasksStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyApplications" component={MyApplicationsScreen} />
      <Stack.Screen name="AppliedTaskDetails" component={AppliedTaskDetailsScreen} />
      <Stack.Screen name="Submissions" component={SubmissionsScreen} />
    </Stack.Navigator>
  );
}

// Notifications Stack
function NotificationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      {/* Add any notification-related stack screens here */}
    </Stack.Navigator>
  );
}

// Dashboard Stack
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={TaskerDashboard} />
      {/* Add any dashboard-related stack screens here */}
    </Stack.Navigator>
  );
}

// Profile Stack
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={TaskerProfileScreen} />
      {/* Add any profile-related stack screens here */}
    </Stack.Navigator>
  );
}

export default function TaskerStack() {
  return (
     <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="AvailableTab"
        component={AvailableStack}
        options={{
          tabBarLabel: 'Available',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "list" : "list-outline"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="MyTasksTab"
        component={MyTasksStack}
        options={{
          tabBarLabel: 'My Tasks',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "briefcase" : "briefcase-outline"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStack}
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "notifications" : "notifications-outline"} 
              color={color} 
              size={size} 
            />
          ),
          tabBarBadge: 3, // You can dynamically set this based on unread count
        }}
      />
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "cash" : "cash-outline"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />
    </Tab.Navigator>
    </SafeAreaView>
  );
}