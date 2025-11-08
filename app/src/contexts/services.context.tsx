// Services Context - Provides dependency injection for services
import React, { createContext, useContext, ReactNode } from 'react';
import { Services, services } from '../api/services';

const ServicesContext = createContext<Services>(services);

export interface ServicesProviderProps {
  children: ReactNode;
  services?: Services;
}

export function ServicesProvider({ children, services: providedServices = services }: ServicesProviderProps) {
  return (
    <ServicesContext.Provider value={providedServices}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): Services {
  return useContext(ServicesContext);
}

export { ServicesContext };

