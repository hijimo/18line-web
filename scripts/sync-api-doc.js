#!/usr/bin/env node

/**
 * API 文档同步脚本
 * 从远程服务器下载 OpenAPI 文档到本地
 */

import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件的目录路径（ES 模块中的 __dirname 替代方案）
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 配置
const API_DOC_URL = 'http://localhost:8080/swagger/doc.yaml'
const OUTPUT_DIR = path.join(__dirname, '../docs/api')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'doc.yaml')

/**
 * 下载文件
 * @param {string} url - 文件 URL
 * @returns {Promise<string>} 文件内容
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    console.log(`📥 正在从 ${url} 下载 API 文档...`)

    protocol
      .get(url, (response) => {
        // 处理重定向
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location
          console.log(`🔄 重定向到: ${redirectUrl}`)
          return downloadFile(redirectUrl).then(resolve).catch(reject)
        }

        // 检查响应状态
        if (response.statusCode !== 200) {
          reject(new Error(`请求失败，状态码: ${response.statusCode}`))
          return
        }

        let data = ''

        response.on('data', (chunk) => {
          data += chunk
        })

        response.on('end', () => {
          resolve(data)
        })
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

/**
 * 保存文件到本地
 * @param {string} content - 文件内容
 * @param {string} filePath - 保存路径
 * @returns {Promise<void>}
 */
function saveFile(content, filePath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filePath)

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      console.log(`📁 创建目录: ${dir}`)
      fs.mkdirSync(dir, { recursive: true })
    }

    // 写入文件
    fs.writeFile(filePath, content, 'utf8', (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

/**
 * 同步 API 文档的主函数
 */
async function syncApiDoc() {
  try {
    // 下载文档
    const content = await downloadFile(API_DOC_URL)

    // 保存文档
    await saveFile(content, OUTPUT_FILE)

    console.log(`✅ API 文档同步成功: ${OUTPUT_FILE}`)
    process.exit(0)
  } catch (error) {
    console.error(`❌ API 文档同步失败:`)

    // 根据错误类型提供友好的错误信息
    if (error.code === 'ECONNREFUSED') {
      console.error(`   无法连接到服务器 ${API_DOC_URL}`)
      console.error(`   请确保后端服务正在运行`)
    } else if (error.code === 'ENOTFOUND') {
      console.error(`   无法解析主机名`)
      console.error(`   请检查网络连接和 URL 配置`)
    } else if (error.code === 'ETIMEDOUT') {
      console.error(`   请求超时`)
      console.error(`   请检查网络连接`)
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      console.error(`   文件写入权限不足`)
      console.error(`   请检查目录权限: ${OUTPUT_DIR}`)
    } else if (error.code === 'ENOSPC') {
      console.error(`   磁盘空间不足`)
    } else {
      console.error(`   ${error.message}`)
    }

    process.exit(1)
  }
}

// 执行同步
syncApiDoc()
