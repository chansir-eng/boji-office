---
name: Boji
description: 简洁、克制的薄肌周期估算工具
colors:
  page: "#f6f7f3"
  surface: "#ffffff"
  result: "#eef2e9"
  ink: "#283126"
  muted: "#626c5d"
  accent: "#526a43"
  accent-hover: "#3e5431"
  accent-soft: "#dfe7d8"
  line: "#d9dfd3"
  input-line: "#bdc7b5"
  fat: "#a9703f"
  danger: "#a63f30"
typography:
  display:
    fontFamily: '"Boji Display", "Microsoft YaHei", sans-serif'
    fontSize: "clamp(36px, 4.4vw, 54px)"
    fontWeight: 800
    lineHeight: 1.35
    letterSpacing: "-.03em"
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "29px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-.025em"
  title:
    fontSize: "20px"
    fontWeight: 650
    letterSpacing: "-.02em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "15px"
    lineHeight: 1.7
  label:
    fontSize: "12px"
    fontWeight: 550
  estimate:
    fontSize: "clamp(48px, 6vw, 76px)"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-.04em"
rounded:
  panel: "16px"
  panel-mobile: "12px"
  reference-card: "12px"
  button: "9px"
  field: "8px"
  segmented: "7px"
  status: "5px"
spacing:
  field-column: "14px"
  field-row: "18px"
  workbench: "28px"
  panel-input: "28px"
  panel-result: "32px"
  section: "76px"
  mobile-section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.surface}"
  button-reset:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    padding: "8px 0 8px 10px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  panel-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "28px"
  panel-result:
    backgroundColor: "{colors.result}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "32px"
  preset-note:
    textColor: "{colors.muted}"
    padding: "0"
  status:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.status}"
    padding: "3px 9px"
  reference-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.reference-card}"
    padding: "0"
  metric-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    rounded: "{rounded.status}"
    padding: "6px 11px"
---

# Design System: Boji

## Overview

**Creative North Star: "简洁、克制，像认真好用的健身工具"**

这句话是用户确认的方向。当前界面用浅色底面、低饱和绿色、清晰的数字层级和实用中文说明呈现薄肌周期估算。六项当前状态输入与结果构成主要工作区，照片参考、概念解释和依据按阅读顺序置于下方。本文记录已经落地的视觉实现。

用户明确不喜欢旧版整活文案。当前文案直接表达行为、结果和限制，不再使用政务窗口隐喻。字体、配色与组件数值来自 `assets/styles.css`；这里的色彩名称是对实现用途的描述，并非额外确认的品牌偏好。

**Key Characteristics:**

- 浅色中性底面与克制的绿色强调。
- 用排版、色面和细线建立层级。
- 数字先行，保留结果解释与模型边界。
- 桌面双栏、窄屏单栏，交互状态可辨认。

## Colors

前文规范化变量对应 CSS 的同名自定义属性；页面只有一个主要绿色强调家族，另有构成和情景所需的棕色辅助标识。

### Primary

- **沉静绿（accent）**：主操作、标题强调、主要周期数字、当前选中项、中心情景曲线与链接。
- **深绿（accent-hover）**：主按钮和链接的悬停反馈。
- **浅绿（accent-soft）**：状态底色及输入聚焦辅助色。

### Secondary

- **暖棕（fat）**：脂肪量构成、增肌阶段标识和较快情景曲线。情景曲线另用线型区分，保守为虚线、中心为实线、较快为点线。

### Neutral

- **页面灰白（page）**：页面与页头连续底色。
- **白色（surface）**：输入面板、输入框和选中的图表指标。
- **结果浅绿灰（result）**：结果面板整块底色。
- **深灰绿（ink）**：正文、标题和关键辅助数值。
- **次级灰绿（muted）**：单位、标签补充、说明和次级导航。
- **分隔灰绿（line / input-line）**：内容分隔线与较清晰的输入边框。

### Semantic

- **错误红棕（danger）**：错误文字与无效输入描边。错误块另有浅红底色（`#fbefeb`）；不可计算或输入有误的状态使用棕色文字（`#8b4d2c`）与浅棕底色（`#f2e1d2`）。

局部图表网格、照片占位、选中照片与表格行还使用 CSS 中的局部色值。这些没有被提升为全局配色变量。

## Typography

**Display Font:** Boji Display，回退到 Microsoft YaHei 与无衬线字体。

**Body Font:** 系统字体栈：Apple 系统字体、BlinkMacSystemFont、Segoe UI、PingFang SC、Microsoft YaHei、sans-serif。

