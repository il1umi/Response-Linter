// Response Linter 自动修复引擎
// 基于策略模式实现多种修复策略，安全地修复AI回复格式问题

/**
 * 修复结果数据结构
 * @typedef {Object} FixResult
 * @property {boolean} success - 修复是否成功
 * @property {string} originalContent - 原始内容
 * @property {string} fixedContent - 修复后内容
 * @property {string} strategy - 使用的修复策略
 * @property {Array<string>} fixedItems - 修复的项目
 * @property {Object} metadata - 修复元数据
 */

/**
 * 修复策略基类
 * 定义修复策略的标准接口
 */
export class FixStrategy {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  /**
   * 检查是否可以应用此修复策略
   * @param {string} content - 消息内容
   * @param {Array<string>} missingItems - 缺失的内容项
   * @returns {boolean} 是否可以修复
   */
  canFix(content, missingItems) {
    throw new Error('子类必须实现 canFix 方法');
  }

  /**
   * 执行修复操作
   * @param {string} content - 原始消息内容
   * @param {Array<string>} missingItems - 缺失的内容项
   * @returns {string} 修复后的内容
   */
  fix(content, missingItems) {
    throw new Error('子类必须实现 fix 方法');
  }

  /**
   * 验证修复结果
   * @param {string} fixedContent - 修复后的内容
   * @param {Array<string>} originalMissingItems - 原始缺失项
   * @returns {boolean} 修复是否有效
   */
  validate(fixedContent, originalMissingItems) {
    // 基础验证：检查原本缺失的项是否已添加
    return originalMissingItems.every(item => {
      if (item.startsWith('<') && item.endsWith('>')) {
        // XML标签检查（支持变体）
        const tagName = item.slice(1, -1).split(' ')[0];
        const pattern = new RegExp(`<\\s*${tagName}[^>]*>`, 'i');
        return pattern.test(fixedContent);
      }
      return fixedContent.includes(item);
    });
  }
}

/**
 * 思维链内容修复策略
 * 处理 </thinking> 后缺失 <content> 的情况
 */
export class ThinkingContentFixStrategy extends FixStrategy {
  constructor() {
    super('thinking-content', '思维链与内容格式修复');
  }

  canFix(content, missingItems) {
    // 检查是否包含 </thinking> 但缺少 <content>
    const hasThinkingEnd = content.includes('</thinking>');
    const missingContent = missingItems.includes('<content>') || missingItems.includes('</content>');

    return hasThinkingEnd && missingContent;
  }

  fix(content, missingItems) {
    try {
      // 查找 </thinking> 的位置
      const thinkingEndIndex = content.lastIndexOf('</thinking>');
      if (thinkingEndIndex === -1) {
        return content;
      }

      // 获取 </thinking> 之后的内容
      const beforeThinking = content.substring(0, thinkingEndIndex + '</thinking>'.length);
      const afterThinking = content.substring(thinkingEndIndex + '</thinking>'.length);

      // 检查 </thinking> 后是否已有内容但没有 <content> 标签
      const trimmedAfter = afterThinking.trim();

      if (trimmedAfter.length > 0 && !trimmedAfter.startsWith('<content>')) {
        // 如果有内容但没有 <content> 标签，添加标签包围
        const needsContentEnd = missingItems.includes('</content>');
        const contentStart = '\n\n<content>\n';
        const contentEnd = needsContentEnd ? '\n</content>' : '';

        return beforeThinking + contentStart + trimmedAfter + contentEnd;
      } else if (trimmedAfter.length === 0) {
        // 如果 </thinking> 后没有内容，添加空的 content 标签
        return beforeThinking + '\n\n<content>\n\n</content>';
      }

      return content;
    } catch (error) {
      console.error('思维链修复策略执行失败:', error);
      return content;
    }
  }

  validate(fixedContent, originalMissingItems) {
    // 检查修复后是否包含完整的思维链和内容结构
    const hasThinking = fixedContent.includes('<thinking>') && fixedContent.includes('</thinking>');
    const hasContent = fixedContent.includes('<content>') && fixedContent.includes('</content>');

    return hasThinking && hasContent && super.validate(fixedContent, originalMissingItems);
  }
}

/**
 * 缺失标签修复策略
 * 智能补全缺失的配对标签
 */
export class MissingTagsFixStrategy extends FixStrategy {
  constructor() {
    super('add-missing-tags', '添加缺失标签');
  }

