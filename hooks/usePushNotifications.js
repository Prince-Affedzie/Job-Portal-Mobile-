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

  useEffect(()=>{
    console.log("I'm Working")
   
  },[])

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        console.log("Expo Push Token:", token);
        setExpoPushToken(token);
        sendPushTokenToBackend(user, token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("Notification response:", response);
        handleNotificationResponse(response);
      }
    );

    // Proper cleanup for newer Expo versions
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  let token;
  console.log("I'm also working")

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log("I'm the final status",finalStatus)

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert("Permission required", "Enable push notifications in settings.");
      return null;
    }


    try {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  console.log("I'm the projectId: ", projectId);
  if (!projectId) {
    console.error("Project ID is missing or undefined");
    return null;
  }
  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  token = tokenResult.data;
  console.log("I'm the token", token);
  
} catch (error) {
  console.error("Error fetching Expo push token:", error);
  return null;
}
  } else {
    Alert.alert("Push notifications only work on physical devices");
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
  console.log('User here',user)
  console.log('Token here',token)
  try {
    const response = await sendPushToken({ token });
    if (response.status === 200) {
      console.log("Push token sent to backend successfully");
    } else {
      console.error("Failed to send push token to backend");
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
