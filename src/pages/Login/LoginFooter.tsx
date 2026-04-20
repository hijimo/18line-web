import type { LoginFooterProps } from './types'

/**
 * 登录页面底部组件
 * 显示"忘记密码"和"注册账号"链接
 */
export const LoginFooter: React.FC<LoginFooterProps> = ({
  showForgotPassword = true,
  showRegister = true,
  onForgotPassword,
  onRegister,
}) => {
  /**
   * 处理"忘记密码"链接点击
   */
  const handleForgotPassword = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    onForgotPassword?.()
  }

  /**
   * 处理"注册账号"链接点击
   */
  const handleRegister = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    onRegister?.()
  }

  // 如果两个链接都不显示，则不渲染组件
  if (!showForgotPassword && !showRegister) {
    return null
  }

  return (
    <div className="flex items-center justify-center space-x-2 text-sm">
      {/* 忘记密码链接 */}
      {showForgotPassword && (
        <a
          href="#"
          onClick={handleForgotPassword}
          className="text-blue-500 transition-colors hover:text-blue-600 hover:underline"
        >
          忘记密码
        </a>
      )}

      {/* 分隔符 */}
      {showForgotPassword && showRegister && (
        <span className="text-gray-400">|</span>
      )}

      {/* 注册账号链接 */}
      {showRegister && (
        <a
          href="#"
          onClick={handleRegister}
          className="text-blue-500 transition-colors hover:text-blue-600 hover:underline"
        >
          注册账号
        </a>
      )}
    </div>
  )
}