  canFix(content, missingItems) {
    // 检查是否有缺失的XML标签
    return missingItems.some(item => item.startsWith('<') && item.endsWith('>'));
  }

  fix(content, missingItems) {
    try {
      let fixedContent = content;

      // 处理缺失的标签
      const missingTags = missingItems.filter(item => item.startsWith('<') && item.endsWith('>'));

      for (const tag of missingTags) {
        if (tag.startsWith('</')) {
          // 缺失结束标签
          const tagName = tag.slice(2, -1);
          const openTag = `<${tagName}>`;

          if (fixedContent.includes(openTag) && !fixedContent.includes(tag)) {
            // 在内容末尾添加结束标签
            fixedContent += `\n${tag}`;
          }
        } else {
          // 缺失开始标签
          const tagName = tag.slice(1, -1);
          const closeTag = `</${tagName}>`;

          if (fixedContent.includes(closeTag) && !fixedContent.includes(tag)) {
            // 在内容开头添加开始标签
            fixedContent = `${tag}\n${fixedContent}`;
          }
        }
      }

      return fixedContent;
    } catch (error) {
      console.error('缺失标签修复策略执行失败:', error);
      return content;
    }
  }

  validate(fixedContent, originalMissingItems) {
    // 检查所有原本缺失的标签是否都已添加
    return super.validate(fixedContent, originalMissingItems);
  }
}

/**
 * 额外标签清理策略（严格模式）
 * 移除未在规则必需内容中声明的其他XML样式标签
 */
export class SanitizeExtraTagsStrategy extends FixStrategy {
  constructor() {
    super('sanitize-extra-tags', '清理未声明的额外标签');
  }

  _getAllowedTagNames() {
    try {
      const seq = window.ResponseLinter?.CurrentRule?.requiredContent || [];
      const names = new Set();
      seq.forEach(item => {
        if (typeof item === 'string' && item.startsWith('<') && item.endsWith('>')) {
          const raw = item.replace(/^<\/?\s*/, '').replace(/\s*>$/, '');
          const name = raw.split(' ')[0].replace(/^\//, '');
          if (name) names.add(name.toLowerCase());
        }
      });
      return names;
    } catch {
      return new Set();
    }
  }

  canFix(content, _missingItems) {
    const allowed = this._getAllowedTagNames();
    if (!allowed || allowed.size === 0) return false; // 无上下文不处理
    const tagRegex = /<\/?\s*([a-zA-Z0-9_-]+)[^>]*>/g;
    let m;
    while ((m = tagRegex.exec(content)) !== null) {
      const name = String(m[1] || '').toLowerCase();
      if (!allowed.has(name)) return true; // 存在未允许标签
    }
    return false;
  }

  fix(content) {
    try {
      const allowed = this._getAllowedTagNames();
      if (!allowed || allowed.size === 0) return content;
      const tagRegex = /<\/?\s*([a-zA-Z0-9_-]+)[^>]*>/g;
      return content.replace(tagRegex, (full, name) => {
        name = String(name || '').toLowerCase();
        return allowed.has(name) ? full : '';
      });
    } catch (e) {
      console.error('额外标签清理失败:', e);
      return content;
    }
  }

  validate(fixedContent, _originalMissingItems) {
    // 清理策略不引入新的缺失；若需要可叠加基础校验
    return true;
  }
}

/**
 * 位置感知修复策略
 * 基于内容位置和顺序进行智能修复，支持双换行符分隔
 */
export class PositionalFixStrategy extends FixStrategy {
  constructor(options = {}) {
    super('positional', '位置感知修复策略');
    this.options = {
      doubleNewline: true, // 默认使用双换行符
      mode: options.mode || null, // 可为 'after-prev' | 'before-next' | null
      ...options,
    };
  }

  canFix(content, missingItems) {
    // 只要有缺失项就可以尝试位置修复
    return missingItems && missingItems.length > 0;
  }

  fix(content, missingItems) {
    try {
      let fixedContent = content;

      // 从外部规则注入顺序信息（若可用）
      // 约定：window.ResponseLinter?.CurrentRule?.requiredContent 提供当前规则顺序
      this._requiredSeq = window.ResponseLinter?.CurrentRule?.requiredContent || [];

      // 为每个缺失项找到最佳插入位置
      for (const missingItem of missingItems) {
        const insertPosition = this._findBestInsertPosition(fixedContent, missingItem, missingItems);
        fixedContent = this._insertAtPosition(fixedContent, missingItem, insertPosition);
      }

      return fixedContent;
    } catch (error) {
      console.error('位置感知修复策略执行失败:', error);
      return content;
    }
  }

