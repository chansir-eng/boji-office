# 开发与运行

Boji 是无构建步骤、无后端的静态站点，使用 HTML、CSS 与 JavaScript。以下命令均在仓库根目录执行。

## 本地预览

安装 Python 后运行：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

打开 [http://127.0.0.1:8000](http://127.0.0.1:8000)，按 `Ctrl+C` 停止服务。也可使用其他静态文件服务器。

计算、输入校验、SVG 图表和标题字体均由仓库内文件提供。参考照片从 Pexels 加载，需要联网；图片失败时仍可选择对应档位。

## 回归检查

安装 Node.js 后运行，无需安装第三方依赖，也不需要额外的历史文件：

```powershell
node tests/calculator.test.cjs
```

检查覆盖固定薄肌参考、纯模型数值、默认结果、已达标、无规律训练、模拟上限、仅减脂、输入校验与焦点、自动更新、照片选择及失败回退、示例重置、图表切换与宽度、提交反馈和减少动态效果。

测试使用轻量浏览器环境替身检查交互契约；布局、真实浏览器和辅助技术表现仍需单独检查。

如另有重构前的原始页面源码，可运行可选比对：

```powershell
node tests/calculator.test.cjs --baseline path/to/original-index.html
```

该命令比较 432 组输入下三种情景的完整模型输出及历史点。`path/to/original-index.html` 需替换为自己提供的原始文件路径；默认回归检查不依赖它。纯模型支持通用目标参数，网页固定采用薄肌参考，详见 [模型与边界](model.md)。

## 目录职责

| 路径 | 内容 |
| --- | --- |
| [index.html](../index.html) | 页面结构、表单、模型解释和外部参考链接 |
| [assets/styles.css](../assets/styles.css) | 设计变量、组件、响应式与减少动态效果设置 |
| [assets/model.js](../assets/model.js) | 独立计算模型，可在浏览器或 Node.js 中使用 |
| [assets/app.js](../assets/app.js) | 输入校验、交互、结果呈现与 SVG 趋势图 |
| [assets/favicon.svg](../assets/favicon.svg) | 站点图标 |
| [assets/fonts/boji-display.ttf](../assets/fonts/boji-display.ttf) | 标题专用的本地字体子集 |
| [assets/fonts/OFL.txt](../assets/fonts/OFL.txt) | 字体的 SIL Open Font License 1.1 |
| [tests/calculator.test.cjs](../tests/calculator.test.cjs) | 无第三方依赖的回归检查 |
| [PRODUCT.md](../PRODUCT.md) | 产品定位与当前功能事实 |
| [DESIGN.md](../DESIGN.md) | 当前设计系统与规范化设计变量 |
| [.impeccable/design.json](../.impeccable/design.json) | 设计文档的组件预览与扩展元数据 |
| [docs/model.md](model.md) | 模型参数、计算过程、边界和资料链接 |

## 静态部署

GitHub Pages 或其他静态托管服务可直接发布仓库中的站点文件，无需构建。发布目录需包含 `index.html` 和完整的 `assets/`，保持相对目录结构：

```text
index.html
assets/
  styles.css
  model.js
  app.js
  favicon.svg
  fonts/
    boji-display.ttf
    OFL.txt
```

HTML 通过 `assets/…` 引用资源，CSS 通过 `fonts/boji-display.ttf` 引用字体。保留这些相对路径，可用于 GitHub Pages 的项目子路径。启用 JavaScript 后计算器才会工作；停用时仍可阅读页面文字和模型说明。

## 素材来源

标题字体是 Noto Sans SC ExtraBold 的字符子集，以“Boji Display”加载；字体文件仅覆盖当前首屏标题所需字符，其余文案使用系统字体。字体许可随 [OFL.txt](../assets/fonts/OFL.txt) 提供，重新分发字体时应保留该许可。

五张视觉参考照片来自 Pexels，按页面顺序为：

1. [Man Posing Shirtless Showing Muscles](https://www.pexels.com/photo/man-posing-shirtless-showing-muscles-8874714/)
2. [Portrait of Shirtless Skinny Athletic Man](https://www.pexels.com/photo/portrait-of-shirtless-skinny-athletic-man-27092692/)
3. [Shirtless Man Holding a Measuring Tape and a Bowl of Vegetables](https://www.pexels.com/photo/shirtless-man-holding-a-measuring-tape-and-a-bowl-of-vegetables-5714276/)
4. [Crop Shirtless Plump Black Man](https://www.pexels.com/photo/crop-shirtless-plump-black-man-5301497/)
5. [Topless Man Using Black Cellphone](https://www.pexels.com/photo/topless-man-using-black-cellphone-4728884/)

照片档位不是人物实测体脂，摄影人物不代表赞助或认可本站。个人输入与第三方请求的说明见 [模型与边界](model.md#视觉参考与数据处理)。
