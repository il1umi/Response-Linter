// Response Linter 消息处理器模块
import { getContext as ST_getContext } from '../../../../st-context.js';

// 负责监听SillyTavern事件、提取消息内容和协调验证流程

// 统一通过 getContext() 与事件系统交互，避免直接导入内部文件
// 使用安全的上下文获取：优先 SillyTavern.getContext()，再到全局 getContext/window.getContext
function safeGetContext() {
  try {
    if (window?.SillyTavern?.getContext) return window.SillyTavern.getContext();
  } catch {}
  try {
    if (typeof getContext === 'function') return getContext();
  } catch {}
  try {
    if (typeof window !== 'undefined' && typeof window.getContext === 'function') return window.getContext();
  } catch {}
  return null;
}


/**
 * 消息处理器核心类
 */
export class MessageHandler {
  constructor() {
    this.isListening = false;
    this.processedMessages = new Set(); // 仅作为护栏，防止极端情况下重复入队死循环
    this.lastContent = new Map(); // messageId -> last content string
    this.lastHandledAt = new Map(); // messageId -> timestamp(ms) 防抖
    this.eventListeners = [];
    this.processingQueue = [];
    this.isProcessing = false;
    this.ctxRef = null; // 缓存从 getContext() 获取的上下文
    this.retryCounts = new Map(); // 消息重试计数，处理上下文尚未就绪等瞬态失败
    this.rebindTimer = null; // 绑定失败时的周期性重试定时器
    this.domObserver = null; // DOM 观察器回退方案
  }

  /**
   * 开始监听消息事件
   */
  async startListening() {
    if (this.isListening) {
      console.warn('消息处理器已在监听中');
      return;
    }

    try {
      const getSys = async () => {
        // 优先使用 ST 提供的 getContext（通过 st-context 模块导出）
        let ctx = this.ctxRef || safeGetContext();
        if (!ctx) {
          try { console.debug('[Response Linter][diag] getSys: ctx is null; SillyTavern.getContext exists =', !!(window?.SillyTavern?.getContext)); } catch {}
        }
        if (ctx) { this.ctxRef = ctx; }
        const es = ctx?.eventSource;
        const et = ctx?.eventTypes || ctx?.event_types;
        if (!es || !et) {
          try { console.debug('[Response Linter][diag] getSys: es:', !!es, ' et:', !!et); } catch {}
        }
        return (es && et) ? { ctx, eventSource: es, event_types: et } : null;
      };

      let sys = await getSys();
      if (!sys) {
        // 等待事件系统就绪（最多等待 10s，间隔 250ms）
        const deadline = Date.now() + 10000;
        while (!sys && Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 250));
          sys = await getSys();
        }
      }

