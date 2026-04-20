import React, { useState, type ReactNode } from 'react';
import type { IThemedLayoutContext } from '../types';

/**
 * 主题布局上下文
 */
export const ThemedLayoutContext = React.createContext<IThemedLayoutContext>({
  siderCollapsed: false,
  mobileSiderOpen: false,
  setSiderCollapsed: () => undefined,
  setMobileSiderOpen: () => undefined,
});

/**
 * 主题布局上下文提供者属性
 */
interface ThemedLayoutContextProviderProps {
  children: ReactNode;
  initialSiderCollapsed?: boolean;
  onSiderCollapsed?: (collapsed: boolean) => void;
}

/**
 * 主题布局上下文提供者
 */
export const ThemedLayoutContextProvider: React.FC<ThemedLayoutContextProviderProps> = ({
  children,
  initialSiderCollapsed,
  onSiderCollapsed,
}) => {
  const [siderCollapsed, setSiderCollapsedState] = useState(initialSiderCollapsed ?? false);
  const [mobileSiderOpen, setMobileSiderOpen] = useState(false);

  const setSiderCollapsed = (collapsed: boolean) => {
    setSiderCollapsedState(collapsed);
    if (onSiderCollapsed) {
      onSiderCollapsed(collapsed);
    }
  };

  return (
    <ThemedLayoutContext.Provider
      value={{
        siderCollapsed,
        mobileSiderOpen,
        setSiderCollapsed,
        setMobileSiderOpen,
      }}
    >
      {children}
    </ThemedLayoutContext.Provider>
  );
};
