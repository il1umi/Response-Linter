// Response Linter 验证功能UI模块
// 重构自index.js中的ValidationFunctions对象，保持完全向后兼容

/**
 * 验证功能UI类
 * 负责手动验证触发、验证结果通知、自动修复触发等UI操作
 */
export class ValidationFunctionsUI {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * 静态初始化方法
   * 创建全局实例并设置向后兼容性
   */
  static async initialize() {
    try {
      console.log('🔍 初始化ValidationFunctionsUI...');

      // 创建实例
      const validationFunctionsInstance = new ValidationFunctionsUI();

      // 设置到全局命名空间
      if (!window.ResponseLinter) {
        window.ResponseLinter = {};
      }
      window.ResponseLinter.ValidationFunctions = validationFunctionsInstance;

      // 向后兼容：在全局scope创建ValidationFunctions（保持现有代码工作）
      window.ValidationFunctions = validationFunctionsInstance;

      validationFunctionsInstance.isInitialized = true;
      console.log('✅ ValidationFunctionsUI初始化完成，向后兼容性已建立');
    } catch (error) {
      console.error('❌ ValidationFunctionsUI初始化失败:', error);
      throw error;
    }
  }

  /**
   * 手动触发验证
   */
  triggerManualValidation() {
    try {
      // 检查后端控制器是否可用
      const backendController = window.backendController || window.ResponseLinter?.backendController;

      if (!backendController) {
        console.warn('后端控制器未初始化');
        console.log('调试信息:', {
          windowBackendController: !!window.backendController,
          responseLinterBackendController: !!window.ResponseLinter?.backendController,
          responseLinter: !!window.ResponseLinter
        });

        if (window.toastr) {
          window.toastr.warning('验证系统未就绪，请检查扩展是否正确加载', '响应检查器');
        }
        return;
      }

      const result = backendController.validateLatestMessage();

      if (!result) {
        if (window.toastr) {
          window.toastr.warning('没有找到可验证的AI消息', '响应检查器');
        }
        return;
      }

      if (result.isValid) {
        const extensionName = 'response-linter';
        if (window.extension_settings && 
            window.extension_settings[extensionName] && 
            window.extension_settings[extensionName].notifications.showSuccess) {
          if (window.toastr) {
            window.toastr.success('最新消息验证通过', '响应检查器');
          }
        }
      } else {
        this.showDetailedValidationNotification(result);
      }

      // 更新统计显示
      if (window.UIState) {
        window.UIState.updateStatistics();
      }
    } catch (error) {
      console.error('手动验证失败:', error);
      if (window.toastr) {
        window.toastr.error('验证过程出错', '响应检查器');
      }
    }
  }

  /**
   * 显示详细验证失败通知
   * @param {Object} result - 验证结果对象
   */
  showDetailedValidationNotification(result) {
    try {
      if (!window.extension_settings || !window.toastr) {
        console.warn('必需的全局对象未初始化');
        return;
      }

      const extensionName = 'response-linter';
      const duration = window.extension_settings[extensionName].notifications.duration * 1000;
      const hasAutoFix = result.fixStrategy && window.UIState && window.UIState.isAutoFixEnabled;

      // 生成详细错误信息HTML
      const detailsHtml = this.generateErrorDetailsHtml(result);

      let message = `<div class="rl-validation-error-detail">
                       <div class="rl-error-type">
                         规则验证失败：<strong>${result.ruleName}</strong>
                         ${this.getErrorBadgeHtml(result.errorType)}
                       </div>
                       ${detailsHtml}
                     </div>`;

      const options = {
        timeOut: duration,
        extendedTimeOut: duration + 2000,
        closeButton: true,
        escapeHtml: false,
        onclick: hasAutoFix ? () => this.triggerAutoFix(result.ruleName) : null,
      };

      if (hasAutoFix) {
        message += '<br><em>点击进行自动修复</em>';
        options.title = '⚠️ 可自动修复';
      } else {
        options.title = this.getErrorTitle(result.errorType);
      }

      window.toastr.warning(message, options.title, options);
    } catch (error) {
      console.error('显示验证通知失败:', error);
    }
  }

  /**
   * 生成错误类型徽章HTML
   * @param {string} errorType - 错误类型
   * @returns {string} 徽章HTML
   */
  getErrorBadgeHtml(errorType) {
    const badges = {
      missing: '<span class="rl-error-badge missing">标签缺失</span>',
      order: '<span class="rl-error-badge order">顺序错误</span>',
      incomplete: '<span class="rl-error-badge incomplete">不完整配对</span>',
    };

    return badges[errorType] || '<span class="rl-error-badge missing">验证失败</span>';
  }

