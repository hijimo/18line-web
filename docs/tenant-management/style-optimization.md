# 租户管理样式优化文档

## 概述

本文档描述了租户管理功能的样式优化实现，包括表格列宽度、长文本省略、滚动行为、抽屉组件样式和响应式布局等方面的优化。

## 优化内容

### 1. 表格列宽度优化

#### 列宽度配置

根据内容特点和显示需求，为每个列设置了合理的宽度：

- **租户名称**: 180px（固定在左侧，方便查看）
- **租户域名**: 220px
- **租户类型**: 120px
- **状态**: 100px
- **创建时间**: 180px
- **创建人**: 140px
- **操作列**: 160px（固定在右侧）

#### 实现位置

`src/configurify/columns/tenantColumns.tsx`

```typescript
export const tenantName: ProColumns<Tenant> = {
  title: '租户名称',
  dataIndex: 'name',
  width: 180,
  fixed: 'left', // 固定在左侧
  // ...
}
```

### 2. 长文本省略显示

#### 实现方式

使用 `ColumnEllipsisWrap` 组件包裹长文本内容，实现文本溢出时的省略显示：

```typescript
render: (_, record) => {
  if (!record.name) return <span>--</span>
  return (
    <ColumnEllipsisWrap width={160}>
      <span className="font-medium">{record.name}</span>
    </ColumnEllipsisWrap>
  )
}
```

#### 应用列

- 租户名称
- 租户域名
- 创建人

#### 样式实现

`src/components/CommonTable/ColumnEllipsisWrap.module.css`

```css
.wrap {
  word-wrap: break-word;
  word-break: break-all;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
```

### 3. 表格滚动行为配置

#### 水平滚动

设置最小宽度为 1200px，当表格宽度超过容器宽度时启用水平滚动：

```typescript
scroll={{ x: 1200, y: 'calc(100vh - 380px)' }}
```

#### 垂直滚动

设置表格高度为视口高度减去固定高度（380px），实现表格内容区域的垂直滚动：

- 表格头部固定
- 内容区域可滚动
- 分页器始终可见

#### 滚动条样式优化

`src/pages/tenants/components/Table/TenantTable/index.module.css`

```css
/* 滚动条样式优化 */
.tenantTable :global(.ant-table-body)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.tenantTable :global(.ant-table-body)::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.tenantTable :global(.ant-table-body)::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}
```

### 4. 抽屉组件样式优化

#### 创建租户抽屉

**样式文件**: `src/pages/tenants/components/Drawer/TenantCreateDrawer/index.module.css`

**优化内容**:

1. **表单布局**: 从水平布局改为垂直布局，提升移动端体验
2. **输入框样式**:
   - 统一使用 `large` 尺寸
   - 圆角边框（6px）
   - 聚焦时的阴影效果
3. **标签样式**: 使用 `font-medium` 增强视觉层次
4. **按钮样式**:
   - 全宽按钮
   - 高度 44px
   - 加载状态文本提示
5. **自动聚焦**: 第一个输入框自动获得焦点

#### 编辑租户抽屉

**样式文件**: `src/pages/tenants/components/Drawer/TenantEditDrawer/index.module.css`

**优化内容**:

1. **租户类型显示**: 使用徽章组件展示，只读不可编辑
2. **表单布局**: 垂直布局，字段间距合理
3. **单选按钮**: 圆角样式，间距优化
4. **元数据输入**: 使用等宽字体（`font-mono`）便于编辑 JSON

#### 通用优化

- **抽屉宽度**: 600px（移动端自适应为 100%）
- **遮罩层**: 不可点击关闭（`maskClosable={false}`）
- **销毁策略**: 关闭时销毁内容（`destroyOnClose`）
- **标题样式**: 大号字体（`text-lg`）+ 加粗（`font-semibold`）

### 5. 响应式布局

#### 移动端适配（≤768px）

**页面级别** (`src/pages/tenants/index.module.css`):

```css
@media (max-width: 768px) {
  .tenantsPage :global(.ant-pro-page-container-children-content) {
    padding: 16px; /* 减少内边距 */
  }

  /* 工具栏垂直排列 */
  .tenantsPage :global(.ant-pro-table-list-toolbar) {
    flex-direction: column;
    gap: 12px;
  }

  /* 按钮全宽显示 */
  .tenantsPage :global(.ant-pro-table-list-toolbar-right button) {
    width: 100%;
  }
}
```

