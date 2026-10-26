# 开发与运行

Boji是无构建步骤、无后端的静态站点，使用HTML、CSS和JavaScript。以下命令均在仓库根目录执行。

## 本地预览

安装Python后运行：

    python -m http.server 8000 --bind 127.0.0.1

打开 [http://127.0.0.1:8000](http://127.0.0.1:8000)，按Ctrl+C停止服务。也可使用其他静态文件服务器。计算、校验、SVG图表和标题字体均由仓库内文件提供。第二轮已移除通过照片选择体脂百分比的功能；测量科普与输入敏感性说明不依赖远程图片。

## 检查与验证的区别

安装Node.js后运行，无需第三方依赖：

    node tests/calculator.test.cjs
    node tests/model-invariants.test.cjs

第一项检查页面交互契约，第二项检查模型边界与75,060个情景网格的不变量。它们不能证明模拟符合个人生理变化，也不能验证个人达标日期。布局、真实浏览器和辅助技术表现需要另外检查，轻量浏览器环境替身不能代替它们。

第一轮曾将提取后的模型与旧页面进行432组输入的完整结果和历史点比对。完全相等只能说明当时的重构保持了旧行为；旧行为中的缺陷也会被保留。第二轮基于原快照ea554af复现并修复边界问题，且有意改变适用域和训练次数规则，不能再用“全部等于旧版”作为通过条件。旧版精确相等的可选baseline比对不再作为当前检查入口。

本轮具体复现、修复、残余限制及实际执行结果记录在 [算法与科普有效性审计](algorithm-audit.md)。研究与参数的支持边界记录在 [模型、假设与边界](model.md)。修改计算规则时，应同步更新测试、示例和这两份文档，不能只更新页面显示数值。

## 目录职责

| 路径 | 内容 |
| --- | --- |
| [index.html](../index.html) | 页面结构、输入表单、测量科普、模型解释和资料链接 |
| [assets/styles.css](../assets/styles.css) | 设计变量、组件、响应式与减少动态效果 |
| [assets/model.js](../assets/model.js) | 独立计算模型、适用域、完成判定和显式状态 |
| [assets/app.js](../assets/app.js) | 校验、交互、结果状态、输入敏感性与SVG趋势图 |
| [assets/favicon.svg](../assets/favicon.svg) | 站点图标 |
| [assets/fonts/boji-display.ttf](../assets/fonts/boji-display.ttf) | 标题本地字体子集 |
| [assets/fonts/OFL.txt](../assets/fonts/OFL.txt) | 字体SIL Open Font License 1.1 |
| [tests/calculator.test.cjs](../tests/calculator.test.cjs) | 无第三方依赖的页面契约回归检查 |
| [tests/model-invariants.test.cjs](../tests/model-invariants.test.cjs) | 模型边界、状态、质量守恒与批量网格检查 |
| [PRODUCT.md](../PRODUCT.md) | 产品定位与当前功能事实 |
| [DESIGN.md](../DESIGN.md) | 设计系统与设计变量 |
| [.impeccable/design.json](../.impeccable/design.json) | 设计文档的组件预览与扩展元数据 |
| [docs/model.md](model.md) | 当前参数、计算规则、状态与证据边界 |
| [docs/algorithm-audit.md](algorithm-audit.md) | 第二轮算法与科普有效性审计 |

## 静态部署

GitHub Pages或其他静态托管服务可直接发布，无需构建。发布目录需包含index.html和完整的assets/，保持相对目录结构：

    index.html
    assets/
      styles.css
      model.js
      app.js
      favicon.svg
      fonts/
        boji-display.ttf
        OFL.txt

HTML通过assets/引用资源，CSS通过fonts/boji-display.ttf引用字体。保留相对路径，可用于GitHub Pages的项目子路径。启用JavaScript后计算器才会工作；停用时仍可阅读科普与模型说明。测试通过不表示已经部署，部署结果应单独核对。

## 素材来源

标题字体是Noto Sans SC ExtraBold的字符子集，以“Boji Display”加载；字体文件仅覆盖当前首屏标题所需字符，其余文案使用系统字体。字体许可随 [OFL.txt](../assets/fonts/OFL.txt) 提供，重新分发时应保留许可。

第一轮曾引用Pexels的五张不同个体照片作为视觉档位。第二轮已撤下这一交互，避免将未经测量的人物外观绑定到体脂数字。历史来源保留如下，便于追溯旧版本素材：

1. [Man Posing Shirtless Showing Muscles](https://www.pexels.com/photo/man-posing-shirtless-showing-muscles-8874714/)
2. [Portrait of Shirtless Skinny Athletic Man](https://www.pexels.com/photo/portrait-of-shirtless-skinny-athletic-man-27092692/)
3. [Shirtless Man Holding a Measuring Tape and a Bowl of Vegetables](https://www.pexels.com/photo/shirtless-man-holding-a-measuring-tape-and-a-bowl-of-vegetables-5714276/)
4. [Crop Shirtless Plump Black Man](https://www.pexels.com/photo/crop-shirtless-plump-black-man-5301497/)
5. [Topless Man Using Black Cellphone](https://www.pexels.com/photo/topless-man-using-black-cellphone-4728884/)

引用或曾使用摄影素材不代表人物赞助或认可本站。当前数据处理方式见 [模型说明](model.md#数据处理)。