  /**
   * 获取错误标题
   * @param {string} errorType - 错误类型
   * @returns {string} 错误标题
   */
  getErrorTitle(errorType) {
    const titles = {
      missing: '⚠️ 缺失必需标签',
      order: '⚠️ 标签顺序错误',
      incomplete: '⚠️ 标签配对不完整',
    };

    return titles[errorType] || '⚠️ 检测到格式问题';
  }

  /**
   * 生成详细错误信息HTML
   * @param {Object} result - 验证结果对象
   * @returns {string} 错误详情HTML
   */
  generateErrorDetailsHtml(result) {
    try {
      if (!result.errorDetails || result.errorDetails.length === 0) {
        // 向后兼容：如果没有详细错误信息，使用简单格式
        return `<div class="rl-error-position">
                  <strong>缺失内容：</strong>${result.missingContent.join(', ')}
                </div>`;
      }

      let html = '';

      for (const detail of result.errorDetails) {
        if (detail.type === 'missing') {
          html += `<div class="rl-error-position">
                     <strong>缺失标签：</strong><span class="rl-error-code">${detail.item}</span>
                   </div>
                   <div class="rl-suggested-fix">
                     <strong>修复建议：</strong>${detail.suggestedFix}
                   </div>`;
        } else if (detail.type === 'order') {
          html += `<div class="rl-error-position">
                     <strong>位置错误：</strong>${detail.message}
                   </div>
                   <div class="rl-suggested-fix">
                     <strong>修复建议：</strong>${detail.suggestedFix}
                   </div>`;
        }
      }

      return html;
    } catch (error) {
      console.error('生成错误详情HTML失败:', error);
      return '<div class="rl-error-position">生成错误详情时出错</div>';
    }
  }

  /**
   * 兼容原有的简单通知方法（废弃）
   * @param {string} ruleName - 规则名称
   * @param {Array} missingContent - 缺失内容数组
   * @param {string} fixStrategy - 修复策略
   * @deprecated 建议使用showDetailedValidationNotification
   */
  showValidationNotification(ruleName, missingContent, fixStrategy) {
    console.warn('showValidationNotification已废弃，请使用showDetailedValidationNotification');

    try {
      if (!window.extension_settings || !window.toastr) {
        console.warn('必需的全局对象未初始化');
        return;
      }

      const extensionName = 'response-linter';
      const duration = window.extension_settings[extensionName].notifications.duration * 1000;
      const hasAutoFix = fixStrategy && window.UIState && window.UIState.isAutoFixEnabled;

      let message = `<strong>验证失败</strong><br>
                        规则：${ruleName}<br>
                        缺失：${missingContent.join(', ')}`;

      const options = {
        timeOut: duration,
        extendedTimeOut: duration + 2000,
        closeButton: true,
        escapeHtml: false,
        onclick: hasAutoFix ? () => this.triggerAutoFix(ruleName) : null,
      };

      if (hasAutoFix) {
        message += '<br><br><em>点击进行自动修复</em>';
        options.title = '⚠️ 可自动修复';
      } else {
        options.title = '⚠️ 检测到格式问题';
      }

      window.toastr.warning(message, options.title, options);
    } catch (error) {
      console.error('显示简单验证通知失败:', error);
    }
  }

  /**
   * 触发自动修复
   * @param {string} ruleName - 规则名称
   */
  triggerAutoFix(ruleName) {
    try {
      console.log('触发自动修复功能:', ruleName);

      // 检查后端控制器是否可用
      const backendController = window.backendController || window.ResponseLinter?.backendController;

      if (!backendController) {
        console.warn('后端控制器未初始化，无法执行自动修复');
        if (window.toastr) {
          window.toastr.warning('修复系统未就绪', '响应检查器');
        }
        return;
      }

      // 调用后端控制器的自动修复功能
      backendController.triggerAutoFix(ruleName);
    } catch (error) {
      console.error('触发自动修复失败:', error);
      if (window.toastr) {
        window.toastr.error('自动修复触发失败', '响应检查器');
      }
    }
  }
}

// 导出单例模式的便捷访问方法
export function getValidationFunctions() {
  return window.ValidationFunctions || window.ResponseLinter?.ValidationFunctions;
}