**Character:** 标题靠较重字形强调问题，正文、单位和数据说明保持常规系统字体。数字使用等宽数字特性（`tabular-nums`），方便比较周期和构成；未使用单独的等宽字体。

`assets/fonts/boji-display.ttf` 是 Noto Sans SC ExtraBold 的本地标题子集，CSS 以 800 字重加载并使用 `font-display: swap`。当前文件为 5,708 字节，仅含空格、`久到多大概练肌薄要，？` 共 12 个码位，覆盖首屏“练到薄肌，大概要多久？”；它不是完整中文字体。字体许可随 `assets/fonts/OFL.txt` 提供。其他文案使用系统字体，不应依赖标题子集覆盖。

### Hierarchy

- **Display**：首屏问题，规范化变量给出桌面尺寸。宽度不超过 1050px 时为 44px，不超过 850px 时为 48px；不超过 600px 时为 `clamp(32px, 8.9vw, 46px)`、行高 1.4。
- **Headline**：区段标题；随布局缩至 27px 和 25px。
- **Title**：“填写当前状态”与“薄肌周期估算”面板标题；小屏为 19px。
- **Body**：全局正文基准；较长说明通常使用 1.9–2 的行高，具体区块较基准更小。首屏说明桌面限制为 38ch，结果解释为 66–70ch。
- **Label**：表单标签；补充单位与范围端点更小、颜色更淡。
- **Estimate**：主周期范围；小屏为 `clamp(42px, 13vw, 66px)`、行高 1.35。单位单独缩小，避免与主数字竞争。

## Layout

桌面容器最大宽度为 1120px，左右合计预留 64px；页头高至少 88px。首屏为正文标题与 365px 说明栏，间隔 70px。工作区为 370px 输入栏和自适应结果栏，间隔由规范化间距变量定义。输入面板内部是两列字段，训练经历与训练次数默认跨两列，单一字段组的图例仅供屏幕阅读器识别。结果标题下先给出静态薄肌参考说明，再按纵向阅读顺序呈现周期、构成、趋势图和情景表。

当前 CSS 没有全局间距级数；前文 `spacing` 仅记录重复出现或决定主要布局的实现值。照片卡片桌面五列，解释区三列，论文列表两列。正文利用留白、细线和区段间隔分组。

### Responsive behavior

- **1050px 及以下**：隐藏页头本地状态提示，首屏说明栏改为 320px；工作区输入栏为 340px、间隔 20px，面板内边距缩小。
- **850px 及以下**：容器左右合计预留 48px，首屏与工作区改为单列；输入全宽字段暂按两列排布，照片为三列；区段上间距为 60px。
- **600px 及以下**：容器左右合计预留 36px，页头高至少 74px，隐藏品牌描述；面板内边距为 23px 20px、圆角缩小，训练选择重新跨两列。照片为两列，解释区与论文列表为单列；区段上间距采用移动端变量。
- **360px 及以下**：容器左右合计预留 28px，面板内边距为 22px 16px，并进一步收紧导航与数字。

图表根据可用宽度设置 `viewBox`，绘图宽度限制在 260–600px，窗口尺寸变化后重绘。绘图区宽度小于 420px 时高 240px、刻度字号 12px、横轴分为三段；其他情况下高 220px、字号 11px、横轴分为四段。文字和摘要允许换行。没有悬浮固定工作面板。

## Elevation & Depth

当前界面没有盒阴影、背景模糊或渐变。输入区用白底加细边框，结果区用浅绿灰整面，照片用边框和低饱和度照片区分内容。焦点描边和选中描边表示状态，不承担装饰性投影。

动态效果限于状态变化：常用颜色和边框过渡为 0.2s，导航下划线为 0.24s，展开图标旋转为 0.3s，构成条宽度为 0.6s；统一曲线为 `cubic-bezier(.16, 1, .3, 1)`。结果更新时主数字执行 0.32s 的透明度与轻微模糊动画，主按钮按下缩放至 0.985。

`prefers-reduced-motion: reduce` 下，CSS 关闭动画和过渡并恢复即时滚动；JavaScript 同时跳过结果动画与平滑滚动。不要仅依靠动画表达更新状态，现有状态文字与播报同样保留。

## Shapes

面板、照片卡片、按钮、字段与状态条使用前文对应圆角。图例点为圆形。面板及照片边框为 1px；内容层级主要由平直分隔线组织，结果面板本身没有外边框。

