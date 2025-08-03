// Response Linter 扩展 - 主入口文件
// UI层实现与真实后端功能集成

import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { callGenericPopup, POPUP_RESULT, POPUP_TYPE } from '../../../popup.js';
import { createBackendController } from './core/backend-controller.js';

// 扩展配置
const extensionName = 'response-linter';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// 创建后端控制器实例
const backendController = createBackendController(extensionName);

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

// UI状态管理
const UIState = {
  isExtensionEnabled: false,
  isAutoFixEnabled: false,
  rules: [],
  currentEditingRule: null,
  isGuideExpanded: false, // 新增：使用指引展开状态

  // 获取最新AI消息的ID
  getLatestAIMessageId() {
    try {
      // 使用jQuery查找最后一个AI消息
      const aiMessages = $('#chat .mes').filter(function () {
        return !$(this).hasClass('user_mes');
      });

      if (aiMessages.length > 0) {
        const latestMessage = aiMessages.last();
        return latestMessage.attr('mesid') || null;
      }

      return null;
    } catch (error) {
      console.error('获取最新AI消息ID失败:', error);
      return null;
    }
  },

  // 更新状态指示器
  updateStatusIndicator() {
    const indicator = $('#rl-status-indicator');
    const backendStatus = backendController.getStatus();

    if (!this.isExtensionEnabled) {
      indicator.removeClass('active warning error').addClass('disabled');
      indicator.attr('title', '扩展已禁用');
    } else if (!backendStatus.isRunning) {
      indicator.removeClass('active disabled error').addClass('warning');
      indicator.attr('title', '后端服务未运行');
    } else if (this.rules.filter(r => r.enabled).length === 0) {
      indicator.removeClass('active disabled error').addClass('warning');
      indicator.attr('title', '无活跃规则');
    } else {
      indicator.removeClass('disabled warning error').addClass('active');
      indicator.attr('title', '扩展运行中');
    }

    // 智能指引：如果无规则且指引未展开，自动展开
    this.checkAutoExpandGuide();
  },

  // 检查是否需要自动展开指引
  checkAutoExpandGuide() {
    const hasRules = this.rules.length > 0;
    const isEnabled = this.isExtensionEnabled;

    // 如果扩展已启用但没有规则，且指引当前收起，则自动展开
    if (isEnabled && !hasRules && !this.isGuideExpanded) {
      this.toggleGuide(true);
      toastr.info('建议先添加验证规则来开始使用扩展', '响应检查器', { timeOut: 3000 });
    }
  },

  // 切换使用指引展开状态
  toggleGuide(forceExpand = null) {
    const content = $('#rl-guide-content');
    const toggle = $('#rl-toggle-guide');

    if (forceExpand !== null) {
      this.isGuideExpanded = forceExpand;
    } else {
      this.isGuideExpanded = !this.isGuideExpanded;
    }

    if (this.isGuideExpanded) {
      content.slideDown(300);
      toggle.addClass('expanded');
    } else {
      content.slideUp(300);
      toggle.removeClass('expanded');
    }

    // 保存指引展开状态到本地存储
    localStorage.setItem('rl-guide-expanded', this.isGuideExpanded);
  },

  // 加载指引展开状态
  loadGuideState() {
    const savedState = localStorage.getItem('rl-guide-expanded');
    if (savedState !== null) {
      this.isGuideExpanded = savedState === 'true';
      if (this.isGuideExpanded) {
        $('#rl-guide-content').show();
        $('#rl-toggle-guide').addClass('expanded');
      }
    }
  },

  // 更新统计显示
  updateStatistics() {
    const stats = backendController.getStatistics();
    const fixStats = backendController.getFixStatistics();

    $('#rl-stat-validations').text(stats.totalValidations);
    $('#rl-stat-fixes').text(stats.successfulFixes);
    $('#rl-stat-fix-attempts').text(stats.totalFixAttempts);
    $('#rl-stat-cancellations').text(stats.userCancellations);
    $('#rl-stat-fix-success').text(fixStats.successRate + '%');
    $('#rl-stat-success').text(stats.successRate + '%');

    // 更新手动修复按钮状态
    const latestMessageId = this.getLatestAIMessageId();
    $('#rl-manual-fix').prop('disabled', !latestMessageId || !this.isExtensionEnabled);
  },
};

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

