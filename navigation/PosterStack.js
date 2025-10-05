import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { CommonActions } from "@react-navigation/native";
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

// Create a Stack Navigator for Posted Tasks
function PostedTasksStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="PostedTasksList"
        component={PostedTasksScreen}
        options={{ title: "My Posted Tasks" }}
      />
      <Stack.Screen
        name="ClientTaskDetail"
        component={ClientTaskDetailScreen}
        options={{ title: "Task Details" }}
      />
      <Stack.Screen
        name="EditTask"
        component={EditTaskScreen}
        options={{ title: "Edit Task" }}
      />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ title: "Post Task" }}
      />
      <Stack.Screen
        name="TaskApplicants"
        component={ApplicantsScreen}
        options={{ title: "Task Applicants" }}
      />
      <Stack.Screen
        name="ApplicantProfile"
        component={ApplicantProfileScreen}
        options={{ title: "Applicant Profile" }}
      />
      <Stack.Screen
        name="TaskSubmissions"
        component={ClientViewSubmissionsScreen}
        options={{ title: "Task Submissions" }}
      />
    </Stack.Navigator>
  );
}

// Create a Stack Navigator for Profile
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="ClientProfile"
        component={ClientProfileScreen}
        options={{ title: "Profile" }}
      />
      <Stack.Screen
        name="AllReviews"
        component={AllReviewsScreen}
        options={{ title: "All Reviews" }}
      />
    </Stack.Navigator>
  );
}

export default function PosterStack() {
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
              if (route.name === 'PostedTasks' || route.name === 'Profile') {
                // Use navigate to go to the initial screen of the stack
                if (route.name === 'PostedTasks') {
                  navigation.navigate('PostedTasks', {
                    screen: 'PostedTasksList'
                  });
                } else if (route.name === 'Profile') {
                  navigation.navigate('Profile', {
                    screen: 'ClientProfile'
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
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="PostedTasks"
          component={PostedTasksStack}
          options={{
            tabBarLabel: "Posted Tasks",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" color={color} size={size} />
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
          name="Profile"
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