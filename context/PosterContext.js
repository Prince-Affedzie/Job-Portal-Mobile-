import React, { createContext, useState, useEffect, useContext } from "react";
import {getMiniTasksPosted, postMiniTask, assignApplicantToTask} from "../api/miniTaskApi";
import {getMicroTaskApplicants,getMicroTaskBids} from "../api/bidApi"
import { AuthContext } from "./AuthContext";

export const PosterContext = createContext();

export const PosterProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [postedTasks, setPostedTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load tasks posted by this poster
  const loadPostedTasks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getMiniTasksPosted();
      setPostedTasks(res.data || []);
    } catch (err) {
      console.log("Failed to fetch posted tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new task
  const addTask = async (taskData) => {
    try {
      const res = await postMiniTask(taskData);
      if (res.success) {
        loadPostedTasks();
      }
    } catch (err) {
      console.log("Failed to create task:", err);
    }
  };

  // Fetch applicants for a given task
  const getApplicants = async (taskId) => {
    try {
      const res = await getMicroTaskApplicants(taskId);
      return res.data || [];
    } catch (err) {
      console.log("Failed to fetch applicants:", err);
      return [];
    }
  };

    const getTaskBids = async (taskId) => {
    try {
      const res = await getMicroTaskBids(taskId);
      return res.data || [];
    } catch (err) {
      console.log("Failed to fetch applicants:", err);
      return [];
    }
  };

  // Approve a tasker
  const approveApplicant = async (taskId, taskerId) => {
    try {
      const res = await assignApplicantToTask(taskId, taskerId);
      if (res.success) {
        loadPostedTasks();
      }
    } catch (err) {
      console.log("Failed to approve tasker:", err);
    }
  };

  useEffect(() => {
    if (user?.role === "poster") {
      loadPostedTasks();
    }
  }, [user]);

  return (
    <PosterContext.Provider
      value={{
        postedTasks,
        loading,
        loadPostedTasks,
        addTask,
        getApplicants,
        approveApplicant,
        getTaskBids,
      }}
    >
      {children}
    </PosterContext.Provider>
  );
};
