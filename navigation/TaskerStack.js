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
import EarningScreen from "../screens/tasker/EarningsScreen";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main Tasker Stack Navigator (for non-tab screens)
function TaskerStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tab Navigator as the main screen */}
      <Stack.Screen name="MainTabs" component={TaskerTabs} />
      
      {/* Stack Screens (not in tabs) */}
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
      <Stack.Screen name="AppliedTaskDetails" component={AppliedTaskDetailsScreen} />
      <Stack.Screen name="Submissions" component={SubmissionsScreen} />
      <Stack.Screen name="AllReviews" component={AllReviewsScreen} />
      <Stack.Screen name="EarningScreen" component={EarningScreen} />
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      
      {/* Chat should be in stack since it's already in tabs */}
      {/* <Stack.Screen name="Chat" component={ChatScreen} /> */}
    </Stack.Navigator>
  );
}

// Tab Navigator with direct screen links
function TaskerTabs() {
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
      >
        {/* Direct Tab Screens */}
        <Tab.Screen
          name="AvailableTasks"
          component={AvailableTasksScreen}
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
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              // Reset to top of available tasks when tab is pressed
              navigation.reset({
                index: 0,
                routes: [{ name: 'AvailableTasks' }],
              });
            },
          })}
        />

        <Tab.Screen
          name="MyTasks"
          component={MyApplicationsScreen}
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
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              // Reset to top of my tasks when tab is pressed
              navigation.reset({
                index: 0,
                routes: [{ name: 'MyTasks' }],
              });
            },
          })}
        />

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
          name="Dashboard"
          component={TaskerDashboard}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "analytics" : "analytics-outline"}
                color={color}
                size={size}
              />
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              // Reset to top of dashboard when tab is pressed
              navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
              });
            },
          })}
        />

        <Tab.Screen
          name="Profile"
          component={TaskerProfileScreen}
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
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              // Reset to top of profile when tab is pressed
              navigation.reset({
                index: 0,
                routes: [{ name: 'Profile' }],
              });
            },
          })}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

export default TaskerStackNavigator;