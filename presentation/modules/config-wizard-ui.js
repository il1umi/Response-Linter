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
   * 绑定第二步事件
   */
  bindStepTwoEvents() {
    try {
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

      const tagInput = $(`
        <div class="rl-wizard-tag-input">
          <input type="text" placeholder="输入标签或内容..." data-index="${index}" />
          <button type="button" class="rl-remove-wizard-tag">×</button>
        </div>
      `);

      container.append(tagInput);
      tagInput.find('input').focus();
    } catch (error) {
      console.error('添加向导标签失败:', error);
    }
  }

  /**
   * 更新向导数据
   */
  updateWizardData() {
    try {
      const inputs = $('#rl-wizard-tags-container input');
      const requiredContent = [];

      inputs.each((index, element) => {
        const value = $(element).val().trim();
        if (value) {
          requiredContent.push(value);
        }
      });

      this.wizardData.requiredContent = requiredContent;
    } catch (error) {
      console.error('更新向导数据失败:', error);
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
      return {
        name: $('#rl-wizard-rule-name').val().trim(),
        description: $('#rl-wizard-rule-description').val().trim() || '',
        enabled: true,
        requiredContent: this.wizardData.requiredContent,
        fixStrategy: this.wizardData.fixStrategy,
        positionalOptions: this.wizardData.positionalOptions || { doubleNewline: true },
      };
    } catch (error) {
      console.error('生成规则数据失败:', error);
      return {};
    }
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
        fixStrategy: this.wizardData.fixStrategy,
      };

      // 使用后端控制器进行测试
      try {
        // 临时添加规则到后端进行测试
        const extensionName = 'response-linter';
        const currentSettings = window.extension_settings ? window.extension_settings[extensionName] : {};
        const tempSettings = {
          ...currentSettings,
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