  /**
   * 查找最佳插入位置
   * @private
   * @param {string} content - 当前内容
   * @param {string} missingItem - 缺失的项
   * @param {Array<string>} allMissingItems - 所有缺失项
   * @returns {Object} 插入位置信息
   */
  _findBestInsertPosition(content, missingItem, allMissingItems) {
    // 模式优先：after-prev 根据上一个应出现的标签定位插入点
    if (this.options.mode === 'after-prev') {
      const prevIdx = this._findPreviousExpectedTag(content, missingItem);
      if (prevIdx !== -1) {
        return { index: prevIdx, type: 'after-prev-tag', addNewlines: this.options.doubleNewline };
      }
    }

    // 针对思维链模式的特殊处理
    if (missingItem === '<content>' && content.includes('</thinking>')) {
      const thinkingEndIndex = content.lastIndexOf('</thinking>');
      return {
        index: thinkingEndIndex + '</thinking>'.length,
        type: 'after-thinking',
        addNewlines: this.options.doubleNewline,
      };
    }

    // 优先：若存在“下一个期望标签”，在其前插入
    const nextIndex = this._findNextExpectedTag(content, missingItem, allMissingItems);
    if (nextIndex !== -1) {
      return {
        index: nextIndex,
        type: 'before-next-tag',
        addNewlines: this.options.doubleNewline,
      };
    }

    // 针对结束标签的处理（fallback）
    if (missingItem.startsWith('</') && missingItem.endsWith('>')) {
      const tagName = missingItem.slice(2, -1);
      const openTag = `<${tagName}>`;

      if (content.includes(openTag)) {
        // 在内容末尾插入结束标签
        return {
          index: content.length,
          type: 'end-tag',
          addNewlines: this.options.doubleNewline,
        };
      }
    }

    // 针对开始标签的处理
    if (missingItem.startsWith('<') && missingItem.endsWith('>') && !missingItem.startsWith('</')) {
      // 查找下一个应该出现的标签
      const nextTagIndex = this._findNextExpectedTag(content, missingItem, allMissingItems);
      if (nextTagIndex !== -1) {
        return {
          index: nextTagIndex,
          type: 'before-next-tag',
          addNewlines: this.options.doubleNewline,
        };
      }
    }

    // 默认在内容末尾插入
    return {
      index: content.length,
      type: 'end',
      addNewlines: this.options.doubleNewline,
    };
  }

  /**
   * 查找下一个期望的标签位置
   * @private
   * @param {string} content - 内容
   * @param {string} missingItem - 缺失项
   * @param {Array<string>} allMissingItems - 所有缺失项
   * @returns {number} 位置索引，-1表示未找到
   */
  // 查找下一个期望的标签位置（用于 before-next）
  _findNextExpectedTag(content, missingItem, allMissingItems) {
    try {
      const seq = this._requiredSeq || []; // 运行时注入：当前规则的顺序
      const idx = seq.indexOf(missingItem);
      if (idx === -1) return -1;
      let bestPos = -1;
      for (let i = idx + 1; i < seq.length; i++) {
        const candidate = seq[i];
        const pos = content.indexOf(candidate);
        if (pos !== -1) {
          if (bestPos === -1 || pos < bestPos) bestPos = pos; // 找到“最靠前”的下一项
        }
      }
      return bestPos;
    } catch (e) {
      console.error('查找下一个期望标签失败:', e);
      return -1;
    }
  }

  /**
   * 查找上一个期望的标签结束位置（用于 after-prev）
   */
  _findPreviousExpectedTag(content, missingItem) {
    try {
      const seq = this._requiredSeq || [];
      const idx = seq.indexOf(missingItem);
      if (idx <= 0) return -1;
      // 从 missingItem 往前寻找最近出现的前驱项（取其“结束位置”）
      for (let i = idx - 1; i >= 0; i--) {
        const prev = seq[i];
        const lastPos = content.lastIndexOf(prev);
        if (lastPos !== -1) {
          return lastPos + String(prev).length; // 在前驱项之后插入
        }
      }
      return -1;
    } catch (e) {
      console.error('查找上一个期望标签失败:', e);
      return -1;
    }
  }

