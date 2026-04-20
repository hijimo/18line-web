/**
 * 登录页面相关类型定义
 */

/**
 * 登录表单值接口
 */
export interface LoginFormValues {
  /** 用户名，3-50 个字符 */
  username: string
  /** 密码，6-50 个字符 */
  password: string
  /** 记住我选项，默认 false */
  remember?: boolean
}

/**
 * 登录表单组件 Props
 */
export interface LoginFormProps {
  /** 表单提交回调函数 */
  onSubmit: (values: LoginFormValues) => Promise<void>
  /** 加载状态 */
  loading?: boolean
}

/**
 * 登录页面组件 Props
 */
export interface LoginPageProps {
  // 无需外部 props，所有状态内部管理
}

/**
 * 登录页面头部组件 Props
 */
export interface LoginHeaderProps {
  /** 标题文本 */
  title?: string
  /** 副标题文本 */
  subtitle?: string
}

/**
 * 登录页面底部组件 Props
 */
export interface LoginFooterProps {
  /** 是否显示"忘记密码"链接 */
  showForgotPassword?: boolean
  /** 是否显示"注册账号"链接 */
  showRegister?: boolean
  /** "忘记密码"点击事件处理函数 */
  onForgotPassword?: () => void
  /** "注册账号"点击事件处理函数 */
  onRegister?: () => void
}
