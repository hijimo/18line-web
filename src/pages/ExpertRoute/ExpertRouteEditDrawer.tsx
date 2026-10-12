/**
 * 达人路线 新增/编辑 Drawer（分天编排）。
 *
 * UI 心智模型照抄 `src/pages/Template/index.tsx`（`Form.List` + `Collapse` 分天），
 * 差异点见设计文档 §2.4 / §7.1：
 * - 景点不是「逗号分隔 ID 字符串」，而是 `[{attractionId, expertIntro, sortOrder}]` 对象数组
 *   （带讲解文案，字符串编码装不下）；
 * - 景点排序用 `components/SortableIdList`（当前为无依赖降级版）；
 * - 6 个资源位（住宿/三餐/用车/跟拍）沿用既有 DataSelect，**批次 1 只能选平台公共资源**：
 *   契约 §1 W2 明确 `accommodationName` 等 6 个展示名「批次 1 恒为 null」，
 *   且 A9 只给了达人私域**景点**的接口，私域住宿/餐饮/用车/摄影要等批次 2 的资源审核页（menu 2270）。
 */

import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Collapse,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Radio,
  Select,
  Space,
  Spin,
} from 'antd';
import React, { useEffect, useState } from 'react';
import AccommodationSelect from '@/components/DataSelect/AccommodationSelect';
import CarSelect from '@/components/DataSelect/CarSelect';
import DiningSelect from '@/components/DataSelect/DiningSelect';
import PhotographySelect from '@/components/DataSelect/PhotographySelect';
import RegionFormItem from '@/components/RegionFormItem';
import UploadList from '@/components/Upload';
import { useExpertPermission } from '@/hooks/usePermission';
import { ExpertAuditStatusEnum, MAX_ROUTE_DAY_COUNT, StatusEnum } from '@/enums';
import { addExpertRoute, getExpertRoute, updateExpertRoute } from '@/services/expert';
import DayAttractionEditor from './DayAttractionEditor';
import { buildSavePayload, toFormValues, validateRouteDays } from './payload';
import type { ExpertRouteFormDay, ExpertRouteFormValues } from './payload';

const REWARD_ENABLED_OPTIONS = [
  { label: '开放（用户可鼓励）', value: '1' },
  { label: '关闭', value: '0' },
];

const STATUS_OPTIONS = [
  { label: '上架', value: StatusEnum.NORMAL },
  { label: '下架', value: StatusEnum.DISABLED },
];

export type ExpertRouteEditDrawerProps = {
  open: boolean;
  /** null = 新增 */
  routeId: number | null;
  onClose: () => void;
  /** 保存成功后回调（外层 reload 列表） */
  onSaved: () => void;
};