  /**
   * 在指定位置插入内容
   * @private
   * @param {string} content - 原始内容
   * @param {string} item - 要插入的项
   * @param {Object} position - 位置信息
   * @returns {string} 修复后的内容
   */
  _insertAtPosition(content, item, position) {
    const { index, addNewlines } = position;

    let insertText = item;

    // 根据位置类型添加换行符
    if (addNewlines) {
      switch (position.type) {
        case 'after-thinking':
          insertText = `\n\n${item}\n`;
          break;
        case 'before-next-tag':
          // 在下一个标签“前”插入：确保前面留双换行
          insertText = `\n\n${item}`;
          break;
        case 'after-prev-tag':
          // 在上一个标签“后”插入：确保后面留双换行
          insertText = `\n\n${item}`;
          break;
        case 'end-tag':
          insertText = `\n${item}`;
          break;
        case 'end':
          insertText = `\n\n${item}`;
          break;
        default:
          insertText = `\n${item}\n`;
      }
    }

    return content.slice(0, index) + insertText + content.slice(index);
  }

  validate(fixedContent, originalMissingItems) {
    // 验证所有缺失项是否已添加
    const isValid = originalMissingItems.every(item => {
      if (item.startsWith('<') && item.endsWith('>')) {
        // XML标签检查
        return fixedContent.includes(item);
      }
      return fixedContent.includes(item);
    });

    // 额外验证：确保插入的内容符合预期格式
    if (isValid && originalMissingItems.includes('<content>')) {
      // 验证思维链格式


      const hasThinking = fixedContent.includes('<thinking>') && fixedContent.includes('</thinking>');
      const hasContent = fixedContent.includes('<content>');

      if (hasThinking && hasContent) {
        // 验证顺序：thinking应该在content之前
        const thinkingIndex = fixedContent.indexOf('<thinking>');
        const contentIndex = fixedContent.indexOf('<content>');
        return thinkingIndex < contentIndex;
      }
    }

    return isValid;
  }
}

/**
 * 自定义修复策略
 * 支持用户定义的正则表达式修复规则
 */
export class CustomFixStrategy extends FixStrategy {
  constructor(pattern, replacement, description = '自定义修复') {
    super('custom', description);
    this.pattern = pattern;
    this.replacement = replacement;
  }

  canFix(content, missingItems) {
    try {
      if (!this.pattern || !this.replacement) {
        return false;
      }

      // 检查正则表达式是否匹配内容
      const regex = new RegExp(this.pattern, 'g');
      return regex.test(content);
    } catch (error) {
      console.error('自定义修复策略检查失败:', error);
      return false;
    }
  }

  fix(content, missingItems) {
    try {
      if (!this.pattern || !this.replacement) {
        return content;
      }

      const regex = new RegExp(this.pattern, 'g');
      return content.replace(regex, this.replacement);
    } catch (error) {
      console.error('自定义修复策略执行失败:', error);
      return content;
    }
  }

  validate(fixedContent, originalMissingItems) {
    // 对于自定义策略，主要检查是否不再匹配原始模式
    try {
      if (!this.pattern) {
        return true;
      }

      const regex = new RegExp(this.pattern, 'g');
      const stillMatches = regex.test(fixedContent);

      // 如果修复后仍然匹配原始模式，可能修复失败
      // 但也要检查基础验证
      return !stillMatches && super.validate(fixedContent, originalMissingItems);
    } catch (error) {
      console.error('自定义修复策略验证失败:', error);
      return super.validate(fixedContent, originalMissingItems);
    }
  }
}

/**
 * 自动修复引擎核心类
 */
export class AutoFixEngine {
  constructor() {
    this.strategies = new Map();
    this.isEnabled = false;
    this.fixHistory = [];
    this.maxHistorySize = 100;

    // 注册内置修复策略
    this._initializeDefaultStrategies();
  }

