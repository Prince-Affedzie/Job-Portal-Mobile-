import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginUser, fetchUser, logoutUser } from "../api/authApi";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Rehydrate session on app start
    const loadStoredAuth = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("authToken");
        if (savedToken) {
          setToken(savedToken);
          const profile = await fetchUser();
          setUser(profile.data);
        }
      } catch (err) {
        console.log("Auth restore failed:", err);
      } finally {
        setLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const res = await loginUser(credentials);
      if (res.data?.token) {
        await AsyncStorage.setItem("authToken", res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return res;
      }
      return false;
    } catch (err) {
        const errorMessage =
        err.res?.data?.message ||
        err.message
      console.log("Login failed:", errorMessage);
      return false;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {}
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem("authToken");
  };

  const updateProfile = async()=>{
    try{

    }catch(err){

    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout,  updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
