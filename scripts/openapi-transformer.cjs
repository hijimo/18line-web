/**
 * OpenAPI 文档转换器
 * 解决 orval 生成代码时的 schema 名称冲突问题
 * 例如：/wx/auth/login 的 operationId 为 login，其内联 requestBody 会被自动命名为 LoginBody，
 * 与 components/schemas/LoginBody 冲突
 */
module.exports = (inputSchema) => {
  const schema = structuredClone(inputSchema)

  // 重命名 /wx/auth/login 的 operationId 避免与 /login 的 LoginBody schema 冲突
  if (schema.paths?.['/wx/auth/login']?.post) {
    schema.paths['/wx/auth/login'].post.operationId = 'wxLogin'
  }

  return schema
}
