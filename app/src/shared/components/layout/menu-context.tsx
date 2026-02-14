import React, { createContext, useContext, ReactNode } from 'react';

interface MenuContextType {
  onOpenMenu: () => void;
  onOpenUserMenu: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider = ({ 
  children, 
  onOpenMenu, 
  onOpenUserMenu 
}: { 
  children: ReactNode;
  onOpenMenu: () => void;
  onOpenUserMenu: () => void;
}) => {
  return (
    <MenuContext.Provider value={{ onOpenMenu, onOpenUserMenu }}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};

