// Response Linter 扩展 - 主入口文件
// UI层实现与真实后端功能集成

import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { callGenericPopup, POPUP_RESULT, POPUP_TYPE } from '../../../popup.js';
import { createBackendController } from './core/backend-controller.js';

// 扩展配置
const extensionName = 'response-linter';
// 以当前模块URL为基准解析扩展根目录，避免大小写/路径不一致导致模板404
const extensionFolderPath = new URL('.', import.meta.url).pathname.replace(/\/$/, '');

// 创建后端控制器实例
const backendController = createBackendController(extensionName);

// 兼容性桥：如果宿主环境未通过 getContext().callGenericPopup 暴露弹窗，则将核心的 callGenericPopup 挂到全局
try {
  if (!(window.getContext && getContext().callGenericPopup)) {
    // 提供全局回退，供 UI 子模块使用
    if (!window.callGenericPopup) window.callGenericPopup = callGenericPopup;
  }
} catch (e) {
  // 即使 getContext 不存在也保证回退可用
  if (!window.callGenericPopup) window.callGenericPopup = callGenericPopup;
}

// 默认设置结构
const defaultSettings = {
  enabled: false,
  autoFix: false,
  rules: [
    {
      id: 'thinking-content-demo',
      name: '思维链与内容格式',
      description: '确保AI回复包含思考过程和内容两个部分',
      enabled: true,
      requiredContent: ['<thinking>', '</thinking>', '<content>', '</content>'],
      fixStrategy: 'thinking-content',
      createdAt: new Date().toISOString(),
    },
  ],
  notifications: {
    enabled: true,
    duration: 5,
    showSuccess: true,
  },
  statistics: {
    validations: 0,
    fixes: 0,
    successRate: 100,
  },
};

// UIState对象已移除 - 功能已迁移到UIStateManager模块
// 通过模块化系统，UIState现在通过window.UIState全局访问
//
// 原始对象定义范围: 44-65行 (22行代码)
// 迁移位置: presentation/modules/ui-state-manager.js
// 全局访问: window.UIState (向后兼容)
// 模块访问: window.ResponseLinter.UIState
//
// 主要功能:
// - 状态属性: isExtensionEnabled, isAutoFixEnabled, rules, currentEditingRule, isGuideExpanded
// - getLatestAIMessageId() - 获取最新AI消息ID
// - updateStatusIndicator() - 更新状态指示器
// - updateStatistics() - 更新统计显示
// - toggleGuide() / loadGuideState() - 指引控制
// - checkAutoExpandGuide() - 自动展开检查
//
// 循环依赖解决:
// 原循环: UIState.rules ↔ RulesManager ↔ RuleEditor
// 现状态: 通过模块系统统一管理，避免循环依赖

// 真实验证和通知功能
// ValidationFunctions对象已移除 - 功能已迁移到ValidationFunctionsUI模块
// 通过模块化系统，ValidationFunctions现在通过window.ValidationFunctions全局访问

/**
 * 显示修复确认对话框
 * @param {string} messageId - 消息ID
 * @param {string} originalContent - 原始内容
 * @param {string} newContent - 修复后内容
 * @param {string} strategy - 修复策略
 */
