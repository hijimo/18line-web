/**
 * 达人 ↔ 入驻商家绑定管理（menu 2240，仅 admin；`travel18:merchantExpert:*`）。
 *
 * 为什么绑定关系是资金语义而不是一条普通关联：
 * - 收款主体**始终是入驻商家**（设计文档 D1），达人挂在商家下，平台才能按商家出对账单；
 * - 绑定是**下单闸门 G4** 的数据源：达人没有生效绑定 → C 端 `rewardAvailable=false`、
 *   后端拒单「达人未完成商家绑定，暂不支持鼓励」。
 *   → 产品后果必须知道：**路线可以审核通过并展示，但没绑商家就收不到钱**；
 * - 解绑会**立即**让该达人新产生的鼓励单失去收款主体，所以二次确认文案里写清了
 *   「已产生的订单仍归原商户（下单时快照 merchant_id）」——这不是装饰，是对账不撕逼的依据。
 *
 * ⚠️ 换绑 = 先解绑再绑定，**不是** UPDATE merchant_id：
 *   `MerchantExpertBindDTO` 的类注释写明 `updateBindRemark` 只允许改 settle_ratio/remark，
 *   否则「这批历史账单该找哪个商家结」无法追溯。所以本页**没有**"编辑商家"入口。
 *
 * ⚠️ 权限串：解绑是 `travel18:merchantExpert:unbind`（menu_id=2244），不是 `:edit`。
 *    后端 `DELETE /{id}` 用的也是这同一个权限串（`TravelMerchantExpertController.remove`）。
 *
 * ⚠️ 「删除」**不是物理删除**（后端实证 `TravelMerchantExpertController.java:167-173`，
 *    `operationId=merchantExpertRemove` → `merchantExpertService.release(id)`）：语义等价于
 *    软解绑，历史绑定行与账单记录都保留，对账追溯不受影响。所以确认弹窗文案不能写
 *    "不可恢复"，那是假的，会让 admin 不敢点、或者点了之后以为数据没了去查库。
 *    与「解绑」按钮的差别只在于：解绑要求填原因（写 remark），删除不要求。
 */

import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import BindableMerchantSelect from '@/components/DataSelect/BindableMerchantSelect';
import DarenUserSelect from '@/components/DataSelect/DarenUserSelect';
import { useExpertPermission } from '@/hooks/usePermission';
import { useTableRequest } from '@/hooks/useTableRequest';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { key, option } from '@/configurify/columns/baseColumns';
import { EXPERT_BIND_STATUS_OPTIONS, ExpertBindStatusColor, ExpertBindStatusLabel } from '@/enums';
import {
  bindMerchantExpert,
  listMerchantExpert,
  releaseMerchantExpert,
  removeMerchantExpert,
} from '@/services/expert';
import type { MerchantExpert } from '@/types/expert';

