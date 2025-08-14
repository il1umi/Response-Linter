// Response Linter 后端控制器
// 整合验证引擎、消息处理器、修复协调器和通知系统，提供统一的后端接口

// 通过 getContext() 获取扩展设置，避免直接依赖内部文件
const __getCtx = () => { try { return (typeof getContext === 'function') ? getContext() : (window.getContext ? window.getContext() : null); } catch { return null; } };
const __ctx = __getCtx() || {};
const extension_settings = __ctx.extensionSettings || window.extension_settings || {};

import { fixCoordinator } from './fix-coordinator.js';
import { messageHandler } from './message-handler.js';
import { validationEngine } from './validation-engine.js';
import { autoFixEngine } from './auto-fix-engine.js';

/**
 * 后端控制器核心类
 * 负责协调各个模块的工作，包括验证和修复功能
 */
export class BackendController {
  constructor(extensionName) {
    this.extensionName = extensionName;
    this.isInitialized = false;
    this.isRunning = false;

    // 统计数据（整合修复统计）
    this.statistics = {
      totalValidations: 0,
      failedValidations: 0,
      successfulFixes: 0,
      totalFixAttempts: 0,
      userCancellations: 0,
      lastActivity: null,
    };

    // 绑定事件处理器
    this._bindEventHandlers();
  }

  /**
   * 初始化后端系统
   * @param {Object} settings - 扩展设置
   */
  initialize(settings) {
    if (this.isInitialized) {
      console.warn('[Response Linter] 后端控制器已初始化');
      return;
    }

    try {
      console.log('[Response Linter] 初始化后端系统（包含修复功能）');

      // 初始化验证引擎
      const activeRules = (settings.rules || []).filter(rule => rule.enabled);
      validationEngine.initialize(activeRules, settings.enabled);

      // 初始化修复协调器
      fixCoordinator.initialize({
        enabled: settings.enabled,
        autoFix: settings.autoFix || false,
      });

      // 如果启用了扩展，开始监听消息
      if (settings.enabled && activeRules.length > 0) {
        this.start();
      }

      this.isInitialized = true;
      console.log('[Response Linter] 后端系统初始化完成');
    } catch (error) {
      console.error('[Response Linter] 后端系统初始化失败:', error);
      this.isInitialized = false;
    }
  }

  /**
   * 启动后端服务
   */
  start() {
    if (this.isRunning) {
      console.warn('[Response Linter] 后端服务已在运行');
      return;
    }

    try {
      // 启动消息监听
      console.info('[Response Linter] 尝试启动消息监听...');
      messageHandler.startListening(); // 内部会打印 [Response Linter] 消息处理器开始监听事件
      this.isRunning = true;

      console.log('[Response Linter] 后端服务已启动');
      this._dispatchStatusEvent('backendStarted');
    } catch (error) {
      console.error('[Response Linter] 启动后端服务失败:', error);
      this.isRunning = false;
    }
  }

  /**
   * 停止后端服务
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      // 停止消息监听
      messageHandler.stopListening();
      this.isRunning = false;

      console.log('[Response Linter] 后端服务已停止');
      this._dispatchStatusEvent('backendStopped');
    } catch (error) {
      console.error('[Response Linter] 停止后端服务失败:', error);
    }
  }

  /**
   * 更新后端配置
   * @param {Object} settings - 新的设置
   */
  updateSettings(settings) {
    try {
      // 更新验证引擎设置
      const activeRules = (settings.rules || []).filter(rule => rule.enabled);
      validationEngine.updateRules(activeRules);
      validationEngine.setEnabled(settings.enabled);

      // 更新修复协调器设置
      fixCoordinator.updateSettings({
        enabled: settings.enabled,
        autoFix: settings.autoFix || false,
      });

      // 根据设置状态控制服务运行
      if (settings.enabled && activeRules.length > 0) {
        if (!this.isRunning) {
          this.start();
        }
      } else {
        if (this.isRunning) {
          this.stop();
        }
      }

      console.log('[Response Linter] 后端设置已更新');
    } catch (error) {
      console.error('[Response Linter] 更新后端设置失败:', error);
    }
  }