// 规则管理器
const RulesManager = {
  // 渲染规则列表
  renderRulesList() {
    const container = $('#rl-rules-list');
    container.empty();

    UIState.rules.forEach(rule => {
      const ruleElement = this.createRuleElement(rule);
      container.append(ruleElement);
    });

    UIState.updateStatusIndicator();
  },

  // 从模板创建规则元素
  createRuleElement(rule) {
    const template = $('#rl-rule-item-template').prop('content');
    const element = $(template.cloneNode(true));

    element.find('.rl-rule-item').attr('data-rule-id', rule.id);
    element.find('.rl-rule-name').text(rule.name);
    element.find('.rl-rule-description').text(rule.description || '无描述');
    element.find('.rl-rule-enabled').prop('checked', rule.enabled);

    // 添加必需内容标签
    const tagsContainer = element.find('.rl-rule-tags');
    rule.requiredContent.forEach(content => {
      const tag = $(`<span class="rl-tag">${content}</span>`);
      tagsContainer.append(tag);
    });

    // 应用禁用状态
    if (!rule.enabled) {
      element.find('.rl-rule-item').addClass('disabled');
    }

    return element;
  },

  // 添加新规则
  addRule(ruleData) {
    const newRule = {
      id: 'rule_' + Date.now(),
      name: ruleData.name,
      description: ruleData.description,
      enabled: ruleData.enabled,
      requiredContent: ruleData.requiredContent,
      fixStrategy: ruleData.fixStrategy,
      createdAt: new Date().toISOString(),
    };

    UIState.rules.push(newRule);
    this.saveRules();
    this.renderRulesList();

    toastr.success(`规则"${newRule.name}"添加成功！`, '响应检查器');
  },

  // 编辑现有规则
  editRule(ruleId, ruleData) {
    const ruleIndex = UIState.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      UIState.rules[ruleIndex] = {
        ...UIState.rules[ruleIndex],
        name: ruleData.name,
        description: ruleData.description,
        enabled: ruleData.enabled,
        requiredContent: ruleData.requiredContent,
        fixStrategy: ruleData.fixStrategy,
        positionalOptions: ruleData.positionalOptions, // 新增：保存位置感知选项
        updatedAt: new Date().toISOString(),
      };

      this.saveRules();
      this.renderRulesList();

      toastr.success(`规则"${ruleData.name}"更新成功！`, '响应检查器');
    }
  },

  // 删除规则
  deleteRule(ruleId) {
    const rule = UIState.rules.find(r => r.id === ruleId);
    if (rule) {
      UIState.rules = UIState.rules.filter(r => r.id !== ruleId);
      this.saveRules();
      this.renderRulesList();

      toastr.info(`规则"${rule.name}"已删除`, '响应检查器');
    }
  },

  // 切换规则启用状态
  toggleRule(ruleId, enabled) {
    const rule = UIState.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.saveRules();
      this.renderRulesList();
    }
  },

  // 保存规则到扩展设置
  saveRules() {
    extension_settings[extensionName].rules = UIState.rules;

    // 同步更新后端规则
    backendController.updateSettings(extension_settings[extensionName]);

    saveSettingsDebounced();
  },

  // 导出规则为JSON文件
  exportRules() {
    const dataStr = JSON.stringify(UIState.rules, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'response-linter-rules.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toastr.success('规则导出成功！', '响应检查器');
  },

  // 从JSON文件导入规则
  importRules() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = event => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = e => {
        try {
          const importedRules = JSON.parse(e.target.result);
          if (Array.isArray(importedRules)) {
            // 分配新ID以避免冲突
            importedRules.forEach(rule => {
              rule.id = Date.now() + Math.random();
              UIState.rules.push(rule);
            });

            this.saveRules();
            this.renderRulesList();
            toastr.success(`成功导入 ${importedRules.length} 条规则！`, '响应检查器');
          } else {
            throw new Error('无效的规则文件格式');
          }
        } catch (error) {
          console.error('导入规则失败:', error);
          toastr.error('导入失败：' + error.message, '响应检查器');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  },

  // 新增：添加预设规则模板
  addTemplate(templateType) {
    const templates = {
      thinking: {
        name: '思维链验证',
        description: '验证AI回复包含正确的思考过程和内容格式',
        requiredContent: ['<thinking>', '</thinking>', '<content>', '</content>'],
        fixStrategy: 'positional',
        positionalOptions: { doubleNewline: true },
        enabled: true,
      },
      code: {
        name: '代码块验证',
        description: '验证代码回复包含正确的代码块标记',
        requiredContent: ['```', '```'],
        fixStrategy: 'add-missing-tags',
        enabled: true,
      },
      qa: {
        name: '问答格式验证',
        description: '验证问答回复包含问题和答案部分',
        requiredContent: ['## 问题', '## 答案'],
        fixStrategy: 'positional',
        positionalOptions: { doubleNewline: true },
        enabled: true,
      },
    };

    const template = templates[templateType];
    if (!template) {
      toastr.error('未知的模板类型', '响应检查器');
      return;
    }

    // 检查是否已存在相同名称的规则
    const existingRule = UIState.rules.find(rule => rule.name === template.name);
    if (existingRule) {
      toastr.warning('该模板规则已存在', '响应检查器');
      return;
    }

    // 创建新规则
    const newRule = {
      id: Date.now() + Math.random(),
      ...template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    UIState.rules.push(newRule);
    this.saveRules();
    this.renderRulesList();

    toastr.success(`成功添加"${template.name}"模板规则！`, '响应检查器');
  },
};

// 规则编辑器模态框
const RuleEditor = {
  currentTags: [],

  // 显示添加新规则的模态框
  showAddModal() {
    this.currentTags = [];
    $('#rl-editor-title').text('添加新规则');
    $('#rl-rule-form')[0].reset();
    $('#rl-rule-enabled').prop('checked', true);
    this.updateTagsList();
    this.showModal();
  },

  // 显示编辑现有规则的模态框
  showEditModal(ruleId) {
    const rule = UIState.rules.find(r => r.id === ruleId);
    if (!rule) return;

    UIState.currentEditingRule = ruleId;
    this.currentTags = [...rule.requiredContent];

    $('#rl-editor-title').text('编辑规则');
    $('#rl-rule-name').val(rule.name);
    $('#rl-rule-description').val(rule.description || '');
    $('#rl-rule-strategy').val(rule.fixStrategy || '');
    $('#rl-rule-enabled').prop('checked', rule.enabled);

    // 新增：设置位置感知修复选项
    if (rule.positionalOptions) {
      $('#rl-insert-double-newline').prop('checked', rule.positionalOptions.doubleNewline !== false);
    } else {
      $('#rl-insert-double-newline').prop('checked', true); // 默认启用
    }

    this.updateTagsList();
    this.toggleCustomStrategy();
    this.togglePositionalStrategy(); // 新增：切换位置感知策略显示
    this.showModal();
  },

  // 显示模态框
  showModal() {
    $('#rl-rule-editor-modal').fadeIn(200);
    $('#rl-rule-name').focus();
  },

  // 隐藏模态框
  hideModal() {
    $('#rl-rule-editor-modal').fadeOut(200);
    UIState.currentEditingRule = null;
    this.currentTags = [];
  },

  // 添加内容标签
  addContentTag() {
    const input = $('#rl-new-content');
    const content = input.val().trim();

    if (content && !this.currentTags.includes(content)) {
      this.currentTags.push(content);
      this.updateTagsList();
      input.val('').focus();
    }
  },

  // 移除内容标签
  removeContentTag(content) {
    this.currentTags = this.currentTags.filter(tag => tag !== content);
    this.updateTagsList();
  },

  // 更新标签列表显示
  updateTagsList() {
    const container = $('#rl-required-content-list');
    container.empty();

    this.currentTags.forEach((content, index) => {
      // 安全地创建DOM元素，避免HTML注入问题
      const tag = $('<div>').addClass('rl-content-tag').attr('draggable', 'true').attr('data-index', index);

      const span = $('<span>').text(content); // 使用.text()安全地设置文本内容
      const removeBtn = $('<button>')
        .attr('type', 'button')
        .addClass('rl-remove-tag')
        .attr('data-content', content) // 使用.attr()安全地设置属性
        .text('×');

      tag.append(span).append(removeBtn);
      container.append(tag);
    });

    // 启用拖拽排序功能
    this.enableDragSort();
  },

  // 启用拖拽排序功能
  enableDragSort() {
    const container = $('#rl-required-content-list')[0];
    let draggedElement = null;

    // 拖拽开始
    container.addEventListener('dragstart', e => {
      if (e.target.classList.contains('rl-content-tag')) {
        draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    // 拖拽结束
    container.addEventListener('dragend', e => {
      if (e.target.classList.contains('rl-content-tag')) {
        e.target.classList.remove('dragging');
        draggedElement = null;
      }
    });

    // 拖拽悬停
    container.addEventListener('dragover', e => {
      e.preventDefault();
      const afterElement = this.getDragAfterElement(container, e.clientY);
      if (afterElement == null) {
        container.appendChild(draggedElement);
      } else {
        container.insertBefore(draggedElement, afterElement);
      }
    });

    // 拖拽放置
    container.addEventListener('drop', e => {
      e.preventDefault();
      this.updateTagsOrderFromDOM();
    });
  },

  // 获取拖拽后的位置元素
  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.rl-content-tag:not(.dragging)')];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY },
    ).element;
  },

  // 从DOM更新标签顺序
  updateTagsOrderFromDOM() {
    const tagElements = $('#rl-required-content-list .rl-content-tag');
    const newOrder = [];

    tagElements.each((index, element) => {
      const content = $(element).find('span').text();
      newOrder.push(content);
    });

    this.currentTags = newOrder;
    console.log('标签顺序已更新:', newOrder);
  },

  // 切换自定义策略字段
  toggleCustomStrategy() {
    const strategy = $('#rl-rule-strategy').val();
    const customSection = $('#rl-custom-strategy');
    const positionalSection = $('#rl-positional-strategy');

    if (strategy === 'custom') {
      customSection.show();
      positionalSection.hide();
    } else if (strategy === 'positional') {
      customSection.hide();
      positionalSection.show();
    } else {
      customSection.hide();
      positionalSection.hide();
    }
  },

  // 切换位置感知策略字段（已废弃，合并到toggleCustomStrategy中）
  togglePositionalStrategy() {
    // 此方法已合并到toggleCustomStrategy中
    // 保留以避免破坏现有调用
  },

  // 保存规则
  saveRule() {
    const formData = {
      name: $('#rl-rule-name').val().trim(),
      description: $('#rl-rule-description').val().trim(),
      enabled: $('#rl-rule-enabled').prop('checked'),
      requiredContent: this.currentTags,
      fixStrategy: $('#rl-rule-strategy').val(),
      positionalOptions: {
        // 新增：保存位置感知选项
        doubleNewline: $('#rl-insert-double-newline').prop('checked'),
      },
    };

    // 验证
    if (!formData.name) {
      toastr.error('规则名称为必填项！', '响应检查器');
      return;
    }

    if (formData.requiredContent.length === 0) {
      toastr.error('至少需要一个必需内容项！', '响应检查器');
      return;
    }

    // 保存或更新规则
    if (UIState.currentEditingRule) {
      RulesManager.editRule(UIState.currentEditingRule, formData);
    } else {
      RulesManager.addRule(formData);
    }

    this.hideModal();
  },
};

// 配置向导
const ConfigWizard = {
  currentStep: 1,
  selectedMode: null,
  wizardData: {},

  // 显示配置向导
  show() {
    this.currentStep = 1;
    this.selectedMode = null;
    this.wizardData = {};

    $('#rl-config-wizard-modal').fadeIn(200);
    this.updateStepDisplay();
    this.updateButtons();
  },

  // 隐藏配置向导
  hide() {
    $('#rl-config-wizard-modal').fadeOut(200);
  },

  // 下一步
  next() {
    if (this.validateCurrentStep()) {
      if (this.currentStep < 4) {
        this.currentStep++;
        this.updateStepDisplay();
        this.updateButtons();
        this.loadStepContent();
      }
    }
  },

  // 上一步
  prev() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateStepDisplay();
      this.updateButtons();
    }
  },

  // 完成向导
  finish() {
    if (this.validateCurrentStep()) {
      const ruleData = this.generateRuleData();
      RulesManager.addRule(ruleData);
      this.hide();
      toastr.success('配置向导完成！规则已成功创建', '响应检查器');
    }
  },

  // 验证当前步骤
  validateCurrentStep() {
    switch (this.currentStep) {
      case 1:
        if (!this.selectedMode) {
          toastr.warning('请选择一个验证模式', '配置向导');
          return false;
        }
        return true;
      case 2:
        return this.validateStepTwo();
      case 3:
        return true; // 测试步骤是可选的
      case 4:
        const name = $('#rl-wizard-rule-name').val().trim();
        if (!name) {
          toastr.warning('请输入规则名称', '配置向导');
          $('#rl-wizard-rule-name').focus();
          return false;
        }
        return true;
      default:
        return true;
    }
  },

  // 验证第二步
  validateStepTwo() {
    // 验证逻辑将根据选择的模式而有所不同
    return this.wizardData.requiredContent && this.wizardData.requiredContent.length > 0;
  },

  // 更新步骤显示
  updateStepDisplay() {
    // 更新步骤指示器
    $('.rl-wizard-step').each((index, element) => {
      const step = $(element);
      const stepNumber = parseInt(step.data('step'));

      step.removeClass('active completed');

      if (stepNumber === this.currentStep) {
        step.addClass('active');
      } else if (stepNumber < this.currentStep) {
        step.addClass('completed');
      }
    });

    // 更新面板显示
    $('.rl-wizard-panel').removeClass('active');
    $(`#rl-wizard-step-${this.currentStep}`).addClass('active');
  },

  // 更新按钮状态
  updateButtons() {
    const prevBtn = $('#rl-wizard-prev');
    const nextBtn = $('#rl-wizard-next');
    const finishBtn = $('#rl-wizard-finish');

    // 显示/隐藏上一步按钮
    if (this.currentStep > 1) {
      prevBtn.show();
    } else {
      prevBtn.hide();
    }

    // 显示/隐藏下一步和完成按钮
    if (this.currentStep < 4) {
      nextBtn.show();
      finishBtn.hide();
    } else {
      nextBtn.hide();
      finishBtn.show();
    }
  },

  // 加载步骤内容
  loadStepContent() {
    switch (this.currentStep) {
      case 2:
        this.loadStepTwoContent();
        break;
      case 4:
        this.loadStepFourContent();
        break;
    }
  },

  // 加载第二步内容
  loadStepTwoContent() {
    const container = $('#rl-wizard-config-content');

    if (this.selectedMode === 'thinking') {
      container.html(`
        <div class="rl-form-group">
          <p>思维链验证模式将检查以下标签的顺序：</p>
          <div class="rl-wizard-preview">
            <div class="rl-preview-item">1. <code>&lt;thinking&gt;</code> - 思考过程开始</div>
            <div class="rl-preview-item">2. <code>&lt;/thinking&gt;</code> - 思考过程结束</div>
            <div class="rl-preview-item">3. <code>&lt;content&gt;</code> - 内容开始</div>
            <div class="rl-preview-item">4. <code>&lt;/content&gt;</code> - 内容结束</div>
          </div>
          <p>您可以在下方修改这些标签：</p>
          <div id="rl-wizard-tags-container">
            <div class="rl-wizard-tag-input">
              <input type="text" value="<thinking>" data-index="0" />
              <button type="button" class="rl-remove-wizard-tag">×</button>
            </div>
            <div class="rl-wizard-tag-input">
              <input type="text" value="</thinking>" data-index="1" />
              <button type="button" class="rl-remove-wizard-tag">×</button>
            </div>
            <div class="rl-wizard-tag-input">
              <input type="text" value="<content>" data-index="2" />
              <button type="button" class="rl-remove-wizard-tag">×</button>
            </div>
            <div class="rl-wizard-tag-input">
              <input type="text" value="</content>" data-index="3" />
              <button type="button" class="rl-remove-wizard-tag">×</button>
            </div>
          </div>
          <button id="rl-add-wizard-tag" class="menu_button secondary small" type="button">
            <i class="fa-solid fa-plus"></i> 添加标签
          </button>
        </div>
      `);

      this.wizardData = {
        requiredContent: ['<thinking>', '</thinking>', '<content>', '</content>'],
        fixStrategy: 'positional',
        positionalOptions: { doubleNewline: true },
      };
    } else if (this.selectedMode === 'structured') {
      this.showStructuredOptions(container);
    } else if (this.selectedMode === 'custom') {
      this.showCustomOptions(container);
    }

    this.bindStepTwoEvents();
  },

  // 显示结构化选项
  showStructuredOptions(container) {
    container.html(`
      <div class="rl-form-group">
        <label>选择结构化验证类型：</label>
        <div class="rl-wizard-sub-options">
          <div class="rl-wizard-sub-option" data-type="qa">
            <h6>问答格式</h6>
            <p>验证 ## 问题 和 ## 答案 标题</p>
          </div>
          <div class="rl-wizard-sub-option" data-type="code">
            <h6>代码块</h6>
            <p>验证代码块的开始和结束标记</p>
          </div>
          <div class="rl-wizard-sub-option" data-type="list">
            <h6>列表结构</h6>
            <p>验证列表项的格式</p>
          </div>
        </div>
      </div>
    `);
  },

  // 显示自定义选项
  showCustomOptions(container) {
    container.html(`
      <div class="rl-form-group">
        <label>自定义验证内容</label>
        <p>请按顺序添加需要验证的内容：</p>
        <div id="rl-wizard-tags-container">
          <!-- 动态添加的标签输入框 -->
        </div>
        <button id="rl-add-wizard-tag" class="menu_button secondary small" type="button">
          <i class="fa-solid fa-plus"></i> 添加内容
        </button>
      </div>
    `);

    this.wizardData = {
      requiredContent: [],
      fixStrategy: 'positional',
      positionalOptions: { doubleNewline: true },
    };
  },

  // 绑定第二步事件
  bindStepTwoEvents() {
    // 绑定添加标签事件
    $('#rl-add-wizard-tag')
      .off('click')
      .on('click', () => {
        this.addWizardTag();
      });

    // 绑定删除标签事件
    $(document)
      .off('click', '.rl-remove-wizard-tag')
      .on('click', '.rl-remove-wizard-tag', e => {
        $(e.target).closest('.rl-wizard-tag-input').remove();
        this.updateWizardData();
      });

    // 绑定输入框变化事件
    $(document)
      .off('input', '#rl-wizard-tags-container input')
      .on('input', '#rl-wizard-tags-container input', () => {
        this.updateWizardData();
      });

    // 绑定结构化子选项事件
    $('.rl-wizard-sub-option')
      .off('click')
      .on('click', e => {
        const type = $(e.currentTarget).data('type');
        this.selectStructuredType(type);
      });
  },

  // 添加向导标签
  addWizardTag() {
    const container = $('#rl-wizard-tags-container');
    const index = container.children().length;

    const tagInput = $(`
      <div class="rl-wizard-tag-input">
        <input type="text" placeholder="输入标签或内容..." data-index="${index}" />
        <button type="button" class="rl-remove-wizard-tag">×</button>
      </div>
    `);

    container.append(tagInput);
    tagInput.find('input').focus();
  },

  // 更新向导数据
  updateWizardData() {
    const inputs = $('#rl-wizard-tags-container input');
    const requiredContent = [];

    inputs.each((index, element) => {
      const value = $(element).val().trim();
      if (value) {
        requiredContent.push(value);
      }
    });

    this.wizardData.requiredContent = requiredContent;
  },

  // 选择结构化类型
  selectStructuredType(type) {
    $('.rl-wizard-sub-option').removeClass('selected');
    $(`.rl-wizard-sub-option[data-type="${type}"]`).addClass('selected');

    const structuredData = {
      qa: {
        requiredContent: ['## 问题', '## 答案'],
        fixStrategy: 'positional',
      },
      code: {
        requiredContent: ['```', '```'],
        fixStrategy: 'add-missing-tags',
      },
      list: {
        requiredContent: ['1. ', '2. ', '3. '],
        fixStrategy: 'positional',
      },
    };

    this.wizardData = {
      ...structuredData[type],
      positionalOptions: { doubleNewline: true },
    };
  },

  // 加载第四步内容
  loadStepFourContent() {
    const summary = $('#rl-wizard-summary-content');
    const modeNames = {
      thinking: '思维链验证',
      structured: '结构化验证',
      custom: '自定义规则',
    };

    let summaryHtml = `
      <div class="rl-summary-item">
        <span class="rl-summary-label">验证模式：</span>
        <span class="rl-summary-value">${modeNames[this.selectedMode]}</span>
      </div>
      <div class="rl-summary-item">
        <span class="rl-summary-label">必需内容：</span>
        <span class="rl-summary-value">${this.wizardData.requiredContent.join(', ')}</span>
      </div>
      <div class="rl-summary-item">
        <span class="rl-summary-label">修复策略：</span>
        <span class="rl-summary-value">${this.wizardData.fixStrategy}</span>
      </div>
    `;

    summary.html(summaryHtml);

    // 设置默认规则名称
    const defaultName = modeNames[this.selectedMode] + ` (${new Date().toLocaleDateString()})`;
    $('#rl-wizard-rule-name').val(defaultName);
  },

  // 生成规则数据
  generateRuleData() {
    return {
      name: $('#rl-wizard-rule-name').val().trim(),
      description: $('#rl-wizard-rule-description').val().trim() || '',
      enabled: true,
      requiredContent: this.wizardData.requiredContent,
      fixStrategy: this.wizardData.fixStrategy,
      positionalOptions: this.wizardData.positionalOptions || { doubleNewline: true },
    };
  },

  // 测试规则
  testRule() {
    const testContent = $('#rl-wizard-test-content').val().trim();
    const resultContainer = $('#rl-wizard-test-result');

    if (!testContent) {
      toastr.warning('请输入测试内容', '配置向导');
      return;
    }

    // 创建临时规则进行测试
    const tempRule = {
      id: 'temp-wizard-rule',
      name: '临时测试规则',
      enabled: true,
      requiredContent: this.wizardData.requiredContent,
      fixStrategy: this.wizardData.fixStrategy,
    };

    // 使用后端控制器进行测试
    try {
      // 临时添加规则到后端进行测试
      const currentSettings = extension_settings[extensionName];
      const tempSettings = {
        ...currentSettings,
        rules: [...(currentSettings.rules || []), tempRule],
      };

      // 暂时更新后端规则
      backendController.updateSettings(tempSettings);

      // 使用后端验证引擎测试
      const result = backendController.validateContent(testContent, 'test-message-wizard');

      // 恢复原始规则设置
      backendController.updateSettings(currentSettings);

      resultContainer.removeClass('success error').show();

      if (!result || result.isValid) {
        resultContainer.addClass('success');
        resultContainer.html(`
          <h5><i class="fa-solid fa-check-circle"></i> 验证通过</h5>
          <p>测试内容符合规则要求！</p>
        `);
      } else {
        resultContainer.addClass('error');
        let errorHtml = `
          <h5><i class="fa-solid fa-exclamation-triangle"></i> 验证失败</h5>
          <p><strong>错误类型：</strong>${result.errorType || 'missing'}</p>
        `;

        if (result.missingContent && result.missingContent.length > 0) {
          errorHtml += `<p><strong>缺失内容：</strong>${result.missingContent.join(', ')}</p>`;
        }

        if (result.errorDetails && result.errorDetails.length > 0) {
          errorHtml += `<p><strong>详细信息：</strong></p><ul>`;
          result.errorDetails.forEach(detail => {
            errorHtml += `<li>${detail.message}</li>`;
          });
          errorHtml += `</ul>`;
        }

        resultContainer.html(errorHtml);
      }
    } catch (error) {
      console.error('规则测试失败:', error);
      resultContainer.removeClass('success error').addClass('error').show();
      resultContainer.html(`
        <h5><i class="fa-solid fa-exclamation-triangle"></i> 测试出错</h5>
        <p>无法完成规则测试，请检查配置。错误：${error.message}</p>
      `);
    }
  },
};

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

  // 规则管理按钮
  $('#rl-add-rule').on('click', () => RuleEditor.showAddModal());
  $('#rl-demo-validation').on('click', () => ValidationFunctions.triggerManualValidation());
  $('#rl-import-rules').on('click', () => RulesManager.importRules());
  $('#rl-export-rules').on('click', () => RulesManager.exportRules());

  // 模板按钮事件
  $('#rl-template-thinking').on('click', () => RulesManager.addTemplate('thinking'));
  $('#rl-template-code').on('click', () => RulesManager.addTemplate('code'));
  $('#rl-template-qa').on('click', () => RulesManager.addTemplate('qa'));

  // 配置向导事件
  $('#rl-config-wizard').on('click', () => ConfigWizard.show());
  $('#rl-close-wizard, #rl-wizard-cancel').on('click', () => ConfigWizard.hide());
  $('#rl-wizard-prev').on('click', () => ConfigWizard.prev());
  $('#rl-wizard-next').on('click', () => ConfigWizard.next());
  $('#rl-wizard-finish').on('click', () => ConfigWizard.finish());
  $('#rl-wizard-test-btn').on('click', () => ConfigWizard.testRule());

  // 向导模式选择事件
  $(document).on('click', '.rl-wizard-option', function () {
    $('.rl-wizard-option').removeClass('selected');
    $(this).addClass('selected');
    ConfigWizard.selectedMode = $(this).data('mode');
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
    const content = $(this).closest('.rl-content-item').data('content');
    const enabled = $(this).prop('checked');
    if (content && window.ResponseLinter?.RuleEditor) {
      window.ResponseLinter.RuleEditor.toggleContentItem(content, enabled);
    }
  });

  // 点击外部关闭模态框
  $('#rl-rule-editor-modal').on('click', function (e) {
    if (e.target === this) {
      RuleEditor.hideModal();
    }
  });

  // 配置向导模态框事件
  $('#rl-config-wizard-modal').on('click', function (e) {
    if (e.target === this) {
      ConfigWizard.hide();
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
