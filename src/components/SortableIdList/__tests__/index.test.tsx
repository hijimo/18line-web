/**
 * SortableIdList（当前为**无依赖降级版**：上移/下移按钮）。
 *
 * 覆盖两件事：
 * 1. `moveItem` 的顺序计算本体（含越界/同位等边界，错了就是"保存后景点顺序变了"）；
 * 2. 按钮的可用性边界（首项不能上移、末项不能下移）与 onReorder 回传的完整数组。
 *
 * ⚠️ 换成 @dnd-kit 后，第 1 组断言必须**原样保留**（顺序计算是本体，拖拽只是触发方式），
 *    第 2 组按拖拽交互重写。
 */

import { fireEvent, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { render } from '@/test-utils';
import SortableIdList, { moveItem } from '../index';

type Item = { id: number; name: string };

const items: Item[] = [
  { id: 1, name: '甲' },
  { id: 2, name: '乙' },
  { id: 3, name: '丙' },
];

describe('moveItem · 顺序计算', () => {
  it('向后移动一位', () => {
    expect(moveItem(items, 0, 1).map((i) => i.id)).toEqual([2, 1, 3]);
  });

  it('向前移动一位', () => {
    expect(moveItem(items, 2, 1).map((i) => i.id)).toEqual([1, 3, 2]);
  });

  it('跨多位移动（首项移到末尾）', () => {
    expect(moveItem(items, 0, 2).map((i) => i.id)).toEqual([2, 3, 1]);
  });

  it('同位移动返回等值新数组，且不修改入参', () => {
    const next = moveItem(items, 1, 1);
    expect(next.map((i) => i.id)).toEqual([1, 2, 3]);
    expect(next).not.toBe(items);
    expect(items.map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('越界下标不改变顺序（防御拖拽库回传脏 index）', () => {
    expect(moveItem(items, -1, 0).map((i) => i.id)).toEqual([1, 2, 3]);
    expect(moveItem(items, 0, 99).map((i) => i.id)).toEqual([1, 2, 3]);
    expect(moveItem(items, 99, 0).map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('空数组不抛错', () => {
    expect(moveItem([], 0, 1)).toEqual([]);
  });
});

describe('SortableIdList · 按钮交互', () => {
  const Harness: React.FC = () => {
    const [list, setList] = useState<Item[]>(items);
    return (
      <SortableIdList
        items={list}
        getKey={(item) => item.id}
        onReorder={setList}
        renderItem={(item) => <span>{item.name}</span>}
      />
    );
  };

  it('首项不可上移、末项不可下移', () => {
    render(<Harness />);
    expect(screen.getByLabelText('上移第1项')).toBeDisabled();
    expect(screen.getByLabelText('下移第3项')).toBeDisabled();
    expect(screen.getByLabelText('下移第1项')).toBeEnabled();
    expect(screen.getByLabelText('上移第3项')).toBeEnabled();
  });

  it('点「下移」后顺序立即生效（序号列跟着变）', () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText('下移第1项'));
    // 序号 1 的位置现在应该是「乙」
    const first = screen.getByTestId('sortable-item-0');
    expect(first.textContent).toContain('乙');
    expect(first.textContent).toContain('1');
  });

  it('把「甲」逐位下移到末尾后，末位的下移按钮自动禁用', () => {
    render(<Harness />);
    // aria-label 按**位置**编号，跟着项走：
    //   [甲,乙,丙] --下移第1项--> [乙,甲,丙] --下移第2项--> [乙,丙,甲]
    // 若两次都点「下移第1项」，只是在交换前两项（等于没动），这也是降级版必须测清的语义。
    fireEvent.click(screen.getByLabelText('下移第1项'));
    fireEvent.click(screen.getByLabelText('下移第2项'));
    const last = screen.getByTestId('sortable-item-2');
    expect(last.textContent).toContain('甲');
    expect(screen.getByLabelText('下移第3项')).toBeDisabled();
    expect(screen.getByLabelText('上移第3项')).toBeEnabled();
  });

  it('空列表显示占位文案而不是空白', () => {
    render(
      <SortableIdList
        items={[]}
        getKey={(i: Item) => i.id}
        onReorder={() => {}}
        renderItem={(i: Item) => <span>{i.name}</span>}
      />,
    );
    expect(screen.getByText('尚未添加景点')).toBeInTheDocument();
  });

  it('disabled 时上下移与移除全部禁用（只读视图不能改顺序）', () => {
    render(
      <SortableIdList
        items={items}
        getKey={(i) => i.id}
        onReorder={() => {}}
        onRemove={() => {}}
        disabled
        renderItem={(i) => <span>{i.name}</span>}
      />,
    );
    expect(screen.getByLabelText('下移第1项')).toBeDisabled();
    expect(screen.getByLabelText('上移第2项')).toBeDisabled();
    expect(screen.getByLabelText('移除第2项')).toBeDisabled();
  });
});
