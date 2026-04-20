import { Drawer } from 'antd';
import { forwardRef, useImperativeHandle, useState } from 'react';
import UserTable from '@/pages/users/components/Table/UserTable';
import styles from './index.module.css';

/**
 * 租户用户抽屉引用接口
 */
export interface TenantsUserDrawerRef {
  open: (tenantId: string) => void;
  close: () => void;
}

type TenantsUserDrawerProps = {
  // 预留扩展属性
};

/**
 * 租户用户管理抽屉
 * 用于在租户管理页面中查看和管理特定租户的用户
 */
const TenantsUserDrawer = forwardRef<TenantsUserDrawerRef, TenantsUserDrawerProps>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');

  useImperativeHandle(ref, () => ({
    open: (id: string) => {
      setTenantId(id);
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
      setTenantId('');
    },
  }));

  return (
    <Drawer
      className={styles.tenantsUserDrawer}
      title={<span className="text-lg font-semibold">租户用户管理</span>}
      open={isOpen}
      onClose={() => {
        setIsOpen(false);
        setTenantId('');
      }}
      width="90%"
      styles={{
        body: {
          padding: '24px',
          paddingTop: '16px',
        },
      }}
      destroyOnClose
      maskClosable={false}
    >
      {isOpen && tenantId && <UserTable tenantId={tenantId} />}
    </Drawer>
  );
});

TenantsUserDrawer.displayName = 'TenantsUserDrawer';

export default TenantsUserDrawer;
