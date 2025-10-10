import React, { createContext, useState, useEffect, useContext } from "react";
import {  getMiniTasks, getYourAppliedMiniTasks } from "../api/miniTaskApi";
import {applyToMiniTask,bidOnMiniTask} from "../api/miniTaskApi";
import { AuthContext } from "./AuthContext";
import {viewAllEarnings} from "../api/paymentApi"

export const TaskerContext = createContext();

export const TaskerProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [earnings,setEarnings] = useState([])

  // Load available tasks for tasker
  const loadAvailableTasks = async (params) => {
    
    if (!token) return;
    setLoading(true);
    try {
      const res = await getMiniTasks(params);
      setAvailableTasks(res.data || []);
    } catch (err) {
      console.log("Failed to fetch available tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load tasks assigned/applied by this tasker
  const loadMyTasks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getYourAppliedMiniTasks();
      return res
    } catch (err) {
      console.log("Failed to fetch my tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  // Apply for a task
  const applyTask = async (taskId) => {
    try {
      const res = await applyToMiniTask(taskId);
      if (res.success) {
        loadMyTasks();
      }
    } catch (err) {
      console.log("Failed to apply for task:", err);
    }
  };

     const bidOnTask = async (id,bidData) => {
    try {
      const res = await bidOnMiniTask(id,bidData);
      if (res.success) {
        loadMyTasks();
      }
    } catch (err) {
      console.log("Failed to apply for task:", err);
    }
  };

  const getAllEarnings = async()=>{
    if(!token) return
    try{
      const res = await viewAllEarnings()
      setEarnings(res.data)
      return res

    }catch(err){
      console.log(err)
    }
  }

  useEffect(() => {
    if (user?.role === "tasker") {
      loadAvailableTasks();
      loadMyTasks();
      getAllEarnings();
    }
  }, [user]);

  return (
    <TaskerContext.Provider
      value={{
        availableTasks,
        myTasks,
        loading,
        loadAvailableTasks,
        loadMyTasks,
        applyTask,
        bidOnTask,
        getAllEarnings,
        earnings
      }}
    >
      {children}
    </TaskerContext.Provider>
  );
};
