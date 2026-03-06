# 现代沉浸式暗黑玻璃态设计规范 (Modern Immersive Dark Glassmorphism)

本规范基于“视频首尾帧提取器”重构项目提取，旨在为后续的 Web 工具/SaaS 产品提供一套**开箱即用、极具质感、且交互平滑**的顶级设计标准。遵循本规范，可快速打造出具备 macOS/iOS 级原生质感的前端产品。

---

## 1. 设计哲学 (Design Philosophy)

- **沉浸专注 (Immersive Focus)**：深色背景降低视觉噪音，让用户视线聚焦于核心工作区。
- **空间与呼吸 (Space & Breath)**：摒弃生硬的实线分割，采用光影、模糊、透明度来构建 Z 轴的空间层次感。
- **物理隐喻 (Physical Metaphor)**：动画不追求一闪而过，而是带有物理惯性的阻尼感，让界面的展开、收起如同实体卡片滑动。
- **克制的极客感 (Restrained Geekiness)**：在关键数据（如版本号、时间戳、文件格式）上使用等宽字体，结合呼吸灯，点缀科技感。

---

## 2. 色彩系统 (Color Palette)

系统以极深色为底，高饱和度的紫/蓝作为点缀。

### 品牌与功能色 (Brand & Semantic Colors)
- **Primary (主色)**：`#745DF5` (高定紫) - 用于主按钮、核心高亮、选中边框。
- **Primary-Light (主色亮)**：`#9c7cf7` - 用于渐变色的过渡或 Hover 提亮。
- **Info (信息)**：`#2080f0` (科技蓝) - 用于辅助光晕、普通提示。
- **Success (成功)**：`#52c41a` - 用于完成状态、起始/正确状态。
- **Error (错误)**：`#f5222d` - 用于报错、结束/删除状态。

### 背景色阶 (Background Elevation)
- **底层背景 (Base)**：`#0A0A0A` (极深灰/近黑)，不使用纯黑。
- **工作区底色 (Surface)**：`rgba(38, 38, 38, 0.4)` (对应 Tailwind `bg-[#262626]/40`)。
- **卡片底色 (Card)**：`rgba(26, 26, 26, 0.8)` (对应 Tailwind `bg-[#1A1A1A]/80`)。

### 文本色阶 (Text Hierarchy)
- **一级文字 (Primary)**：`#FFFFFF` (100% 白)，用于标题、正文。
- **二级文字 (Secondary)**：`rgba(255, 255, 255, 0.6)` (60% 白)，用于副标题、不重要描述。
- **三级文字 (Tertiary)**：`rgba(255, 255, 255, 0.4)` (40% 白)，用于辅助说明、占位符。

---

## 3. 质感与空间构建 (Material & Space)

### 3.1 动态环境光 (Ambient Glow)
不要让纯色背景死气沉沉。在页面最底层（`z-0`）放置 2-3 个巨大的彩色模糊圆形，作为环境光源。
- **实现方案**：`w-[50vw] h-[50vw] rounded-full blur-[140px] opacity-15 mix-blend-screen`。
- **动画**：给光晕添加缓慢的位移缩放动画（20s 周期），模拟呼吸感。

### 3.2 玻璃态 (Glassmorphism)
对于所有浮层、导航、工作区容器，使用毛玻璃效果。
- **边框**：极细的半透明白边 `border border-white/10` 或 `border-white/5`。
- **模糊**：高强度背景模糊 `backdrop-blur-xl` 或 `backdrop-blur-2xl`。
- **阴影**：大范围、低透明度的柔和阴影 `shadow-2xl`。

---

## 4. 动画与微交互 (Motion & Micro-interactions)

任何状态的切换都必须有过渡动画（Transition），拒绝生硬跳变。

### 4.1 物理阻尼展开 (Fluid Expansion)
容器尺寸或布局发生变化时，使用自定义贝塞尔曲线，模拟“快速拉开-缓慢刹车”的物理质感。
- **推荐时长与曲线**：`duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]`

### 4.2 悬停反馈 (Hover States)
- **按钮/卡片悬停**：轻微上浮（`-translate-y-0.5`）或放大（`scale-105`），并伴随发光阴影 `hover:shadow-[0_4px_20px_rgba(116,94,245,0.4)]`。
- **虚线拖拽区**：平时透明白框，Hover 时变为主色透明度 `hover:border-primary/50 hover:bg-primary/5`。

### 4.3 呼吸指示灯 (Pulse Indicators)
在需要体现“活物”、“监控中”、“状态”的地方，加入极小的呼吸点。
- **实现**：`w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(82,196,26,0.8)] animate-pulse`

---

## 5. 布局规范 (Layout Guidelines)

### 5.1 居中聚焦范式 (Center-Focus Card)
对于工具类应用，放弃传统的“左侧边栏+右侧内容”死板结构。采用一屏显示（`100vh`），内容区封装在一个**居中的带圆角（`rounded-[2rem]`）的大卡片容器**中。

### 5.2 状态驱动的弹性布局
- **初始态**：容器居中，内部为单一操作区，引导极其明确。
- **结果态**：容器宽度平滑扩展，右侧（或下方）滑出结果侧边栏。

### 5.3 响应式降级
- **大屏 (LG+)**：左右横向排列。
- **平板/笔记本 (MD - LG)**：转换为上下排列结构，右侧面板变成底部卡片。
- **手机 (SM 以下)**：高度自适应，横向排版的按钮变为纵向填满。

---

## 6. 字体排版 (Typography)

- **全局字体**：系统默认无衬线字体，开启抗锯齿 `font-sans antialiased`。
- **标题**：适度减小字间距，显得更紧凑高级 `tracking-tight` 或 `tracking-wide`。
- **数据与标示**：对于版本号（`v2.2.0`）、时间（`00:00.00`）、文件后缀（`MP4`），**强制使用等宽字体** `font-mono`，辅以全大写和宽字间距 `uppercase tracking-widest`。

---

## 7. UI 组件标准代码 (Component Best Practices)

### 7.1 主行动按钮 (Primary CTA Button)
自带流光渐变、防手抖变形、发光阴影：
```html
<button class="bg-gradient-to-r from-primary to-primary-light text-white rounded-xl font-semibold px-4 py-3 shadow-[0_4px_20px_rgba(116,94,245,0.4)] transition-all duration-300 hover:shadow-[0_8px_25px_rgba(116,94,245,0.6)] hover:-translate-y-0.5 active:translate-y-0">
  点击执行
</button>
```

### 7.2 悬浮提示 (Toast / Alert)
脱离文档流，带模糊背景，状态色体现在极细边框上：
```html
<div class="alert shadow-2xl border border-primary/50 backdrop-blur-2xl bg-[#1A1A1A]/90 text-white rounded-2xl flex items-center gap-3 px-5 py-3">
  <!-- Spinner or Icon here -->
  <span class="text-sm font-medium tracking-wide">提示信息</span>
</div>
```

### 7.3 标签徽章 (Badge)
低对比度背景 + 细边框，适合做辅助标识：
```html
<span class="px-2.5 py-1 rounded-md bg-white/10 border border-white/5 text-[11px] font-mono text-white/50 tracking-wider">
  标签文本
</span>
```

---
*遵循此规范，前端团队可快速复刻“视频首尾帧提取器”中展现的顶级工具产品质感。*