/**
 * Ant Design 静态方法桥接
 *
 * 在 Ant Design 5 中，message/notification/modal 的静态方法
 * 需要在 App 组件上下文中才能正常工作。
 * 此模块用于将 App.useApp() 获取的实例暴露给非组件代码（如 axios 拦截器）。
 */
import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';

let messageInstance: MessageInstance;
let notificationInstance: NotificationInstance;
let modalInstance: Omit<ModalStaticFunctions, 'warn'>;

/**
 * 由 AntdStaticProvider 组件调用，注册实例
 */
export const setAntdInstances = (
  msg: MessageInstance,
  ntf: NotificationInstance,
  mdl: Omit<ModalStaticFunctions, 'warn'>,
): void => {
  messageInstance = msg;
  notificationInstance = ntf;
  modalInstance = mdl;
};

export { messageInstance, notificationInstance, modalInstance };
