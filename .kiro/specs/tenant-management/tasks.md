# 租户管理实现任务清单

## 任务列表

- [x] 1. 创建表格列定义配置
  - 在 `src/configurify/columns/` 目录下创建 `tenantColumns.tsx` 文件
  - 定义租户名称、租户域名、租户类型、租户状态、创建时间等列
  - 使用 `baseColumns.tsx` 中的通用列定义（如创建时间、操作列）
  - 实现租户类型的标签渲染（平台租户/业务租户）
  - 实现租户状态的徽章渲染（启用/禁用）
  - 配置搜索表单项（租户名称搜索、类型筛选、状态筛选）
  - _需求: 1.1, 1.2, 2.1, 2.2, 2.3, 6.1, 6.2, 7.1, 7.2, 7.3_

- [x] 2. 实现创建租户抽屉组件
  - 创建 `src/pages/tenants/components/Drawer/TenantCreateDrawer/index.tsx` 文件
  - 参考模板实现抽屉组件结构（使用 forwardRef 和 useImperativeHandle）
  - 实现表单字段：租户名称（必填）、租户域名（可选）、元数据（可选）
  - 配置表单验证规则（租户名称 1-255 字符，域名最多 255 字符）
  - 使用 React Query 的 useMutation 处理创建请求
  - 实现成功/失败提示和抽屉关闭逻辑
  - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3. 实现编辑租户抽屉组件
  - 创建 `src/pages/tenants/components/Drawer/TenantEditDrawer/index.tsx` 文件
  - 参考模板实现抽屉组件结构
  - 实现表单字段：租户名称、租户域名、状态、元数据（均为可选）
  - 实现表单数据预填充逻辑
  - 配置表单验证规则
  - 使用 React Query 的 useMutation 处理更新请求
  - 实现成功/失败提示和抽屉关闭逻辑
  - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 4. 实现租户表格组件
  - 创建 `src/pages/tenants/components/Table/TenantTable/index.tsx` 文件
  - 参考模板使用 CommonTable 组件
  - 配置表格列（使用步骤 1 创建的列定义）
  - 实现数据请求逻辑（使用 React Query 和 getTenants API）
  - 实现分页功能
  - 实现搜索和筛选功能（租户名称、类型、状态）
  - 实现操作菜单（编辑、删除按钮）
  - 实现删除确认对话框
  - 集成创建和编辑抽屉组件
  - 实现表格刷新逻辑
  - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.1, 10.2, 10.3, 10.4_

- [x] 5. 实现租户管理主页面
  - 创建 `src/pages/tenants/index.tsx` 文件
  - 使用 PageContainer 组件包裹
  - 渲染租户表格组件
  - 配置页面标题和面包屑
  - _需求: 1.1_

- [x] 6. 配置路由
  - 在 `src/router.tsx` 中添加租户管理路由
  - 配置路径为 `/tenants`
  - 使用 Layout 包裹租户管理页面
  - _需求: 1.1_

- [x] 7. 实现错误处理
  - 在表格组件中实现 API 错误处理
  - 在抽屉组件中实现表单验证错误显示
  - 实现网络错误、权限错误的友好提示
  - 在控制台记录详细错误信息
  - _需求: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8. 实现类型定义
  - 创建 `src/pages/tenants/types.ts` 文件
  - 定义表格组件的 Props 类型
  - 定义抽屉组件的 Ref 类型
  - 定义表单数据类型
  - _需求: 所有需求_

- [x] 9. 样式优化
  - 确保表格列宽度合理
  - 实现长文本省略显示
  - 配置表格滚动行为
  - 优化抽屉组件样式
  - 确保响应式布局
  - _需求: 9.1, 9.2, 9.3, 9.4, 9.5_

## 实现说明

### 技术要点

1. **表格列定义**: 参考 `baseColumns.tsx` 和 `jobsColumns.tsx` 模板，使用 ProColumns 类型定义
2. **抽屉组件**: 参考 `AccountCreateDrawer` 模板，使用 forwardRef 和 useImperativeHandle 暴露方法
3. **表格组件**: 参考 `HistoryTable` 模板，使用 CommonTable 和 React Query
4. **主页面**: 参考 `singleTable/index.tsx` 模板，使用 PageContainer 包裹

### API 集成

- 使用 `getTenantManagement()` 获取 API 方法
- 使用 React Query 的 `useQuery` 处理列表查询
- 使用 React Query 的 `useMutation` 处理创建、更新、删除操作

### 数据流

1. 表格组件通过 useQuery 获取租户列表
2. 点击创建按钮打开创建抽屉
3. 点击编辑按钮打开编辑抽屉并预填充数据
4. 点击删除按钮显示确认对话框
5. 操作成功后刷新表格数据

### 注意事项

- 所有用户可见文本使用中文
- 代码注释使用中文
- 确保类型安全，避免使用 any
- 遵循项目的代码规范和命名约定
- 使用 TailwindCSS 工具类进行样式定制
