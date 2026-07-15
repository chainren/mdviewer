# 版本发布规则

<!-- AIGC START -->

## 当前版本

- `1.0.0` 是 mdviewer 的第一个正式版本。
- 版本号统一维护在：
  - `package.json`
  - `package-lock.json`
  - `src/version.ts`

## 版本号规则

后续版本遵循 SemVer：`MAJOR.MINOR.PATCH`。

- `PATCH`：兼容性 bug 修复，例如 `1.0.0 -> 1.0.1`
- `MINOR`：向后兼容的新功能，例如 `1.0.0 -> 1.1.0`
- `MAJOR`：不兼容变更，例如 `1.0.0 -> 2.0.0`

## 版本递增命令

```bash
# 修复版本
npm run version:patch

# 功能版本
npm run version:minor

# 大版本
npm run version:major

# 指定版本
npm run version:set -- 1.2.3
```

上述命令会同步更新 `package.json`、`package-lock.json` 和 `src/version.ts`。

## 发布检查

```bash
npm run build
node dist/server.js --version
npm run build:bundle
node mdviewer.js --version
```

本地安装发布：

```bash
npm run release:local
mdviewer --version
```

<!-- AIGC END -->
