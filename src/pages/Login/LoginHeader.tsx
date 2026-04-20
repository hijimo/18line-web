import type { LoginHeaderProps } from './types'

/**
 * 登录页面头部组件
 * 显示品牌标识和应用名称
 */
export const LoginHeader: React.FC<LoginHeaderProps> = ({
  title = '子梅的AI空间',
  subtitle = '欢迎回来，请登录您的账号',
}) => {
  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Logo */}
      <div className="flex items-center justify-center">
        <img src="/favicon.svg" alt="Logo" className="h-16 w-16" />
      </div>

      {/* 标题 */}
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>

      {/* 副标题 */}
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  )
}
