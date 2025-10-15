import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../apiClient';

const OPDContext = createContext();

export const useOPD = () => {
  const context = useContext(OPDContext);
  if (!context) {
    throw new Error('useOPD must be used within an OPDProvider');
  }
  return context;
};

export const OPDProvider = ({ children }) => {
  const [opds, setOpds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOPDs = async () => {
    try {
      setLoading(true);
      console.log('Fetching OPDs from backend...');
      const response = await apiClient.get('/opd-management/public');
      console.log('OPDs fetched:', response.data);
      setOpds(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch OPDs:', err);
      setError(err.response?.data?.detail || 'Failed to fetch OPDs');
    } finally {
      setLoading(false);
    }
  };

  const createOPD = async (opdData) => {
    try {
      const response = await apiClient.post('/opd-management/', opdData);
      setOpds(prev => [...prev, response.data]);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Failed to create OPD:', err);
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Failed to create OPD' 
      };
    }
  };

  const updateOPD = async (opdId, opdData) => {
    try {
      const response = await apiClient.put(`/opd-management/${opdId}`, opdData);
      setOpds(prev => prev.map(opd => opd.id === opdId ? response.data : opd));
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Failed to update OPD:', err);
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Failed to update OPD' 
      };
    }
  };

  const deleteOPD = async (opdId) => {
    try {
      await apiClient.delete(`/opd-management/${opdId}`);
      setOpds(prev => prev.map(opd => 
        opd.id === opdId ? { ...opd, is_active: false } : opd
      ));
      return { success: true };
    } catch (err) {
      console.error('Failed to delete OPD:', err);
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Failed to delete OPD' 
      };
    }
  };

  const activateOPD = async (opdId) => {
    try {
      await apiClient.post(`/opd-management/${opdId}/activate`);
      setOpds(prev => prev.map(opd => 
        opd.id === opdId ? { ...opd, is_active: true } : opd
      ));
      return { success: true };
    } catch (err) {
      console.error('Failed to activate OPD:', err);
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Failed to activate OPD' 
      };
    }
  };

  const getActiveOPDs = () => {
    return opds.filter(opd => opd.is_active);
  };

  const getOPDByCode = (opdCode) => {
    return opds.find(opd => opd.opd_code === opdCode);
  };

  useEffect(() => {
    fetchOPDs();
  }, []);

  const value = {
    opds,
    activeOPDs: getActiveOPDs(),
    loading,
    error,
    fetchOPDs,
    createOPD,
    updateOPD,
    deleteOPD,
    activateOPD,
    getOPDByCode,
  };

  return (
    <OPDContext.Provider value={value}>
      {children}
    </OPDContext.Provider>
  );
};
