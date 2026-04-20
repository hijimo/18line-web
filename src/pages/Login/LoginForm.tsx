import { Button, Checkbox, Form, Input } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import type { LoginFormProps, LoginFormValues } from './types'

/**
 * 登录表单组件
 * 使用 Ant Design Form 实现用户登录表单
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm<LoginFormValues>()

  /**
   * 处理表单提交
   */
  const handleFinish = async (values: LoginFormValues) => {
    await onSubmit(values)
  }

  return (
    <Form
      form={form}
      name="login"
      layout="vertical"
      initialValues={{
        username: 'admin@system.local',
      }}
      onFinish={handleFinish}
      autoComplete="off"
      className="space-y-4"
    >
      {/* 用户名输入字段 */}
      <Form.Item
        name="username"
        label="用户名"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, message: '用户名至少 3 个字符' },
        ]}
      >
        <Input
          prefix={<UserOutlined className="text-gray-400" />}
          placeholder="请输入用户名"
          size="large"
          disabled={loading}
        />
      </Form.Item>

      {/* 密码输入字段 */}
      <Form.Item
        name="password"
        label="密码"
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码至少 6 个字符' },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="text-gray-400" />}
          placeholder="请输入密码"
          size="large"
          disabled={loading}
        />
      </Form.Item>

      {/* 记住我复选框 */}
      <Form.Item name="remember" valuePropName="checked" noStyle>
        <Checkbox disabled={loading}>记住我</Checkbox>
      </Form.Item>

      {/* 登录按钮 */}
      <Form.Item className="mb-0 mt-6">
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          disabled={loading}
          className="w-full"
        >
          {loading ? '登录中...' : '登录'}
        </Button>
      </Form.Item>
    </Form>
  )
}
