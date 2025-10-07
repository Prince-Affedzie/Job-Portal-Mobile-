import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import DashboardScreen from "../screens/poster/DashboardScreen";
import PostedTasksScreen from "../screens/poster/PostedTasksScreen";
import PaymentsScreen from "../screens/poster/PaymentsScreen";
import ClientTaskDetailScreen from "../screens/poster/TaskDetailsScreen";
import EditTaskScreen from "../screens/poster/EditTaskScreen";
import CreateTaskScreen from "../screens/poster/CreateTaskScreen";
import { NotificationContext } from "../context/NotificationContext";
import NotificationsScreen from "../screens/tasker/NotificationsScreen";
import ApplicantsScreen from "../screens/poster/TaskApplicantsScreen";
import ApplicantProfileScreen from "../screens/poster/ApplicantProfileScreen";
import ClientViewSubmissionsScreen from "../screens/poster/ClientSubmissionsScreen";
import ClientProfileScreen from "../screens/poster/ClientProfileScreen";
import ChatScreen from "../screens/tasker/ChatScreen";
import AllReviewsScreen from "../screens/tasker/AllReviewsScreen";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main Poster Stack Navigator (for non-tab screens)
function PosterStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tab Navigator as the main screen */}
      <Stack.Screen name="MainTabs" component={PosterTabs} />
      
      {/* Stack Screens (not in tabs) */}
      <Stack.Screen name="ClientTaskDetail" component={ClientTaskDetailScreen} />
      <Stack.Screen name="EditTask" component={EditTaskScreen} />
      <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
      <Stack.Screen name="TaskApplicants" component={ApplicantsScreen} />
      <Stack.Screen name="ApplicantProfile" component={ApplicantProfileScreen} />
      <Stack.Screen name="TaskSubmissions" component={ClientViewSubmissionsScreen} />
      <Stack.Screen name="AllReviews" component={AllReviewsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      
      {/* Chat should be in stack since it's already in tabs */}
      {/* <Stack.Screen name="Chat" component={ChatScreen} /> */}
    </Stack.Navigator>
  );
}

// Tab Navigator with direct screen links
function PosterTabs() {
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
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
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
          name="PostedTasks"
          component={PostedTasksScreen}
          options={{
            tabBarLabel: 'My Tasks',
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
              // Reset to top of posted tasks when tab is pressed
              navigation.reset({
                index: 0,
                routes: [{ name: 'PostedTasks' }],
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
          name="Notifications"
          component={NotificationsScreen}
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
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              // Reset to top of notifications when tab is pressed
              navigation.reset({
                index: 0,
                routes: [{ name: 'Notifications' }],
              });
            },
          })}
        />

        <Tab.Screen
          name="Profile"
          component={ClientProfileScreen}
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

export default PosterStackNavigator;