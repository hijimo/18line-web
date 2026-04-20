# Chat 页面图标更新

## 更新概述

将 `pages/chat` 目录下所有组件的图标从 `@ant-design/icons` 替换为 `lucide-react`，并优化了 SessionItem 的交互方式。

## 主要改动

### 1. SessionItem 组件

**交互优化：**

- 移除了 hover 显示的多个操作按钮
- 改为右上角固定显示 `MoreVertical` (三点) 图标
- 点击后显示下拉菜单，包含：置顶、归档、删除操作
- 删除操作保留了确认提示

**图标替换：**

- `PushpinFilled` / `PushpinOutlined` → `Pin` / `PinOff`
- `InboxOutlined` → `Archive`
- `DeleteOutlined` → `Trash2`
- `MoreVertical` (新增)

### 2. SessionList 组件

**图标替换：**

- `PlusOutlined` → `Plus`

### 3. ChatHeader 组件

**图标替换：**

- `MenuFoldOutlined` / `MenuUnfoldOutlined` → `X` / `Menu`
- `SettingOutlined` → `Settings`

### 4. ChatInput 组件

**图标替换：**

- `SendOutlined` → `Send`
- `StopOutlined` → `StopCircle`

### 5. ChatScrollButtons 组件

**图标替换：**

- `UpOutlined` → `ArrowUp`
- `DownOutlined` → `ArrowDown`

### 6. Message 组件

**图标替换：**

- `RobotOutlined` → `Bot`
- `UserOutlined` → `User`
- `CopyOutlined` → `Copy`
- `EditOutlined` → `Edit2`
- `DeleteOutlined` → `Trash2`

### 7. MessageCodeBlock 组件

**图标替换：**

- `CopyOutlined` → `Copy`
- `UpOutlined` / `DownOutlined` → `ChevronUp` / `ChevronDown`

### 8. StreamStatusIndicator 组件

**图标替换：**

- `ToolOutlined` → `Wrench`
- `SearchOutlined` → `Search`
- `BulbOutlined` → `Lightbulb`
- `LoadingOutlined` → `Loader2`

## 样式调整

### SessionItem.module.css

- 移除了 `.actions` 和 `.actionButton` 样式
- 新增 `.moreButton` 样式，包含：
  - 固定尺寸 24x24
  - hover 效果
  - 选中状态下的主题色适配

## 技术细节

### 图标尺寸统一

- 小图标（按钮内）：14-16px
- 中等图标（头像内）：18px
- 保持视觉一致性

### 下拉菜单配置

```tsx
const menuItems = [
  {
    key: 'pin',
    label: session.isPinned ? '取消置顶' : '置顶',
    icon: session.isPinned ? <PinOff size={16} /> : <Pin size={16} />,
    onClick: handlePin,
  },
  {
    key: 'archive',
    label: session.isArchived ? '取消归档' : '归档',
    icon: <Archive size={16} />,
    onClick: handleArchive,
  },
  {
    type: 'divider' as const,
  },
  {
    key: 'delete',
    label: '删除',
    icon: <Trash2 size={16} />,
    danger: true,
    onClick: handleDelete,
  },
];
```

## 优势

1. **视觉统一**：lucide-react 图标风格更现代、一致
2. **体积优化**：按需导入，减少打包体积
3. **交互优化**：SessionItem 的操作更简洁，避免视觉干扰
4. **易于维护**：统一的图标库，便于后续调整

## 兼容性

- 所有改动向后兼容
- 不影响现有功能
- 类型检查通过
