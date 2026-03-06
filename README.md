# 视频首尾帧提取器

纯前端静态网页工具：上传视频后提取首帧与尾帧，统一导出 `PNG`，支持单图下载与 `ZIP` 打包下载。

## 功能特性

- 上传视频后一键提取首帧和尾帧
- 输出图片统一为 `PNG`
- 支持单独下载首帧/尾帧
- 支持首尾帧打包下载 `frames.zip`
- 使用 `DaisyUI` 实现现代化界面
- 无后端依赖，支持 GitHub Pages 直接托管

## 技术方案

- 前端：`HTML` + `JavaScript` + `DaisyUI`
- 帧提取：`<video>` + `<canvas>` + `toBlob("image/png")`
- ZIP 打包：`JSZip`

## 本地使用

直接双击打开 `index.html` 即可使用。  
也可以用静态服务打开（可选）：

```bash
python3 -m http.server 8080
```

然后访问：`http://localhost:8080`

## 视频格式说明

项目使用浏览器原生解码能力，理论上支持多数常见格式（如 `mp4`、`webm`、`ogg`、`mov`），实际可播放与可提取能力取决于用户当前浏览器及系统编解码器。

## 部署到 GitHub Pages（自动）

### 1) 创建新仓库并推送

在项目目录执行：

```bash
git init
git add .
git commit -m "feat: init video first-last frame extractor"
gh repo create video-first-last-frame-extractor --public --source . --remote origin --push
```

### 2) 启用 Pages（GitHub Actions 来源）

```bash
gh api -X POST repos/:owner/video-first-last-frame-extractor/pages -f build_type=workflow
```

如果返回已存在错误，说明 Pages 可能已启用，可忽略。

### 3) 查看部署状态

```bash
gh run list --workflow deploy-pages.yml
```

成功后公网地址通常为：

`https://<你的GitHub用户名>.github.io/video-first-last-frame-extractor/`

## 文件结构

```text
.
├── .github/workflows/deploy-pages.yml
├── app.js
├── custom.css
├── index.html
└── lib/jszip.min.js
```
