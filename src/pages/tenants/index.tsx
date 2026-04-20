import { PageContainer } from '@ant-design/pro-components';
import React from 'react';
import TenantTable from './components/Table/TenantTable';
import styles from './index.module.css';

/**
 * 租户管理主页面
 * 提供租户的查看、创建、编辑和删除功能
 */
const TenantsPage: React.FC = () => {
  return (
    <div className={styles.tenantsPage}>
      <TenantTable />
    </div>
  );
};

export default TenantsPage;