  /**
   * 注册内置修复策略
   * @private
   */
  _initializeDefaultStrategies() {
    // 注册默认修复策略
    this.registerStrategy('thinking-content', new ThinkingContentFixStrategy());
    this.registerStrategy('balance-pairs', new MissingTagsFixStrategy());
    // 位置感知拆分为两个微策略；保留旧 positional 以兼容
    this.registerStrategy('after-prev', new PositionalFixStrategy({ mode: 'after-prev' }));
    this.registerStrategy('before-next', new PositionalFixStrategy({ mode: 'before-next' }));
    this.registerStrategy('positional', new PositionalFixStrategy());
    // 清理未声明标签：保留注册但不在UI暴露
    this.registerStrategy('sanitize-extra-tags', new SanitizeExtraTagsStrategy());
  }



  /**
   * 注册修复策略
   * @param {string} name - 策略名称
   * @param {FixStrategy} strategy - 修复策略实例
   */
  registerStrategy(name, strategy) {
    if (!(strategy instanceof FixStrategy)) {
      throw new Error('修复策略必须继承自 FixStrategy 类');
    }

    this.strategies.set(name, strategy);
    console.log(`修复策略已注册: ${name}`);
  }

  /**
   * 注册自定义修复策略
   * @param {string} pattern - 正则表达式模式
   * @param {string} replacement - 替换内容
   * @param {string} description - 策略描述
   */
  registerCustomStrategy(pattern, replacement, description) {
    const strategy = new CustomFixStrategy(pattern, replacement, description);
    this.registerStrategy('custom', strategy);
  }

  /**
   * 启用/禁用自动修复引擎
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`自动修复引擎${enabled ? '已启用' : '已禁用'}`);
  }

  /**
   * 尝试修复内容
   * - strategyName: string | string[] | null
   * - 若为数组则按顺序组成流水线执行；否则与旧行为一致
   */
  attemptFix(content, missingItems, strategyName = null) {
    if (!this.isEnabled) {
      return { success: false, originalContent: content, fixedContent: content, strategy: null, fixedItems: [], metadata: { reason: '自动修复引擎未启用' } };
    }

    try {
      // 若未指定策略或为字符串，尝试根据当前规则的 contentOptions 派生流水线
      let pipelineNames = [];
      if (!strategyName || typeof strategyName === 'string') {
        const rule = window.ResponseLinter?.CurrentRule || null;
        if (rule && rule.contentOptions && Array.isArray(rule.requiredContent)) {
          for (const item of rule.requiredContent) {
            const opt = rule.contentOptions[item];
            if (!opt || opt.enabled === false) continue;
            const acts = Array.isArray(opt.actions) ? opt.actions : [];
            for (const act of acts) pipelineNames.push(act);
          }
        }
      }
      if (Array.isArray(strategyName)) {
        pipelineNames = strategyName;
      } else if (typeof strategyName === 'string' && strategyName) {
        pipelineNames = pipelineNames.length ? pipelineNames : [strategyName];
      }

      // 去重，保持原有顺序
      pipelineNames = pipelineNames.filter((n, i, arr) => arr.indexOf(n) === i);

      // 若包含 custom，则从当前规则读取 pattern + replacement 并注册策略（覆盖之前注册的custom）
      if (pipelineNames.includes('custom')) {
        const rule = window.ResponseLinter?.CurrentRule || null;
        if (rule && rule.contentOptions) {
          const seq = Array.isArray(rule.requiredContent) ? rule.requiredContent : Object.keys(rule.contentOptions);
          for (const key of seq) {
            const opt = rule.contentOptions[key];
            if (opt && Array.isArray(opt.actions) && opt.actions.includes('custom') && opt.pattern && typeof opt.replacement === 'string') {
              try { this.registerCustomStrategy(opt.pattern, opt.replacement, `规则自定义修复: ${key}`); } catch {}
              break;
            }
          }
        }
      }

      const pipeline = (pipelineNames.length ? pipelineNames : Array.from(this.strategies.keys()))
        .map(n => this.strategies.get(n))
        .filter(Boolean);

      let current = content;
      const executed = [];

      // 每一步后重新计算缺失项，避免重复插入；无变化则跳过后续
      for (const strategy of pipeline) {
        if (!strategy || !strategy.canFix(current, missingItems)) continue;

        // 注入当前规则的 positionalOptions.doubleNewline 到位置感知策略
        try {
          if (strategy instanceof PositionalFixStrategy) {
            const rule = window.ResponseLinter?.CurrentRule || null;
            const ruleDoubleNewline = rule?.positionalOptions?.doubleNewline;
            if (typeof ruleDoubleNewline === 'boolean') {
              strategy.options.doubleNewline = ruleDoubleNewline;
            }
          }
        } catch (e) { /* 安全兜底，不阻塞修复 */ }

        const next = strategy.fix(current, missingItems);
        if (next !== current && strategy.validate(next, missingItems)) {
          executed.push(strategy.name);
          current = next;
          // 轻量重新评估：若所有缺失项已满足则可提前结束
          const allOk = missingItems.every(it => current.includes(it));
          if (allOk) break;
        }
      }

      if (executed.length > 0 && current !== content) {
        const result = {
          success: true,
          originalContent: content,
          fixedContent: current,
          strategy: executed.join(' | '),
          fixedItems: this._findFixedItems(content, current, missingItems),
          metadata: { pipeline: executed, fixTime: new Date(), contentLengthChange: current.length - content.length },
        };
        this._recordFixHistory(result);
        console.log(`修复成功 - 流水线: ${result.strategy}`);
        return result;
      }

      // 若是单策略模式则回退到旧逻辑尝试全部已注册策略
      if (!Array.isArray(strategyName)) {
        for (const strategy of Array.from(this.strategies.values())) {
          if (strategy.canFix(content, missingItems)) {
            const fixedContent = strategy.fix(content, missingItems);
            if (strategy.validate(fixedContent, missingItems)) {
              const result = {
                success: true,
                originalContent: content,
                fixedContent,
                strategy: strategy.name,
                fixedItems: this._findFixedItems(content, fixedContent, missingItems),
                metadata: { strategyDescription: strategy.description, fixTime: new Date(), contentLengthChange: fixedContent.length - content.length },
              };
              this._recordFixHistory(result);
              console.log(`修复成功 - 策略: ${strategy.name}`, result);
              return result;
            }
          }
        }
      }

      return { success: false, originalContent: content, fixedContent: content, strategy: null, fixedItems: [], metadata: { reason: '没有适用的修复策略' } };
    } catch (error) {
      console.error('修复过程出错:', error);
      return {
        success: false,
        originalContent: content,
        fixedContent: content,
        strategy: null,
        fixedItems: [],
        metadata: { reason: '修复过程出错', error: error.message },
      };
    }
  }