图标由内联 SVG 构成，常用尺寸为 20px，线宽 1.6，采用圆端点和圆连接；小型辅助图标按上下文缩至 11–19px。Logo 为 CSS 几何图形配小写字标。

## Components

### Buttons

主按钮是整行绿色操作，文字白色，最小高度 48px，内边距见规范化组件变量。悬停变深，按下轻微缩小。恢复示例是无底色文字按钮，最小高度 44px，悬停强调为绿色。通用禁用样式为 0.5 透明度和不可操作指针；当前计算流程没有加载中的禁用阶段。

所有链接、按钮、输入、选择器和展开控件都有键盘可见焦点：绿色 3px 外轮廓，偏移 4px。输入框另有专用聚焦处理。

### Inputs / Fields

白底、灰绿 1px 边框、等宽数字，单位放在标签右侧。悬停边框加深（`#889b7a`）；聚焦时边框变绿，外加浅绿 2px 描边、偏移 1px。无效字段以错误色描边，并通过 `aria-invalid` 和错误说明关联。

选择器沿用字段样式，右侧使用内嵌 SVG 箭头。表单仅有身高、体重、当前体脂率、年龄、抗阻训练经历和每周力量训练六项当前状态。桌面数值字段至少 47px 高；小屏输入字号为 16px，选择器至少 48px 高。

### Navigation

页头包含三个锚点导航。默认使用次级文字，悬停切换深色并展开底部细线；当前没有滚动位置高亮或活动标签。移动端保留同一行导航，缩小字号与间距，隐藏品牌描述及页头状态。键盘用户可通过页首跳转链接直接到达表单。

### Cards / Containers

输入面板、结果面板及移动端变体见规范化组件变量。结果面板内的阶段摘要有上下分隔和中间竖线，三个统计值一行并列。信息解释区使用细分隔线，没有为每项增加独立有底卡片。

### Thin-muscle reference

结果标题下用普通说明文字呈现“薄肌参考：体脂约 12%，并具备一定肌量。”。说明距标题 10px，字号 11px、行高 1.9，使用 muted；“如何定义”链接左距 4px、单行显示，指向下方解释区。该区明确标准化 FFMI 20.5 为本站建模参考，非官方或临床标准。

### Status

小状态条使用浅绿底和绿色字，显示“示例估算”或“已更新”。达到薄肌参考时使用同一绿色样式；输入有误与不可计算时改用棕色状态。错误时保留上一次结果，并明确标注“输入有误 · 结果未更新”。没有规律力量训练且情景不可完成时，增肌阶段显示“未估算”，总周期显示“无法估算”；有训练但达到 520 周上限的情景显示“超出模拟范围”。状态不是仅凭颜色区分。

### Metric control and chart

体脂率与体重用双按钮分段控件切换。控件底为浅灰绿（`#e1e7db`），选中按钮为白底绿字，并以 `aria-pressed` 表达状态。趋势图同时使用颜色、线型和文字图例区分三种情景；体脂图另有固定薄肌参考虚线（`#7d896f`），轴标签沿用 muted。中心情景表格行使用浅绿色面和较重的文字，数字右对齐。

视口宽度不超过 850px 时，手动提交有效输入会滚动到结果面板；修改参数触发的自动更新不改变滚动位置。减少动态效果设置启用时，跳转即时完成。

### Reference selection cards

照片卡片为低饱和照片与文字说明的整体按钮。悬停加深边框，选中后有绿色边框、外描边、浅绿底和“已选”标记，`aria-pressed` 同步更新。照片桌面高 190px，随断点调整为 170px、200px、175px，采用裁切填充。图片失败时显示文字占位并保持档位可选；占位不虚构人物体脂。

### Disclosures

结果解读、照片说明和证据区使用原生 `details/summary`。右侧加号随展开旋转 45°；内容用次级色、宽松行高与有限行长呈现。证据区的第一个计算说明默认展开，其余可按需阅读。

## Do's and Don'ts

### Do:

- **Do** 沿用现有绿色强调、浅色面板与细线层级，让关键数字和操作易于辨认。
- **Do** 同时呈现情景名称、线型或明确状态文字，保留模型边界与单位。
- **Do** 延续已实现的键盘焦点、表单错误关联和减少动态效果设置。
- **Do** 为标题子集之外的文字保留系统字体回退。

### Don't:

- **Don't** 恢复用户明确拒绝的整活文案和政务隐喻。
- **Don't** 把模型情景包装为确定完成日期或置信区间。
- **Don't** 把标题字体子集当作完整中文字体使用。
- **Don't** 以纯颜色或仅动画表达当前已有文字说明的交互状态。