async function showFixConfirmationDialog(messageId, originalContent, newContent, strategy) {
  const strategyNames = {
    'thinking-content': '思维链格式修复',
    'add-missing-tags': '添加缺失标签',
    custom: '自定义修复',
  };

  const strategyName = strategyNames[strategy] || strategy;
  const preview = newContent.length > 200 ? newContent.substring(0, 200) + '...' : newContent;

  const dialogContent = `
    <div class="rl-fix-confirmation-dialog">
      <h3>确认自动修复</h3>
      <p><strong>修复策略</strong>: ${strategyName}</p>
      <p><strong>消息ID</strong>: ${messageId}</p>

      <div class="rl-content-preview">
        <h4>修复后内容预览：</h4>
        <pre style="max-height: 150px; overflow-y: auto; background: var(--SmartThemeBodyColor); padding: 10px; border-radius: 4px; text-align: left;">${escapeHtml(
          preview,
        )}</pre>
      </div>
    </div>
  `;

  try {
    const result = await callGenericPopup(dialogContent, POPUP_TYPE.CONFIRM, '', {
      wide: false,
      customButtons: [
        {
          text: '应用修复',
          result: POPUP_RESULT.AFFIRMATIVE,
          classes: ['menu_button'],
        },
        {
          text: '取消',
          result: POPUP_RESULT.NEGATIVE,
          classes: ['menu_button', 'secondary'],
        },
      ],
    });

    if (result === POPUP_RESULT.AFFIRMATIVE) {
      // 用户确认修复
      try {
        const confirmResult = await backendController.confirmFix(messageId, true);
        if (confirmResult.success) {
          toastr.success('修复已应用', '响应检查器');
        } else {
          toastr.error(confirmResult.reason || '修复确认失败', '响应检查器');
        }
      } catch (error) {
        console.error('确认修复失败:', error);
        toastr.error('确认过程出错', '响应检查器');
      }
    } else {
      // 用户取消修复
      try {
        await backendController.confirmFix(messageId, false);
        toastr.info('修复已取消', '响应检查器');
      } catch (error) {
        console.error('取消修复失败:', error);
      }
    }
  } catch (error) {
    console.error('显示修复确认对话框失败:', error);
    toastr.error('显示确认对话框出错', '响应检查器');
  }
}

