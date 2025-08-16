// Response Linter 修复协调器
// 协调验证失败事件和修复执行，管理修复流程和用户交互

import { autoFixEngine } from './auto-fix-engine.js';
import { messageModifier } from './message-modifier.js';
import { validationEngine } from './validation-engine.js';

/**
 * 修复任务数据结构
 * @typedef {Object} FixTask
 * @property {string} messageId - 消息ID
 * @property {string} content - 消息内容
 * @property {Array<string>} missingItems - 缺失项
 * @property {string} ruleName - 触发的规则名称
 * @property {string} fixStrategy - 修复策略
 * @property {number} priority - 任务优先级
 * @property {Date} createdAt - 创建时间
 * @property {string} status - 任务状态
 */

/**
 * 修复协调器核心类
 */
export class FixCoordinator {
  constructor() {
    this.isEnabled = false;
    this.autoFixEnabled = false;
    this.requireConfirmation = true;

    this.fixQueue = [];
    this.maxQueueSize = 20;
    this.isProcessing = false;

    this.statistics = {
      totalTasks: 0,
      successfulFixes: 0,
      failedFixes: 0,
      userCancellations: 0,
    };

    // 绑定事件处理器
    this._bindEventHandlers();
  }

  /**
   * 初始化修复协调器
   * @param {Object} settings - 配置设置
   */
  initialize(settings) {
    this.isEnabled = !!settings.enabled;
    this.autoFixEnabled = !!settings.autoFix;
    // 由“自动修复默认行为”决定是否需要确认：preview=需要确认；apply=直接应用
    this.requireConfirmation = (settings?.defaultAutoFixAction === 'preview');

    // 启用相关服务
    autoFixEngine.setEnabled(this.isEnabled && this.autoFixEnabled);
    messageModifier.setEnabled(this.isEnabled);

    console.log(`修复协调器已初始化 - 自动修复: ${this.autoFixEnabled ? '启用' : '禁用'}，默认行为: ${this.requireConfirmation ? '预览确认' : '直接应用'}`);
  }

  /**
   * 更新设置
   * @param {Object} settings - 新设置
   */
  updateSettings(settings) {
    this.isEnabled = !!settings.enabled;
    this.autoFixEnabled = !!settings.autoFix;
    this.requireConfirmation = (settings?.defaultAutoFixAction === 'preview');

    // 同步更新相关服务
    autoFixEngine.setEnabled(this.isEnabled && this.autoFixEnabled);
    messageModifier.setEnabled(this.isEnabled);

    console.log(`修复协调器设置已更新 - 自动修复: ${this.autoFixEnabled ? '启用' : '禁用'}，默认行为: ${this.requireConfirmation ? '预览确认' : '直接应用'}`);
  }

  /**
   * 绑定事件处理器
   * @private
   */
  _bindEventHandlers() {
    // 监听验证失败事件
    document.addEventListener('responseLinter.validationFailed', event => {
      this._handleValidationFailed(event.detail);
    });

    // 监听修改确认事件
    document.addEventListener('responseLinter.modificationConfirmationRequired', event => {
      this._handleModificationConfirmationRequired(event.detail);
    });
  }

