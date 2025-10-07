import React, { createContext, useState, useEffect, useContext } from "react";
import {getMiniTasksPosted, postMiniTask, assignApplicantToTask,updateMiniTask,deleteMiniTask} from "../api/miniTaskApi";
import {getMicroTaskApplicants,getMicroTaskBids} from "../api/bidApi"
import { getClientPayments } from '../api/paymentApi'; 

import { AuthContext } from "./AuthContext";

export const PosterContext = createContext();

export const PosterProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [postedTasks, setPostedTasks] = useState([]);
  const [payments,setPayments] = useState([])
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
      return res
    } catch (err) {
      console.log("Failed to create task:", err);
    }
  };

  const deleteTask = async(taskId)=>{
    try{
      const res = deleteMiniTask(taskId)
      return res

    }catch(err){
      console.log(err)
    }
  }

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

  const editMiniTask = async(taskId, data)=>{
    try{
      const response = await updateMiniTask(taskId,data)
      return response

    }catch(err){
        console.log(err)
    }
  }


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

   const fetchPayments = async () => {
      try {
        const response = await getClientPayments(); 
        setPayments(response.data || []);
      } catch (error) {
        console.error('Error fetching payments:', error);
        Alert.alert('Error', 'Failed to load payment data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  useEffect(() => {
      loadPostedTasks();
      fetchPayments();
  }, [user]);

  return (
    <PosterContext.Provider
      value={{
        postedTasks,
        loading,
        loadPostedTasks,
        fetchPayments,
        addTask,
        editMiniTask,
        getApplicants,
        approveApplicant,
        getTaskBids,
        deleteTask,
        payments,
      }}
    >
      {children}
    </PosterContext.Provider>
  );
};
