// context/ServiceRequestContext.js
import React, { createContext, useState, useContext } from 'react';
import { AuthContext } from './AuthContext';
import {getServiceRequest,getRequestDetail, deleteRequest,updateRequest} from "../api/serviceRequestAPI/clientAPI"

const ServiceRequestContext = createContext();

export const ServiceRequestProvider = ({ children }) => {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const loadServiceRequests = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await getServiceRequest();
      if (response.status === 200) {
        setServiceRequests(response.data);
      }
    } catch (error) {
      console.error('Error loading service requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceRequestDetails = async(requestId)=>{
    try{

        const res = await getRequestDetail(requestId)
        return res;
        
    }catch (error) {
      console.error('Error loading service requests:', error);
    } 
  }

  const deleteServiceRequest = async (requestId) => {
    try {
      const response = await deleteRequest(requestId);
      if (response.status === 200) {
        setServiceRequests(prev => prev.filter(req => req._id !== requestId));
      }
      return response;
    } catch (error) {
      console.error('Error deleting service request:', error);
      throw error;
    }
  };

  const updateServiceRequest = async (requestId, updates) => {
    try {
      const response = await updateRequest(requestId,updates);
      if (response.status === 200) {
        setServiceRequests(prev => 
          prev.map(req => req._id === requestId ? { ...req, ...updates } : req)
        );
      }
      return response;
    } catch (error) {
      console.error('Error updating service request:', error);
      throw error;
    }
  };

  return (
    <ServiceRequestContext.Provider value={{
      serviceRequests,
      loading,
      loadServiceRequests,
      getServiceRequestDetails,
      deleteServiceRequest,
      updateServiceRequest,
    }}>
      {children}
    </ServiceRequestContext.Provider>
  );
};

export const useServiceRequest = () => {
  const context = useContext(ServiceRequestContext);
  if (!context) {
    throw new Error('useServiceRequest must be used within a ServiceRequestProvider');
  }
  return context;
};

export { ServiceRequestContext };