/**
 * HTML转义函数
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// RulesManager对象已移除 - 功能已迁移到RulesManagerUI模块
// 通过模块化系统，RulesManager现在通过window.RulesManager全局访问
//
// 原始对象定义范围: 252-418行 (167行代码)
// 迁移位置: presentation/modules/rules-manager-ui.js
// 全局访问: window.RulesManager (向后兼容)
// 模块访问: window.ResponseLinter.RulesManager
//
// 主要功能:
// - renderRulesList() - 渲染规则列表
// - createRuleElement() - 创建规则元素
// - addRule() / editRule() / deleteRule() - 规则CRUD操作
// - toggleRule() - 规则状态切换
// - saveRules() - 规则持久化
// - exportRules() / importRules() - 规则导入导出

// RulesManager的addTemplate方法已移除
// 功能已完整迁移到RulesManagerUI模块中

// RuleEditor对象已移除 - 功能已迁移到RuleEditorUI模块
// 通过模块化系统，RuleEditor现在通过window.RuleEditor全局访问
//
// 原始对象定义范围: 271-474行 (204行代码)
// 迁移位置: presentation/modules/rule-editor-ui.js
// 全局访问: window.RuleEditor (向后兼容)
// 模块访问: window.ResponseLinter.RuleEditor
//
// 主要功能:
// - showAddModal() / showEditModal() - 模态框显示控制
// - showModal() / hideModal() - 模态框基础控制
// - addContentTag() / removeContentTag() - 标签管理
// - updateTagsList() - 标签列表更新
// - enableDragSort() - 拖拽排序功能
// - toggleCustomStrategy() - 策略字段切换
// - saveRule() - 规则保存 (已移除，解决循环依赖)
//
// 循环依赖解决:
// 原循环: RuleEditor.saveRule() → RulesManager.addRule()/editRule() →
//         RulesManager.renderRulesList() → createRuleElement() →
//         编辑按钮绑定 → RuleEditor.showEditModal()
// 现状态: 通过模块系统统一管理，避免循环依赖

// ConfigWizard对象已移除 - 功能已迁移到ConfigWizardUI模块
// 通过模块化系统，ConfigWizard现在通过window.ConfigWizard全局访问
//
// 原始对象定义范围: 707-1153行 (447行代码)
// 迁移位置: presentation/modules/config-wizard-ui.js
// 全局访问: window.ConfigWizard (向后兼容)
// 模块访问: window.ResponseLinter.ConfigWizard
//
// 主要功能:
// - show() / hide() - 显示/隐藏配置向导
// - next() / prev() / finish() - 向导流程控制
// - validateCurrentStep() - 步骤验证
// - testRule() - 规则测试功能
// - generateRuleData() - 生成规则数据
//
// 依赖关系:
// - RulesManager.addRule() - 创建规则
// - backendController - 规则测试
// - toastr - 通知显示
// - jQuery - DOM操作

// ConfigWizard对象的所有孤立方法已移除
// 所有功能已完整迁移到ConfigWizardUI模块中

// 设置管理
function loadSettings() {
  // 如果设置不存在则初始化
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  const settings = extension_settings[extensionName];

  // 更新UI状态
  UIState.isExtensionEnabled = settings.enabled;
  UIState.isAutoFixEnabled = settings.autoFix;
  UIState.rules = settings.rules || [];

  // 更新UI控件
  $('#rl-enabled').prop('checked', settings.enabled);
  $('#rl-auto-fix').prop('checked', settings.autoFix);
  $('#rl-notification-duration').val(settings.notifications.duration);
  $('#rl-duration-display').text(settings.notifications.duration + '秒');
  $('#rl-show-success').prop('checked', settings.notifications.showSuccess);

  // 渲染规则并更新状态
  RulesManager.renderRulesList();
  UIState.updateStatistics();
  UIState.loadGuideState(); // 加载指引展开状态

  // 初始化后端系统
  backendController.initialize(settings);

  // 暴露后端控制器到全局作用域供UI模块使用
  window.backendController = backendController;
}

function saveSettings() {
  const settings = extension_settings[extensionName];

  settings.enabled = UIState.isExtensionEnabled;
  settings.autoFix = UIState.isAutoFixEnabled;
  settings.notifications.duration = parseInt($('#rl-notification-duration').val());
  settings.notifications.showSuccess = $('#rl-show-success').prop('checked');

  // 同步更新后端设置
  backendController.updateSettings(settings);

  saveSettingsDebounced();
}

// 后端事件处理器
function setupBackendEventHandlers() {
  // 监听验证失败事件
  document.addEventListener('responseLinter.validationFailed', event => {
    const { result } = event.detail;
    ValidationFunctions.showDetailedValidationNotification(result);
    UIState.updateStatistics();
  });

  // 监听验证通过事件
  document.addEventListener('responseLinter.validationPassed', event => {
    if (extension_settings[extensionName].notifications.showSuccess) {
      toastr.success('消息验证通过', '响应检查器', { timeOut: 2000 });
    }
    UIState.updateStatistics();
  });

  // ============ 修复相关事件监听器 ============

  // 监听修复确认请求事件
  document.addEventListener('responseLinter.confirmationRequired', event => {
    const { messageId, originalContent, newContent, strategy, dialogContent } = event.detail;
    // 异步调用修复确认对话框（不需要等待）
    showFixConfirmationDialog(messageId, originalContent, newContent, strategy);
  });

  // 监听修复应用成功事件
  document.addEventListener('responseLinter.fixApplied', event => {
    const { task, fixResult } = event.detail;
    toastr.success(`修复成功应用 - ${task.fixStrategy}`, '响应检查器');
    UIState.updateStatistics();
  });

  // 监听修复确认事件
  document.addEventListener('responseLinter.fixConfirmed', event => {
    const { messageId } = event.detail;
    toastr.success('修复已确认应用', '响应检查器');
    UIState.updateStatistics();
  });

  // 监听修复取消事件
  document.addEventListener('responseLinter.fixCancelled', event => {
    const { messageId } = event.detail;
    toastr.info('修复操作已取消', '响应检查器');
    UIState.updateStatistics();
  });

  // 监听修复撤销事件
  document.addEventListener('responseLinter.fixUndone', event => {
    const { messageId, steps } = event.detail;
    toastr.info(`已撤销 ${steps} 步修复操作`, '响应检查器');
    UIState.updateStatistics();
  });

  // 监听重新验证通过事件
  document.addEventListener('responseLinter.revalidationPassed', event => {
    const { messageId } = event.detail;
    toastr.success('修复后验证通过', '响应检查器', { timeOut: 2000 });
  });

  // 监听重新验证失败事件
  document.addEventListener('responseLinter.revalidationFailed', event => {
    const { messageId } = event.detail;
    toastr.warning('修复后仍有验证问题', '响应检查器');
  });

  // 监听后端状态变化
  document.addEventListener('responseLinter.backendStarted', () => {
    UIState.updateStatusIndicator();
    console.log('后端服务已启动');
  });

  document.addEventListener('responseLinter.backendStopped', () => {
    UIState.updateStatusIndicator();
    console.log('后端服务已停止');
  });
}

// 事件处理器设置
function setupEventHandlers() {
  // 主要控件
  $('#rl-enabled').on('change', function () {
    UIState.isExtensionEnabled = $(this).prop('checked');
    UIState.updateStatusIndicator();
    saveSettings();

    const status = UIState.isExtensionEnabled ? '已启用' : '已禁用';
    toastr.info(`响应检查器${status}`, '响应检查器');
  });

  $('#rl-auto-fix').on('change', function () {
    UIState.isAutoFixEnabled = $(this).prop('checked');
    saveSettings();
  });

  // 通知设置
  $('#rl-notification-duration').on('input', function () {
    const value = $(this).val();
    $('#rl-duration-display').text(value + '秒');
    saveSettings();
  });

  $('#rl-show-success').on('change', saveSettings);

  // 安全加载 ConfigWizard（若尚未初始化，进行懒加载）
  async function ensureConfigWizard() {
    try {
      if (!window.ConfigWizard) {
        const { ConfigWizardUI } = await import('./presentation/modules/config-wizard-ui.js');
        await ConfigWizardUI.initialize();
      }
    } catch (e) {
      console.error('加载配置向导模块失败:', e);
    }
    return window.ConfigWizard;
  }

  // 安全加载 RuleEditor（若尚未初始化，进行懒加载）
  async function ensureRuleEditor() {
    try {
      if (!window.RuleEditor) {
        const { RuleEditorUI } = await import('./presentation/modules/rule-editor-ui.js');
        await RuleEditorUI.initialize();
      }
    } catch (e) {
      console.error('加载规则编辑器模块失败:', e);
    }
    return window.RuleEditor;
  }

  // 安全加载 RulesManager（若尚未初始化，进行懒加载）
  async function ensureRulesManager() {
    try {
      if (!window.RulesManager) {
        const { RulesManagerUI } = await import('./presentation/modules/rules-manager-ui.js');
        await RulesManagerUI.initialize();
      }
    } catch (e) {
      console.error('加载规则管理器模块失败:', e);
    }
    return window.RulesManager;
  }

  // 规则管理按钮（使用懒加载确保可用）
  $('#rl-add-rule').on('click', async () => (await ensureRuleEditor())?.showAddModal());
  $('#rl-demo-validation').on('click', async () => (await ensureRulesManager()) && ValidationFunctions?.triggerManualValidation?.());
  $('#rl-import-rules').on('click', async () => (await ensureRulesManager())?.importRules?.());
  $('#rl-export-rules').on('click', async () => (await ensureRulesManager())?.exportRules?.());

  // 模板按钮事件（确保RulesManager存在）
  $('#rl-template-thinking').on('click', async () => (await ensureRulesManager())?.addTemplate('thinking'));
  $('#rl-template-code').on('click', async () => (await ensureRulesManager())?.addTemplate('code'));
  $('#rl-template-qa').on('click', async () => (await ensureRulesManager())?.addTemplate('qa'));

  // 配置向导事件（懒加载，确保模块已初始化）
  $('#rl-config-wizard').on('click', async () => { const CW = await ensureConfigWizard(); if (CW && CW.show) CW.show(); });
  $('#rl-close-wizard, #rl-wizard-cancel').on('click', async () => { const CW = await ensureConfigWizard(); if (CW && CW.hide) CW.hide(); });
  $('#rl-wizard-prev').on('click', async () => { const CW = await ensureConfigWizard(); if (CW && CW.prev) CW.prev(); });
  $('#rl-wizard-next').on('click', async () => { const CW = await ensureConfigWizard(); if (CW && CW.next) CW.next(); });
  $('#rl-wizard-finish').on('click', async () => { const CW = await ensureConfigWizard(); if (CW && CW.finish) CW.finish(); });
  $('#rl-wizard-test-btn').on('click', async () => { const CW = await ensureConfigWizard(); if (CW && CW.testRule) CW.testRule(); });

  // 向导模式选择事件
  $(document).on('click', '.rl-wizard-option', async function () {
    $('.rl-wizard-option').removeClass('selected');
    $(this).addClass('selected');
    const CW = await ensureConfigWizard();
    if (CW) CW.selectedMode = $(this).data('mode');
  });

  // 使用指引展开/收起按钮事件
  $('#rl-toggle-guide').on('click', () => UIState.toggleGuide());

  // 统计
  $('#rl-reset-stats').on('click', function () {
    backendController.resetStatistics();
    const settings = extension_settings[extensionName];
    settings.statistics = {
      validations: 0,
      fixes: 0,
      fixAttempts: 0,
      cancellations: 0,
      successRate: 100,
    };
    UIState.updateStatistics();
    saveSettings();
    toastr.info('统计已重置', '响应检查器');
  });

  // 手动修复功能
  $('#rl-manual-fix').on('click', async function () {
    const button = $(this);
    const originalText = button.text();

    try {
      button.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> 修复中...');

      // 获取最新AI消息的ID
      const latestMessageId = UIState.getLatestAIMessageId();
      if (!latestMessageId) {
        toastr.warning('没有找到可修复的AI消息', '响应检查器');
        return;
      }

      // 调用后端修复API
      const result = await backendController.triggerManualFix(latestMessageId);

      if (result.success) {
        toastr.success('修复任务已提交', '响应检查器');
        UIState.updateStatistics();
      } else {
        toastr.error(result.reason || '修复失败', '响应检查器');
      }
    } catch (error) {
      console.error('手动修复失败:', error);
      toastr.error('修复过程出错', '响应检查器');
    } finally {
      button.prop('disabled', false).html(originalText);
    }
  });

  // 规则编辑器模态框事件
  $('#rl-close-editor, #rl-cancel-rule').on('click', () => RuleEditor.hideModal());
  $('#rl-save-rule').on('click', () => RuleEditor.saveRule());

  // 规则编辑器表单事件
  $('#rl-add-content').on('click', () => RuleEditor.addContentTag());
  $('#rl-new-content').on('keypress', function (e) {
    if (e.which === 13) {
      e.preventDefault();
      RuleEditor.addContentTag();
    }
  });

  $('#rl-rule-strategy').on('change', () => RuleEditor.toggleCustomStrategy());

  // 规则项目的动态事件处理器
  $(document).on('change', '.rl-rule-enabled', function () {
    const ruleId = $(this).closest('.rl-rule-item').data('rule-id');
    const enabled = $(this).prop('checked');
    RulesManager.toggleRule(ruleId, enabled);
  });

  $(document).on('click', '.rl-edit-rule', function () {
    const ruleId = $(this).closest('.rl-rule-item').data('rule-id');
    RuleEditor.showEditModal(ruleId);
  });

  $(document).on('click', '.rl-delete-rule', function () {
    const ruleId = $(this).closest('.rl-rule-item').data('rule-id');
    const rule = UIState.rules.find(r => r.id === ruleId);

    if (confirm(`确定要删除规则"${rule.name}"吗？`)) {
      RulesManager.deleteRule(ruleId);
    }
  });

  // 保留旧标签系统的兼容性
  $(document).on('click', '.rl-remove-tag', function () {
    const content = $(this).data('content');
    RuleEditor.removeContentTag(content);
  });

  // 新滑块系统的事件绑定（由模块内部处理，这里保留作为备用）
  $(document).on('click', '.rl-delete-content', function (e) {
    e.stopPropagation();
    const content = $(this).closest('.rl-content-item').data('content');
    if (content && window.ResponseLinter?.RuleEditor) {
      window.ResponseLinter.RuleEditor.removeContentTag(content);
    }
  });

  $(document).on('change', '.rl-content-enabled', function (e) {
    const itemEl = $(this).closest('.rl-content-item')[0];
    const enabled = $(this).prop('checked');
    if (itemEl && window.ResponseLinter?.RuleEditor) {
      window.ResponseLinter.RuleEditor.toggleContentItem(itemEl, enabled);
    }
  });

  // 点击外部关闭模态框
  $('#rl-rule-editor-modal').on('click', function (e) {
    if (e.target === this) {
      RuleEditor.hideModal();
    }
  });

  // 配置向导模态框事件：点击遮罩弹确认再关闭（默认行为）
  $('#rl-config-wizard-modal').on('click', async function (e) {
    if (e.target === this) {
      if (window.confirm('关闭配置向导？当前进度将不会保存。')) {
        const CW = await ensureConfigWizard();
        if (CW) CW.hide();
      }
    }
  });
}

// 扩展初始化
jQuery(async () => {
  let initializationMode = 'unknown';
  let moduleInitSuccess = false;

  try {
    console.log('🚀 Response Linter扩展开始初始化...');

    // 🔒 核心UI注册逻辑 - 绝对不能修改
    console.log('📂 加载HTML模板...');
    const settingsHtml = await $.get(`${extensionFolderPath}/presentation/templates/settings.html`);
    const editorHtml = await $.get(`${extensionFolderPath}/presentation/templates/rule-editor.html`);

    // 🔒 添加到扩展设置面板 - 绝对不能修改
    $('#extensions_settings2').append(settingsHtml);
    $('body').append(editorHtml);
    console.log('✅ HTML模板加载完成');

    // 🆕 尝试模块化初始化
    try {
      console.log('🔧 尝试模块化初始化...');

      // 动态导入UI模块管理器
      const { UIModuleManager } = await import('./presentation/modules/ui-module-manager.js');

      // 尝试初始化模块
      moduleInitSuccess = await UIModuleManager.initialize();

      if (moduleInitSuccess) {
        console.log('🎉 模块化初始化成功！');
        initializationMode = 'modular';
      } else {
        console.log('⚠️ 模块化初始化失败，回退到兼容模式');
        initializationMode = 'fallback';
      }
    } catch (moduleError) {
      console.error('❌ 模块化初始化出错，回退到兼容模式:', moduleError);
      moduleInitSuccess = false;
      initializationMode = 'fallback';
    }

    // 🔄 兼容模式初始化（原有逻辑）
    if (!moduleInitSuccess) {
      console.log('🔧 使用兼容模式初始化...');

      // 设置事件处理器（原有逻辑）
      setupEventHandlers();
      setupBackendEventHandlers();

      console.log('✅ 兼容模式初始化完成');
    } else {
      // 模块化模式仍需要这些函数，但将来会移到模块中
      setupEventHandlers();
      setupBackendEventHandlers();
    }

    // 🔧 加载设置（两种模式都需要）
    loadSettings();

    // 🎯 暴露全局访问点用于调试
    window.ResponseLinter = window.ResponseLinter || {};
    window.ResponseLinter.initializationMode = initializationMode;
    window.ResponseLinter.moduleInitSuccess = moduleInitSuccess;
    window.ResponseLinter.backendController = backendController;

    console.log(`🎉 Response Linter扩展初始化完成 [模式: ${initializationMode}]`);
  } catch (error) {
    console.error('💥 Response Linter扩展初始化失败:', error);
    toastr.error('响应检查器扩展加载失败', '扩展错误');

    // 记录错误信息用于调试
    window.ResponseLinter = window.ResponseLinter || {};
    window.ResponseLinter.initializationError = error;
    window.ResponseLinter.initializationMode = 'failed';
  }
});
