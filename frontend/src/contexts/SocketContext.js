import React, { createContext, useContext, useEffect, useState } from 'react';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Mock socket for now - WebSocket functionality disabled
    console.log('Socket functionality temporarily disabled');
    setConnected(false);
    setSocket(null);
  }, []);

  const joinOPD = (opdType) => {
    // WebSocket functionality disabled
    console.log('joinOPD called but WebSocket disabled');
  };

  const leaveOPD = (opdType) => {
    // WebSocket functionality disabled
    console.log('leaveOPD called but WebSocket disabled');
  };

  const joinDisplay = () => {
    // WebSocket functionality disabled
    console.log('joinDisplay called but WebSocket disabled');
  };

  const leaveDisplay = () => {
    // WebSocket functionality disabled
    console.log('leaveDisplay called but WebSocket disabled');
  };

  const onQueueUpdate = (callback) => {
    // WebSocket functionality disabled
    console.log('onQueueUpdate called but WebSocket disabled');
  };

  const onPatientStatusUpdate = (callback) => {
    // WebSocket functionality disabled
    console.log('onPatientStatusUpdate called but WebSocket disabled');
  };

  const onDisplayUpdate = (callback) => {
    // WebSocket functionality disabled
    console.log('onDisplayUpdate called but WebSocket disabled');
  };

  const onPatientReferral = (callback) => {
    // WebSocket functionality disabled
    console.log('onPatientReferral called but WebSocket disabled');
  };

  const removeAllListeners = () => {
    // WebSocket functionality disabled
    console.log('removeAllListeners called but WebSocket disabled');
  };

  const value = {
    socket,
    connected,
    joinOPD,
    leaveOPD,
    joinDisplay,
    leaveDisplay,
    onQueueUpdate,
    onPatientStatusUpdate,
    onDisplayUpdate,
    onPatientReferral,
    removeAllListeners,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

