/**
 * 达人私域景点（menu 2220，`travel18:expertAttraction:*`）。
 *
 * ## 与既有 `pages/Attractions`（公共景点）的关系
 * 同一张表 `travel_attraction`，靠 `owner_user_id` 区分归属：
 * - `owner_user_id IS NULL` = 平台公共数据 → 既有 `pages/Attractions` 维护，
 *   且后端在所有既有 `selectAttractionList` 里**硬编码**追加了这个条件（契约 §3）；
 * - `owner_user_id = 某达人` = 私域数据 → **只能**走 A9 `/travel18/expertAttraction/list`。
 * 所以本页默认只列「我的私域景点」，另给一个只读的「公共景点」视图，
 * 让达人编路线时能确认要引用的公共景点长什么样（**不可编辑**，公共数据由 admin 维护）。
 *
 * ## 审核语义（与公共景点不同，别搞混）
 * 景点/住宿/餐饮 = **后置审核**：建即 `owner_audit_status='1'`，可立刻编入路线；
 * admin 可置 `'2'` 封禁（封禁后不得再编入路线）。
 * 用车/摄影才是**前置审核**（建即 '0'，admin 置 '1' 才可用）—— 那属 menu 2270
 * 「达人资源审核」页，本次未实现。
 *
 * ⚠️ 数据隔离 fail-closed：daren 只能看到自己的行（后端 @AuthorDataScope），
 *    非 admin 非 daren → `AND 1=0`。前端不做"帮后端过滤"。
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
  Popconfirm,
  Radio,
  Select,
  Space,
  Tag,
} from 'antd';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import CoordinateInput from '@/components/CoordinateInput';
import RegionFormItem from '@/components/RegionFormItem';
import UploadList from '@/components/Upload';
import { useExpertPermission } from '@/hooks/usePermission';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import {
  BlindStatusLabel,
  ClassicRatingOptions,
  OwnerAuditStatusColor,
  OwnerAuditStatusLabel,
  StatusEnum,
  StatusLabel,
} from '@/enums';
import { get as getAttractionApi } from '@/services/api/景点管理/景点管理';
import {
  addExpertAttraction,
  listExpertAttraction,
  removeExpertAttraction,
  updateExpertAttraction,
} from '@/services/expert';
import type { List8Params } from '@/types/api/list8Params';
import type { ExpertAttraction } from '@/types/expert';

const attractionApi = getAttractionApi();

const blindStatusOptions = Object.entries(BlindStatusLabel).map(([value, label]) => ({
  label,
  value,
}));

type Scope = 'mine' | 'public';

type AttractionFormValues = Partial<ExpertAttraction> & {
  region?: { province?: string; city?: string; district?: string };
  attachments?: { url?: string; name?: string }[];
};

const ExpertAttractionPage: React.FC = () => {
  const actionRef = useRef<{ reload: () => void } | null>(null);
  const perm = useExpertPermission();

  const [scope, setScope] = useState<Scope>('mine');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [current, setCurrent] = useState<ExpertAttraction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<AttractionFormValues>();

  /** A9：我的私域景点（daren 只看自己，admin 看全部，由后端决定） */
  const mineLoader = (params: Record<string, unknown>) =>
    listExpertAttraction(params as unknown as Parameters<typeof listExpertAttraction>[0]);

  /**
   * 公共景点：复用既有 `/travel18/attraction/list`（后端硬编码 owner_user_id IS NULL）。
   * ⚠️ 只读视图，不给任何写操作入口。
   */
  const publicLoader = async (params: Record<string, unknown>) => {
    const res = await attractionApi.list8(params as unknown as List8Params);
    return {
      code: res?.code ?? 200,
      msg: res?.msg ?? '',
      total: res?.total ?? 0,
      rows: (res?.rows ?? []) as unknown as ExpertAttraction[],
    };
  };

  const request = useTableRequest(
    (scope === 'mine' ? mineLoader : publicLoader) as (params: Record<string, unknown>) => Promise<{
      code: number;
      msg: string;
      total: number;
      rows: unknown[];
    }>,
  );

  const openDrawer = (record?: ExpertAttraction) => {
    setCurrent(record ?? null);
    if (record) {
      form.setFieldsValue({
        ...record,
        region: {
          province: record.province ?? undefined,
          city: record.city ?? undefined,
          district: record.district ?? undefined,
        },
        attachments: (record.attachments ?? []) as { url?: string; name?: string }[],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ blindStatus: '0', status: StatusEnum.NORMAL });
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    let values: AttractionFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const { region, attachments, ...rest } = values;
    const payload: Partial<ExpertAttraction> = {
      ...rest,
      province: region?.province ?? null,
      city: region?.city ?? null,
      district: region?.district ?? null,
      attachments: attachments ?? [],
    };
    setSubmitting(true);
    try {
      if (current) {
        await updateExpertAttraction({ ...payload, attractionId: current.attractionId });
        message.success('编辑成功');
      } else {
        // owner_user_id 由服务端从登录态取，前端不传（传了也不信）；
        // owner_audit_status 同理：景点是后置审核，建即 '1'
        await addExpertAttraction(payload);
        message.success('新增成功（景点为后置审核，已可直接编入路线）');
      }
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: ExpertAttraction) => {
    try {
      await removeExpertAttraction(record.attractionId);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示（被路线引用时后端应拒绝，前端不猜原因）
    }
  };

  /**
   * admin 封禁 / 解封。
   * ⚠️ 契约 §2 只给了 A9 的 CRUD，没有独立的「封禁」接口，这里复用 PUT +
   *    `ownerAuditStatus` 字段。
   * ✅ 安全性已核实：后端 `TravelExpertAttractionServiceImpl.java:170-179`「硬约束 3」
   *    规定 `ownerAuditStatus` **只有 admin 能改**，非 admin 传值会被强制置 null，
   *    所以达人自己构造请求改不了封禁态（前端 gate 只是第一道）。
   * TODO(批次2): menu 2270「达人资源审核」页落地后，把封禁/解封迁到
   *    `travel18:expertResourceAudit:audit`（A8 审核接口），本页只保留跳转入口；
   *    届时同步删掉这里的 ownerAuditStatus 写路径，避免两处入口口径漂移。
   */
  const handleToggleBan = async (record: ExpertAttraction) => {
    const banned = record.ownerAuditStatus === '2';
    try {
      await updateExpertAttraction({
        attractionId: record.attractionId,
        ownerAuditStatus: banned ? '1' : '2',
      });
      message.success(banned ? '已解除封禁' : '已封禁，该景点不可再编入路线');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示
    }
  };

  const columns = [
    key,
    { title: 'ID', dataIndex: 'attractionId', width: 80, search: false },
    { title: '名称', dataIndex: 'attractionName', ellipsis: true, width: 200 },
    {
      title: '来源',
      dataIndex: 'ownerUserId',
      width: 100,
      search: false,
      render: (_: unknown, r: ExpertAttraction) =>
        r.ownerUserId ? <Tag color="purple">达人私域</Tag> : <Tag>平台公共</Tag>,
    },
    {
      title: '归属达人',
      dataIndex: 'ownerNickname',
      width: 130,
      ellipsis: true,
      search: false,
      render: (_: unknown, r: ExpertAttraction) =>
        r.ownerNickname ?? (r.ownerUserId ? `#${r.ownerUserId}` : '--'),
    },
    {
      title: '审核状态',
      dataIndex: 'ownerAuditStatus',
      width: 110,
      search: false,
      render: (_: unknown, r: ExpertAttraction) =>
        r.ownerAuditStatus ? (
          <Tag color={OwnerAuditStatusColor[r.ownerAuditStatus] ?? 'default'}>
            {OwnerAuditStatusLabel[r.ownerAuditStatus as keyof typeof OwnerAuditStatusLabel] ??
              r.ownerAuditStatus}
          </Tag>
        ) : (
          // 公共数据的 owner_audit_status 恒为 NULL，显示 '--' 而不是"待审核"
          '--'
        ),
    },
    {
      title: '是否全盲',
      dataIndex: 'blindStatus',
      width: 100,
      search: false,
      render: (_: unknown, r: ExpertAttraction) =>
        BlindStatusLabel[r.blindStatus as keyof typeof BlindStatusLabel] ?? '--',
    },
    // ⚠️ 这里刻意没有「地点」列：后端 `ExpertAttractionAdminVO` 不含 location，
    //    列留着就是永远空白的一列（原因详见下方表单处的完整说明）。
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      search: false,
      render: (_: unknown, r: ExpertAttraction) =>
        StatusLabel[r.status as keyof typeof StatusLabel] ?? r.status ?? '--',
    },
    {
      ...option,
      width: 190,
      render: (_: unknown, record: ExpertAttraction) =>
        scope === 'public' ? (
          <span style={{ color: '#999' }}>公共景点只读</span>
        ) : (
          <Space>
            <a onClick={() => openDrawer(record)}>编辑</a>
            {perm.isAdmin ? (
              <Popconfirm
                title={
                  record.ownerAuditStatus === '2'
                    ? '确定解除封禁吗？'
                    : '封禁后该景点不可再被编入路线，确定吗？'
                }
                onConfirm={() => handleToggleBan(record)}
              >
                <a>{record.ownerAuditStatus === '2' ? '解封' : '封禁'}</a>
              </Popconfirm>
            ) : null}
            <Popconfirm title="确定删除该私域景点吗？" onConfirm={() => handleDelete(record)}>
              <a>删除</a>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <>
      {scope === 'public' ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="公共景点为只读视图"
          description="平台公共景点由管理员在「景点管理」页维护，这里仅供你在编排路线前确认引用对象。"
        />
      ) : null}
      <CommonTable
        actionRef={actionRef}
        rowKey="attractionId"
        // scope 变化必须触发重新请求：loader 换了但 ProTable 不会自己知道
        params={{ scope }}
        request={request as never}
        columns={columns as never}
        headerTitle={
          <Radio.Group
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: '我的私域景点', value: 'mine' },
              { label: '公共景点（只读）', value: 'public' },
            ]}
          />
        }
        toolBarRender={() => [
          scope === 'mine' ? (
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              新增私域景点
            </Button>
          ) : null,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        columnsState={{ persistenceKey: 'expert-attraction', persistenceType: 'localStorage' }}
      />

      <Drawer
        title={current ? '编辑私域景点' : '新增私域景点'}
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              确定
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="后置审核：保存即可用"
          description="达人景点建即视为审核通过，可立刻编入路线；管理员保留封禁权（封禁后不可再被编入）。归属达人由登录态决定，不可指定他人。"
        />
        <Form form={form} layout="vertical">
          <Form.Item
            name="attractionName"
            label="景点名称"
            rules={[{ required: true, message: '请输入景点名称' }]}
          >
            <Input placeholder="请输入" maxLength={120} />
          </Form.Item>
          <Form.Item name="attractionShortName" label="简称">
            <Input placeholder="请输入" maxLength={60} />
          </Form.Item>
          <Form.Item name="attractionDescription" label="描述">
            <Input.TextArea rows={3} maxLength={2000} placeholder="请输入" />
          </Form.Item>
          <RegionFormItem />
          {/*
            ⚠️ 刻意没有「地点」输入项：travel_attraction 无 location 列，后端 ExpertAttractionAdminVO 也不含该字段。地址语义由 province/city/district 三级 + 经纬度承担（批次 2 再评估是否做组合展示）。加了会静默丢数据。
            丢数据的路径是：项目未配置 FAIL_ON_UNKNOWN_PROPERTIES
            （ApplicationConfig.java 只定制了 timeZone）→ 多出来的字段不会 400，
            而是被 Jackson 静默忽略 → 达人填了「地点」、保存提示成功、重开是空的。
            （本段必须用 JSX 注释语法，写成 // 会被当成文本节点渲染进抽屉。）
          */}
          <CoordinateInput />
          <Form.Item name="blindStatus" label="是否全盲">
            <Select placeholder="请选择" options={blindStatusOptions} />
          </Form.Item>
          <Form.Item name="visitDuration" label="游玩时长(小时)">
            <InputNumber min={0} max={24} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="openTime" label="开放时间">
            <Input placeholder="例如：08:00-17:30" maxLength={100} />
          </Form.Item>
          <Form.Item name="classicRating" label="经典指数">
            <Select placeholder="请选择" options={ClassicRatingOptions} allowClear />
          </Form.Item>
          <Space size={12}>
            <Form.Item name="ticketPriceA" label="门票(成人,元)">
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="ticketPriceC" label="门票(儿童,元)">
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item name="attachments" label="图片" valuePropName="fileList">
            <UploadList
              purpose="detail"
              maxLength={9}
              uploadText="上传图片"
              accept="image/png,image/jpeg,image/gif"
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
};

export default ExpertAttractionPage;
