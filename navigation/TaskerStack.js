import React, { useContext } from "react";
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
import ChatScreen from "../screens/tasker/ChatScreen";
import { NotificationContext } from "../context/NotificationContext";
import AllReviewsScreen from "../screens/tasker/AllReviewsScreen";
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
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      {/* Add any dashboard-related stack screens here */}
    </Stack.Navigator>
  );
}

// Profile Stack
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={TaskerProfileScreen} />
      <Stack.Screen name="AllReviews" component={AllReviewsScreen} />
      {/* Add any profile-related stack screens here */}
    </Stack.Navigator>
  );
}

export default function TaskerStack() {
  const { notifications } = useContext(NotificationContext);
  const unreadNotifications = notifications.filter(n => !n.read);

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
        screenListeners={({ navigation, route }) => ({
          tabPress: (e) => {
            // Get the current state
            const state = navigation.getState();
            const currentRoute = state.routes[state.index];
            
            // If we're pressing the currently active tab
            if (currentRoute.name === route.name) {
              // Prevent default to handle the reset ourselves
              e.preventDefault();
              
              // For stack navigators, we need to reset to the first screen
              if (route.name === 'AvailableTab' || route.name === 'MyTasksTab' || route.name === 'DashboardTab' || route.name === 'ProfileTab') {
                // Use navigate to go to the initial screen of the stack
                if (route.name === 'AvailableTab') {
                  navigation.navigate('AvailableTab', {
                    screen: 'AvailableTasks'
                  });
                } else if (route.name === 'MyTasksTab') {
                  navigation.navigate('MyTasksTab', {
                    screen: 'MyApplications'
                  });
                } else if (route.name === 'DashboardTab') {
                  navigation.navigate('DashboardTab', {
                    screen: 'Dashboard'
                  });
                } else if (route.name === 'ProfileTab') {
                  navigation.navigate('ProfileTab', {
                    screen: 'Profile'
                  });
                }
              } else {
                // For regular screens, just navigate normally
                navigation.navigate(route.name);
              }
            }
            // If switching to a different tab, let the default handler work
          },
        })}
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
        {/* <Tab.Screen
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
            tabBarBadge: unreadNotifications.length > 0 ? unreadNotifications.length : undefined,
          }}
        /> */}
        <Tab.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            tabBarLabel: 'Chat',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "chatbox" : "chatbox-outline"}
                color={color}
                size={size}
              />
            ),
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