// Response Linter UI模块管理器
// 负责协调所有UI模块的初始化，确保安全的模块化加载

/**
 * UI模块管理器 - 核心协调器
 * 负责按正确顺序初始化所有UI模块，并提供失败回退机制
 */
export class UIModuleManager {
  static isInitialized = false;
  static initializationError = null;

  /**
   * 初始化所有UI模块
   * @returns {Promise<boolean>} 初始化是否成功
   */
  static async initialize() {
    if (this.isInitialized) {
      console.log('UI模块已经初始化，跳过重复初始化');
      return true;
    }

    try {
      console.log('🚀 开始Response Linter UI模块初始化...');

      // 第一阶段：初始化状态管理器
      console.log('📊 初始化状态管理器...');
      const { UIStateManager } = await import('./ui-state-manager.js');
      await UIStateManager.initialize();

      // 第二阶段：初始化规则管理器
      console.log('📋 初始化规则管理器...');
      const { RulesManagerUI } = await import('./rules-manager-ui.js');
      await RulesManagerUI.initialize();

      // 第三阶段：初始化规则编辑器
      console.log('✏️ 初始化规则编辑器...');
      const { RuleEditorUI } = await import('./rule-editor-ui.js');
      await RuleEditorUI.initialize();

      // 第四阶段：初始化配置向导
      console.log('🧙 初始化配置向导...');
      const { ConfigWizardUI } = await import('./config-wizard-ui.js');
      await ConfigWizardUI.initialize();

      // 第五阶段：初始化验证功能
      console.log('🔍 初始化验证功能...');
      const { ValidationFunctionsUI } = await import('./validation-functions-ui.js');
      await ValidationFunctionsUI.initialize();

      // 第六阶段：完成初始化
      console.log('✅ 完成UI模块初始化设置...');
      await this.finalizeInitialization();

      this.isInitialized = true;
      console.log('🎉 UI模块初始化完成！');
      return true;
    } catch (error) {
      // 使用纯ASCII避免某些环境对全角标点解析问题
      console.error('UI模块初始化失败:', error);
      this.initializationError = error;

      // 不抛出异常，允许回退到原始方式
      return false;
    }
  }

  /**
   * 完成初始化设置
   * @private
   */
  static async finalizeInitialization() {
    try {
      // 设置模块间的交叉引用和依赖关系
      console.log('🔗 建立模块间依赖关系...');

      // 确保所有模块都可以访问彼此
      if (window.ResponseLinter) {
        // 所有模块现在都应该在 window.ResponseLinter 命名空间下可用
        const modules = ['UIState', 'RulesManager', 'RuleEditor', 'ConfigWizard', 'ValidationFunctions'];
        const missingModules = modules.filter(module => !window.ResponseLinter[module]);

        if (missingModules.length > 0) {
          console.warn('部分模块未正确初始化:', missingModules);
        } else {
          console.log('✅ 所有UI模块已成功初始化并建立依赖关系');

          // 依赖注入（最小侵入）：将 backendController 与 UIState 注入各模块实例
          const controller = window.backendController || window.ResponseLinter?.BackendController || null;
          const uiState = window.ResponseLinter?.UIState || window.UIState || null;
          const targets = ['RulesManager', 'RuleEditor', 'ConfigWizard', 'ValidationFunctions'];
          for (const key of targets) {
            const inst = window.ResponseLinter[key];
            if (!inst || typeof inst !== 'object') continue;
            try {
              // 优先调用模块自带的 setter（若将来添加），否则直接赋值为私有字段
              if (typeof inst.setController === 'function') inst.setController(controller);
              else inst._controller = controller;
              if (typeof inst.setUIState === 'function') inst.setUIState(uiState);
              else inst._uiState = uiState;
            } catch (e) {
              console.warn(`为模块 ${key} 注入依赖失败:`, e);
            }
          }
        }
      }

      console.log('📝 模块初始化完成，准备进行设置加载...');
    } catch (error) {
      console.error('完成初始化时出错:', error);
      throw error;
    }
  }

  /**
   * 获取初始化状态
   * @returns {Object} 初始化状态信息
   */
  static getInitializationStatus() {
    return {
      isInitialized: this.isInitialized,
      error: this.initializationError,
      timestamp: new Date().toISOString(),
      modules: window.ResponseLinter
        ? Object.keys(window.ResponseLinter).filter(key => typeof window.ResponseLinter[key] === 'object')
        : [],
    };
  }

  /**
   * 重置初始化状态（用于测试）
   */
  static reset() {
    this.isInitialized = false;
    this.initializationError = null;
  }
}

// 为了调试方便，将模块管理器暴露到全局
if (typeof window !== 'undefined') {
  window.ResponseLinterUIModuleManager = UIModuleManager;
}
