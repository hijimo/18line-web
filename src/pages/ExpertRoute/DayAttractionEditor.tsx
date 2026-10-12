/**
 * 单天的景点编排：**选择（公共 + 私域）→ 排序 → 逐个填达人讲解**。
 *
 * 受控组件（value/onChange），交给外层 `Form.Item name={[field.name, 'attractions']}` 托管，
 * 这样「一天的景点」在 Form 里就是一个字段，不用嵌套 Form.List（嵌套 List 的
 * name 路径在 antd 5 里极易写错，且删除一天时残留字段会串位）。
 *
 * 排序控件是 `components/SortableIdList`，当前为**无依赖降级版**（上移/下移按钮）；
 * 替换成 @dnd-kit 时本文件零改动，详见该组件文件头。
 */

import { Alert, Input, Space, Tag, Typography } from 'antd';
import React from 'react';
import ExpertAttractionSelect from '@/components/DataSelect/ExpertAttractionSelect';
import type { ExpertAttractionRef } from '@/components/DataSelect/ExpertAttractionSelect';
import SortableIdList from '@/components/SortableIdList';
import { BlindStatusEnum } from '@/enums';
import { MAX_DAY_ATTRACTION_COUNT } from '@/enums/expert';
import { collectBlindHints } from './payload';
import type { ExpertRouteAttractionFormItem } from './payload';

type DayAttractionEditorProps = {
  value?: ExpertRouteAttractionFormItem[];
  onChange?: (next: ExpertRouteAttractionFormItem[]) => void;
  disabled?: boolean;
};

export const DayAttractionEditor: React.FC<DayAttractionEditorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const items = value ?? [];

  const refs: ExpertAttractionRef[] = items.map((item) => ({
    attractionId: item.attractionId,
    attractionName: item.attractionName,
    ownerUserId: item.ownerUserId ?? null,
    ownerAuditStatus: item.ownerAuditStatus ?? null,
    blindStatus: item.blindStatus ?? null,
  }));

  /** 选择变化：以新选择结果为准，但**保留已填写的讲解**（否则调一次顺序/加一个景点就清空所有文案） */
  const handleSelectChange = (next: ExpertAttractionRef[]) => {
    const merged = next.map((ref) => {
      const prev = items.find((i) => i.attractionId === ref.attractionId);
      return { ...ref, expertIntro: prev?.expertIntro ?? '' };
    });
    onChange?.(merged);
  };

  const handleReorder = (next: ExpertRouteAttractionFormItem[]) => onChange?.(next);

  const handleIntroChange = (index: number, text: string) => {
    const next = items.map((item, i) => (i === index ? { ...item, expertIntro: text } : item));
    onChange?.(next);
  };

  const handleRemove = (index: number) => {
    onChange?.(items.filter((_, i) => i !== index));
  };

  const hints = collectBlindHints([{ attractions: items }]);

  return (
    <div>
      <ExpertAttractionSelect
        value={refs}
        onChange={handleSelectChange}
        disabled={disabled}
        maxCount={MAX_DAY_ATTRACTION_COUNT}
      />
      <Typography.Text type="secondary" style={{ display: 'block', margin: '4px 0 8px' }}>
        已选 {items.length} / {MAX_DAY_ATTRACTION_COUNT} 个；顺序即用户创建行程后的游览顺序。
      </Typography.Text>

      {hints.map((hint) => (
        <Alert
          key={`${hint.level}-${hint.text}`}
          type={hint.level}
          showIcon
          message={hint.text}
          style={{ marginBottom: 8 }}
        />
      ))}

      <SortableIdList
        items={items}
        disabled={disabled}
        getKey={(item) => item.attractionId}
        onReorder={handleReorder}
        onRemove={handleRemove}
        renderItem={(item, index) => (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space size={4} wrap>
              <Typography.Text strong>
                {item.attractionName ?? `#${item.attractionId}`}
              </Typography.Text>
              {item.ownerUserId ? <Tag color="purple">私域</Tag> : <Tag>公共</Tag>}
              {item.blindStatus === BlindStatusEnum.YES ? <Tag color="orange">全盲</Tag> : null}
            </Space>
            <Input.TextArea
              rows={2}
              maxLength={2000}
              showCount
              disabled={disabled}
              value={item.expertIntro ?? ''}
              placeholder="达人讲解（会展示给用户；全盲景点请勿写出景点名与具体位置）"
              aria-label={`第${index + 1}个景点的达人讲解`}
              onChange={(e) => handleIntroChange(index, e.target.value)}
            />
          </Space>
        )}
      />
    </div>
  );
};

export default DayAttractionEditor;