  /**
   * 处理验证失败事件
   * @private
   * @param {Object} eventData - 验证失败事件数据
   */
  async _handleValidationFailed(eventData) {
    if (!this.isEnabled || !this.autoFixEnabled) {
      return;
    }

    try {
      const { result, messageData } = eventData;

      // 检查是否有可用的修复策略
      if (!result.fixStrategy) {
        console.log('验证失败但没有可用的修复策略:', result.ruleName);
        return;
      }

      // 基于顺序错误合成“待补标签”：
      // 例：要求 A(</Psyche_think>) 在 B(<content>) 之前，但检测到 B 提前，则把 A 当作“缺少的标签”加入修复列表
      let _missing = Array.isArray(result.missingContent) ? [...result.missingContent] : [];
      try {
        if (result.errorType === 'order' && Array.isArray(result.errorDetails)) {
          const synth = result.errorDetails
            .filter(d => d && d.type === 'order' && typeof d.expectedAfter === 'string' && /^<\//.test(d.expectedAfter))
            .map(d => d.expectedAfter);
          if (synth.length) {
            _missing = [...new Set([..._missing, ...synth])];
          }
        }
      } catch {}

      // 创建修复任务
      const fixTask = {
        messageId: messageData.messageId,
        content: messageData.content,
        missingItems: _missing,
        ruleName: result.ruleName,
        ruleId: result?.metadata?.ruleId || null,
        fixStrategy: result.fixStrategy,
        priority: this._calculatePriority(result),
        createdAt: new Date(),
        status: 'pending',
      };

      try { console.debug('[Response Linter][diag] enqueue fixTask', { id: fixTask.messageId, strat: fixTask.fixStrategy, miss: fixTask.missingItems, contentLen: (fixTask.content||'').length }); } catch {}

      // 添加到修复队列
      this._addToQueue(fixTask);
    } catch (error) {
      console.error('处理验证失败事件出错:', error);
    }
  }

  /**
   * 处理修改确认请求事件
   * @private
   * @param {Object} eventData - 确认请求事件数据
   */
  _handleModificationConfirmationRequired(eventData) {
    const { messageId, originalContent, newContent, strategy } = eventData;

    // 触发UI确认对话框
    this._showConfirmationDialog(messageId, originalContent, newContent, strategy);
  }

  /**
   * 添加任务到修复队列
   * @private
   * @param {FixTask} task - 修复任务
   */
  _addToQueue(task) {
    // 检查队列大小
    if (this.fixQueue.length >= this.maxQueueSize) {
      console.warn('修复队列已满，丢弃最旧的任务');
      this.fixQueue.shift();
    }

    // 按优先级插入队列
    const insertIndex = this.fixQueue.findIndex(t => t.priority < task.priority);
    if (insertIndex === -1) {
      this.fixQueue.push(task);
    } else {
      this.fixQueue.splice(insertIndex, 0, task);
    }

    console.log(`修复任务已添加到队列 [${task.messageId}] - 策略: ${task.fixStrategy}`);

    // 开始处理队列
    this._processQueue();
  }

  /**
   * 处理修复队列
   * @private
   */
  async _processQueue() {
    if (this.isProcessing || this.fixQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.fixQueue.length > 0) {
      const task = this.fixQueue.shift();

      try {
        await this._processFixTask(task);

        // 添加小延迟避免阻塞UI
        await this._sleep(100);
      } catch (error) {
        console.error('处理修复任务失败:', error, task);
        task.status = 'failed';
        this.statistics.failedFixes++;
      }
    }

    this.isProcessing = false;
  }

  /**
   * 处理单个修复任务
   * @private
   * @param {FixTask} task - 修复任务
   */
  async _processFixTask(task) {
    try {
      task.status = 'processing';
      this.statistics.totalTasks++;

      console.log(`开始处理修复任务 [${task.messageId}] - 策略: ${task.fixStrategy}`);

      // 尝试自动修复
      // 将当前任务对应的规则顺序暴露给修复引擎（用于查找下一个/上一个标签）
      try {
        const rule = (window.UIState?.rules || []).find(r => r.id === task.ruleId) || null;
        window.ResponseLinter = window.ResponseLinter || {};
        window.ResponseLinter.CurrentRule = rule || null;
      } catch (e) {}

      const fixResult = autoFixEngine.attemptFix(task.content, task.missingItems, task.fixStrategy);

      if (fixResult.success) {
        // 修复成功，应用到消息
        const modificationResult = await messageModifier.modifyMessage(
          task.messageId,
          fixResult.fixedContent,
          task.fixStrategy,
          this.requireConfirmation,
        );

        if (modificationResult.success) {
          task.status = 'completed';
          this.statistics.successfulFixes++;

          console.log(`修复任务完成 [${task.messageId}] - 策略: ${task.fixStrategy}`);

          // 触发修复成功事件
          this._dispatchFixEvent('fixApplied', {
            task,
            fixResult,
            modificationResult,
          });

          // 可选：重新验证修复结果
          if (this._shouldRevalidate(task)) {
            await this._revalidateMessage(task.messageId, fixResult.fixedContent);
          }
        } else if (modificationResult.metadata?.requiresConfirmation) {
          task.status = 'pending_confirmation';
          console.log(`修复任务等待用户确认 [${task.messageId}]`);
        } else {
          task.status = 'failed';
          this.statistics.failedFixes++;
          console.error(`修复任务失败 - 消息修改失败 [${task.messageId}]`, modificationResult);
        }
      } else {
        task.status = 'failed';
        this.statistics.failedFixes++;
        console.log(`修复任务失败 - 无法修复 [${task.messageId}]`, fixResult);
      }
    } catch (error) {
      task.status = 'failed';
      this.statistics.failedFixes++;
      console.error('处理修复任务出错:', error, task);
    }
  }

  /**
   * 计算任务优先级
   * @private
   * @param {Object} validationResult - 验证结果
   * @returns {number} 优先级数值（越高越优先）
   */
  _calculatePriority(validationResult) {
    let priority = 50; // 基础优先级

    // 根据缺失项数量调整优先级
    priority += Math.min(validationResult.missingContent.length * 10, 30);

    // 根据修复策略调整优先级
    switch (validationResult.fixStrategy) {
      case 'thinking-content':
        priority += 20; // 思维链修复优先级较高
        break;
      case 'add-missing-tags':
        priority += 10; // 标签修复中等优先级
        break;
      case 'custom':
        priority += 5; // 自定义策略优先级较低
        break;
    }

    return Math.min(priority, 100); // 限制最大优先级
  }

  /**
   * 显示确认对话框
   * @private
   * @param {string} messageId - 消息ID
   * @param {string} originalContent - 原始内容
   * @param {string} newContent - 新内容
   * @param {string} strategy - 修复策略
   */
  _showConfirmationDialog(messageId, originalContent, newContent, strategy) {
    // 创建确认对话框内容
    const dialogContent = this._createConfirmationDialog(messageId, originalContent, newContent, strategy);

    // 触发UI显示事件
    this._dispatchFixEvent('confirmationRequired', {
      messageId,
      originalContent,
      newContent,
      strategy,
      dialogContent,
    });
  }

  /**
   * 创建确认对话框内容
   * @private
   * @param {string} messageId - 消息ID
   * @param {string} originalContent - 原始内容
   * @param {string} newContent - 新内容
   * @param {string} strategy - 修复策略
   * @returns {string} 对话框HTML内容
   */
  _createConfirmationDialog(messageId, originalContent, newContent, strategy) {
    const strategyNames = {
      'thinking-content': '思维链格式修复',
      'add-missing-tags': '添加缺失标签',
      custom: '自定义修复',
    };

    const strategyName = strategyNames[strategy] || strategy;

    return `
            <div class="rl-fix-confirmation">
                <h3>确认自动修复</h3>
                <p><strong>修复策略</strong>: ${strategyName}</p>
                <p><strong>消息ID</strong>: ${messageId}</p>
                
                <div class="rl-content-comparison">
                    <div class="rl-original">
                        <h4>原始内容：</h4>
                        <pre>${this._escapeHtml(originalContent.substring(0, 200))}${
      originalContent.length > 200 ? '...' : ''
    }</pre>
                    </div>
                    <div class="rl-modified">
                        <h4>修复后内容：</h4>
                        <pre>${this._escapeHtml(newContent.substring(0, 200))}${
      newContent.length > 200 ? '...' : ''
    }</pre>
                    </div>
                </div>
                
                <div class="rl-confirmation-buttons">
                    <button class="rl-confirm-fix" data-message-id="${messageId}">应用修复</button>
                    <button class="rl-cancel-fix" data-message-id="${messageId}">取消</button>
                    <button class="rl-show-full-diff" data-message-id="${messageId}">查看完整差异</button>
                </div>
            </div>
        `;
  }

  /**
   * 转义HTML字符
   * @private
   * @param {string} text - 要转义的文本
   * @returns {string} 转义后的文本
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 确认修复操作
   * @param {string} messageId - 消息ID
   * @param {boolean} confirmed - 是否确认
   * @returns {Promise<Object>} 确认结果
   */
  async confirmFix(messageId, confirmed) {
    const result = await messageModifier.confirmModification(messageId, confirmed);

    if (confirmed && result.success) {
      this.statistics.successfulFixes++;
      this._dispatchFixEvent('fixConfirmed', { messageId, result });
    } else if (!confirmed) {
      this.statistics.userCancellations++;
      this._dispatchFixEvent('fixCancelled', { messageId });
    }

    return result;
  }

  /**
   * 撤销修复操作
   * @param {string} messageId - 消息ID
   * @param {number} steps - 撤销步数
   * @returns {Promise<Object>} 撤销结果
   */
  async undoFix(messageId, steps = 1) {
    const result = await messageModifier.undoModification(messageId, steps);

    if (result.success) {
      this._dispatchFixEvent('fixUndone', { messageId, steps, result });
    }

    return result;
  }

  /**
   * 手动触发修复
   * @param {string} messageId - 消息ID
   * @param {string} content - 消息内容
   * @param {Array<string>} missingItems - 缺失项
   * @param {string} strategy - 修复策略
   * @returns {Promise<Object>} 修复结果
   */
  async triggerManualFix(messageId, content, missingItems, strategy) {
    const fixTask = {
      messageId,
      content,
      missingItems,
      ruleName: 'manual',
      fixStrategy: strategy,
      priority: 100, // 手动修复最高优先级
      createdAt: new Date(),
      status: 'pending',
    };

    this._addToQueue(fixTask);

    return { success: true, taskAdded: true };
  }

  /**
   * 检查是否应该重新验证
   * @private
   * @param {FixTask} task - 修复任务
   * @returns {boolean} 是否需要重新验证
   */
  _shouldRevalidate(task) {
    // 对于重要的修复策略，进行重新验证
    return ['thinking-content', 'add-missing-tags'].includes(task.fixStrategy);
  }

  /**
   * 重新验证修复后的消息
   * @private
   * @param {string} messageId - 消息ID
   * @param {string} content - 修复后的内容
   */
  async _revalidateMessage(messageId, content) {
    try {
      const revalidationResult = validationEngine.validateMessage(content, messageId);

      if (revalidationResult && revalidationResult.isValid) {
        console.log(`重新验证成功 [${messageId}] - 修复有效`);
        this._dispatchFixEvent('revalidationPassed', { messageId, content });
      } else {
        console.warn(`重新验证失败 [${messageId}] - 修复可能不完整`, revalidationResult);
        this._dispatchFixEvent('revalidationFailed', { messageId, content, result: revalidationResult });
      }
    } catch (error) {
      console.error('重新验证出错:', error);
    }
  }

  /**
   * 分发修复事件
   * @private
   * @param {string} eventType - 事件类型
   * @param {Object} data - 事件数据
   */
  _dispatchFixEvent(eventType, data) {
    try {
      const event = new CustomEvent(`responseLinter.${eventType}`, {
        detail: {
          ...data,
          timestamp: new Date(),
        },
      });

      document.dispatchEvent(event);
    } catch (error) {
      console.error('分发修复事件失败:', error);
    }
  }

  /**
   * 获取修复统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    return {
      ...this.statistics,
      queueLength: this.fixQueue.length,
      isProcessing: this.isProcessing,
      successRate:
        this.statistics.totalTasks > 0
          ? Math.round((this.statistics.successfulFixes / this.statistics.totalTasks) * 100)
          : 0,
    };
  }

  /**
   * 获取协调器状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      autoFixEnabled: this.autoFixEnabled,
      requireConfirmation: this.requireConfirmation,
      queueLength: this.fixQueue.length,
      isProcessing: this.isProcessing,
      statistics: this.getStatistics(),
    };
  }

  /**
   * 清理队列和历史
   */
  cleanup() {
    this.fixQueue = [];
    this.isProcessing = false;
    messageModifier.clearHistory();
    autoFixEngine.clearHistory();

    console.log('修复协调器已清理');
  }

  /**
   * 睡眠函数
   * @private
   * @param {number} ms - 毫秒数
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建全局修复协调器实例
export const fixCoordinator = new FixCoordinator();