export const ExpertRouteEditDrawer: React.FC<ExpertRouteEditDrawerProps> = ({
  open,
  routeId,
  onClose,
  onSaved,
}) => {
  const [form] = Form.useForm<ExpertRouteFormValues>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** 编辑对象当前的审核状态，用于「保存会回到待审核」的提示 */
  const [auditStatus, setAuditStatus] = useState<string | null>(null);
  const perm = useExpertPermission();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setAuditStatus(null);
    if (!routeId) {
      form.setFieldsValue({
        rewardEnabled: '1',
        status: StatusEnum.NORMAL,
        recommendWeight: 0,
        coverFiles: [],
        days: [{ dayTheme: '', dayIntro: '', attractions: [] }],
      });
      return;
    }
    let cancelled = false;
    setLoading(true);
    getExpertRoute(routeId)
      .then((res) => {
        if (cancelled) return;
        const detail = res?.data;
        if (!detail) {
          message.error('路线不存在或已被删除');
          return;
        }
        setAuditStatus(detail.auditStatus ?? null);
        form.setFieldsValue(toFormValues(detail));
      })
      .catch(() => {
        // 错误提示已由 request 拦截器统一弹出，这里只需停止 loading
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, routeId, form]);

  const handleSubmit = async () => {
    let values: ExpertRouteFormValues;
    try {
      values = await form.validateFields();
    } catch {
      // 校验未通过：表单已就地标红
      return;
    }

    const dayErrors = validateRouteDays(values.days ?? []);
    if (dayErrors.length) {
      message.error(dayErrors[0] as string);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildSavePayload(values, {
        routeId,
        // ⚠️ 推荐权重是运营字段，达人不得自调：后端服务层 resolveRecommendWeight 会对
        //    非 admin 忽略该值并记 warn（字段在 ExpertRouteSaveDTO 里是存在的，不是没有）。
        //    前端干脆不提交，让「达人视角没有这个字段」在请求体上就是可见的事实。
        includeRecommendWeight: perm.isAdmin,
      });
      if (routeId) {
        await updateExpertRoute(payload);
        message.success('保存成功，审核状态已回到「待审核」');
      } else {
        await addExpertRoute(payload);
        message.success('新增成功，等待管理员审核');
      }
      onSaved();
      onClose();
    } catch {
      // 拦截器已提示；这里不重复弹，避免一个错误两条 toast
    } finally {
      setSubmitting(false);
    }
  };

  /** 保存会触发「先审后发」：已通过路线被改动后服务层强制 audit_status 回 '0' */
  const showReauditAlert =
    !!routeId && (auditStatus === ExpertAuditStatusEnum.APPROVED || auditStatus === null);

  return (
    <Drawer
      title={routeId ? '编辑达人路线' : '新增达人路线'}
      width={880}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            保存
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {showReauditAlert ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="先审后发"
            description="保存后审核状态会回到「待审核」，需管理员重新审核通过并处于「上架」状态，用户才能在小程序看到这条路线。"
          />
        ) : null}

        <Form form={form} layout="vertical">
          <Form.Item
            name="routeTitle"
            label="路线标题"
            rules={[
              { required: true, message: '请输入路线标题' },
              { max: 120, message: '路线标题不能超过120个字符' },
            ]}
          >
            <Input placeholder="例如：松阳三日·古村与茶园" maxLength={120} showCount />
          </Form.Item>

          <RegionFormItem label="所在地区" />

          <Form.Item name="coverFiles" label="封面图" valuePropName="fileList">
            <UploadList
              purpose="cover"
              maxLength={1}
              uploadText="上传封面"
              accept="image/png,image/jpeg,image/gif"
            />
          </Form.Item>

          <Form.Item
            name="intro"
            label="路线介绍"
            rules={[{ max: 2000, message: '路线介绍不能超过2000个字符' }]}
          >
            <Input.TextArea
              rows={3}
              maxLength={2000}
              showCount
              placeholder="卡片副文案，用户列表页可见"
            />
          </Form.Item>

          <Space size={24} wrap>
            <Form.Item name="rewardEnabled" label="鼓励开关">
              <Radio.Group options={REWARD_ENABLED_OPTIONS} />
            </Form.Item>
            <Form.Item name="status" label="上架状态">
              <Select options={STATUS_OPTIONS} style={{ width: 120 }} />
            </Form.Item>
            {perm.isAdmin ? (
              <Form.Item
                name="recommendWeight"
                label="推荐权重"
                tooltip="瀑布流排序用，数值越大越靠前；运营字段，达人不展示"
              >
                <InputNumber min={0} max={9999} style={{ width: 140 }} />
              </Form.Item>
            ) : null}
          </Space>

          <Form.Item
            name="remark"
            label="备注"
            rules={[{ max: 500, message: '备注不能超过500个字符' }]}
          >
            <Input.TextArea rows={2} maxLength={500} placeholder="内部备注，不对用户展示" />
          </Form.Item>

          <div style={{ marginBottom: 8, fontWeight: 500 }}>分天编排</div>
          <Form.List name="days">
            {(fields, { add, remove }) => (
              <>
                <Collapse
                  size="small"
                  // 默认展开全部：编辑已有多天路线时，折叠状态下看不到「哪天没配景点」
                  defaultActiveKey={fields.map((f) => String(f.key))}
                  items={fields.map((field) => ({
                    key: String(field.key),
                    label: `第 ${field.name + 1} 天`,
                    extra: (
                      <a
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(field.name);
                        }}
                      >
                        删除本天
                      </a>
                    ),
                    children: (
                      <>
                        <Form.Item name={[field.name, 'dayTheme']} label="当天主题">
                          <Input placeholder="例如：Day1 抵达与古城漫步" maxLength={120} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'dayIntro']} label="当天方案">
                          <Input.TextArea
                            rows={2}
                            maxLength={2000}
                            placeholder="当天整体安排说明"
                          />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'attractions']}
                          label="景点安排"
                          tooltip="顺序即用户创建行程后的游览顺序"
                        >
                          <DayAttractionEditor />
                        </Form.Item>
                        <Space size={12} wrap>
                          <Form.Item name={[field.name, 'accommodationId']} label="住宿">
                            <AccommodationSelect style={{ width: 200 }} />
                          </Form.Item>
                          <Form.Item name={[field.name, 'breakfastDiningId']} label="早餐">
                            <DiningSelect style={{ width: 200 }} placeholder="请选择早餐餐厅" />
                          </Form.Item>
                          <Form.Item name={[field.name, 'lunchDiningId']} label="午餐">
                            <DiningSelect style={{ width: 200 }} placeholder="请选择午餐餐厅" />
                          </Form.Item>
                          <Form.Item name={[field.name, 'dinnerDiningId']} label="晚餐">
                            <DiningSelect style={{ width: 200 }} placeholder="请选择晚餐餐厅" />
                          </Form.Item>
                          <Form.Item name={[field.name, 'carId']} label="用车">
                            <CarSelect style={{ width: 200 }} />
                          </Form.Item>
                          <Form.Item name={[field.name, 'photographyId']} label="跟拍">
                            <PhotographySelect style={{ width: 200 }} />
                          </Form.Item>
                        </Space>
                      </>
                    ),
                  }))}
                />
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                  disabled={fields.length >= MAX_ROUTE_DAY_COUNT}
                  onClick={() =>
                    add({ dayTheme: '', dayIntro: '', attractions: [] } as ExpertRouteFormDay)
                  }
                >
                  添加日程（{fields.length}/{MAX_ROUTE_DAY_COUNT}）
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Spin>
    </Drawer>
  );
};

export default ExpertRouteEditDrawer;
