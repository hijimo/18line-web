import { useNavigate, useLocation } from 'react-router'
import { message } from 'antd'
import { LoginHeader } from './LoginHeader'
import { LoginForm } from './LoginForm'
import { LoginFooter } from './LoginFooter'
import type { LoginFormValues } from './types'
import { useLogin } from '@/hooks/services/useAuthentication'
import { useAuthStore } from '@/stores/authStore'
import styles from './index.module.css'

/**
 * 登录页面主容器组件
 * 组合 LoginHeader、LoginForm、LoginFooter 组件
 * 实现全屏居中布局和响应式设计
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { mutateAsync: login, isPending } = useLogin()
  const authStore = useAuthStore()

  /**
   * 处理登录表单提交
   * @param values 表单值
   */
  const handleLogin = async (values: LoginFormValues) => {
    try {
      // 调用登录 API

      const response = await login({
        email: values.username, // 使用 username 作为 email
        password: values.password,
        // tenantId: 'f98c705a-3bb4-4551-9568-7a607fb25195',
      })

      // 检查响应是否成功（code 为 200 表示成功）
      if (response.code === 200 && response.data) {
        const { accessToken, user } = response.data

        // 检查必要的数据是否存在
        if (accessToken && user) {
          // 更新认证状态
          authStore.login(accessToken, user, values.remember)

          // 显示成功提示
          message.success('登录成功！')

          // 1 秒后跳转到首页或之前访问的页面
          setTimeout(() => {
            const from =
              (location.state as { from?: { pathname: string } })?.from
                ?.pathname || '/'
            navigate(from, { replace: true })
          }, 1000)
        } else {
          // 数据不完整
          message.error('登录响应数据不完整，请重试')
        }
      } else {
        // API 返回失败状态
        message.error(response.message || '登录失败，请重试')
      }
    } catch (error) {
      // 处理错误
      let errorMessage = '登录失败，请重试'

      if (error instanceof Error) {
        // 根据错误类型显示不同的提示
        if (error.message.includes('401')) {
          errorMessage = '用户名或密码错误'
        } else if (error.message.includes('403')) {
          errorMessage = '账号已被锁定，请联系管理员'
        } else if (error.message.includes('Network')) {
          errorMessage = '网络连接失败，请检查网络设置'
        } else if (error.message.includes('timeout')) {
          errorMessage = '请求超时，请重试'
        }
      }

      message.error(errorMessage)
      console.error('登录错误:', error)
    }
  }

  /**
   * 处理"忘记密码"点击
   */
  const handleForgotPassword = () => {
    message.info('忘记密码功能即将推出')
    // TODO: 实现忘记密码功能或路由跳转
  }

  /**
   * 处理"注册账号"点击
   */
  const handleRegister = () => {
    message.info('注册功能即将推出')
    // TODO: 实现注册功能或路由跳转
  }

  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8 ${styles.loginContainer}`}
    >
      {/* 登录卡片容器 */}
      <div
        className={`w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg sm:p-12 ${styles.loginCard}`}
      >
        {/* 页面头部 */}
        <div className={styles.loginHeader}>
          <LoginHeader />
        </div>

        {/* 登录表单 */}
        <div className={`mt-8 ${styles.loginForm}`}>
          <LoginForm onSubmit={handleLogin} loading={isPending} />
        </div>

        {/* 页面底部 */}
        <div className={`mt-6 ${styles.loginFooter}`}>
          <LoginFooter
            onForgotPassword={handleForgotPassword}
            onRegister={handleRegister}
          />
        </div>
      </div>
    </div>
  )
}

export default LoginPage
