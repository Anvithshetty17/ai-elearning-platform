import React, { createContext, useContext, useState } from 'react';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});

  // Set global loading state
  const setLoading = (isLoading) => {
    setGlobalLoading(isLoading);
  };

  // Set loading state for specific component/action
  const setComponentLoading = (key, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }));
  };

  // Check if specific component is loading
  const isComponentLoading = (key) => {
    return loadingStates[key] || false;
  };

  // Check if any component is loading
  const isAnyLoading = () => {
    return globalLoading || Object.values(loadingStates).some(Boolean);
  };

  const value = {
    globalLoading,
    loadingStates,
    setLoading,
    setComponentLoading,
    isComponentLoading,
    isAnyLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  
  return context;
};