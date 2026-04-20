import { useContext } from 'react';
import { ThemedLayoutContext } from '../context/ThemedLayoutContext';

/**
 * 使用主题布局上下文的 Hook
 * @returns 主题布局上下文
 */
export const useThemedLayoutContext = () => {
  const context = useContext(ThemedLayoutContext);

  if (!context) {
    throw new Error('useThemedLayoutContext must be used within ThemedLayoutContextProvider');
  }

  return context;
};