  /**
   * 手动验证最新消息
   * @returns {Object|null} 验证结果
   */
  validateLatestMessage() {
    try {
      const latestMessage = messageHandler.getLatestAIMessage();

      if (!latestMessage) {
        console.warn('没有找到AI消息进行验证');
        return null;
      }

      const result = validationEngine.validateMessage(latestMessage.content, latestMessage.id);

      if (result) {
        this._handleValidationResult(result, latestMessage);
      }

      return result;
    } catch (error) {
      console.error('手动验证失败:', error);
      return null;
    }
  }

  /**
   * 验证指定内容
   * @param {string} content - 要验证的内容
   * @param {string} messageId - 消息ID（用于标识）
   * @returns {Object|null} 验证结果
   */
  validateContent(content, messageId = 'manual-validation') {
    try {
      if (!content || typeof content !== 'string') {
        console.warn('验证内容无效:', content);
        return null;
      }

      // 直接使用验证引擎验证内容
      const result = validationEngine.validateMessage(content, messageId);

      // 更新统计（但不触发事件，因为这是手动测试）
      if (result && !result.isValid) {
        this.statistics.totalValidations++;
        this.statistics.failedValidations++;
      } else if (result) {
        this.statistics.totalValidations++;
      }

      return result;
    } catch (error) {
      console.error('内容验证失败:', error);
      return null;
    }
  }

  /**
   * 获取后端状态
   * @returns {Object} 完整的状态信息
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      extensionName: this.extensionName,
      statistics: { ...this.statistics },
      validationEngine: validationEngine.getStatistics(),
      messageHandler: messageHandler.getStatus(),
      fixCoordinator: fixCoordinator.getStatus(),
    };
  }

  /**
   * 获取统计数据
   * @returns {Object} 统计信息
   */
  getStatistics() {
    const engineStats = validationEngine.getStatistics();

    return {
      totalValidations: this.statistics.totalValidations,
      failedValidations: this.statistics.failedValidations,
      successfulFixes: this.statistics.successfulFixes,
      totalFixAttempts: this.statistics.totalFixAttempts,
      userCancellations: this.statistics.userCancellations,
      lastActivity: this.statistics.lastActivity,
      engineValidations: engineStats.validationCount,
      activeRules: engineStats.activeRulesCount,
      successRate:
        this.statistics.totalValidations > 0
          ? Math.round(
              ((this.statistics.totalValidations - this.statistics.failedValidations) /
                this.statistics.totalValidations) *
                100,
            )
          : 100,
    };
  }

  /**
   * 重置统计数据
   */
  resetStatistics() {
    this.statistics = {
      totalValidations: 0,
      failedValidations: 0,
      successfulFixes: 0,
      totalFixAttempts: 0,
      userCancellations: 0,
      lastActivity: null,
    };

    validationEngine.resetStatistics();
    fixCoordinator.resetStatistics();
    console.log('后端统计数据已重置');
  }

  /**
   * 执行内存清理
   */
  cleanup() {
    try {
      // 清理消息处理器的内存
      messageHandler.cleanupProcessedMessages();
      fixCoordinator.cleanup();

      console.log('后端内存清理完成');
    } catch (error) {
      console.error('后端内存清理失败:', error);
    }
  }

  /**
   * 绑定事件处理器
   * @private
   */
  _bindEventHandlers() {
    // 监听消息处理事件
    document.addEventListener('responseLinter.messageProcessed', event => {
      this._handleMessageProcessed(event.detail);
    });
  }

  /**
   * 处理消息已处理事件
   * @private
   * @param {Object} messageData - 消息数据
   */
  async _handleMessageProcessed(messageData) {
    try {
      // 进行验证
      const result = validationEngine.validateMessage(messageData.content, messageData.messageId);

      if (result) {
        this._handleValidationResult(result, messageData);
      }
    } catch (error) {
      console.error('处理消息验证失败:', error, messageData);
    }
  }

