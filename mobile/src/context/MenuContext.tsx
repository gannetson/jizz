import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';

type MenuContextType = {
  openUserMenu: () => void;
  closeUserMenu: () => void;
  userMenuVisible: boolean;
  openLeftMenu: () => void;
  closeLeftMenu: () => void;
  leftMenuVisible: boolean;
  currentRouteName: string;
  setCurrentRouteName: (name: string) => void;
};

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [leftMenuVisible, setLeftMenuVisible] = useState(false);
  const [currentRouteName, setCurrentRouteName] = useState('Home');

  const openUserMenu = useCallback(() => setUserMenuVisible(true), []);
  const closeUserMenu = useCallback(() => setUserMenuVisible(false), []);
  const openLeftMenu = useCallback(() => setLeftMenuVisible(true), []);
  const closeLeftMenu = useCallback(() => setLeftMenuVisible(false), []);

  return (
    <MenuContext.Provider
      value={{
        openUserMenu,
        closeUserMenu,
        userMenuVisible,
        openLeftMenu,
        closeLeftMenu,
        leftMenuVisible,
        currentRouteName,
        setCurrentRouteName,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}
