#!/usr/bin/env python3
"""
18line-web 一键发布脚本
用法: python3 publish.py

流程:
1. pnpm build（构建 + 自动上传静态资源到 OSS）
2. 上传 index.html 到服务器
"""

import subprocess
import sys
import os

# 服务器配置
SERVER_HOST = "8.136.229.208"
SERVER_USER = "root"
SERVER_PATH = "/var/www/18line-web"
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


def run(cmd: str, **kwargs) -> None:
    """执行命令，失败则退出"""
    print(f"\n>>> {cmd}")
    result = subprocess.run(cmd, shell=True, **kwargs)
    if result.returncode != 0:
        print(f"❌ 命令失败: {cmd}")
        sys.exit(1)


def main() -> None:
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    # 1. 构建（ENABLE_OSS=true 触发静态资源上传 OSS）
    print("🔨 构建项目并上传静态资源到 OSS...")
    run("ENABLE_OSS=true pnpm build")

    # 2. 上传 index.html 到服务器
    html_file = os.path.join(DIST_DIR, "index.html")
    if not os.path.exists(html_file):
        print("❌ dist/index.html 不存在")
        sys.exit(1)

    print(f"\n📤 上传 index.html 到 {SERVER_HOST}...")
    run(f"scp {html_file} {SERVER_USER}@{SERVER_HOST}:{SERVER_PATH}/index.html")

    print(f"\n✅ 发布完成！访问 http://{SERVER_HOST}")


if __name__ == "__main__":
    main()
