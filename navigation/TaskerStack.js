import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import { createStackNavigator } from "@react-navigation/stack";
import AvailableTasksScreen from "../screens/tasker/AvailableTasksScreen";
import TaskDetailsScreen from "../screens/tasker/TaskDetails";
import TaskerDashboard from "../screens/tasker/DashboardScreen";
import TaskerProfileScreen from "../screens/tasker/ProfileScreen";
import TaskerTasksScreen from "../screens/tasker/MyTasksScreen";
import NotificationsScreen from "../screens/tasker/NotificationsScreen";
import AppliedTaskDetailsScreen from "../screens/tasker/AppliedTaskDetailScreen";
import SubmissionsScreen from "../screens/tasker/TaskSubmissionsScreen";
import ChatScreen from "../screens/tasker/ChatScreen";
import { NotificationContext } from "../context/NotificationContext";
import AllReviewsScreen from "../screens/tasker/AllReviewsScreen";
import HelpSupportScreen from "../screens/tasker/SupportScreen"
import EarningScreen from "../screens/tasker/EarningsScreen";
import PaymentMethodScreen from '../screens/tasker/PaymentMethodScreen'
import WorkSamplesScreen from '../screens/tasker/WorkSamplesScreen'
import ServiceRequestDetailScreen from '../screens/tasker/ServiceRequestDetailScreen'
import BidDetailsScreen from "../screens/tasker/BidDetailsScreen";
import TaskerProfileDetailScreen from '../screens/tasker/TaskerProfileDetails'
import TaskerBookingsScreen from '../screens/tasker/TaskerBookingScreen'
import TaskerBookingDetailScreen from '../screens/tasker/BookingDetailScreen'
import PurchaseScreen from '../screens/tasker/CreditPurchaseScreen'
import TaskerPortfolioScreen from '../screens/tasker/PortfolioScreens'
import TaskerServicesScreen from '../screens/tasker/TaskerServicesScreen'

import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from '@expo/vector-icons';

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
      <Stack.Screen name="BidDetails" component={BidDetailsScreen} />
      <Stack.Screen name="Submissions" component={SubmissionsScreen} />
      <Stack.Screen name="AllReviews" component={AllReviewsScreen} />
      <Stack.Screen name="EarningScreen" component={EarningScreen} />
      {/*<Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />*/}
      <Stack.Screen name="SupportScreen" component={HelpSupportScreen} />
      <Stack.Screen name="PaymentMethodScreen" component={PaymentMethodScreen} />
      <Stack.Screen name="WorkSamples" component={WorkSamplesScreen} />
      <Stack.Screen name="ServiceRequestDetail" component={ServiceRequestDetailScreen} />
      <Stack.Screen name="TaskerProfileDetail" component={TaskerProfileDetailScreen} />
      <Stack.Screen name="BookingDetail" component={TaskerBookingDetailScreen} />
      <Stack.Screen name="PurchaseCredit" component={PurchaseScreen} />
      <Stack.Screen name="TaskerPortfolio" component={TaskerPortfolioScreen} />
      <Stack.Screen name="TaskerServices" component={TaskerServicesScreen} />

      
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
            tabBarLabel: 'For You',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "compass" : "compass-outline"}
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
          name="Bookings"
          component={TaskerBookingsScreen}
          options={{
            tabBarLabel: 'Bookings',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
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
                routes: [{ name: 'Bookings' }],
              });
            },
          })}
        />


        <Tab.Screen
          name="MyTasks"
          component={TaskerTasksScreen}
          options={{
            tabBarLabel: 'Bidings',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "clipboard" : "clipboard-outline"}
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

        {/*<Tab.Screen
          name="Dashboard"
          component={TaskerDashboard}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialIcons
                    name={focused ? "dashboard" : "dashboard"}
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
        />*/}

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