  /**
   * 查找修复的项目
   * @private
   * @param {string} original - 原始内容
   * @param {string} fixed - 修复后内容
   * @param {Array<string>} missingItems - 原始缺失项
   * @returns {Array<string>} 修复的项目
   */
  _findFixedItems(original, fixed, missingItems) {
    const fixedItems = [];

    for (const item of missingItems) {
      const wasFixed = !original.includes(item) && fixed.includes(item);
      if (wasFixed) {
        fixedItems.push(item);
      }
    }

    return fixedItems;
  }

  /**
   * 记录修复历史
   * @private
   * @param {FixResult} result - 修复结果
   */
  _recordFixHistory(result) {
    this.fixHistory.push({
      timestamp: new Date(),
      strategy: result.strategy,
      success: result.success,
      fixedItemsCount: result.fixedItems.length,
      contentLengthChange: result.metadata.contentLengthChange,
    });

    // 限制历史记录大小
    if (this.fixHistory.length > this.maxHistorySize) {
      this.fixHistory = this.fixHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 获取修复统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    const successfulFixes = this.fixHistory.filter(fix => fix.success).length;
    const strategyUsage = {};

    this.fixHistory.forEach(fix => {
      strategyUsage[fix.strategy] = (strategyUsage[fix.strategy] || 0) + 1;
    });

    return {
      totalAttempts: this.fixHistory.length,
      successfulFixes,
      successRate: this.fixHistory.length > 0 ? Math.round((successfulFixes / this.fixHistory.length) * 100) : 0,
      strategyUsage,
      registeredStrategies: Array.from(this.strategies.keys()),
      isEnabled: this.isEnabled,
    };
  }

  /**
   * 清理修复历史
   */
  clearHistory() {
    this.fixHistory = [];
    console.log('修复历史已清理');
  }

  /**
   * 获取可用的修复策略列表
   * @returns {Array<Object>} 策略信息列表
   */
  getAvailableStrategies() {
    return Array.from(this.strategies.entries()).map(([name, strategy]) => ({
      name,
      description: strategy.description,
      type: strategy.constructor.name,
    }));
  }
}

// 创建全局自动修复引擎实例
export const autoFixEngine = new AutoFixEngine();
