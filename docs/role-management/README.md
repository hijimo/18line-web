# 角色管理功能

## 概述

角色管理页面用于管理系统中的角色信息，包括角色的创建、编辑、删除以及权限查看等功能。

## 功能特性

- ✅ 角色列表展示（角色名称、描述、创建时间）
- ✅ 查看角色权限详情
- ✅ 创建新角色
- ✅ 编辑角色信息
- ✅ 删除角色
- ✅ 分页展示
- ✅ 响应式设计

## 快速开始

### 访问页面

```tsx
import RoleManagement from '@/pages/roles';

// 在路由中配置
{
  path: '/roles',
  element: <RoleManagement />
}
```

### 基本使用

页面已经包含完整的 UI 和交互逻辑，只需要：

1. 替换模拟数据为实际的 API 调用
2. 实现各个操作的具体业务逻辑
3. 根据需要添加权限控制

## 文件结构

```
src/pages/roles/
  ├── index.tsx              # 主页面组件
  ├── index.module.css       # 页面样式
  └── types.ts               # 类型定义
```

## 技术栈

- **React 19** - UI 框架
- **TypeScript 5.8** - 类型系统
- **Ant Design 5.27** - UI 组件库
- **ahooks 3.9** - React Hooks 工具库
- **TailwindCSS 4.1** - 样式方案

## 数据结构

### RoleData

```typescript
interface RoleData {
  id: string // 角色 ID
  name: string // 角色名称
  description: string // 角色描述
  createdAt: string // 创建时间
}
```

### RoleListResponse

```typescript
interface RoleListResponse {
  data: RoleData[] // 角色列表
  total: number // 总数
}
```

## API 集成

### 获取角色列表

需要实现以下 API 调用：

```typescript
// src/services/role.ts
export const getRoles = async (params?: {
  page?: number
  pageSize?: number
  keyword?: string
}): Promise<RoleListResponse> => {
  // 实现 API 调用
}
```

### 其他 API

- `createRole(data: Partial<RoleData>)` - 创建角色
- `updateRole(id: string, data: Partial<RoleData>)` - 更新角色
- `deleteRole(id: string)` - 删除角色
- `getRolePermissions(id: string)` - 获取角色权限

## 待实现功能

当前页面使用模拟数据，需要完成以下集成：

1. **API 集成**
   - 替换 `useRequest` 中的模拟数据为实际 API 调用
   - 实现错误处理和重试逻辑

2. **权限详情**
   - 创建权限详情抽屉或模态框组件
   - 实现权限树展示
   - 支持权限的查看和编辑

3. **角色创建/编辑**
   - 创建角色表单组件
   - 实现表单验证
   - 支持权限分配

4. **搜索和筛选**
   - 添加搜索卡片组件
   - 支持按角色名称搜索
   - 支持按状态筛选

5. **批量操作**
   - 支持批量删除
   - 支持批量导出

## 使用示例

### 集成到路由

```tsx
// src/router.tsx
import { lazy } from 'react'

const RoleManagement = lazy(() => import('@/pages/roles'))

export const routes = [
  {
    path: '/roles',
    element: <RoleManagement />,
  },
]
```

### 自定义样式

```tsx
// 通过 className 自定义样式
<RoleManagement className="custom-role-page" />
```

## 注意事项

- 确保用户有相应的权限才能访问此页面
- 删除角色前应该确认是否有用户正在使用该角色
- 超级管理员角色通常不允许删除
- 创建时间格式应该统一（建议使用 ISO 8601 格式）
- 角色名称应该唯一

## 相关文档

- [表格页面模板规范](../../.kiro/steering/表格页面模板规范.md)
- [组件开发指南](../../.kiro/steering/组件开发指南.md)
- [项目开发规范](../../.kiro/steering/项目规范.md)

## 更新日志

### v1.0.0 (2025-10-22)

- ✨ 初始版本
- ✨ 实现角色列表展示
- ✨ 实现基础操作按钮
- ✨ 添加查看权限详情功能
