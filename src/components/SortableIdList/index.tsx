/**
 * 可排序 ID 列表（达人路线「天内景点排序」用）。
 *
 * ## ⚠️ 当前是**无依赖降级版**（上移/下移按钮），待用户授权后替换为 @dnd-kit
 *
 * 设计文档 §7.2 要求用 `@dnd-kit/core` + `@dnd-kit/sortable` 做拖拽。实测本仓库状态：
 * - `package.json` 的 dependencies / devDependencies **都没有** `@dnd-kit/*`；
 * - `pnpm-lock.yaml` 里出现的 `@dnd-kit/core@6.3.1`、`@dnd-kit/sortable@7.0.2` 是
 *   `@ant-design/pro-components` 的**传递依赖**（lock 第 4689 行在 pro-components 的依赖块内），
 *   pnpm 严格 node_modules 布局下 `node_modules/@dnd-kit` 根本不存在（已 `ls` 验证），
 *   从 `src/` 里 import 不到；
 * - 擅自 `pnpm add @dnd-kit/core @dnd-kit/sortable` 会改 `pnpm-lock.yaml`，
 *   而 lockfile 是全仓库共享文件，本次任务明确不允许动。
 *
 * 所以按设计文档 §7.2 自己写好的**兜底路径**落地：「退化为上移/下移按钮 + arrayMove，
 * 零依赖、功能等价，只是点击次数多」。替换成 dnd-kit 时只需改本文件内部实现，
 * **props 契约保持不变**（`items` / `onReorder` / `renderItem`），页面层零改动。
 *
 * 替换时要一并处理 §7.2 记录的两个坑：
 * 1. `PointerSensor` 必须加 `activationConstraint: { distance: 5 }`，否则 Drawer 滚动/选字会打架；
 * 2. antd Drawer 有 `transform`，`DragOverlay` 默认挂 body 会定位错位，需真机验证拖拽跟随。
 */

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Empty, Space, Tooltip } from 'antd';
import React from 'react';

/**
 * 纯函数：把 items[from] 移到 to。
 * 单独导出是为了能被单测直接覆盖（拖拽/按钮只是触发方式，顺序计算才是本体）。
 */
export const moveItem = <T,>(items: T[], from: number, to: number): T[] => {
  if (from === to) return [...items];
  if (from < 0 || from >= items.length) return [...items];
  if (to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
};

export type SortableIdListProps<T> = {
  items: T[];
  /** 稳定 key（不要用 index，否则移除后 React 复用错节点，输入框内容会串位） */
  getKey: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 顺序变化（上移/下移）回调，参数是完整新数组 */
  onReorder: (nextItems: T[]) => void;
  onRemove?: (index: number) => void;
  disabled?: boolean;
  emptyText?: string;
};

const SortableIdListInner = <T,>({
  items,
  getKey,
  renderItem,
  onReorder,
  onRemove,
  disabled = false,
  emptyText = '尚未添加景点',
}: SortableIdListProps<T>) => {
  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;
  }

  const move = (index: number, offset: number) => {
    onReorder(moveItem(items, index, index + offset));
  };

  return (
    <div data-testid="sortable-id-list">
      {items.map((item, index) => (
        <Space
          key={getKey(item, index)}
          align="start"
          style={{ display: 'flex', marginBottom: 8 }}
          data-testid={`sortable-item-${index}`}
        >
          <span
            style={{
              display: 'inline-block',
              width: 24,
              lineHeight: '32px',
              textAlign: 'center',
              color: '#999',
            }}
          >
            {index + 1}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item, index)}</div>
          <Space size={0}>
            <Tooltip title="上移">
              <Button
                size="small"
                type="text"
                icon={<ArrowUpOutlined />}
                disabled={disabled || index === 0}
                aria-label={`上移第${index + 1}项`}
                onClick={() => move(index, -1)}
              />
            </Tooltip>
            <Tooltip title="下移">
              <Button
                size="small"
                type="text"
                icon={<ArrowDownOutlined />}
                disabled={disabled || index === items.length - 1}
                aria-label={`下移第${index + 1}项`}
                onClick={() => move(index, 1)}
              />
            </Tooltip>
            {onRemove ? (
              <Tooltip title="移除">
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={disabled}
                  aria-label={`移除第${index + 1}项`}
                  onClick={() => onRemove(index)}
                />
              </Tooltip>
            ) : null}
          </Space>
        </Space>
      ))}
    </div>
  );
};

/**
 * 泛型组件包一层 memo：`React.memo` 会吃掉泛型签名，
 * 所以按项目既有做法（`components/CommonTable/index.tsx`）显式 cast 回原类型。
 */
const SortableIdList = React.memo(SortableIdListInner) as typeof SortableIdListInner;

export default SortableIdList;