const fmtTime = (v?: string | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');

type BindFormValues = {
  merchantId: number;
  authorUserId: number;
  settleRatio?: number | null;
  remark?: string;
};

const MerchantExpertPage: React.FC = () => {
  const actionRef = useRef<{ reload: () => void } | null>(null);
  const perm = useExpertPermission();

  const [bindOpen, setBindOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bindForm] = Form.useForm<BindFormValues>();

  const [releaseTarget, setReleaseTarget] = useState<MerchantExpert | null>(null);
  const [releaseRemark, setReleaseRemark] = useState('');
  const [releaseSubmitting, setReleaseSubmitting] = useState(false);

  const request = useTableRequest(
    listMerchantExpert as (params: Record<string, unknown>) => Promise<{
      code: number;
      msg: string;
      total: number;
      rows: unknown[];
    }>,
  );

  const openBind = () => {
    bindForm.resetFields();
    setBindOpen(true);
  };

  const submitBind = async () => {
    let values: BindFormValues;
    try {
      values = await bindForm.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    try {
      await bindMerchantExpert({
        merchantId: values.merchantId,
        authorUserId: values.authorUserId,
        settleRatio: values.settleRatio ?? null,
        remark: values.remark?.trim() || null,
      });
      message.success('绑定成功');
      setBindOpen(false);
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示（后端对"同一达人已有生效绑定"会撞唯一键 active_flag）
    } finally {
      setSubmitting(false);
    }
  };

  const openRelease = (record: MerchantExpert) => {
    setReleaseTarget(record);
    setReleaseRemark('');
  };

  const submitRelease = async () => {
    if (!releaseTarget) return;
    if (!releaseRemark.trim()) {
      message.error('解绑必须填写原因（写入 remark，用于对账追溯）');
      return;
    }
    setReleaseSubmitting(true);
    try {
      await releaseMerchantExpert(releaseTarget.id, releaseRemark.trim());
      message.success('已解绑');
      setReleaseTarget(null);
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示
    } finally {
      setReleaseSubmitting(false);
    }
  };

  const handleDelete = async (record: MerchantExpert) => {
    try {
      await removeMerchantExpert(record.id);
      // ⚠️ 一律按 HTTP/业务成功提示，**不要拿返回文案做分支**：后端 remove() 在幂等场景
      //    （本来就是解绑态）也返回「解绑成功」，不像 `PUT /{id}/release` 会返回
      //    「该绑定已是解绑状态」，按文案判断会把成功当失败。
      message.success('已解除绑定关系（历史记录保留）');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示
    }
  };

  const columns = [
    key,
    { title: 'ID', dataIndex: 'id', width: 80, search: false },
    {
      title: '商家',
      dataIndex: 'merchantId',
      width: 200,
      ellipsis: true,
      renderFormItem: () => <BindableMerchantSelect />,
      render: (_: unknown, r: MerchantExpert) => r.merchantName ?? `#${r.merchantId ?? '--'}`,
    },
    {
      title: '达人',
      dataIndex: 'authorUserId',
      width: 180,
      ellipsis: true,
      renderFormItem: () => <DarenUserSelect placeholder="按达人筛选" />,
      render: (_: unknown, r: MerchantExpert) => r.authorNickname ?? `#${r.authorUserId ?? '--'}`,
    },
    {
      title: '绑定状态',
      dataIndex: 'bindStatus',
      width: 110,
      valueType: 'select',
      fieldProps: { options: EXPERT_BIND_STATUS_OPTIONS },
      render: (_: unknown, r: MerchantExpert) => (
        <Tag color={ExpertBindStatusColor[r.bindStatus ?? ''] ?? 'default'}>
          {ExpertBindStatusLabel[r.bindStatus as keyof typeof ExpertBindStatusLabel] ??
            r.bindStatus ??
            '--'}
        </Tag>
      ),
    },
    {
      title: '绑定时间',
      dataIndex: 'bindTime',
      width: 170,
      search: false,
      render: (_: unknown, r: MerchantExpert) => fmtTime(r.bindTime),
    },
    {
      title: '解绑时间',
      dataIndex: 'unbindTime',
      width: 170,
      search: false,
      render: (_: unknown, r: MerchantExpert) => fmtTime(r.unbindTime),
    },
    {
      title: '内部二次分账比例',
      dataIndex: 'settleRatio',
      width: 150,
      search: false,
      // null = 平台不管这层分配，仅备注；显示 0% 会让商家以为平台承诺了 0 分成
      render: (_: unknown, r: MerchantExpert) =>
        r.settleRatio === null || r.settleRatio === undefined ? (
          <Typography.Text type="secondary">平台不介入</Typography.Text>
        ) : (
          `${r.settleRatio}%`
        ),
    },
    { title: '备注', dataIndex: 'remark', width: 200, ellipsis: true, search: false },
    {
      ...option,
      width: 140,
      render: (_: unknown, record: MerchantExpert) => (
        <Space>
          {perm.canManageBinding && record.bindStatus === '0' ? (
            <a onClick={() => openRelease(record)}>解绑</a>
          ) : null}
          {perm.canManageBinding ? (
            <Popconfirm
              // 文案与后端真实语义对齐：remove() 内部就是 release()，软解绑、历史保留。
              // 不写"不可恢复"（假的），但要写清它和「解绑」的差别（不强制填原因）。
              title="确定删除这条绑定关系吗？"
              description="这只会解除绑定关系（软解绑），历史绑定与账单记录保留，不影响对账追溯。与「解绑」的差别：删除不要求填写原因，需要留痕请改用「解绑」。"
              okText="确认删除"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <a>删除</a>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <>
      <CommonTable
        actionRef={actionRef}
        rowKey="id"
        request={request as never}
        columns={columns as never}
        toolBarRender={() => [
          perm.canManageBinding ? (
            <Button key="bind" type="primary" icon={<PlusOutlined />} onClick={openBind}>
              新建绑定
            </Button>
          ) : null,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        columnsState={{ persistenceKey: 'merchant-expert', persistenceType: 'localStorage' }}
      />

      <Drawer
        title="新建达人↔商家绑定"
        width={520}
        open={bindOpen}
        onClose={() => setBindOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setBindOpen(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={submitBind}>
              确定绑定
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="绑定是下单闸门 G4 的数据源"
          description="达人未绑定生效商家时，其路线在小程序端不显示鼓励入口，后端也会拒单。绑定后新产生的鼓励单收款主体即为该商家。"
        />
        <Form form={bindForm} layout="vertical">
          <Form.Item
            name="merchantId"
            label="入驻商家"
            rules={[{ required: true, message: '请选择入驻商家' }]}
          >
            <BindableMerchantSelect />
          </Form.Item>
          <Form.Item
            name="authorUserId"
            label="达人"
            rules={[{ required: true, message: '请选择达人' }]}
            extra="只列带 daren 角色的用户；换绑请先解绑旧关系再新建，历史订单的商家归属是下单快照，不会被改写"
          >
            <DarenUserSelect showRoleWarning />
          </Form.Item>
          <Form.Item
            name="settleRatio"
            label="内部二次分账比例(%)"
            tooltip="商家与达人之间的分配比例，平台只记录不参与计算；留空表示平台不介入"
          >
            <InputNumber
              min={0}
              max={100}
              precision={2}
              style={{ width: '100%' }}
              placeholder="例如 70"
            />
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
            rules={[{ max: 500, message: '备注不能超过500个字符' }]}
          >
            <Input.TextArea rows={3} maxLength={500} placeholder="例如：合同约定达人七成" />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title="解绑确认"
        open={!!releaseTarget}
        onCancel={() => setReleaseTarget(null)}
        onOk={submitRelease}
        okText="确认解绑"
        okButtonProps={{ danger: true }}
        confirmLoading={releaseSubmitting}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message="解绑后立即影响下单闸门 G4"
            description={
              releaseTarget
                ? `解绑后，「${releaseTarget.authorNickname ?? `达人#${releaseTarget.authorUserId}`}」新产生的鼓励单将被拒（达人未完成商家绑定）；已产生的订单仍归「${
                    releaseTarget.merchantName ?? `商户#${releaseTarget.merchantId}`
                  }」结算（下单时已快照 merchant_id）。`
                : undefined
            }
          />
          <Typography.Text>
            解绑原因（必填，写入 remark 用于对账追溯）：
            <Input.TextArea
              rows={3}
              maxLength={500}
              value={releaseRemark}
              onChange={(e) => setReleaseRemark(e.target.value)}
              placeholder="例如：达人更换合作商家 / 合作终止"
            />
          </Typography.Text>
        </Space>
      </Modal>
    </>
  );
};

export default MerchantExpertPage;
