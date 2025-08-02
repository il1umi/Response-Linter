// Response Linter 消息处理器模块
// 负责监听SillyTavern事件、提取消息内容和协调验证流程

import { getContext } from '../../../../extensions.js';

/**
 * 消息处理器核心类
 */
export class MessageHandler {
  constructor() {
    this.isListening = false;
    this.processedMessages = new Set(); // 防止重复处理
    this.eventListeners = [];
    this.processingQueue = [];
    this.isProcessing = false;
  }

  /**
   * 开始监听消息事件
   */
  startListening() {
    if (this.isListening) {
      console.warn('消息处理器已在监听中');
      return;
    }

    try {
      // 导入SillyTavern事件系统
      import('../../../../script.js')
        .then(({ eventSource, event_types }) => {
          // 监听AI消息渲染完成事件
          const messageRenderedHandler = messageId => {
            this._handleMessageRendered(messageId);
          };

          // 使用makeLast确保在所有其他处理器之后执行
          eventSource.makeLast(event_types.CHARACTER_MESSAGE_RENDERED, messageRenderedHandler);

          this.eventListeners.push({
            event: event_types.CHARACTER_MESSAGE_RENDERED,
            handler: messageRenderedHandler,
          });

          this.isListening = true;
          console.log('消息处理器开始监听事件');
        })
        .catch(error => {
          console.error('导入SillyTavern事件系统失败:', error);
        });
    } catch (error) {
      console.error('启动消息监听失败:', error);
    }
  }

  /**
   * 停止监听消息事件
   */
  stopListening() {
    if (!this.isListening) {
      return;
    }

    try {
      // 移除事件监听器
      import('../../../../script.js').then(({ eventSource }) => {
        this.eventListeners.forEach(({ event, handler }) => {
          eventSource.off(event, handler);
        });
        this.eventListeners = [];
        this.isListening = false;
        console.log('消息处理器停止监听');
      });
    } catch (error) {
      console.error('停止消息监听失败:', error);
    }
  }

  /**
   * 处理消息渲染事件
   * @private
   * @param {string} messageId - 消息ID
   */
  async _handleMessageRendered(messageId) {
    // 防止重复处理同一消息
    if (this.processedMessages.has(messageId)) {
      return;
    }

    try {
      // 标记为已处理
      this.processedMessages.add(messageId);

      // 添加到处理队列
      this.processingQueue.push(messageId);

      // 如果没有正在处理，开始处理队列
      if (!this.isProcessing) {
        await this._processQueue();
      }
    } catch (error) {
      console.error('处理消息渲染事件失败:', error, { messageId });
    }
  }

  /**
   * 处理消息队列
   * @private
   */
  async _processQueue() {
    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const messageId = this.processingQueue.shift();

      try {
        await this._processMessage(messageId);
        // 添加小延迟避免阻塞UI
        await this._sleep(10);
      } catch (error) {
        console.error('处理消息失败:', error, { messageId });
      }
    }

    this.isProcessing = false;
  }

  /**
   * 处理单个消息
   * @private
   * @param {string} messageId - 消息ID
   */
  async _processMessage(messageId) {
    const messageData = this.extractMessage(messageId);

    if (!messageData) {
      console.warn('无法提取消息数据:', messageId);
      return;
    }

    // 只处理AI消息（非用户消息）
    if (messageData.isUser) {
      return;
    }

    console.log(`处理AI消息 [${messageId}]:`, {
      length: messageData.content.length,
      name: messageData.name,
    });

    // 触发消息处理事件
    this._dispatchMessageEvent('messageProcessed', {
      messageId,
      content: messageData.content,
      name: messageData.name,
      timestamp: new Date(),
    });
  }

  /**
   * 提取消息数据
   * @param {string} messageId - 消息ID
   * @returns {Object|null} 消息数据或null
   */
  extractMessage(messageId) {
    try {
      const context = getContext();

      if (!context || !context.chat || !Array.isArray(context.chat)) {
        console.warn('无法获取聊天上下文');
        return null;
      }

      // 通过messageId查找消息
      const message = context.chat.find(msg => msg.id == messageId || context.chat.indexOf(msg) == messageId);

      if (!message) {
        console.warn('未找到对应消息:', messageId);
        return null;
      }

      // 提取消息内容（优先使用display_text）
      const content = message.extra?.display_text || message.mes || '';

      return {
        id: messageId,
        content: content.trim(),
        name: message.name || 'Unknown',
        isUser: message.is_user || false,
        isSystem: message.is_system || false,
        timestamp: message.send_date || new Date().toISOString(),
        raw: message,
      };
    } catch (error) {
      console.error('提取消息数据失败:', error, { messageId });
      return null;
    }
  }

  /**
   * 获取最新的AI消息
   * @returns {Object|null} 最新的AI消息数据
   */
  getLatestAIMessage() {
    try {
      const context = getContext();

      if (!context?.chat?.length) {
        return null;
      }

      // 从后往前查找最新的AI消息
      for (let i = context.chat.length - 1; i >= 0; i--) {
        const message = context.chat[i];
        if (!message.is_user && !message.is_system) {
          const content = message.extra?.display_text || message.mes || '';
          return {
            id: i.toString(),
            content: content.trim(),
            name: message.name || 'AI',
            timestamp: message.send_date || new Date().toISOString(),
          };
        }
      }

      return null;
    } catch (error) {
      console.error('获取最新AI消息失败:', error);
      return null;
    }
  }

  /**
   * 分发消息事件
   * @private
   * @param {string} eventType - 事件类型
   * @param {Object} data - 事件数据
   */
  _dispatchMessageEvent(eventType, data) {
    try {
      const event = new CustomEvent(`responseLinter.${eventType}`, {
        detail: data,
      });

      document.dispatchEvent(event);
    } catch (error) {
      console.error('分发消息事件失败:', error, { eventType, data });
    }
  }

  /**
   * 清理已处理消息记录（防止内存泄漏）
   * @param {number} maxSize - 最大记录数量
   */
  cleanupProcessedMessages(maxSize = 1000) {
    if (this.processedMessages.size > maxSize) {
      const arr = Array.from(this.processedMessages);
      const keepSize = Math.floor(maxSize * 0.8);

      this.processedMessages.clear();

      // 保留最新的记录
      arr.slice(-keepSize).forEach(id => {
        this.processedMessages.add(id);
      });

      console.log(`清理已处理消息记录: ${arr.length} -> ${this.processedMessages.size}`);
    }
  }

  /**
   * 获取处理器状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      isListening: this.isListening,
      isProcessing: this.isProcessing,
      processedCount: this.processedMessages.size,
      queueLength: this.processingQueue.length,
      eventListenersCount: this.eventListeners.length,
    };
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

// 创建全局消息处理器实例
export const messageHandler = new MessageHandler();
