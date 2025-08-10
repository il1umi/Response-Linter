# Response-Linter 轻量测试夹具

本测试夹具用于在不依赖 SillyTavern 宿主的情况下，验证“验证引擎 + 自动修复引擎”的关键行为。

## 目录
- tests/harness.html：在浏览器中打开此文件即可运行
- tests/harness.js：用例与最小全局模拟（window.ResponseLinter、toastr、extension_settings）

## 运行
1. 在文件管理器中双击打开 `tests/harness.html`（或拖拽到浏览器）
2. 打开开发者工具 (F12) 查看控制台输出
3. 页面顶部会显示通过统计（例如：通过 5 / 5 项）

## 覆盖用例
- A：doubleNewline=true 时，插入 `\n\n<content>`（双换行）
- B：doubleNewline=false 时，不强制双换行
- C：顺序错误包含“之后”提示
- D：顺序错误包含“之前”提示（阶段1修复项）
- E：before-next 模式：缺失 `<content>` 时应插入在 `</content>` 之前

## 注意
- 此夹具不会写入宿主数据，也不依赖任何外部库
- 若需要扩展用例，可直接编辑 tests/harness.js 追加断言

