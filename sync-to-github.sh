#!/bin/bash

# 同步项目到GitHub的脚本
# Script to sync project to GitHub

echo "📦 FAJ - Sync to GitHub"
echo "========================"
echo ""

# 检查是否已经有远程仓库
if git remote | grep -q "origin"; then
    echo "⚠️  远程仓库 'origin' 已存在"
    echo "当前远程仓库URL:"
    git remote get-url origin
    echo ""
    read -p "是否要更新远程仓库URL? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "请输入新的GitHub仓库URL: " REPO_URL
        git remote set-url origin "$REPO_URL"
        echo "✅ 远程仓库URL已更新"
    fi
else
    # 添加远程仓库
    echo "请输入你的GitHub用户名:"
    read GITHUB_USERNAME
    echo ""
    echo "请输入仓库名称 (例如: find-a-job 或 faj):"
    read REPO_NAME
    echo ""
    
    # 构建仓库URL
    REPO_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
    
    echo "将添加远程仓库: $REPO_URL"
    read -p "确认? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote add origin "$REPO_URL"
        echo "✅ 远程仓库已添加"
    else
        echo "❌ 取消操作"
        exit 1
    fi
fi

echo ""
echo "准备推送到GitHub..."
echo "当前分支: $(git branch --show-current)"
echo ""

# 推送代码
read -p "是否推送到GitHub? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "推送中..."
    
    # 设置上游分支并推送
    git push -u origin master
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 成功推送到GitHub!"
        echo ""
        echo "你的项目现在可以通过以下地址访问:"
        echo "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
        echo ""
        echo "接下来你可以:"
        echo "1. 在GitHub上查看你的项目"
        echo "2. 添加LICENSE文件"
        echo "3. 完善项目描述"
        echo "4. 邀请协作者"
    else
        echo ""
        echo "❌ 推送失败"
        echo "请检查:"
        echo "1. GitHub仓库是否已创建"
        echo "2. 你是否有推送权限"
        echo "3. 仓库URL是否正确"
        echo ""
        echo "如果是认证问题，你可能需要:"
        echo "- 使用GitHub Personal Access Token"
        echo "- 或设置SSH密钥"
    fi
else
    echo "❌ 取消推送"
fi