**表格级别** (`src/pages/tenants/components/Table/TenantTable/index.module.css`):

```css
@media (max-width: 768px) {
  .tenantTable :global(.ant-table-cell) {
    padding: 8px 12px !important;
    font-size: 14px;
  }
}
```

**抽屉级别**:

```css
@media (max-width: 768px) {
  .createDrawer :global(.ant-drawer) {
    width: 100% !important; /* 全屏显示 */
  }

  .createDrawer :global(.ant-drawer-body) {
    padding: 16px; /* 减少内边距 */
  }
}
```

#### 平板适配（769px - 1024px）

- 适度调整内边距
- 保持表格列宽度
- 优化字体大小

#### 桌面适配（≥1025px）

- 完整显示所有列
- 标准内边距（24px）
- 最佳视觉效果

## 视觉增强

### 1. 颜色语义化

- **租户域名**: 蓝色文本（`text-blue-600`）
- **空值**: 灰色文本（`text-gray-400`）
- **删除操作**: 红色文本（`text-red-500`）
- **租户名称**: 加粗显示（`font-medium`）

### 2. 交互反馈

**表格行悬停**:

```css
.tenantTable :global(.ant-table-tbody > tr:hover > td) {
  background-color: #f5f7fa !important;
  transition: background-color 0.2s ease;
}
```

**链接悬停**:

```css
.tenantTable :global(.ant-table-cell) a:hover {
  opacity: 0.8;
}
```

**输入框聚焦**:

```css
.createDrawer :global(.ant-input:focus) {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}
```

### 3. 分页器优化

```typescript
pagination={{
  defaultPageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条记录`,
  pageSizeOptions: ['10', '20', '50', '100'],
}}
```

## 性能优化

### 1. CSS Modules

使用 CSS Modules 避免样式冲突，提升样式隔离性：

- `index.module.css` - 页面级样式
- `TenantTable/index.module.css` - 表格样式
- `TenantCreateDrawer/index.module.css` - 创建抽屉样式
- `TenantEditDrawer/index.module.css` - 编辑抽屉样式

### 2. 样式复用

通过 TailwindCSS 工具类实现样式复用，减少 CSS 代码量：

```typescript
<span className="text-lg font-semibold">创建租户</span>
<Input className="font-mono text-sm" />
```

### 3. 条件渲染

对于空值使用简单的文本渲染，避免不必要的组件包裹：

```typescript
if (!record.domain) return <span className="text-gray-400">--</span>
```

## 可访问性

### 1. 键盘导航

- 表单输入框支持 Tab 键切换
- 第一个输入框自动聚焦（`autoFocus`）
- 按钮支持 Enter 键提交

### 2. 语义化标签

- 使用 `<span>` 标签包裹文本内容
- 使用 `font-medium` 增强标签可读性
- 使用 Badge 组件展示状态信息

### 3. 提示信息

- 表单字段提供 `tooltip` 提示
- 分页器显示总记录数
- 加载状态显示文本提示

## 浏览器兼容性

### 支持的浏览器

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 滚动条样式

使用 `-webkit-scrollbar` 伪元素，仅支持 WebKit 内核浏览器。其他浏览器使用默认滚动条样式。

## 维护建议

### 1. 样式文件组织

- 保持样式文件与组件文件在同一目录
- 使用 CSS Modules 避免全局污染
- 通用样式使用 TailwindCSS 工具类

### 2. 响应式断点

统一使用以下断点：

- 移动端: `max-width: 768px`
- 平板: `min-width: 769px and max-width: 1024px`
- 桌面: `min-width: 1025px`

### 3. 颜色规范

- 主色: `#1890ff`
- 成功: `#52c41a`
- 警告: `#faad14`
- 错误: `#ff4d4f`
- 文本: `#1f2937`
- 次要文本: `#6b7280`
- 边框: `#f0f0f0`

## 总结

通过以上优化，租户管理功能在以下方面得到了显著提升：

1. **视觉体验**: 合理的列宽、清晰的文本层次、统一的颜色语义
2. **交互体验**: 流畅的悬停效果、友好的加载提示、便捷的键盘导航
3. **响应式**: 完善的移动端适配、灵活的布局调整
4. **性能**: CSS Modules 隔离、样式复用、条件渲染优化
5. **可维护性**: 清晰的文件组织、统一的样式规范、完善的文档

这些优化确保了租户管理功能在不同设备和屏幕尺寸下都能提供一致、流畅的用户体验。
