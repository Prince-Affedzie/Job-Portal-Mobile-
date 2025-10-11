import { useEffect, useRef, useState, useContext } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, Alert } from "react-native";
import Constants from "expo-constants";
import { sendPushToken } from "../api/commonApi";
import { AuthContext } from "../context/AuthContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();
  const { user } = useContext(AuthContext);

  // Log when hook runs
  useEffect(() => {
    console.log("usePushNotifications initialized");
  }, []);

  // Handle push token registration and listeners
  useEffect(() => {
    let isMounted = true;

    async function registerAndSendToken() {
      try {
        const token = await registerForPushNotificationsAsync();
        if (isMounted && token) {
          console.log("Expo Push Token:", token);
          setExpoPushToken(token);
          // Only send token to backend if user is logged in
          if (user) {
            await sendPushTokenToBackend(user, token);
          } else {
            console.log("User not logged in, skipping token send");
          }
        } else if (!token) {
          console.error("No token returned from registerForPushNotificationsAsync");
        }
      } catch (error) {
        console.error("Error in registerAndSendToken:", error);
      }
    }

    // Register for push notifications
    registerAndSendToken();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Received notification:", notification);
        setNotification(notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("Notification response:", response);
        handleNotificationResponse(response);
      }
    );

    // Cleanup
      return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]); // Re-run when user changes (e.g., logs in)

  // Send token to backend when user logs in (if token already exists)
  useEffect(() => {
    if (user && expoPushToken) {
      console.log("User logged in, sending existing token:", expoPushToken);
      sendPushTokenToBackend(user, expoPushToken);
    }
  }, [user, expoPushToken]);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (!Device.isDevice) {
    Alert.alert("Push notifications only work on physical devices");
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log("Permission status:", finalStatus);

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert("Permission required", "Enable push notifications in settings.");
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    console.log("Project ID:", projectId);
    if (!projectId) {
      console.error("Project ID is missing or undefined");
      return null;
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    token = tokenResult.data;
    console.log("Generated token:", token);
  } catch (error) {
    console.error("Error fetching Expo push token:", error);
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}

async function sendPushTokenToBackend(user, token) {
  console.log("Sending to backend - User ID:", user?._id, "Token:", token);
  if (!user || !token) {
    console.error("Missing user or token for backend send");
    return;
  }
  try {
    const response = await sendPushToken({ userId: user._id, token });
    if (response.status === 200) {
      console.log("Push token sent to backend successfully");
    } else {
      console.error("Failed to send push token to backend:", response.status);
    }
  } catch (error) {
    console.error("Error sending push token to backend:", error);
  }
}

function handleNotificationResponse(response) {
  const { notification } = response;
  const data = notification.request.content.data;
  console.log("Notification data:", data);
}