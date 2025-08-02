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
    // 新增：滑块组件的增强数据结构
    this.tagSliders = []; // 存储滑块的详细信息 {content, enabled, id}
    this.dragState = null; // 拖拽状态管理
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
      this.tagSliders = []; // 清空滑块数据
      $('#rl-editor-title').text('添加新规则');
      $('#rl-rule-form')[0].reset();
      $('#rl-rule-enabled').prop('checked', true);
      this.updateTagsList();
      this.showModal();
      console.log('➕ 新规则编辑器已打开');
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

      // 设置currentTags（向后兼容）
      this.currentTags = [...rule.requiredContent];

      // 重新初始化滑块数据以匹配编辑的规则
      this.tagSliders = [];
      rule.requiredContent.forEach((content, index) => {
        const sliderId = `slider-edit-${Date.now()}-${index}`;
        this.tagSliders.push({
          id: sliderId,
          content: content,
          enabled: true, // 编辑现有规则时默认都启用
          order: index,
        });
      });

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

      console.log('📝 编辑规则加载完成，滑块数量:', this.tagSliders.length);
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
      this.tagSliders = []; // 清空滑块数据
      this.dragState = null; // 清空拖拽状态
      console.log('❌ 规则编辑器已关闭');
    } catch (error) {
      console.error('隐藏模态框失败:', error);
    }
  }

  /**
   * 添加内容标签（滑块式组件升级版）
   */
  addContentTag() {
    try {
      const input = $('#rl-new-content');
      const content = input.val().trim();

      if (content && !this.currentTags.includes(content)) {
        // 保持向后兼容的数组结构
        this.currentTags.push(content);

        // 新增：创建滑块数据结构
        const sliderId = `slider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.tagSliders.push({
          id: sliderId,
          content: content,
          enabled: true, // 默认启用
          order: this.tagSliders.length,
        });

        this.updateTagsList();
        input.val('').focus();

        console.log('📝 添加滑块:', { content, id: sliderId });
      }
    } catch (error) {
      console.error('添加内容标签失败:', error);
    }
  }

  /**
   * 移除内容标签（滑块式组件升级版）
   * @param {string} contentOrId - 要移除的内容或滑块ID
   */
  removeContentTag(contentOrId) {
    try {
      // 兼容旧的content方式和新的ID方式
      let targetSlider = null;
      let targetContent = contentOrId;

      // 尝试通过ID查找
      targetSlider = this.tagSliders.find(slider => slider.id === contentOrId);
      if (targetSlider) {
        targetContent = targetSlider.content;
      } else {
        // 通过内容查找
        targetSlider = this.tagSliders.find(slider => slider.content === contentOrId);
      }

      if (targetSlider) {
        // 从滑块数组中移除
        this.tagSliders = this.tagSliders.filter(slider => slider.id !== targetSlider.id);
        console.log('🗑️ 移除滑块:', { content: targetContent, id: targetSlider.id });
      }

      // 保持向后兼容：从旧数组中移除
      this.currentTags = this.currentTags.filter(tag => tag !== targetContent);
      this.updateTagsList();
    } catch (error) {
      console.error('移除内容标签失败:', error);
    }
  }

  /**
   * 更新标签列表显示（滑块式组件重构版）
   * 性能优化：减少DOM操作，优化拖拽体验
   */
  updateTagsList() {
    try {
      const container = $('#rl-required-content-list');

      // 性能优化：批量DOM更新，减少重绘
      const fragment = document.createDocumentFragment();

      // 确保滑块数据与currentTags同步（向后兼容）
      this.syncTagSlidersWithCurrentTags();

      // 按order排序
      const sortedSliders = [...this.tagSliders].sort((a, b) => a.order - b.order);

      sortedSliders.forEach((slider, index) => {
        const sliderElement = this.createSliderElement(slider, index);
        fragment.appendChild(sliderElement);
      });

      // 一次性更新DOM
      container.empty();
      container.append(fragment);

      // 只绑定一次拖拽事件（性能优化）
      this.initializeEnhancedDragSort();

      console.log('🎛️ 滑块列表已更新，共', sortedSliders.length, '个滑块');
    } catch (error) {
      console.error('更新标签列表失败:', error);
    }
  }

  /**
   * 同步滑块数据与currentTags（向后兼容）
   */
  syncTagSlidersWithCurrentTags() {
    try {
      // 处理新增的currentTags（可能来自编辑现有规则）
      this.currentTags.forEach((content, index) => {
        const existingSlider = this.tagSliders.find(s => s.content === content);
        if (!existingSlider) {
          const sliderId = `slider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          this.tagSliders.push({
            id: sliderId,
            content: content,
            enabled: true,
            order: index,
          });
        }
      });

      // 处理被删除的currentTags
      this.tagSliders = this.tagSliders.filter(slider => this.currentTags.includes(slider.content));

      // 更新currentTags顺序以匹配滑块order
      const sortedSliders = [...this.tagSliders].sort((a, b) => a.order - b.order);
      this.currentTags = sortedSliders.map(slider => slider.content);
    } catch (error) {
      console.error('同步滑块数据失败:', error);
    }
  }

  /**
   * 创建单个滑块元素
   * @param {Object} slider - 滑块数据
   * @param {number} index - 索引
   * @returns {HTMLElement} 滑块DOM元素
   */
  createSliderElement(slider, index) {
    try {
      // 创建滑块容器
      const sliderDiv = document.createElement('div');
      sliderDiv.className = `rl-content-slider ${slider.enabled ? 'enabled' : 'disabled'}`;
      sliderDiv.setAttribute('data-slider-id', slider.id);
      sliderDiv.setAttribute('data-content', slider.content);
      sliderDiv.setAttribute('draggable', 'true');
      sliderDiv.setAttribute('data-order', slider.order);

      // 拖拽手柄
      const dragHandle = document.createElement('div');
      dragHandle.className = 'rl-slider-handle';
      dragHandle.innerHTML = '⋮⋮';
      dragHandle.title = '拖拽排序';

      // 内容显示
      const contentSpan = document.createElement('span');
      contentSpan.className = 'rl-slider-content';
      contentSpan.textContent = slider.content;

      // 开关按钮
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = `rl-slider-toggle ${slider.enabled ? 'on' : 'off'}`;
      toggleBtn.innerHTML = slider.enabled ? '✓' : '✗';
      toggleBtn.title = slider.enabled ? '点击禁用' : '点击启用';
      toggleBtn.setAttribute('data-slider-id', slider.id);

      // 删除按钮
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'rl-slider-delete';
      deleteBtn.innerHTML = '🗑';
      deleteBtn.title = '删除';
      deleteBtn.setAttribute('data-slider-id', slider.id);

      // 组装滑块
      sliderDiv.appendChild(dragHandle);
      sliderDiv.appendChild(contentSpan);
      sliderDiv.appendChild(toggleBtn);
      sliderDiv.appendChild(deleteBtn);

      return sliderDiv;
    } catch (error) {
      console.error('创建滑块元素失败:', error);
      return document.createElement('div'); // 返回空div避免破坏
    }
  }

  /**
   * 初始化增强的拖拽排序功能（性能优化版）
   * 使用事件委托和CSS Transform提升性能
   */
  initializeEnhancedDragSort() {
    try {
      const container = $('#rl-required-content-list')[0];
      if (!container) return;

      // 移除旧的事件监听器，避免重复绑定
      this.cleanupDragEvents(container);

      // 使用事件委托，性能更好
      container.addEventListener('dragstart', this.handleDragStart.bind(this));
      container.addEventListener('dragend', this.handleDragEnd.bind(this));
      container.addEventListener('dragover', this.handleDragOver.bind(this));
      container.addEventListener('drop', this.handleDrop.bind(this));

      // 点击事件委托（开关和删除）
      container.addEventListener('click', this.handleSliderClick.bind(this));

      console.log('🎯 增强拖拽系统已初始化');
    } catch (error) {
      console.error('初始化增强拖拽失败:', error);
    }
  }

  /**
   * 清理拖拽事件（避免重复绑定）
   */
  cleanupDragEvents(container) {
    try {
      const events = ['dragstart', 'dragend', 'dragover', 'drop', 'click'];
      events.forEach(event => {
        container.removeEventListener(event, this[`handle${event.charAt(0).toUpperCase() + event.slice(1)}`]);
      });
    } catch (error) {
      console.error('清理拖拽事件失败:', error);
    }
  }

  /**
   * 处理拖拽开始
   */
  handleDragStart(e) {
    try {
      const sliderElement = e.target.closest('.rl-content-slider');
      if (!sliderElement) return;

      this.dragState = {
        draggedElement: sliderElement,
        draggedId: sliderElement.getAttribute('data-slider-id'),
        startY: e.clientY,
        placeholder: null,
      };

      // 视觉反馈
      sliderElement.classList.add('rl-dragging');
      sliderElement.style.opacity = '0.6';

      // 创建拖拽占位符
      this.createDragPlaceholder();

      e.dataTransfer.effectAllowed = 'move';
      console.log('🔄 开始拖拽滑块:', this.dragState.draggedId);
    } catch (error) {
      console.error('拖拽开始处理失败:', error);
    }
  }

  /**
   * 处理拖拽结束
   */
  handleDragEnd(e) {
    try {
      if (!this.dragState) return;

      // 清理视觉效果
      this.dragState.draggedElement.classList.remove('rl-dragging');
      this.dragState.draggedElement.style.opacity = '';

      // 移除占位符
      if (this.dragState.placeholder) {
        this.dragState.placeholder.remove();
      }

      console.log('✅ 拖拽结束:', this.dragState.draggedId);
      this.dragState = null;
    } catch (error) {
      console.error('拖拽结束处理失败:', error);
    }
  }

  /**
   * 处理拖拽悬停（性能优化：使用transform）
   */
  handleDragOver(e) {
    try {
      e.preventDefault();
      if (!this.dragState) return;

      const container = e.currentTarget;
      const afterElement = this.getOptimizedDragAfterElement(container, e.clientY);

      // 使用占位符而非直接移动元素（性能优化）
      if (afterElement == null) {
        container.appendChild(this.dragState.placeholder);
      } else {
        container.insertBefore(this.dragState.placeholder, afterElement);
      }
    } catch (error) {
      console.error('拖拽悬停处理失败:', error);
    }
  }

  /**
   * 处理拖拽放置
   */
  handleDrop(e) {
    try {
      e.preventDefault();
      if (!this.dragState) return;

      // 更新滑块顺序
      this.updateSlidersOrderFromDOM();
      console.log('📋 滑块顺序已更新');
    } catch (error) {
      console.error('拖拽放置处理失败:', error);
    }
  }

  /**
   * 处理滑块点击事件（开关和删除）
   */
  handleSliderClick(e) {
    try {
      const target = e.target;
      const sliderId = target.getAttribute('data-slider-id');

      if (!sliderId) return;

      if (target.classList.contains('rl-slider-toggle')) {
        e.preventDefault();
        this.toggleSliderState(sliderId);
      } else if (target.classList.contains('rl-slider-delete')) {
        e.preventDefault();
        this.removeContentTag(sliderId);
      }
    } catch (error) {
      console.error('滑块点击处理失败:', error);
    }
  }

  /**
   * 创建拖拽占位符
   */
  createDragPlaceholder() {
    try {
      if (!this.dragState) return;

      const placeholder = document.createElement('div');
      placeholder.className = 'rl-drag-placeholder';
      placeholder.style.height = this.dragState.draggedElement.offsetHeight + 'px';
      placeholder.innerHTML = '<div class="rl-placeholder-content">放置到此处...</div>';

      this.dragState.placeholder = placeholder;
    } catch (error) {
      console.error('创建拖拽占位符失败:', error);
    }
  }

  /**
   * 优化的拖拽位置计算
   */
  getOptimizedDragAfterElement(container, y) {
    try {
      const draggableElements = [...container.querySelectorAll('.rl-content-slider:not(.rl-dragging)')];

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
      console.error('拖拽位置计算失败:', error);
      return null;
    }
  }

  /**
   * 从DOM更新滑块顺序
   */
  updateSlidersOrderFromDOM() {
    try {
      const sliderElements = $('#rl-required-content-list .rl-content-slider');
      const newOrder = [];

      sliderElements.each((index, element) => {
        const sliderId = element.getAttribute('data-slider-id');
        const slider = this.tagSliders.find(s => s.id === sliderId);
        if (slider) {
          slider.order = index;
          newOrder.push(slider.content);
        }
      });

      // 同步到向后兼容的currentTags
      this.currentTags = newOrder;
      console.log('📊 滑块顺序已同步:', newOrder);
    } catch (error) {
      console.error('更新滑块顺序失败:', error);
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
   * 切换滑块启用状态
   * @param {string} sliderId - 滑块ID
   */
  toggleSliderState(sliderId) {
    try {
      const slider = this.tagSliders.find(s => s.id === sliderId);
      if (slider) {
        slider.enabled = !slider.enabled;
        console.log('🔄 切换滑块状态:', { id: sliderId, content: slider.content, enabled: slider.enabled });
        this.updateTagsList();
      }
    } catch (error) {
      console.error('切换滑块状态失败:', error);
    }
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
