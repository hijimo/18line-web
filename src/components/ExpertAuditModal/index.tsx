/**
 * 达人路线审核弹窗（A2 `PUT /travel18/expertRoute/audit`）。
 *
 * 抽成公共组件是因为**两个入口**要用同一套逻辑：
 * - `pages/ExpertRoute`（列表行内「审核」，admin 才可见）
 * - `pages/ExpertRouteAudit`（待审列表页，menu 2230）
 * 两处若各写一份，迟早出现「一个页面拒绝可以不填意见、另一个必填」这种口径漂移。
 *
 * ⚠️ 资金相关：`audit_status='1'` 是下单闸门 G2 的必要条件（另需 status='0' 上架 +
 *    reward_enabled='1'）。审核通过 = 这条路线开始能收真钱，所以：
 * - **拒绝必须填意见**（服务层也校验，前端先拦一道，避免用户白等一次网络往返）；
 * - 通过时不强制填意见，但会把上一次的拒绝意见显示出来，避免"改了没改看不出来"。
 *
 * ⚠️ 权限串是 `travel18:expertRouteAudit:audit`（menu_id=2232），
 *    不是契约文档 §2 表格里的 `:edit` —— 以 SQL 为准，已同步给后端。
 */

import { Alert, Form, Input, message, Modal, Radio, Space, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { ExpertAuditStatusLabel } from '@/enums';
import { auditExpertRoute } from '@/services/expert';
import type { ExpertRoute } from '@/types/expert';

export type ExpertAuditModalProps = {
  /** null = 关闭 */
  route: ExpertRoute | null;
  /**
   * 入口预设：审核页的「通过」「拒绝」是两个独立按钮，点哪个就该预选哪个。
   * 不传时按当前 auditStatus 推断（已拒绝的重新审核默认仍是拒绝，防误放）。
   */
  initialDecision?: '1' | '2';
  onClose: () => void;
  onAudited: () => void;
};

type AuditFormValues = {
  auditStatus: '1' | '2';
  auditRemark?: string;
};

export const ExpertAuditModal: React.FC<ExpertAuditModalProps> = ({
  route,
  initialDecision,
  onClose,
  onAudited,
}) => {
  const [form] = Form.useForm<AuditFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const auditStatus = Form.useWatch('auditStatus', form);

  useEffect(() => {
    if (!route) return;
    // 待审默认「通过」；已拒绝的重新审核时默认「拒绝」，避免误点提交把该拒的放过去
    const decision = initialDecision ?? (route.auditStatus === '2' ? '2' : '1');
    form.setFieldsValue({
      auditStatus: decision,
      auditRemark: decision === '2' ? (route.auditRemark ?? '') : '',
    });
  }, [route, initialDecision, form]);

  const handleOk = async () => {
    if (!route) return;
    let values: AuditFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    try {
      await auditExpertRoute({
        routeId: route.routeId,
        auditStatus: values.auditStatus,
        auditRemark: values.auditRemark?.trim() || null,
      });
      message.success(values.auditStatus === '1' ? '已通过审核' : '已拒绝');
      onAudited();
      onClose();
    } catch {
      // 拦截器已提示
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="达人路线审核"
      open={!!route}
      onCancel={onClose}
      onOk={handleOk}
      okText="提交审核结果"
      confirmLoading={submitting}
      destroyOnClose
      width={560}
    >
      {route ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message="审核通过即代表该路线可被用户鼓励（收真钱）"
            description="闸门 G2 需要「审核通过 + 上架 + 开放鼓励」三者同时成立；若该达人还未绑定入驻商家，即使审核通过，下单也会被 G4 拒绝。"
          />
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            <Space direction="vertical" size={2}>
              <span>
                路线：<strong>{route.routeTitle}</strong>（ID {route.routeId}）
              </span>
              <span>达人：{route.authorNickname ?? `#${route.authorUserId ?? '--'}`}</span>
              <span>
                当前状态：
                {ExpertAuditStatusLabel[route.auditStatus as keyof typeof ExpertAuditStatusLabel] ??
                  route.auditStatus ??
                  '--'}
                {route.dayCount != null ? ` ｜ ${route.dayCount} 天` : ''}
                {route.attractionCount != null ? ` ｜ ${route.attractionCount} 个景点` : ''}
              </span>
              {route.auditRemark ? (
                <Typography.Text type="secondary">
                  上次审核意见：{route.auditRemark}
                </Typography.Text>
              ) : null}
            </Space>
          </Typography.Paragraph>

          <Form form={form} layout="vertical">
            <Form.Item name="auditStatus" label="审核结果" rules={[{ required: true }]}>
              <Radio.Group
                options={[
                  { label: '通过', value: '1' },
                  { label: '拒绝', value: '2' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="auditRemark"
              label="审核意见"
              rules={
                auditStatus === '2'
                  ? [
                      { required: true, message: '拒绝时必须填写审核意见' },
                      { max: 500, message: '审核意见不能超过500个字符' },
                    ]
                  : [{ max: 500, message: '审核意见不能超过500个字符' }]
              }
              extra={auditStatus === '2' ? '拒绝意见会展示给达人，请写清可执行的修改点' : undefined}
            >
              <Input.TextArea rows={3} maxLength={500} showCount placeholder="请输入审核意见" />
            </Form.Item>
          </Form>
        </Space>
      ) : null}
    </Modal>
  );
};

export default ExpertAuditModal;
