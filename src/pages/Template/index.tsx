import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  Button,
  Collapse,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Select,
  Space,
} from 'antd';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import AccommodationSelect from '@/components/DataSelect/AccommodationSelect';
import AttractionSelect from '@/components/DataSelect/AttractionSelect';
import CarSelect from '@/components/DataSelect/CarSelect';
import DictSelect from '@/components/DataSelect/DictSelect';
import DiningSelect from '@/components/DataSelect/DiningSelect';
import PhotographySelect from '@/components/DataSelect/PhotographySelect';
import RegionFormItem from '@/components/RegionFormItem';
import UploadList from '@/components/Upload';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { StaminaLabel, StatusEnum, StatusLabel, YesNoLabel } from '@/enums';
import { get as getTemplateApi } from '@/services/api/行程模板管理/行程模板管理';

const templateApi = getTemplateApi();

const STAMINA_OPTIONS = Object.entries(StaminaLabel).map(([value, label]) => ({ label, value }));
const YES_NO_OPTIONS = Object.entries(YesNoLabel).map(([value, label]) => ({ label, value }));

const Template: React.FC = () => {
  const actionRef = useRef<TODO>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<TODO>(null);
  const [form] = Form.useForm();
  const [generateForm] = Form.useForm();

  const request = useTableRequest(templateApi.list18 as TODO);

  const openDrawer = async (record?: TODO) => {
    setCurrentRecord(record || null);
    if (record) {
      try {
        const res = await templateApi.getInfo8({ templateId: record.templateId });
        const detail = (res as TODO)?.data || record;
        form.setFieldsValue({
          ...detail,
          region: { province: detail.province, city: detail.city, district: detail.district },
          travelTags: detail.travelTags
            ? detail.travelTags
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [],
          attachments: detail.attachments || [],
          days: (detail.days || []).map((d: TODO) => ({
            ...d,
            attractionIds: d.attractionIds
              ? d.attractionIds
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
          })),
        });
      } catch {
        form.setFieldsValue({
          ...record,
          region: { province: record.province, city: record.city, district: record.district },
          travelTags: record.travelTags
            ? record.travelTags
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [],
          attachments: record.attachments || [],
        });
      }
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { region, attachments: attachmentFiles, days, ...rest } = values;
    const params = {
      ...rest,
      ...region,
      travelTags: Array.isArray(rest.travelTags) ? rest.travelTags.join(',') : rest.travelTags,
      attachments: attachmentFiles || [],
      days: (days || []).map((d: TODO) => ({
        ...d,
        attractionIds: Array.isArray(d.attractionIds) ? d.attractionIds.join(',') : d.attractionIds,
      })),
    };
    try {
      if (currentRecord) {
        await templateApi.edit13({ ...params, templateId: currentRecord.templateId } as TODO);
        message.success('编辑成功');
      } else {
        await templateApi.add2(params as TODO);
        message.success('新增成功');
      }
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleToggleStatus = async (record: TODO) => {
    const newStatus = record.status === StatusEnum.NORMAL ? StatusEnum.DISABLED : StatusEnum.NORMAL;
    try {
      await templateApi.edit13({ templateId: record.templateId, status: newStatus } as TODO);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: TODO) => {
    try {
      await templateApi.remove1(String(record.templateId));
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const handleGenerate = async () => {
    const values = await generateForm.validateFields();
    const { region, ...rest } = values;
    setGenerating(true);
    try {
      await templateApi.generate({
        ...rest,
        ...region,
        travelLikes: Array.isArray(rest.travelLikes)
          ? rest.travelLikes.join(',')
          : rest.travelLikes,
        foodLikes: Array.isArray(rest.foodLikes) ? rest.foodLikes.join(',') : rest.foodLikes,
      } as TODO);
      message.success('自动生成成功');
      setGenerateOpen(false);
      generateForm.resetFields();
      actionRef.current?.reload();
    } catch (e: TODO) {
      message.error(e?.response?.data?.msg || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'templateName', ellipsis: true },
    { title: '地点', dataIndex: 'location', search: false },
    { title: '体力等级', dataIndex: 'staminaLevel', valueEnum: StaminaLabel },
    { title: '基准天数', dataIndex: 'baseDays', search: false },
    {
      title: '天数范围',
      dataIndex: 'minDays',
      search: false,
      render: (_: TODO, record: TODO) => `${record.minDays ?? '--'} ~ ${record.maxDays ?? '--'}`,
    },
    {
      ...option,
      render: (_: TODO, record: TODO) => (
        <Space>
          <a onClick={() => openDrawer(record)}>编辑</a>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record)}>
            <a>删除</a>
          </Popconfirm>
          {record.status === StatusEnum.NORMAL ? (
            <a onClick={() => handleToggleStatus(record)}>下架</a>
          ) : (
            <a onClick={() => handleToggleStatus(record)}>上架</a>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <CommonTable
        actionRef={actionRef}
        request={request as TODO}
        columns={columns as TODO}
        toolBarRender={() => [
          <Button icon={<ThunderboltOutlined />} onClick={() => setGenerateOpen(true)}>
            自动生成
          </Button>,
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            添加模板
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />

      <Drawer
        title={currentRecord ? '编辑行程模板' : '新增行程模板'}
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              确定
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="templateName"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="templateDesc" label="模板描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <RegionFormItem />
          <Form.Item name="baseDays" label="基准天数">
            <InputNumber placeholder="请输入" addonAfter="天" style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="minDays" label="最小天数" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" addonAfter="天" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxDays" label="最大天数" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" addonAfter="天" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="staminaLevel" label="体力等级">
            <Select placeholder="请选择" options={STAMINA_OPTIONS} />
          </Form.Item>
          <Form.Item name="travelTags" label="旅游喜好">
            <DictSelect code="travel_tourist_like" mode="multiple" />
          </Form.Item>
          <Form.Item name="includePhotography" label="含跟拍">
            <Select placeholder="请选择" options={YES_NO_OPTIONS} />
          </Form.Item>
          <Form.Item name="includeCar" label="含包车">
            <Select placeholder="请选择" options={YES_NO_OPTIONS} />
          </Form.Item>
          <Form.Item name="version" label="版本号" initialValue={1}>
            <InputNumber placeholder="请输入" style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ marginBottom: 8, fontWeight: 500 }}>日程安排</div>
          <Form.List name="days">
            {(fields, { add, remove }) => (
              <>
                <Collapse
                  size="small"
                  items={fields.map((field) => ({
                    key: field.key,
                    label: `第 ${form.getFieldValue(['days', field.name, 'dayNumber']) ?? field.name + 1} 天`,
                    extra: (
                      <a
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(field.name);
                        }}
                      >
                        删除
                      </a>
                    ),
                    children: (
                      <>
                        <Form.Item name={[field.name, 'dayNumber']} hidden>
                          <InputNumber />
                        </Form.Item>
                        <Form.Item name={[field.name, 'dayTheme']} label="主题">
                          <Input placeholder="请输入当天主题" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'attractionIds']} label="景点">
                          <AttractionSelect mode="multiple" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'accommodationId']} label="住宿">
                          <AccommodationSelect />
                        </Form.Item>
                        <Form.Item name={[field.name, 'breakfastDiningId']} label="早餐">
                          <DiningSelect placeholder="请选择早餐餐厅" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'lunchDiningId']} label="午餐">
                          <DiningSelect placeholder="请选择午餐餐厅" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'dinnerDiningId']} label="晚餐">
                          <DiningSelect placeholder="请选择晚餐餐厅" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'photographyId']} label="跟拍">
                          <PhotographySelect />
                        </Form.Item>
                        <Form.Item name={[field.name, 'carId']} label="包车">
                          <CarSelect />
                        </Form.Item>
                        <Form.Item name={[field.name, 'remark']} label="备注">
                          <Input.TextArea placeholder="请输入" rows={2} />
                        </Form.Item>
                      </>
                    ),
                  }))}
                />
                <Button
                  type="dashed"
                  block
                  onClick={() => add({ dayNumber: fields.length + 1 })}
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                >
                  添加日程
                </Button>
              </>
            )}
          </Form.List>
          <Form.Item
            name="attachments"
            label="附件"
            valuePropName="fileList"
            style={{ marginTop: 16 }}
          >
            <UploadList
              purpose="detail"
              maxLength={9}
              uploadText="上传附件"
              accept="image/png,image/jpeg,image/gif,application/pdf"
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="自动生成模板"
        width={480}
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setGenerateOpen(false)}>取消</Button>
            <Button type="primary" loading={generating} onClick={handleGenerate}>
              生成
            </Button>
          </Space>
        }
      >
        <Form form={generateForm} layout="vertical">
          <RegionFormItem required />
          <Form.Item name="days" label="天数" rules={[{ required: true, message: '请输入天数' }]}>
            <InputNumber placeholder="请输入" addonAfter="天" min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="staminaLevel" label="体力等级">
            <DictSelect code="travel_stamina" />
          </Form.Item>
          <Form.Item name="travelLikes" label="旅游喜好">
            <DictSelect code="travel_tourist_like" mode="multiple" />
          </Form.Item>
          <Form.Item name="foodLikes" label="美食喜好">
            <DictSelect code="travel_food_like" mode="multiple" />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
};

export default Template;
