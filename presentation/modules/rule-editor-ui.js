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
    // 依赖注入（可选）：后端控制器与 UI 状态（放在构造器中，避免类字段使用 this 导致语法错误）
    this._controller = null;
    this._uiState = null;
  }

  // 依赖注入 setter（使用标准类方法，兼容性更好）
  setController(c) { this._controller = c; }
  setUIState(s) { this._uiState = s; }


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
      if (!this._uiState && !(window.UIState || window.ResponseLinter?.UIState)) {
        throw new Error('UIState未初始化');
      }

      const state = this._uiState || window.UIState || window.ResponseLinter?.UIState;
      const rule = state.rules.find(r => r.id === ruleId);
      if (!rule) return;

      state.currentEditingRule = ruleId;
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
      // 锁定背景滚动，避免移动端滚动穿透
      $('body').addClass('rl-modal-open');
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
      $('#rl-rule-editor-modal').fadeOut(200, () => {
        // 所有rl-modal关闭后再解除滚动锁
        if ($('.rl-modal:visible').length === 0) {
          $('body').removeClass('rl-modal-open');
        }
      });
      const state = this._uiState || window.UIState || window.ResponseLinter?.UIState;
      if (state) {
        state.currentEditingRule = null;
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
   * 更新内容滑块列表显示
   */
  updateTagsList() {
    try {
      const container = $('#rl-required-content-list');
      container.empty();

      if (this.currentTags.length === 0) {
        return; // 容器为空时显示占位符文本
      }

      this.currentTags.forEach((content, index) => {
        this.createContentSlider(content, index);
      });

      // 启用拖拽排序功能
      this.enableDragSort();
    } catch (error) {
      console.error('更新内容滑块列表失败:', error);
    }
  }

  /**
   * 创建内容滑块项
   * @param {string} content - 内容文本
   * @param {number} index - 索引位置
   */
  createContentSlider(content, index) {
    try {
      const template = document.getElementById('rl-content-slider-template');
      if (!template) {
        console.error('找不到内容滑块模板');
        return;
      }

      const clone = template.content.cloneNode(true);
      const slider = clone.querySelector('.rl-content-item');

      // 设置数据属性
      slider.setAttribute('data-content', content);
      slider.setAttribute('data-index', index);

      // 设置内容文本
      const contentText = clone.querySelector('.rl-content-text');
      contentText.textContent = content;

      // 绑定删除按钮事件
      const deleteBtn = clone.querySelector('.rl-delete-content');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeContentTag(content);
      });

      // 绑定开关事件（直接传入对应的DOM元素，避免同名内容导致选择器命中多个项）
      const toggle = clone.querySelector('.rl-content-enabled');
      toggle.addEventListener('change', (e) => {
        this.toggleContentItem(slider, e.target.checked);
      });

      // 行内“动作设置”按钮 -> 打开标准弹窗
      const actionsBtn = clone.querySelector('.rl-actions-config');
      const chipsBox = clone.querySelector('.rl-actions-chips');
      if (actionsBtn && chipsBox) {
        const state = this._uiState || window.UIState || window.ResponseLinter?.UIState;
        const ruleId = state?.currentEditingRule;
        const currentRule = ruleId ? state?.rules?.find(r => r.id === ruleId) : null;
        const existing = currentRule?.contentOptions?.[content] || { actions: [] };
        RuleEditorUI.renderChips(chipsBox, existing.actions);

        actionsBtn.addEventListener('click', async () => {
          const picked = await RuleEditorUI.openActionsPopup(existing.actions, existing.pattern, existing.replacement);
          if (!picked) return;
          RuleEditorUI.setContentActions(content, picked.actions, picked.pattern, picked.replacement);
          RuleEditorUI.renderChips(chipsBox, picked.actions);
          $('#rl-custom-strategy').toggle((picked.actions||[]).includes('custom'));
        });
        // 行内自定义规则迷你摘要：显示 pattern/replacement 的 tooltip
        const mini = clone.querySelector('.rl-custom-mini');
        if (mini) {
          const pat = existing.pattern || '';
          const rep = (typeof existing.replacement === 'string') ? existing.replacement : '';
          const show = (existing.actions||[]).includes('custom') && (pat || typeof rep === 'string');
          mini.style.display = show ? '' : 'none';
          if (show) mini.setAttribute('title', `正则: ${pat || ''}${rep?`\n替换: ${rep}`:''}`);
        }

      }

      // 添加到容器
      $('#rl-required-content-list').append(slider);
    } catch (error) {
      console.error('创建内容滑块失败:', error);
    }
  }


  /**
   * 切换内容项的启用状态
   * @param {HTMLElement|jQuery|string} target - 该内容项的根元素或内容文本
   * @param {boolean} enabled - 是否启用
   */
  toggleContentItem(target, enabled) {
    try {
      // 允许传入DOM元素/jQuery对象/内容字符串，统一解析为对应的条目元素
      let element = null;
      let contentKey = null;

      if (typeof target === 'string') {
        element = $(`.rl-content-item[data-content="${CSS.escape(target)}"]`);
        contentKey = target;
      } else if (target instanceof HTMLElement) {
        element = $(target);
        contentKey = element.attr('data-content');
      } else if (target && 'jquery' in target) {
        element = target;
      } else {
        // 若传入的是克隆的 slider 节点
        element = $(target?.closest ? target.closest('.rl-content-item') : null);
        if (!element) {
          element = Array.from(document.querySelectorAll('.rl-content-item'))
            .find(el => el.getAttribute('data-content') === content);
        }
      }

      if (!element) return;
      const slider = $(element);
      contentKey = contentKey || slider.attr('data-content');

      slider.toggleClass('disabled', !enabled);

      // 记录当前规则的 contentOptions 状态（enabled）
      const state = this._uiState || window.UIState || window.ResponseLinter?.UIState;
      const ruleId = state?.currentEditingRule;
      const currentRule = ruleId ? state?.rules?.find(r => r.id === ruleId) : null;
      if (currentRule && contentKey) {
        currentRule.contentOptions = currentRule.contentOptions || {};
        const existing = currentRule.contentOptions[contentKey] || { actions: [] };
        currentRule.contentOptions[contentKey] = { ...existing, enabled };
      }

      console.log(`内容项 "${contentKey}" ${enabled ? '已启用' : '已禁用'}`);
    } catch (error) {
      console.error('切换内容项状态失败:', error);
    }
  }

  /** 渲染行内chips摘要 */
  static renderChips(container, actions = []) {
    const map = { 'balance-pairs': '配对', 'after-prev': '上后', 'before-next': '下前', 'custom': '自定义' };
    container.innerHTML = (actions||[]).map(a=>`<span class="rl-chip">${map[a]||a}</span>`).join('');
  }

  /** 打开动作选择弹窗（使用酒馆标准弹窗） */
  static async openActionsPopup(selected = [], pattern = '', replacement = '') {
    try {
      const html = $(`
        <div class="rl-actions-popup">
          <div class="grid-two">
            <label class="checkbox_label"><input type="checkbox" value="balance-pairs"> <span>配对检测与补齐</span></label>
            <label class="checkbox_label"><input type="checkbox" value="after-prev"> <span>依据上一个标签插入</span></label>
            <label class="checkbox_label"><input type="checkbox" value="before-next"> <span>依据下一个标签插入</span></label>
            <label class="checkbox_label"><input type="checkbox" value="custom"> <span>自定义（规则级正则）</span></label>
          </div>
          <div class="rl-custom-area" style="display:none; margin-top:8px;">
            <label>自定义正则（可选）</label>
            <input type="text" class="text_pole rl-custom-pattern" placeholder="例如：(</thinking>)(?!\\s*<content>)" />
            <label style="margin-top:6px; display:block;">替换内容（replacement）</label>
            <input type="text" class="text_pole rl-custom-replacement" placeholder="$1\n\n<content>" />
          </div>
        </div>
      `);
      // 预选
      selected = Array.isArray(selected) ? selected : [];
      html.find('input[type="checkbox"]').each((_, el) => {
        el.checked = selected.includes(el.value);
      });
      // 切换自定义区域
      const refreshCustom = () => html.find('.rl-custom-area').toggle(html.find('input[value="custom"]')[0].checked);
      html.on('change', 'input[value="custom"]', refreshCustom);
      refreshCustom();
      if (pattern) html.find('.rl-custom-area .rl-custom-pattern').val(pattern);
      if (replacement) html.find('.rl-custom-area .rl-custom-replacement').val(replacement);

      const popup = (window.getContext && getContext().callGenericPopup) ? getContext().callGenericPopup : window.callGenericPopup;
      if (!popup) throw new ReferenceError('callGenericPopup is not available');
      const ok = await popup(html, 'confirm', '选择修复动作', { okButton: '确定', cancelButton: '取消', allowVerticalScrolling: true });
      if (!ok) return null;
      const actions = html.find('input:checked').map((_, el)=>el.value).get();
      const pat = html.find('.rl-custom-area .rl-custom-pattern').val()?.toString().trim() || '';
      const rep = html.find('.rl-custom-area .rl-custom-replacement').val()?.toString() || '';
      return { actions, pattern: pat, replacement: rep };
    } catch (e) { console.warn('openActionsPopup失败', e); return null; }
  }

  static setContentActions(content, actions, pattern, replacement) {
    try {
      const state = this._uiState || window.UIState || window.ResponseLinter?.UIState;
      const ruleId = state?.currentEditingRule;
      const currentRule = ruleId ? state?.rules?.find(r => r.id === ruleId) : null;
      if (!currentRule) return;
      currentRule.contentOptions = currentRule.contentOptions || {};
      const existing = currentRule.contentOptions[content] || { enabled: true, actions: [] };
      currentRule.contentOptions[content] = {
        ...existing,
        actions,
        ...(actions?.includes('custom') && pattern ? { pattern } : { pattern: undefined }),
        ...(actions?.includes('custom') && replacement ? { replacement } : { replacement: undefined }),
      };
    } catch (e) { console.warn('设置动作失败', e); }
  }


  /**
   * 启用拖拽排序功能（性能优化版本）
   */
  enableDragSort() {
    try {
      const container = $('#rl-required-content-list')[0];
      if (!container) return;

      let draggedElement = null;
      let placeholder = null;
      let dragOverThrottleId = null;
      let cachedElements = null;
      let lastY = -1;

      // 创建占位符元素
      const createPlaceholder = () => {
        const div = document.createElement('div');
        div.className = 'rl-content-item rl-drag-placeholder';

        // 获取计算后的主题色 - 使用引用色，通常有很好的对比度
        const computedStyle = getComputedStyle(document.documentElement);
        const themeColor = computedStyle.getPropertyValue('--SmartThemeQuoteColor').trim() ||
                          computedStyle.getPropertyValue('--SmartThemeUnderlineColor').trim() ||
                          '#ff8c00';

        // 使用酒馆主题色
        div.style.height = '3px';
        div.style.border = 'none';
        div.style.background = themeColor;
        div.style.marginBottom = '6px';
        div.style.borderRadius = '2px';
        div.style.opacity = '0.9';
        div.style.transition = 'all 0.2s ease';
        div.style.boxShadow = `0 0 6px ${themeColor}`;
        div.style.minHeight = '3px';
        div.style.width = '100%';
        div.style.display = 'block';

        return div;
      };

      // 节流函数
      const throttle = (func, delay) => {
        return function(...args) {
          if (dragOverThrottleId) return;
          dragOverThrottleId = setTimeout(() => {
            func.apply(this, args);
            dragOverThrottleId = null;
          }, delay);
        };
      };

      // 拖拽开始
      container.addEventListener('dragstart', e => {
        const contentItem = e.target.closest('.rl-content-item');
        if (contentItem) {
          draggedElement = contentItem;
          contentItem.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';

          // 缓存可拖拽元素列表
          cachedElements = [...container.querySelectorAll('.rl-content-item:not(.dragging):not(.rl-drag-placeholder)')];

          // 创建并插入占位符
          placeholder = createPlaceholder();
          contentItem.parentNode.insertBefore(placeholder, contentItem.nextSibling);

          // 设置拖拽光标样式
          document.body.classList.add('rl-dragging');
        }
      });

      // 拖拽结束
      container.addEventListener('dragend', e => {
        const contentItem = e.target.closest('.rl-content-item');
        if (contentItem) {
          contentItem.classList.remove('dragging');

          // 移除占位符
          if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
          }

          // 清理状态和样式
          draggedElement = null;
          placeholder = null;
          cachedElements = null;
          lastY = -1;

          // 清理节流定时器
          if (dragOverThrottleId) {
            clearTimeout(dragOverThrottleId);
            dragOverThrottleId = null;
          }

          // 恢复默认光标样式
          document.body.classList.remove('rl-dragging');

          // 强制重置所有相关元素的光标样式
          setTimeout(() => {
            document.body.style.cursor = '';
            if (contentItem) {
              contentItem.style.cursor = '';
            }
            // 清理可能残留的光标样式
            const allContentItems = container.querySelectorAll('.rl-content-item');
            allContentItems.forEach(item => {
              item.style.cursor = '';
            });
          }, 50); // 短暂延迟确保拖拽状态完全清理
        }
      });

      // 拖拽悬停（性能优化版本 - 节流 + 缓存）
      const handleDragOver = throttle((e) => {
        if (!draggedElement || !placeholder) return;

        // 只有Y坐标变化超过阈值时才重新计算
        if (Math.abs(e.clientY - lastY) < 5) return;
        lastY = e.clientY;

        const afterElement = this.getDragAfterElementOptimized(cachedElements, e.clientY);

        // 使用requestAnimationFrame优化DOM操作
        requestAnimationFrame(() => {
          if (!placeholder || !placeholder.parentNode) return;

          if (afterElement === null) {
            if (placeholder.parentNode !== container || placeholder.nextSibling !== null) {
              container.appendChild(placeholder);
            }
          } else {
            if (placeholder.nextSibling !== afterElement) {
              container.insertBefore(placeholder, afterElement);
            }
          }
        });
      }, 16); // 约60fps

      container.addEventListener('dragover', e => {
        e.preventDefault();
        handleDragOver(e);
      });

      // 拖拽放置
      container.addEventListener('drop', e => {
        e.preventDefault();
        if (!draggedElement || !placeholder) return;

        // 将拖拽元素移动到占位符位置
        placeholder.parentNode.insertBefore(draggedElement, placeholder);

        // 更新数据顺序
        this.updateTagsOrderFromDOM();
      });
    } catch (error) {
      console.error('启用拖拽排序失败:', error);
    }
  }

  /**
   * 获取拖拽后的位置元素（优化版本）
   * @param {HTMLElement} container - 容器元素
   * @param {number} y - Y坐标
   * @returns {HTMLElement} 位置元素
   */
  getDragAfterElement(container, y) {
    try {
      const draggableElements = [...container.querySelectorAll('.rl-content-item:not(.dragging):not(.rl-drag-placeholder)')];

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
   * 获取拖拽后的位置元素（性能优化版本 - 使用缓存）
   * @param {HTMLElement[]} cachedElements - 缓存的可拖拽元素列表
   * @param {number} y - Y坐标
   * @returns {HTMLElement} 位置元素
   */
  getDragAfterElementOptimized(cachedElements, y) {
    try {
      if (!cachedElements || cachedElements.length === 0) return null;

      return cachedElements.reduce(
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
   * 从DOM更新内容项顺序
   */
  updateTagsOrderFromDOM() {
    try {
      const contentItems = $('#rl-required-content-list .rl-content-item:not(.rl-drag-placeholder)');
      const newOrder = [];

      contentItems.each((_, element) => {
        const content = $(element).attr('data-content');
        if (content) {
          newOrder.push(content);
        }
      });

      this.currentTags = newOrder;
      console.log('内容项顺序已更新:', newOrder);
    } catch (error) {
      console.error('更新内容项顺序失败:', error);
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

      // 将每个内容项的绑定写入 contentOptions
      formData.contentOptions = {};
      // 采集每个内容项的动作（多选）
      this.currentTags.forEach(tag => {
        const row = document.querySelector(`.rl-content-item[data-content="${CSS.escape(tag)}"]`);
        const actions = Array.from(row?.querySelectorAll('.rl-multi-menu input:checked') || []).map(el=>el.value);
        const tooltip = row?.querySelector('.rl-custom-mini');
        const state = this._uiState || window.UIState || window.ResponseLinter?.UIState;
        const existing = (state?.rules?.find(r=>r.id===state?.currentEditingRule)?.contentOptions?.[tag]) || {};
        // 写入已配置的 pattern/replacement（来源于弹窗保存）
        formData.contentOptions[tag] = {
          enabled: true,
          actions,
          ...(existing.pattern ? { pattern: existing.pattern } : {}),
          ...(typeof existing.replacement === 'string' ? { replacement: existing.replacement } : {}),
        };
        // 同步 tooltip 状态
        if (tooltip) {
          const show = actions.includes('custom') && (existing.pattern || typeof existing.replacement === 'string');
          tooltip.style.display = show ? '' : 'none';
          if (show) tooltip.setAttribute('title', `正则: ${existing.pattern || ''}${existing.replacement?`\n替换: ${existing.replacement}`:''}`);
        }
      });

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
      const state = this._uiState || window.UIState || window.ResponseLinter?.UIState;
      if (state && state.currentEditingRule) {
        if (window.RulesManager) {
          window.RulesManager.editRule(state.currentEditingRule, formData);
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
