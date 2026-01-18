## 现状结论
- `scripts/` 下共有 6 个脚本包含 `require('puppeteer')`，仓库内未发现被 `package.json` 的 npm scripts 或 CI 配置调用。
- 多个脚本混用了 Playwright 风格 API（如 `page.fill()`、`page.waitForURL()`、`button:has-text(...)`），在 Puppeteer 下基本不可运行；还有脚本会自动 `npm install puppeteer`，具备副作用。
- 其中至少 2 个脚本硬编码了账号/密码并访问生产域名，保留在仓库内有明显安全风险。

## 处理策略（默认推荐）
1. 直接删除这 6 个脚本文件（而不是只删 `require('puppeteer')` 这一行），因为它们当前没有被任何地方引用，且即便保留也不可可靠运行。
2. 同步清理仓库中可能残留的 puppeteer 依赖：确认 `package.json/package-lock` 不包含 puppeteer（如有则移除），避免 `npm ci` 下载 Chromium（Dockerfile 也提示了这一点）。

## 可选保留方案（如果团队仍需要“手工浏览器回归”）
- 将这些脚本迁出仓库或改造成：
  - 使用 Playwright（若项目已采用）或统一成纯 Puppeteer。
  - 所有账号/密码改从环境变量读取，删除硬编码。
  - 移除“脚本内自动安装依赖”的逻辑，改成清晰的依赖说明。

## 验证方式
- 全仓检索确认不再存在 `require('puppeteer')`/`import puppeteer`。
- 运行项目现有的测试/构建命令，确保删除脚本不影响正常流程。

## 交付物
- 删除（或迁出）`scripts/` 下 6 个 puppeteer 相关脚本。
-（如需要）更新依赖文件，确保不再包含 puppeteer。