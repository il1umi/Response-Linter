// Response Linter 配置向导UI模块
// 重构自index.js中的ConfigWizard对象，保持完全向后兼容

/**
 * 配置向导UI类
 * 负责配置向导的多步骤流程、模式选择、规则生成等UI操作
 */
export class ConfigWizardUI {
  constructor() {
    this.currentStep = 1;
    this.selectedMode = null;
    this.wizardData = {};
    this.isInitialized = false;
  }

  /**
   * 静态初始化方法
   * 创建全局实例并设置向后兼容性
   */
  static async initialize() {
    try {
      console.log('🧙 初始化ConfigWizardUI...');

      // 创建实例
      const configWizardInstance = new ConfigWizardUI();

      // 设置到全局命名空间
      if (!window.ResponseLinter) {
        window.ResponseLinter = {};
      }
      window.ResponseLinter.ConfigWizard = configWizardInstance;

      // 向后兼容：在全局scope创建ConfigWizard（保持现有代码工作）
      window.ConfigWizard = configWizardInstance;

      configWizardInstance.isInitialized = true;
      console.log('✅ ConfigWizardUI初始化完成，向后兼容性已建立');
    } catch (error) {
      console.error('❌ ConfigWizardUI初始化失败:', error);
      throw error;
    }
  }

  /**
   * 显示配置向导
   */
  show() {
    try {
      this.currentStep = 1;
      this.selectedMode = null;
      this.wizardData = {};

      $('#rl-config-wizard-modal').fadeIn(200);
      this.updateStepDisplay();
      this.updateButtons();
    } catch (error) {
      console.error('显示配置向导失败:', error);
    }
  }

  /**
   * 隐藏配置向导
   */
  hide() {
    try {
      $('#rl-config-wizard-modal').fadeOut(200);
    } catch (error) {
      console.error('隐藏配置向导失败:', error);
    }
  }

  /**
   * 下一步
   */
  next() {
    try {
      if (this.validateCurrentStep()) {
        if (this.currentStep < 4) {
          this.currentStep++;
          this.updateStepDisplay();
          this.updateButtons();
          this.loadStepContent();
        }
      }
    } catch (error) {
      console.error('向导下一步失败:', error);
    }
  }

  /**
   * 上一步
   */
  prev() {
    try {
      if (this.currentStep > 1) {
        this.currentStep--;
        this.updateStepDisplay();
        this.updateButtons();
      }
    } catch (error) {
      console.error('向导上一步失败:', error);
    }
  }

  /**
   * 完成向导
   */
  finish() {
    try {
      if (this.validateCurrentStep()) {
        const ruleData = this.generateRuleData();
        if (window.RulesManager) {
          window.RulesManager.addRule(ruleData);
        }
        this.hide();
        if (window.toastr) {
          window.toastr.success('配置向导完成！规则已成功创建', '响应检查器');
        }
      }
    } catch (error) {
      console.error('完成向导失败:', error);
      if (window.toastr) {
        window.toastr.error('完成向导失败', '响应检查器');
      }
    }
  }

  /**
   * 验证当前步骤
   * @returns {boolean} 验证是否通过
   */
  validateCurrentStep() {
    try {
      switch (this.currentStep) {
        case 1:
          if (!this.selectedMode) {
            if (window.toastr) {
              window.toastr.warning('请选择一个验证模式', '配置向导');
            }
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
            if (window.toastr) {
              window.toastr.warning('请输入规则名称', '配置向导');
            }
            $('#rl-wizard-rule-name').focus();
            return false;
          }
          return true;
        default:
          return true;
      }
    } catch (error) {
      console.error('验证当前步骤失败:', error);
      return false;
    }
  }

  /**
   * 验证第二步
   * @returns {boolean} 验证是否通过
   */
  validateStepTwo() {
    try {
      // 验证逻辑将根据选择的模式而有所不同
      return this.wizardData.requiredContent && this.wizardData.requiredContent.length > 0;
    } catch (error) {
      console.error('验证第二步失败:', error);
      return false;
    }
  }