      if (!sys) {
        console.error('[Response Linter] 无法获取事件系统：getContext().eventSource/event_types 不可用，将在APP_READY与每3秒重试绑定');
        // 周期性重试绑定（每3秒一次）
        if (!this.rebindTimer) {
          this.rebindTimer = setInterval(async () => {
            try {
              const s = await getSys();
              if (s) {
                clearInterval(this.rebindTimer);
                this.rebindTimer = null;
                await this.startListening();
              }
            } catch {}
          }, 3000);
        }
        // 也立即监听 APP_READY 后再次绑定
        try {
          const c = this.ctxRef || safeGetContext();
          if (c?.eventSource && (c.eventTypes || c.event_types)) {
            const et = c.eventTypes || c.event_types;
            c.eventSource.once(et.APP_READY, () => this.startListening());
          }
        } catch {}
        return;
      // 作为最后回退：观察 DOM 出现 #chat 容器后再尝试获取上下文（部分构建里上下文在 UI 完全渲染后注入）
      try {
        if (!this.domObserver) {
          this.domObserver = new MutationObserver(async () => {
            const chatEl = document.querySelector('#chat');
            if (chatEl) {
              const s = await getSys();
              if (s) {
                this.domObserver.disconnect();
                this.domObserver = null;
                await this.startListening();
              }
            }
          });
          this.domObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
      } catch {}

      }

      // 监听AI消息渲染完成事件
      const messageRenderedHandler = (messageId, type) => {
        try { console.log('[Response Linter] CHARACTER_MESSAGE_RENDERED', messageId, type); } catch {}
        this._handleMessageRendered(String(messageId));
      };

      // 绑定消息渲染事件：优先使用 makeLast，确保在其他监听器之后执行；否则回退到 on
      const bindMethod = (typeof sys.eventSource.makeLast === 'function') ? 'makeLast' : 'on';
      sys.eventSource[bindMethod](sys.event_types.CHARACTER_MESSAGE_RENDERED, messageRenderedHandler);


      // 兜底绑定：在 APP_READY 事件触发时再次绑定一次，防止初始化顺序问题
      try {
        const onAppReady = () => {
          try {
            const bm = (typeof sys.eventSource.makeLast === 'function') ? 'makeLast' : 'on';
            sys.eventSource[bm](sys.event_types.CHARACTER_MESSAGE_RENDERED, messageRenderedHandler);
          } catch(e){}
        };
        if (typeof sys.eventSource.once === 'function' && sys.event_types?.APP_READY) {
          sys.eventSource.once(sys.event_types.APP_READY, onAppReady);
          this.eventListeners.push({ event: sys.event_types.APP_READY, handler: onAppReady });
        }
      } catch(e){}

      this.eventListeners.push({
        event: sys.event_types.CHARACTER_MESSAGE_RENDERED,
        handler: messageRenderedHandler,
      });

      // 监听 MESSAGE_RECEIVED（渲染前时机）用于前置验证/修复
      try {
        if (sys.event_types?.MESSAGE_RECEIVED && typeof sys.eventSource.on === 'function') {
          const messageReceivedHandler = (id, type) => {
            try { console.debug('[Response Linter] MESSAGE_RECEIVED', id, type); } catch {}
            this._handleMessageRendered(String(id));
          };
          sys.eventSource.on(sys.event_types.MESSAGE_RECEIVED, messageReceivedHandler);
          this.eventListeners.push({ event: sys.event_types.MESSAGE_RECEIVED, handler: messageReceivedHandler });
        }
        // 监听消息更新与滑动切换，重roll/编辑时也能感知
        if (typeof sys.eventSource.on === 'function') {
          if (sys.event_types?.MESSAGE_UPDATED) {
            sys.eventSource.on(sys.event_types.MESSAGE_UPDATED, messageRenderedHandler);
            this.eventListeners.push({ event: sys.event_types.MESSAGE_UPDATED, handler: messageRenderedHandler });
          }
          if (sys.event_types?.MESSAGE_SWIPED) {
            sys.eventSource.on(sys.event_types.MESSAGE_SWIPED, messageRenderedHandler);
            this.eventListeners.push({ event: sys.event_types.MESSAGE_SWIPED, handler: messageRenderedHandler });
          }
        }
      } catch {}


      this.isListening = true;
      console.log('[Response Linter] 消息处理器开始监听事件', {
        listeners: this.eventListeners.map(e=>e.event),
      });
    } catch (error) {
      console.error('[Response Linter] 启动消息监听失败:', error);
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
      const ctx = safeGetContext();
      if (!ctx || !ctx.eventSource) return;
      // 移除事件监听器
      this.eventListeners.forEach(({ event, handler }) => {
        try { ctx.eventSource.removeListener(event, handler); } catch(e) { try { ctx.eventSource.off?.(event, handler); } catch {} }
      });
      this.eventListeners = [];
      this.isListening = false;
      console.log('[Response Linter] 消息处理器停止监听');
    } catch (error) {
      console.error('[Response Linter] 停止消息监听失败:', error);
    }
  }

  /**
   * 处理消息渲染事件
   * @private
   * @param {string} messageId - 消息ID
   */
  async _handleMessageRendered(messageId) {
    // 内容级去重由 _processMessage 负责；这里仅用 processedMessages 作为极端护栏
    // 防抖：短时间内重复事件直接丢弃（防止同源多事件风暴）
    const lastAt = this.lastHandledAt.get(messageId) || 0;
    if (Date.now() - lastAt < 200) {
      return;
    }

    try {
      // 入队处理
      this.processingQueue.push(messageId);

      // 如果没有正在处理，开始处理队列
      if (!this.isProcessing) {
        await this._processQueue();
      }
    } catch (error) {
      console.error('处理消息渲染事件失败:', error, { messageId });
      // 出错时允许下次重试
      this.processedMessages.delete(messageId);
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
        const ok = await this._processMessage(messageId);
        // 添加小延迟避免阻塞UI
        await this._sleep(10);
        if (!ok) {
          // 若处理失败（例如上下文未就绪），允许有限次重试
          const count = (this.retryCounts.get(messageId) || 0) + 1;
          if (count <= 3) {
            this.retryCounts.set(messageId, count);
            // 稍后重试（100ms）
            setTimeout(() => this._handleMessageRendered(messageId), 100);
          } else {
            this.retryCounts.delete(messageId);
          }
        } else {
          this.retryCounts.delete(messageId);
        }
      } catch (error) {
        console.error('处理消息失败:', error, { messageId });
        this.processedMessages.delete(messageId);
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
      return false;
    }

    // 只处理AI消息（非用户消息）
    if (messageData.isUser) {
      return true; // 非AI消息视为成功处理
    }

    // 内容去重：仅当内容发生变化时才继续后续流程
    const prev = this.lastContent.get(messageId);
    const changed = prev !== messageData.content;
    this.lastContent.set(messageId, messageData.content);
    this.lastHandledAt.set(messageId, Date.now());

    console.log(`处理AI消息 [${messageId}]`, {
      length: messageData.content.length,
      name: messageData.name,
      changed,
    });

    if (!changed) {
      // 内容未变化：视为成功处理但不再触发验证/修复
      return true;
    }

    // 触发消息处理事件
    this._dispatchMessageEvent('messageProcessed', {
      messageId,
      content: messageData.content,
      name: messageData.name,
      timestamp: new Date(),
    });
    return true;
  }

  /**
   * 提取消息数据
   * @param {string} messageId - 消息ID
   * @returns {Object|null} 消息数据或null
   */

  extractMessage(messageId) {
    try {
      // 优先用缓存的 ctxRef，降低偶发空窗口
      const context = this.ctxRef || safeGetContext() || null;

      if (!context || !Array.isArray(context?.chat)) {
        console.warn('无法获取聊天上下文');
        return null;
      }

      // 支持两种标识：严格 id 匹配 或 索引
      let message = context.chat.find(msg => msg.id == messageId);
      let idx = -1;
      if (!message) {
        idx = Number.parseInt(messageId, 10);
        if (Number.isInteger(idx) && idx >= 0 && idx < context.chat.length) {
          message = context.chat[idx];
        }
      }

      if (!message) {
        console.warn('未找到对应消息:', messageId);
        return null;
      }

      const content = (message.extra?.display_text ?? message.mes ?? '').trim();
      const resolvedId = (message.id ?? (idx >= 0 ? String(idx) : String(messageId)));

      return {
        id: String(resolvedId),
        content,
        name: message.name || 'Unknown',
        isUser: !!message.is_user,
        isSystem: !!message.is_system,
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
      const context = safeGetContext() || null;

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
