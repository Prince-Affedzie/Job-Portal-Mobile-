import React, { createContext, useState, useEffect, useContext } from "react";
import { createNotification, getNotifications} from "../api/notificationApi"
import { AuthContext } from "./AuthContext";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load notifications
  const loadNotifications= async () => {
    if (!token) return;
    setLoading(true);
    try {
     const res = await getNotifications();
     setNotifications(res.data || []);
    } catch (err) {
      console.log("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };
  const addNotification = async(data)=>{
    try{
         await createNotification(data);

    }catch (err) {
      console.log("Failed to generate notification:", err);
    } 
  }

  return (
      <NotificationContext.Provider
     value={{
      notifications,
      loading,
      loadNotifications,
      addNotification,
    }}
  >
    {children}
  </NotificationContext.Provider>
    );
  };