  /**
   * 更新步骤显示
   */
  updateStepDisplay() {
    try {
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
    } catch (error) {
      console.error('更新步骤显示失败:', error);
    }
  }

  /**
   * 更新按钮状态
   */
  updateButtons() {
    try {
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
    } catch (error) {
      console.error('更新按钮状态失败:', error);
    }
  }

  /**
   * 加载步骤内容
   */
  loadStepContent() {
    try {
      switch (this.currentStep) {
        case 2:
          this.loadStepTwoContent();
          break;
        case 4:
          this.loadStepFourContent();
          break;
      }
    } catch (error) {
      console.error('加载步骤内容失败:', error);
    }
  }

  /**
   * 加载第二步内容
   */
  loadStepTwoContent() {
    try {
      const container = $('#rl-wizard-config-content');

      if (this.selectedMode === 'thinking') {
        container.html(`
          <div class="rl-form-group">
            <div class="rl-flex-header">
              <p>思维链验证模式将检查以下标签的顺序：</p>
              <div>
                <button id="rl-wizard-apply-thinking-template" class="menu_button secondary small" type="button">
                  一键套用：思维链（顺序+配对）
                </button>
              </div>
            </div>
            <div class="rl-wizard-preview">
              <div class="rl-preview-item">1. <code>&lt;thinking&gt;</code> - 思考过程开始</div>
              <div class="rl-preview-item">2. <code>&lt;/thinking&gt;</code> - 思考过程结束</div>
              <div class="rl-preview-item">3. <code>&lt;content&gt;</code> - 内容开始</div>
              <div class="rl-preview-item">4. <code>&lt;/content&gt;</code> - 内容结束</div>
            </div>
            <p>您可以在下方修改这些标签，并为每项设置“绑定策略”与“启用开关”：</p>
            <div id="rl-wizard-tags-container" class="rl-wizard-tags-table">
              ${this._renderWizardTagRow('<thinking>', 0)}
              ${this._renderWizardTagRow('</thinking>', 1)}
              ${this._renderWizardTagRow('<content>', 2)}
              ${this._renderWizardTagRow('</content>', 3)}
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
          contentOptions: {
            '<thinking>': { enabled: true, binding: 'default' },
            '</thinking>': { enabled: true, binding: 'after-previous-tag' },
            '<content>': { enabled: true, binding: 'after-previous-tag' },
            '</content>': { enabled: true, binding: 'before-next-tag' },
          },
        };
      } else if (this.selectedMode === 'structured') {
        this.showStructuredOptions(container);
      } else if (this.selectedMode === 'custom') {
        this.showCustomOptions(container);
      }

      // 渲染后同步绑定/开关默认值
      this._applyContentOptionsToRows();
      this.bindStepTwoEvents();
    } catch (error) {
      console.error('加载第二步内容失败:', error);
    }
  }

  /**
   * 显示结构化选项
   * @param {jQuery} container - 容器元素
   */
  showStructuredOptions(container) {
    try {
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
    } catch (error) {
      console.error('显示结构化选项失败:', error);
    }
  }

  /**
   * 显示自定义选项
   * @param {jQuery} container - 容器元素
   */
  showCustomOptions(container) {
    try {
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
    } catch (error) {
      console.error('显示自定义选项失败:', error);
    }
  }

  /**
   * 渲染向导第二步每一行的“标签 + 绑定 + 开关”
   * @param {string} text 初始标签文本
   * @param {number} index 索引
   */
  _renderWizardTagRow(text, index) {
    const multiOptions = [
      { val: 'balance-pairs', label: '配对检测与补齐' },
      { val: 'after-prev', label: '依据上一个标签插入' },
      { val: 'before-next', label: '依据下一个标签插入' },
      { val: 'custom', label: '自定义（规则级正则）' },
    ];

    const opt = (this.wizardData?.contentOptions && this.wizardData.contentOptions[text]) || { enabled: true, actions: [] };

    return `
      <div class="rl-content-item rl-wizard-tag-row" data-index="${index}">
        <div class="rl-content-header">
          <div class="rl-drag-handle" title="拖拽排序"><i class="fa-solid fa-grip-vertical"></i></div>
          <div class="rl-content-info">
            <input type="text" class="rl-wizard-tag-text" value="${text}" data-index="${index}" />
          </div>
          <div class="rl-content-controls">
            <label class="rl-content-toggle" title="启用/禁用此内容项">
              <input type="checkbox" class="rl-wizard-tag-enabled rl-content-enabled" data-index="${index}" ${opt.enabled ? 'checked' : ''} />
              <span class="rl-toggle-slider"></span>
            </label>
            <div class="rl-actions-chips"></div>
            <button type="button" class="menu_button small rl-actions-config" title="配置修复动作"><i class="fa-solid fa-sliders"></i></button>
            <button type="button" class="rl-delete-content rl-remove-wizard-tag" title="删除此内容项"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="rl-wizard-custom-pattern" style="display:none; padding: 0 12px 12px;">
          <input type="text" class="rl-wizard-tag-pattern" data-index="${index}" placeholder="自定义正则（选填）" />
        </div>
      </div>
    `;
  }

  /**
   * 绑定第二步事件
   */
  bindStepTwoEvents() {
    try {
      // 一键模板：思维链（顺序+配对）
      $(document)
        .off('click', '#rl-wizard-apply-thinking-template')
        .on('click', '#rl-wizard-apply-thinking-template', () => {
          this.wizardData = {
            requiredContent: ['<thinking>', '</thinking>', '<content>', '</content>'],
            fixStrategy: 'positional',
            positionalOptions: { doubleNewline: true },
            contentOptions: {
              '<thinking>': { enabled: true, binding: 'default' },
              '</thinking>': { enabled: true, binding: 'after-previous-tag' },
              '<content>': { enabled: true, binding: 'after-previous-tag' },
              '</content>': { enabled: true, binding: 'before-next-tag' },
            },
          };
          const container = $('#rl-wizard-tags-container');
          container.html([
            this._renderWizardTagRow('<thinking>', 0),
            this._renderWizardTagRow('</thinking>', 1),
            this._renderWizardTagRow('<content>', 2),
            this._renderWizardTagRow('</content>', 3),
          ].join(''));
        });

      // 绑定添加标签事件
      $('#rl-add-wizard-tag')
        .off('click')
        .on('click', () => {
          this.addWizardTag();
        });

      // 删除：适配新结构（.rl-wizard-tag-row）
      $(document)
        .off('click', '.rl-remove-wizard-tag, .rl-delete-content')
        .on('click', '.rl-remove-wizard-tag, .rl-delete-content', e => {
          $(e.target).closest('.rl-wizard-tag-row, .rl-content-item, .rl-wizard-tag-input').remove();
          this.updateWizardData();
        });

      // 输入变化（文本/开关）
      $(document)
        .off('input change', '#rl-wizard-tags-container input, #rl-wizard-tags-container select')
        .on('input change', '#rl-wizard-tags-container input, #rl-wizard-tags-container select', () => this.updateWizardData());

      // 结构化子选项事件（保留）
      $('.rl-wizard-sub-option')
        .off('click')
        .on('click', e => {
          const type = $(e.currentTarget).data('type');
          this.selectStructuredType(type);
        });
      // 动作设置按钮 -> 弹窗（移入方法体内，避免类作用域语法错误）
      $(document)
        .off('click', '#rl-wizard-tags-container .rl-actions-config')
        .on('click', '#rl-wizard-tags-container .rl-actions-config', async (e) => {
          const row = $(e.currentTarget).closest('.rl-wizard-tag-row');
          const text = String(row.find('input.rl-wizard-tag-text').val() || '').trim();
          const opt = (this.wizardData && this.wizardData.contentOptions && this.wizardData.contentOptions[text]) || { enabled: true, actions: [] };
          const picked = await this._openActionsPopup(opt.actions, opt.pattern);
          if (!picked) return;
          this.wizardData.contentOptions[text] = { enabled: opt.enabled, actions: picked.actions, ...((picked.actions && picked.actions.includes('custom') && picked.pattern) ? { pattern: picked.pattern } : {}) };
          // 渲染chips
          const chips = (picked.actions||[]).map(a=>({ 'balance-pairs': '配对', 'after-prev': '上后', 'before-next': '下前', 'custom': '自定义' }[a]||a))
            .map(t=>`<span class="rl-chip">${t}</span>`).join('');
          row.find('.rl-actions-chips').html(chips);
          // 自定义正则显示区域（保留原有容器以兼容）
          row.find('.rl-wizard-custom-pattern').toggle((picked.actions||[]).includes('custom'));
          if (picked.pattern) row.find('input.rl-wizard-tag-pattern').val(picked.pattern);
          this.updateWizardData();
        });

      // 初始化渲染现有chips
      $('#rl-wizard-tags-container .rl-wizard-tag-row').each((_, el)=>{
        const row = $(el); const text = String(row.find('input.rl-wizard-tag-text').val()||'').trim();
        const opt = (this.wizardData && this.wizardData.contentOptions && this.wizardData.contentOptions[text]) || { enabled:true, actions:[] };
        const chips = (opt.actions||[]).map(a=>({ 'balance-pairs': '配对', 'after-prev': '上后', 'before-next': '下前', 'custom': '自定义' }[a]||a))
          .map(t=>`<span class="rl-chip">${t}</span>`).join('');
        row.find('.rl-actions-chips').html(chips);
      });
    } catch (error) {
      console.error('绑定第二步事件失败:', error);
    }
  }


  /**
   * 添加向导标签
   */
  addWizardTag() {
    try {
      const container = $('#rl-wizard-tags-container');
      const index = container.children().length;

      const rowHtml = this._renderWizardTagRow('', index);
      const row = $(rowHtml);
      container.append(row);
      row.find('input.rl-wizard-tag-text').focus();
    } catch (error) {
      console.error('添加向导标签失败:', error);
    }
  }

  /**
   * 更新向导数据
   */
  updateWizardData() {
    try {
      const rows = '#rl-wizard-tags-container .rl-wizard-tag-row';
      const requiredContent = [];
      const contentOptions = {};

      $(rows).each((idx, el) => {
        const row = $(el);
        const text = String(row.find('input.rl-wizard-tag-text').val() || '').trim();
        if (!text) return;
        const enabled = !!row.find('input.rl-wizard-tag-enabled').prop('checked');
        const actions = row.find('.rl-multi-item input:checked').map((_, el)=>$(el).val()).get();
        const pattern = String(row.find('input.rl-wizard-tag-pattern').val() || '').trim();
        requiredContent.push(text);
        contentOptions[text] = { enabled, actions, ...(actions.includes('custom') && pattern ? { pattern } : {}) };
      });

      this.wizardData.requiredContent = requiredContent;
      this.wizardData.contentOptions = contentOptions;
    } catch (error) {
      console.error('更新向导数据失败:', error);
    }
  }

  /**
   * 将 wizardData.contentOptions 应用到已渲染的行（设置下拉/开关/正则）
   */
  _applyContentOptionsToRows() {
    try {
      const opts = this.wizardData?.contentOptions || {};
      $('#rl-wizard-tags-container .rl-wizard-tag-row').each((i, el) => {
        const row = $(el);
        const text = String(row.find('input.rl-wizard-tag-text').val() || '').trim();
        const opt = opts[text] || { enabled: true, actions: [] };
        row.find('input.rl-wizard-tag-enabled').prop('checked', !!opt.enabled);
        // 应用多选选中状态
        const actions = Array.isArray(opt.actions) ? opt.actions : [];
        row.find('.rl-multi-item input[type="checkbox"]').each((_, chk) => {
          const v = $(chk).val();
          const on = actions.includes(v);
          $(chk).prop('checked', on);
          $(chk).closest('.rl-multi-item').toggleClass('selected', on);
        });
        const pat = row.find('input.rl-wizard-tag-pattern');
        pat.toggle(actions.includes('custom'));
        if (opt.pattern) pat.val(opt.pattern);
      });
    } catch (e) {
      console.warn('应用 contentOptions 到行失败', e);
    }
  }


  /**
   * 选择结构化类型
   * @param {string} type - 结构化类型
   */
  selectStructuredType(type) {
    try {
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
    } catch (error) {
      console.error('选择结构化类型失败:', error);
    }
  }

  /**
   * 加载第四步内容
   */
  loadStepFourContent() {
    try {
      const summary = $('#rl-wizard-summary-content');
      const modeNames = {
        thinking: '思维链验证',
        structured: '结构化验证',
        custom: '自定义规则',
      };

      // 构建“必需内容 + 绑定 + 开关”摘要表格
      const rows = (this.wizardData.requiredContent || []).map(text => {
        const opt = (this.wizardData.contentOptions && this.wizardData.contentOptions[text]) || { enabled: true, actions: [] };
        const map = { 'balance-pairs': '配对补齐', 'after-prev': '上后', 'before-next': '下前', 'custom': '自定义' };
        const chips = (opt.actions||[]).map(a=>`<span class=\"rl-chip\">${map[a]||a}</span>`).join('');
        const enabledText = opt.enabled ? '启用' : '禁用';
        const extra = (opt.actions?.includes('custom') && opt.pattern) ? ` / 正则: <code>${opt.pattern}</code>` : '';
        return `<li><code>${text}</code> — <span>${chips || '默认'}</span> — <em>${enabledText}</em>${extra}</li>`;
      }).join('');

      let summaryHtml = `
        <div class="rl-summary-item">
          <span class="rl-summary-label">验证模式：</span>
          <span class="rl-summary-value">${modeNames[this.selectedMode]}</span>
        </div>
        <div class="rl-summary-item">
          <span class="rl-summary-label">必需内容：</span>
          <span class="rl-summary-value"><ul class="rl-summary-list">${rows}</ul></span>
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
    } catch (error) {
      console.error('加载第四步内容失败:', error);
    }
  }

  /**
   * 生成规则数据
   * @returns {Object} 规则数据
   */
  generateRuleData() {
    try {
      // 确保最新数据同步
      this.updateWizardData();
      return {
        name: $('#rl-wizard-rule-name').val().trim(),
        description: $('#rl-wizard-rule-description').val().trim() || '',
        enabled: true,
        requiredContent: this.wizardData.requiredContent,
        // fixStrategy 保持向后兼容：可能是字符串或数组
        fixStrategy: this.wizardData.fixStrategy,
        positionalOptions: this.wizardData.positionalOptions || { doubleNewline: true },
        contentOptions: this.wizardData.contentOptions || {},
      };
    } catch (error) {
      console.error('生成规则数据失败:', error);
      return {};
    }
  }
  /** 弹出动作选择弹窗（与规则编辑器一致的UI） */
  _openActionsPopup(selected = [], pattern = '') {
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
            <input type="text" class="text_pole" placeholder="例如：(</thinking>)(?!\\s*<content>)" />
          </div>
        </div>
      `);
      selected = Array.isArray(selected) ? selected : [];
      html.find('input[type="checkbox"]').each((_, el)=>{ el.checked = selected.includes(el.value); });
      const refreshCustom = () => html.find('.rl-custom-area').toggle(html.find('input[value="custom"]')[0].checked);
      html.on('change', 'input[value="custom"]', refreshCustom); refreshCustom();
      if (pattern) html.find('.rl-custom-area input').val(pattern);
      const popup = (window.getContext && getContext().callGenericPopup) ? getContext().callGenericPopup : window.callGenericPopup;
      if (!popup) throw new ReferenceError('callGenericPopup is not available');
      return popup(html, 'confirm', '选择修复动作', { okButton: '确定', cancelButton: '取消', allowVerticalScrolling: true })
        .then(ok => {
          if (!ok) return null;
          const actions = html.find('input:checked').map((_, el)=>el.value).get();
          const pat = html.find('.rl-custom-area input').val()?.toString().trim() || '';
          return { actions, pattern: pat };
        });
    } catch (e) { console.warn('Wizard openActionsPopup失败', e); return Promise.resolve(null); }
  }


  /**
   * 测试规则
   */
  testRule() {
    try {
      const testContent = $('#rl-wizard-test-content').val().trim();
      const resultContainer = $('#rl-wizard-test-result');

      if (!testContent) {
        if (window.toastr) {
          window.toastr.warning('请输入测试内容', '配置向导');
        }
        return;
      }

      // 创建临时规则进行测试
      const tempRule = {
        id: 'temp-wizard-rule',
        name: '临时测试规则',
        enabled: true,
        requiredContent: this.wizardData.requiredContent,
        fixStrategy: Array.isArray(this.wizardData.fixStrategy) ? this.wizardData.fixStrategy : this.wizardData.fixStrategy,
        contentOptions: this.wizardData.contentOptions,
      };

      // 使用后端控制器进行测试
      try {
        // 临时添加规则到后端进行测试
        const extensionName = 'response-linter';
        const currentSettings = window.extension_settings ? window.extension_settings[extensionName] : {};
        const tempSettings = {
          ...currentSettings,
          enabled: true, // 测试期强制启用验证引擎，避免被全局禁用短路
          rules: [...(currentSettings.rules || []), tempRule],
        };

        // 暂时更新后端规则
        if (window.backendController) {
          window.backendController.updateSettings(tempSettings);

          // 使用后端验证引擎测试
          const result = window.backendController.validateContent(testContent, 'test-message-wizard');

          // 恢复原始规则设置
          window.backendController.updateSettings(currentSettings);

          resultContainer.removeClass('success error').show();

          if (!result || result.isValid) {
            resultContainer.addClass('success');
            // 即使验证通过也显示修复预览：用于消除多余标签或规范空白
            let passHtml = `
              <h5><i class="fa-solid fa-check-circle"></i> 验证通过</h5>
              <p>测试内容符合规则要求！</p>
            `;
            try {
              // 通过即不做规范化；仅提示用户已符合规则
              // 如需预览流水线，可在下方切换为具体动作数组调用 previewFix([...])
            } catch (pe) { console.warn('生成通过预览失败', pe); }
            resultContainer.html(passHtml);
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

            // 新增：失败时给出修复预览（注入当前规则上下文，便于位置/清理策略参考顺序）
            try {
              const prevRule = window.ResponseLinter?.CurrentRule;
              window.ResponseLinter = window.ResponseLinter || {};
              window.ResponseLinter.CurrentRule = tempRule;
              const preview = window.backendController?.previewFix?.(testContent, result.missingContent, result.fixStrategy);
              if (preview && preview.success && preview.newContent) {
                const before = testContent.length > 300 ? testContent.slice(0, 300) + '...' : testContent;
                const after = preview.newContent.length > 300 ? preview.newContent.slice(0, 300) + '...' : preview.newContent;
                errorHtml += `<div class="rl-preview-block"><p><strong>修复预览（策略：${preview.strategy || '自动'}）</strong></p>` +
                  `<div class="rl-preview-compare"><div><em>修复前</em><pre>${before.replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</pre></div>` +
                  `<div><em>修复后</em><pre>${after.replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</pre></div></div></div>`;
              } else if (preview && !preview.success) {
                errorHtml += `<p><strong>修复预览失败：</strong>${preview.reason || '无可用修复'}</p>`;
              }
              window.ResponseLinter.CurrentRule = prevRule;
            } catch (pe) {
              console.warn('生成修复预览失败', pe);
            }

            resultContainer.html(errorHtml);
          }
        } else {
          throw new Error('后端控制器未初始化');
        }
      } catch (error) {
        console.error('规则测试失败:', error);
        resultContainer.removeClass('success error').addClass('error').show();
        resultContainer.html(`
          <h5><i class="fa-solid fa-exclamation-triangle"></i> 测试出错</h5>
          <p>无法完成规则测试，请检查配置。错误：${error.message}</p>
        `);


      }
    } catch (error) {
      console.error('测试规则失败:', error);
      if (window.toastr) {
        window.toastr.error('测试规则失败', '配置向导');
      }
    }
  }
}
