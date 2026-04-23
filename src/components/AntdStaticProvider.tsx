/**
 * 将 antd App.useApp() 的实例注册到全局，供非组件代码使用
 */
import { App } from 'antd';
import { useEffect } from 'react';
import { setAntdInstances } from '@/utils/antdStatic';

export const AntdStaticProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { message, notification, modal } = App.useApp();

  useEffect(() => {
    setAntdInstances(message, notification, modal);
  }, [message, notification, modal]);

  return <>{children}</>;
};
