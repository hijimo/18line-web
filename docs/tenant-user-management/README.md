# 租户用户管理功能

## 概述

本功能允许在租户管理页面中直接查看和管理特定租户下的用户，通过抽屉组件提供便捷的用户管理界面。

## 功能特性

- 在租户列表中添加"管理用户"操作按钮
- 通过抽屉组件展示特定租户的用户列表
- 支持在租户用户列表中创建、编辑、删除用户
- 创建用户时自动填充租户 ID
- 用户列表自动按租户 ID 筛选

## 技术实现

### 1. UserTable 组件增强

**文件**: `src/pages/users/components/Table/UserTable/index.tsx`

**改动**:

- 添加 `tenantId` props，支持按租户筛选用户
- 创建用户时将 `tenantId` 传递给创建抽屉作为默认值
- 使用 `useTableRequest` hook 的默认参数功能设置初始筛选条件

```tsx
interface UserTableProps {
  tenantId?: string;
}

const UserTable: React.FC<UserTableProps> = ({ tenantId }) => {
  // 表格数据请求时自动添加 tenantId 筛选条件
  const fetchData = useTableRequest(
    getUsers,
    tenantId ? { tenantId } : undefined,
  );

  // 创建用户时传入 tenantId
  const handleCreate = useCallback(() => {
    createDrawerRef.current?.open(tenantId);
  }, [tenantId]);
};
```

### 2. UserCreateDrawer 组件增强

**文件**: `src/pages/users/components/Drawer/UserCreateDrawer/index.tsx`

**改动**:

- `open` 方法接收可选的 `tenantId` 参数
- 打开抽屉时自动设置租户 ID 为表单默认值

```tsx
interface UserCreateDrawerRef {
  open: (tenantId?: string) => void;
  close: () => void;
}

useImperativeHandle(ref, () => ({
  open: (tenantId?: string) => {
    setIsOpen(true);
    setTimeout(() => {
      form.resetFields();
      if (tenantId) {
        form.setFieldsValue({ tenantId });
      }
    }, 100);
  },
}));
```

### 3. TenantsUserDrawer 组件

**文件**: `src/pages/tenants/components/Drawer/TenantsUserDrawer/index.tsx`

**新增组件**，用于在租户管理页面中展示用户管理界面。

**特性**:

- 使用 `useImperativeHandle` 暴露 `open` 和 `close` 方法
- `open` 方法接收 `tenantId` 参数
- 内部渲染 `UserTable` 组件并传入 `tenantId`
- 使用大尺寸抽屉（90% 宽度）以提供足够的操作空间

```tsx
interface TenantsUserDrawerRef {
  open: (tenantId: string) => void;
  close: () => void;
}

const TenantsUserDrawer = forwardRef<TenantsUserDrawerRef>((props, ref) => {
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
    <Drawer width="90%">
      {isOpen && tenantId && <UserTable tenantId={tenantId} />}
    </Drawer>
  );
});
```

### 4. TenantTable 组件集成

**文件**: `src/pages/tenants/components/Table/TenantTable/index.tsx`

**改动**:

- 引入 `TenantsUserDrawer` 组件
- 在操作列中添加"管理用户"按钮
- 实现 `handleManageUsers` 方法打开用户管理抽屉

```tsx
const TenantTable: React.FC<TenantTableProps> = () => {
  const userDrawerRef = useRef<TenantsUserDrawerRef>(null);

  const handleManageUsers = useCallback((tenantId: string | undefined) => {
    if (!tenantId) {
      message.error('租户 ID 不存在');
      return;
    }
    userDrawerRef.current?.open(tenantId);
  }, []);

  // 在操作列中添加"管理用户"按钮
  return (
    <>
      <CommonTable columns={columns} />
      <TenantsUserDrawer ref={userDrawerRef} />
    </>
  );
};
```

### 5. useTableRequest Hook 增强

**文件**: `src/hooks/useTableRequest.ts`

**改动**:

- 添加 `defaultParams` 参数支持默认查询条件
- 在请求时自动合并默认参数

```tsx
export const useTableRequest = (
  dataLoader?: (params: DataLoaderParams) => Promise<ResponsePaginationData>,
  defaultParams?: Record<string, unknown>,
  getParams?: (params: Record<string, unknown>) => Record<string, unknown>,
  transform?: (result: ResponsePaginationData) => unknown,
) => {
  const request = useCallback(
    async (params, sort) => {
      const newParams = {
        ...params,
        ...defaultParams, // 合并默认参数
        ...getParams?.(params),
      };
      // ...
    },
    [dataLoader, defaultParams, getParams, transform],
  );
  return request;
};
```

## 使用方式

### 在租户管理页面

1. 打开租户管理页面
2. 在租户列表的操作列中点击"管理用户"按钮
3. 在弹出的抽屉中查看和管理该租户的用户
4. 创建新用户时，租户 ID 会自动填充

### 在用户管理页面

用户管理页面保持原有功能不变，可以查看和管理所有用户。

## 注意事项

- 租户管理员只能看到自己租户下的用户
- 平台管理员可以看到所有租户的用户
- 创建用户时，如果指定了租户 ID，该字段会作为表单默认值
- 抽屉使用 `destroyOnClose` 确保每次打开都是全新状态

## 相关文件

- `src/pages/users/components/Table/UserTable/index.tsx` - 用户表格组件
- `src/pages/users/components/Drawer/UserCreateDrawer/index.tsx` - 创建用户抽屉
- `src/pages/users/types.ts` - 用户相关类型定义
- `src/pages/tenants/components/Drawer/TenantsUserDrawer/index.tsx` - 租户用户管理抽屉
- `src/pages/tenants/components/Table/TenantTable/index.tsx` - 租户表格组件
- `src/hooks/useTableRequest.ts` - 表格请求 Hook
