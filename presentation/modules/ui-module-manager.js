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

      // 第五阶段：完成初始化
      console.log('✅ 完成UI模块初始化设置...');
      await this.finalizeInitialization();

      this.isInitialized = true;
      console.log('🎉 UI模块初始化完成！');
      return true;
    } catch (error) {
      console.error('❌ UI模块初始化失败:', error);
      this.initializationError = error;

      // 不抛出异常，允许回退到原始方式
      return false;
    }
  }

  /**
   * 完成初始化 - 建立模块间依赖关系
   */
  static async finalizeInitialization() {
    try {
      console.log('🔗 建立模块间依赖关系...');

      // 确保所有模块都已正确初始化
      const modules = ['UIState', 'RulesManager', 'RuleEditor', 'ConfigWizard'];
      for (const moduleName of modules) {
        if (!window[moduleName]) {
          throw new Error(`模块 ${moduleName} 未正确初始化`);
        }
      }

      // 设置模块间的引用关系
      if (window.UIState) {
        window.UIState.RulesManager = window.RulesManager;
        window.UIState.RuleEditor = window.RuleEditor;
        window.UIState.ConfigWizard = window.ConfigWizard;
      }

      // 设置后端事件处理器（从index.js迁移）
      this.setupBackendEventHandlers();

      console.log('✅ 模块依赖关系建立完成');
    } catch (error) {
      console.error('❌ 完成初始化时出错:', error);
      throw error;
    }
  }

  /**
   * 设置后端事件处理器
   */
  static setupBackendEventHandlers() {
    try {
      console.log('🔧 设置后端事件处理器...');

      // 监听消息渲染事件
      if (typeof eventSource !== 'undefined') {
        eventSource.on('CHARACTER_MESSAGE_RENDERED', data => {
          if (window.backendController && window.UIState) {
            window.backendController.handleMessageRendered(data);
          }
        });
        console.log('✅ 后端事件处理器设置完成');
      } else {
        console.warn('⚠️ eventSource未定义，无法设置后端事件');
      }
    } catch (error) {
      console.error('❌ 设置后端事件处理器失败:', error);
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
