import { useAuthStore } from '@/stores/authStore';
import UserTable from './components/Table/UserTable';
import styles from './index.module.css';

/**
 * 用户管理主页面
 */
const UsersPage: React.FC = () => {
  // 获取当前用户信息
  const user = useAuthStore((state) => state.user);

  // 获取当前用户的 tenantId
  const tenantId = user?.tenantId;

  return <div className={styles.usersPage}>{tenantId && <UserTable tenantId={tenantId} />}</div>;
};

export default UsersPage;