  /**
   * 处理验证结果
   * @private
   * @param {Object} result - 验证结果
   * @param {Object} messageData - 消息数据
   */
  _handleValidationResult(result, messageData) {
    // 更新统计
    this.statistics.totalValidations++;
    this.statistics.lastActivity = new Date();

    if (result.isValid) {
      console.log('验证通过:', messageData.messageId);
      this._dispatchValidationEvent('validationPassed', result, messageData);
    } else {
      console.log('验证失败:', result);
      this.statistics.failedValidations++;
      this._dispatchValidationEvent('validationFailed', result, messageData);
    }

    // 更新UI统计显示
    this._updateUIStatistics();
  }

  /**
   * 更新UI统计显示
   * @private
   */
  _updateUIStatistics() {
    try {
      const settings = extension_settings[this.extensionName];
      if (settings && settings.statistics) {
        const stats = this.getStatistics();
        settings.statistics.validations = stats.totalValidations;
        settings.statistics.fixes = stats.successfulFixes;
        settings.statistics.successRate = stats.successRate;
        settings.statistics.fixAttempts = stats.totalFixAttempts;
        settings.statistics.cancellations = stats.userCancellations;
      }
    } catch (error) {
      console.error('更新UI统计失败:', error);
    }
  }

  /**
   * 分发验证事件
   * @private
   * @param {string} eventType - 事件类型
   * @param {Object} result - 验证结果
   * @param {Object} messageData - 消息数据
   */
  _dispatchValidationEvent(eventType, result, messageData) {
    try {
      const event = new CustomEvent(`responseLinter.${eventType}`, {
        detail: {
          result,
          messageData,
          timestamp: new Date(),
        },
      });

      document.dispatchEvent(event);
    } catch (error) {
      console.error('分发验证事件失败:', error);
    }
  }

  /**
   * 分发状态事件
   * @private
   * @param {string} eventType - 事件类型
   */
  _dispatchStatusEvent(eventType) {
    try {
      const event = new CustomEvent(`responseLinter.${eventType}`, {
        detail: {
          timestamp: new Date(),
          status: this.getStatus(),
        },
      });

      document.dispatchEvent(event);
    } catch (error) {
      console.error('分发状态事件失败:', error);
    }
  }

  // ============ 修复功能API ============

  /**
   * 手动触发消息修复
   * @param {string} messageId - 消息ID
   * @param {string} strategy - 修复策略（可选）
   * @returns {Promise<Object>} 修复结果
   */
  async triggerManualFix(messageId, strategy = null) {
    try {
      // 获取消息内容
      const messageData = messageHandler.extractMessage(messageId);
      if (!messageData) {
        return { success: false, reason: '无法获取消息内容' };
      }

      // 重新验证消息以获取缺失项
      const validationResult = validationEngine.validateMessage(messageData.content, messageId);
      if (!validationResult || validationResult.isValid) {
        return { success: false, reason: '消息已通过验证，无需修复' };
      }

      // 获取第一个失败规则的缺失项
      const failedRule = validationResult.failedRules[0];
      if (!failedRule) {
        return { success: false, reason: '无法确定修复策略' };
      }

      // 触发手动修复
      const result = await fixCoordinator.triggerManualFix(
        messageId,
        messageData.content,
        failedRule.missingContent,
        strategy || failedRule.fixStrategy,
      );

      // 更新统计
      this.statistics.totalFixAttempts++;
      this._updateUIStatistics();

      return result;
    } catch (error) {
      console.error('手动修复失败:', error);
      return { success: false, reason: '修复过程出错', error: error.message };
    }
  }

  /**
   * 确认修复操作
   * @param {string} messageId - 消息ID
   * @param {boolean} confirmed - 是否确认修复
   * @returns {Promise<Object>} 确认结果
   */
  async confirmFix(messageId, confirmed) {
    try {
      const result = await fixCoordinator.confirmFix(messageId, confirmed);

      // 更新统计
      if (confirmed && result.success) {
        this.statistics.successfulFixes++;
      } else if (!confirmed) {
        this.statistics.userCancellations++;
      }

      this._updateUIStatistics();
      return result;
    } catch (error) {
      console.error('确认修复失败:', error);
      return { success: false, reason: '确认过程出错', error: error.message };
    }
  }

