// Response Linter 规则编辑器UI模块
// 重构自index.js中的RuleEditor对象，保持完全向后兼容

/**
 * 规则编辑器UI类
 * 负责规则的编辑界面、标签管理、拖拽排序等UI操作
 */
export class RuleEditorUI {
  constructor() {
    this.currentTags = [];
    this.isInitialized = false;
  }

  /**
   * 静态初始化方法
   * 创建全局实例并设置向后兼容性
   */
  static async initialize() {
    try {
      console.log('✏️ 初始化RuleEditorUI...');

      // 创建实例
      const ruleEditorInstance = new RuleEditorUI();

      // 设置到全局命名空间
      if (!window.ResponseLinter) {
        window.ResponseLinter = {};
      }
      window.ResponseLinter.RuleEditor = ruleEditorInstance;

      // 向后兼容：在全局scope创建RuleEditor（保持现有代码工作）
      window.RuleEditor = ruleEditorInstance;

      ruleEditorInstance.isInitialized = true;
      console.log('✅ RuleEditorUI初始化完成，向后兼容性已建立');
    } catch (error) {
      console.error('❌ RuleEditorUI初始化失败:', error);
      throw error;
    }
  }

  /**
   * 显示添加新规则的模态框
   */
  showAddModal() {
    try {
      this.currentTags = [];
      $('#rl-editor-title').text('添加新规则');
      $('#rl-rule-form')[0].reset();
      $('#rl-rule-enabled').prop('checked', true);
      this.updateTagsList();
      this.showModal();
    } catch (error) {
      console.error('显示添加模态框失败:', error);
    }
  }

  /**
   * 显示编辑现有规则的模态框
   * @param {string} ruleId - 规则ID
   */
  showEditModal(ruleId) {
    try {
      if (!window.UIState) {
        throw new Error('UIState未初始化');
      }

      const rule = window.UIState.rules.find(r => r.id === ruleId);
      if (!rule) return;

      if (window.UIState) {
        window.UIState.currentEditingRule = ruleId;
      }
      this.currentTags = [...rule.requiredContent];

      $('#rl-editor-title').text('编辑规则');
      $('#rl-rule-name').val(rule.name);
      $('#rl-rule-description').val(rule.description || '');
      $('#rl-rule-strategy').val(rule.fixStrategy || '');
      $('#rl-rule-enabled').prop('checked', rule.enabled);

      // 设置位置感知修复选项
      if (rule.positionalOptions) {
        $('#rl-insert-double-newline').prop('checked', rule.positionalOptions.doubleNewline !== false);
      } else {
        $('#rl-insert-double-newline').prop('checked', true); // 默认启用
      }

      this.updateTagsList();
      this.toggleCustomStrategy();
      this.togglePositionalStrategy(); // 切换位置感知策略显示
      this.showModal();
    } catch (error) {
      console.error('显示编辑模态框失败:', error);
    }
  }

  /**
   * 显示模态框
   */
  showModal() {
    try {
      $('#rl-rule-editor-modal').fadeIn(200);
      $('#rl-rule-name').focus();
    } catch (error) {
      console.error('显示模态框失败:', error);
    }
  }

  /**
   * 隐藏模态框
   */
  hideModal() {
    try {
      $('#rl-rule-editor-modal').fadeOut(200);
      if (window.UIState) {
        window.UIState.currentEditingRule = null;
      }
      this.currentTags = [];
    } catch (error) {
      console.error('隐藏模态框失败:', error);
    }
  }

  /**
   * 添加内容标签
   */
  addContentTag() {
    try {
      const input = $('#rl-new-content');
      const content = input.val().trim();

      if (content && !this.currentTags.includes(content)) {
        this.currentTags.push(content);
        this.updateTagsList();
        input.val('').focus();
      }
    } catch (error) {
      console.error('添加内容标签失败:', error);
    }
  }

  /**
   * 移除内容标签
   * @param {string} content - 要移除的内容
   */
  removeContentTag(content) {
    try {
      this.currentTags = this.currentTags.filter(tag => tag !== content);
      this.updateTagsList();
    } catch (error) {
      console.error('移除内容标签失败:', error);
    }
  }

  /**
   * 更新标签列表显示（已修复HTML注入问题）
   */
  updateTagsList() {
    try {
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
    } catch (error) {
      console.error('更新标签列表失败:', error);
    }
  }

  /**
   * 启用拖拽排序功能
   */
  enableDragSort() {
    try {
      const container = $('#rl-required-content-list')[0];
      if (!container) return;

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
    } catch (error) {
      console.error('启用拖拽排序失败:', error);
    }
  }

  /**
   * 获取拖拽后的位置元素
   * @param {HTMLElement} container - 容器元素
   * @param {number} y - Y坐标
   * @returns {HTMLElement} 位置元素
   */
  getDragAfterElement(container, y) {
    try {
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
    } catch (error) {
      console.error('获取拖拽位置失败:', error);
      return null;
    }
  }

  /**
   * 从DOM更新标签顺序
   */
  updateTagsOrderFromDOM() {
    try {
      const tagElements = $('#rl-required-content-list .rl-content-tag');
      const newOrder = [];

      tagElements.each((index, element) => {
        const content = $(element).find('span').text();
        newOrder.push(content);
      });

      this.currentTags = newOrder;
      console.log('标签顺序已更新:', newOrder);
    } catch (error) {
      console.error('更新标签顺序失败:', error);
    }
  }

  /**
   * 切换自定义策略字段
   */
  toggleCustomStrategy() {
    try {
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
    } catch (error) {
      console.error('切换自定义策略失败:', error);
    }
  }

  /**
   * 切换位置感知策略字段（保留方法以避免破坏现有调用）
   */
  togglePositionalStrategy() {
    // 此方法已合并到toggleCustomStrategy中
    // 保留以避免破坏现有调用
  }

  /**
   * 保存规则
   */
  saveRule() {
    try {
      const formData = {
        name: $('#rl-rule-name').val().trim(),
        description: $('#rl-rule-description').val().trim(),
        enabled: $('#rl-rule-enabled').prop('checked'),
        requiredContent: this.currentTags,
        fixStrategy: $('#rl-rule-strategy').val(),
        positionalOptions: {
          // 保存位置感知选项
          doubleNewline: $('#rl-insert-double-newline').prop('checked'),
        },
      };

      // 验证
      if (!formData.name) {
        if (window.toastr) {
          window.toastr.error('规则名称为必填项！', '响应检查器');
        }
        return;
      }

      if (formData.requiredContent.length === 0) {
        if (window.toastr) {
          window.toastr.error('至少需要一个必需内容项！', '响应检查器');
        }
        return;
      }

      // 保存或更新规则
      if (window.UIState && window.UIState.currentEditingRule) {
        if (window.RulesManager) {
          window.RulesManager.editRule(window.UIState.currentEditingRule, formData);
        }
      } else {
        if (window.RulesManager) {
          window.RulesManager.addRule(formData);
        }
      }

      this.hideModal();
    } catch (error) {
      console.error('保存规则失败:', error);
      if (window.toastr) {
        window.toastr.error('保存规则失败', '响应检查器');
      }
    }
  }
}
