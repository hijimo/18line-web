import React, { useState } from 'react'
import {
  ConfigProvider,
  Button,
  Switch,
  Space,
  Card,
  Divider,
  Form,
  Input,
  Select,
} from 'antd'
import { getSwitchableTheme } from './index'

/**
 * 主题配置示例组件
 * 演示如何在应用中使用主题配置
 */
const ThemeExample: React.FC = () => {
  // 主题模式状态
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')

  // 切换主题模式
  const handleThemeChange = (checked: boolean) => {
    setThemeMode(checked ? 'dark' : 'light')
  }

  return (
    <ConfigProvider theme={getSwitchableTheme(themeMode)}>
      <Card title="主题配置示例" style={{ maxWidth: 800, margin: '0 auto' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3>主题模式</h3>
            <Space>
              <span>亮色</span>
              <Switch
                checked={themeMode === 'dark'}
                onChange={handleThemeChange}
              />
              <span>暗色</span>
            </Space>
          </div>

          <Divider />

          <h3>按钮组件</h3>
          <Space wrap>
            <Button type="primary">主按钮</Button>
            <Button>次按钮</Button>
            <Button type="dashed">虚线按钮</Button>
            <Button type="link">链接按钮</Button>
            <Button type="primary" danger>
              危险按钮
            </Button>
          </Space>

          <Divider />

          <h3>表单组件</h3>
          <Form layout="vertical">
            <Form.Item label="用户名" required>
              <Input placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item label="部门">
              <Select
                placeholder="请选择部门"
                options={[
                  { value: 'tech', label: '技术部' },
                  { value: 'product', label: '产品部' },
                  { value: 'design', label: '设计部' },
                ]}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button>取消</Button>
                <Button type="primary">提交</Button>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </ConfigProvider>
  )
}

export default ThemeExample