  /**
   * 预览修复（不落地、不触发确认），用于配置向导测试
   * @param {string} content 原始内容
   * @param {Array<string>} missingItems 缺失项
   * @param {string|null} strategy 策略（可选，为空则尝试所有策略）
   * @returns {{success:boolean, newContent:string, strategy:string|null, reason?:string}}
   */
  previewFix(content, missingItems = [], strategy = null) {
    try {
      if (!content || typeof content !== 'string') {
        return { success: false, newContent: content || '', strategy: null, reason: '无效内容' };
      }

      // 确保修复引擎处于启用状态，仅用于预览计算
      const prevEnabled = autoFixEngine.isEnabled;
      autoFixEngine.setEnabled(true);
      const res = autoFixEngine.attemptFix(content, missingItems, strategy);
      autoFixEngine.setEnabled(prevEnabled);

      if (!res.success) {
        return { success: false, newContent: content, strategy: null, reason: res.metadata?.reason || '无法生成修复预览' };
      }

      return { success: true, newContent: res.fixedContent, strategy: res.strategy };
    } catch (error) {
      console.error('预览修复失败:', error);
      return { success: false, newContent: content, strategy: null, reason: error.message };
    }
  }

/**
   * 撤销修复操作
   * @param {string} messageId - 消息ID
   * @param {number} steps - 撤销步数，默认1
   * @returns {Promise<Object>} 撤销结果
   */
  async undoFix(messageId, steps = 1) {
    try {
      const result = await fixCoordinator.undoFix(messageId, steps);

      // 更新统计（撤销不影响成功修复计数）
      this._updateUIStatistics();
      return result;
    } catch (error) {
      console.error('撤销修复失败:', error);
      return { success: false, reason: '撤销过程出错', error: error.message };
    }
  }

  /**
   * 获取消息的修复历史
   * @param {string} messageId - 消息ID
   * @returns {Array<Object>} 修复历史记录
   */
  getFixHistory(messageId) {
    try {
      // 通过fixCoordinator获取修改历史
      return fixCoordinator.getModificationHistory ? fixCoordinator.getModificationHistory(messageId) : [];
    } catch (error) {
      console.error('获取修复历史失败:', error);
      return [];
    }
  }

  /**
   * 检查消息是否可以撤销修复
   * @param {string} messageId - 消息ID
   * @returns {boolean} 是否可以撤销
   */
  canUndoFix(messageId) {
    try {
      return fixCoordinator.canUndo ? fixCoordinator.canUndo(messageId) : false;
    } catch (error) {
      console.error('检查撤销状态失败:', error);
      return false;
    }
  }

  /**
   * 获取修复相关的统计信息
   * @returns {Object} 修复统计数据
   */
  getFixStatistics() {
    try {
      const coordinatorStats = fixCoordinator.getStatistics();
      return {
        totalAttempts: this.statistics.totalFixAttempts,
        successfulFixes: this.statistics.successfulFixes,
        userCancellations: this.statistics.userCancellations,
        queueLength: coordinatorStats.queueLength || 0,
        isProcessing: coordinatorStats.isProcessing || false,
        successRate:
          this.statistics.totalFixAttempts > 0
            ? Math.round((this.statistics.successfulFixes / this.statistics.totalFixAttempts) * 100)
            : 0,
      };
    } catch (error) {
      console.error('获取修复统计失败:', error);
      return {
        totalAttempts: 0,
        successfulFixes: 0,
        userCancellations: 0,
        queueLength: 0,
        isProcessing: false,
        successRate: 0,
      };
    }
  }
}

/**
 * 创建后端控制器实例
 * @param {string} extensionName - 扩展名称
 * @returns {BackendController} 控制器实例
 */
export function createBackendController(extensionName) {
  return new BackendController(extensionName);
}
