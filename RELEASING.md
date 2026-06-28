# Releasing (发布指南)

项目采用自动化 GitHub Actions 流程来打包并发布 release，这极大简化了手动发布的复杂性。

## 版本规范 (Version Rules)

- 使用 `minor` 版本号：完成用户可感知的新功能或重要应用里程碑（例如：引入 OCR 框选、新增本地生词本等）。
- 使用 `patch` 版本号：修复 bug、OCR/翻译问题、打包配置调整或小范围体验打磨。
- 遵循语义化版本命名，并在发布前确保 `CHANGELOG.md` 已记录相关变更。

---

## 自动化发布流程 (Recommended Workflow)

当推送以 `v` 开头的 tag 时，GitHub Actions 会自动触发发布流水线（编译、运行冒烟测试、进行依赖安全审计、打包 Windows 便携式 `.exe`），并自动创建 GitHub Release 并上传安装包产物。

### 发布步骤：

1. **更新本地 package.json 版本**（选择 `minor` 或 `patch`）：
   ```powershell
   npm version <minor|patch> --no-git-tag-version
   ```

2. **更新 `CHANGELOG.md`**：
   在 `CHANGELOG.md` 顶部添加新版本的改动日志。

3. **提交代码与标签**：
   ```powershell
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "release: vX.Y.Z"
   git tag vX.Y.Z
   ```

4. **推送到远程仓库**：
   ```powershell
   git push origin main
   git push origin vX.Y.Z
   ```

5. **验证 Release**：
   等待 GitHub Actions 运行完毕，访问项目的 GitHub Releases 页面，检查自动生成的草稿/发布包是否包含 `Translate.Desk-X.Y.Z-win-x64-portable.exe` 并且描述正确。

---

## 本地手动打包与发布 (Fallback Manual Workflow)

如果 CI/CD 服务不可用或需要离线打包发布，可使用以下步骤：

### 1. 本地前置检查
在执行打包前，必须确保以下命令全部通过：
```powershell
# 1. 编译验证
npm run build

# 2. 语法静态检查
node --check dist-electron\main.cjs
node --check dist-electron\preload.cjs

# 3. 桌面端冒烟测试
npx electron . --smoke-test

# 4. 生产依赖安全审计
npm audit --audit-level=moderate --omit=dev
```

### 2. 本地打包
运行打包命令生成 Windows 绿色便携包：
```powershell
npm run dist:win
```
生成的产物位于 `release\Translate.Desk-X.Y.Z-win-x64-portable.exe`。

### 3. 使用 GitHub CLI 手动创建 Release
```powershell
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file CHANGELOG.md release\Translate.Desk-X.Y.Z-win-x64-portable.exe
```

---

## 发布安全规则 (Security Rules)

1. **禁止发布无应用产物的 Release**：正式 release 必须包含 Windows 绿色便携包 `.exe` 文件，严禁只发布 Git 源码 Tag。
2. **严防泄露隐私**：确保打包前清理了本地的临时开发日志、环境配置文件（如 `.env`）和任何用户截屏 OCR 缓存。
3. **安全漏洞声明**：若版本包含安全补丁，应在 Release 描述中简述受影响范围及修复手段，避免过早暴露未公开的安全细节。
