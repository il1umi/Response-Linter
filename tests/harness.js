/*
  Response-Linter 轻量浏览器测试夹具
  - 不依赖 SillyTavern 宿主
  - 直接 import 核心模块，模拟必要的全局对象
  - 在控制台输出断言结果，并在页面显示汇总
*/

// 最小全局模拟
window.ResponseLinter = window.ResponseLinter || {};
window.toastr = { info: console.log, warning: console.warn, success: console.log, error: console.error };
window.extension_settings = { 'response-linter': { notifications: { duration: 3 }, defaultAutoFixAction: 'preview' } };

// 简易断言
function assertEqual(actual, expected, name) {
  const ok = actual === expected;
  log(ok, name, { actual, expected });
  return ok;
}
function assertTrue(cond, name, extra) {
  const ok = !!cond;
  log(ok, name, extra);
  return ok;
}

const results = [];
function log(ok, name, data) {
  const entry = { ok, name, data };
  results.push(entry);
  const tag = ok ? '%c√' : '%c×';
  const color = ok ? 'color:#16a34a' : 'color:#dc2626';
  console.log(`${tag} ${name}`, color, data || '');
}

function summary() {
  const el = document.getElementById('result');
  const okCount = results.filter(r => r.ok).length;
  const total = results.length;
  el.innerHTML = `<p>通过 ${okCount} / ${total} 项</p>`;
}

// 导入核心模块
import { backendController as _bc } from './imports.js';

// 构建 imports.js 动态（避免 ES 模块相对路径噪声）
// 由于直接 import 路径需静态，我们在此手动拼装导入

/* imports.js 内容（虚拟说明）：
export { createBackendController } from '../core/backend-controller.js';
*/

// 直接在此处动态加载后端控制器（为简化，我们内联一个创建器）
import { createBackendController } from '../core/backend-controller.js';
const backendController = createBackendController('response-linter');

// 开启修复引擎（预览时需要）
import { autoFixEngine } from '../core/auto-fix-engine.js';
autoFixEngine.setEnabled(true);

// 初始化验证引擎所需设置
const baseRule = {
  id: 'r1',
  name: '双换行与顺序提示测试',
  enabled: true,
  requiredContent: ['<thinking>', '</thinking>', '<content>', '</content>'],
  fixStrategy: 'positional',
  positionalOptions: { doubleNewline: true },
};

const settings = {
  enabled: true,
  autoFix: false,
  rules: [JSON.parse(JSON.stringify(baseRule))],
};

backendController.initialize(settings);

function setCurrentRule(rule) {
  window.ResponseLinter.CurrentRule = rule;
}

// 用例 A：doubleNewline=true 时插入应为 \n\n<content>
(async function caseA() {
  const text = '</thinking>这里是内容</content>';
  const rule = { ...baseRule, positionalOptions: { doubleNewline: true } };
  setCurrentRule(rule);
  const res = backendController.validateContent(text, 'caseA');
  const preview = backendController.previewFix(text, res?.missingContent || [], 'positional');
  assertTrue(preview.success, 'A1: 预览成功');
  assertTrue(preview.newContent.includes('\n\n<content>') || preview.newContent.includes('\n\n<content>\n'), 'A2: 双换行生效', { snippet: preview.newContent.slice(0, 200) });
})();

// 用例 B：doubleNewline=false 时不应强制双换行
(async function caseB() {
  const text = '</thinking>这里是内容</content>';
  const rule = { ...baseRule, positionalOptions: { doubleNewline: false } };
  setCurrentRule(rule);
  const res = backendController.validateContent(text, 'caseB');
  const preview = backendController.previewFix(text, res?.missingContent || [], 'positional');
  assertTrue(preview.success, 'B1: 预览成功');
  const hasDouble = preview.newContent.includes('\n\n<content>');
  assertTrue(!hasDouble, 'B2: 双换行未强制', { snippet: preview.newContent.slice(0, 200) });
})();

// 用例 C：顺序错误，“之后”提示应出现
(async function caseC() {
  const text = '</thinking>\n<thinking>\n<content>\n</content>';
  const rule = { ...baseRule };
  setCurrentRule(rule);
  const res = backendController.validateContent(text, 'caseC');
  assertTrue(!!res && !res.isValid, 'C1: 验证失败触发');
  const msg = (res.errorDetails||[]).map(d=>d.message).join('\n');
  assertTrue(/之后/.test(msg), 'C2: 包含“之后”提示', { msg });
})();

// 用例 D：顺序错误，“之前”提示应出现（阶段1修复）
(async function caseD() {
  const text = '</thinking>\n<thinking>\n<content>\n</content>';
  const rule = { ...baseRule };
  setCurrentRule(rule);
  const res = backendController.validateContent(text, 'caseD');
  const msg = (res?.errorDetails||[]).map(d=>d.message).join('\n');
  assertTrue(/之前/.test(msg), 'D1: 包含“之前”提示', { msg });
})();

// 用例 E：before-next 模式：缺失 <content> 时应插入在 </content> 之前
(async function caseE() {
  const text = '</thinking>\n这里是正文\n</content>';
  const rule = { ...baseRule, fixStrategy: 'before-next', positionalOptions: { doubleNewline: true } };
  setCurrentRule(rule);
  const res = backendController.validateContent(text, 'caseE');
  const preview = backendController.previewFix(text, res?.missingContent || [], 'before-next');
  assertTrue(preview.success, 'E1: 预览成功');
  const idx = preview.newContent.indexOf('<content>');
  const nextIdx = preview.newContent.indexOf('</content>');
  assertTrue(idx !== -1 && nextIdx !== -1 && idx < nextIdx, 'E2: <content> 位于 </content> 之前', { snippet: preview.newContent.slice(idx - 10, nextIdx + 10) });
})();

setTimeout(summary, 300);

