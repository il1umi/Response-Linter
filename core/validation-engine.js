// Response Linter 验证引擎核心模块
// 负责AI回复内容的规则验证和结果处理

/**
 * 验证结果数据结构
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - 验证是否通过
 * @property {string} ruleName - 触发的规则名称
 * @property {Array<string>} missingContent - 缺失的内容项
 * @property {string} fixStrategy - 修复策略
 * @property {Object} metadata - 附加元数据
 * @property {string} errorType - 错误类型：'missing'|'order'|'incomplete'
 * @property {Array<Object>} errorDetails - 详细错误信息
 * @property {Array<Object>} positionInfo - 位置信息
 */

/**
 * 错误类型常量
 */
const ERROR_TYPES = {
  MISSING_TAG: 'missing', // 标签缺失
  WRONG_ORDER: 'order', // 顺序错误
  INCOMPLETE_PAIR: 'incomplete', // 配对不完整
};

/**
 * 验证引擎核心类
 */
export class ValidationEngine {
  constructor() {
    this.isEnabled = false;
    this.activeRules = [];
    this.validationCount = 0;
    this.lastValidationTime = null;
  }

  /**
   * 初始化验证引擎
   * @param {Array} rules - 活跃的验证规则
   * @param {boolean} enabled - 是否启用验证
   */
  initialize(rules, enabled) {
    this.activeRules = rules.filter(rule => rule.enabled);
    this.isEnabled = enabled;

    console.log(`验证引擎已初始化: ${this.activeRules.length}条活跃规则`);
  }

  /**
   * 验证消息内容
   * @param {string} content - 消息内容
   * @param {string} messageId - 消息ID
   * @returns {ValidationResult|null} 验证结果，null表示无需验证
   */
  validateMessage(content, messageId) {
    // 检查验证引擎是否启用
    if (!this.isEnabled || this.activeRules.length === 0) {
      return null;
    }

    // 输入验证
    if (!content || typeof content !== 'string') {
      console.warn('验证引擎: 无效的消息内容', { messageId, content });
      return null;
    }

    // 记录验证统计
    this.validationCount++;
    this.lastValidationTime = new Date();

    console.log(`开始验证消息 [${messageId}]: ${content.length}字符`);

    // 逐条检查规则
    for (const rule of this.activeRules) {
      const result = this._validateSingleRule(content, rule, messageId);
      if (!result.isValid) {
        console.log(`验证失败 - 规则: ${rule.name}`, result);
        return result;
      }
    }

    // 所有规则都通过
    console.log(`验证通过 [${messageId}]`);
    return {
      isValid: true,
      ruleName: null,
      missingContent: [],
      fixStrategy: null,
      metadata: {
        messageId,
        checkedRules: this.activeRules.length,
        validationTime: this.lastValidationTime,
      },
    };
  }

  /**
   * 验证单条规则
   * @private
   * @param {string} content - 消息内容
   * @param {Object} rule - 验证规则
   * @param {string} messageId - 消息ID
   * @returns {ValidationResult} 验证结果
   */
  _validateSingleRule(content, rule, messageId) {
    const { requiredContent } = rule;

    // 执行位置感知验证
    const positionResults = this._validateContentPositions(content, requiredContent);

    // 分析验证结果
    const analysis = this._analyzeValidationResults(positionResults, rule);

    // 生成详细错误信息
    const errorDetails = this._generateErrorDetails(content, positionResults, analysis);

    return {
      isValid: analysis.isValid,
      ruleName: rule.name,
      missingContent: analysis.missingItems,
      fixStrategy: rule.fixStrategy || null,
      errorType: analysis.errorType,
      errorDetails: errorDetails,
      positionInfo: positionResults,
      metadata: {
        messageId,
        ruleId: rule.id,
        contentLength: content.length,
        validationTime: new Date(),
        validationType: 'positional', // 新增：标识为位置感知验证
      },
    };
  }

  /**
   * 验证内容位置和顺序
   * @private
   * @param {string} content - 消息内容
   * @param {Array<string>} requiredItems - 必需内容项
   * @returns {Array<Object>} 位置验证结果
   */
  _validateContentPositions(content, requiredItems) {
    const results = [];

    for (let i = 0; i < requiredItems.length; i++) {
      const item = requiredItems[i];
      const positions = this._findAllPositions(content, item);

      results.push({
        item: item,
        index: i,
        expectedOrder: i,
        positions: positions,
        found: positions.length > 0,
        firstPosition: positions.length > 0 ? positions[0] : -1,
      });
    }

    return results;
  }

  /**
   * 查找内容项在文本中的所有位置
   * @private
   * @param {string} content - 消息内容
   * @param {string} item - 要查找的内容项
   * @returns {Array<number>} 位置数组
   */
  _findAllPositions(content, item) {
    const positions = [];
    let startIndex = 0;

    while (true) {
      const index = content.indexOf(item, startIndex);
      if (index === -1) break;

      positions.push(index);
      startIndex = index + 1;
    }

    return positions;
  }

  /**
   * 分析验证结果
   * @private
   * @param {Array<Object>} positionResults - 位置验证结果
   * @param {Object} rule - 验证规则
   * @returns {Object} 分析结果
   */
  _analyzeValidationResults(positionResults, rule) {
    const missingItems = [];
    const orderErrors = [];
    let errorType = null;

    // 检查缺失项
    for (const result of positionResults) {
      if (!result.found) {
        missingItems.push(result.item);
      }
    }

    // 如果有缺失项，直接返回缺失错误
    if (missingItems.length > 0) {
      return {
        isValid: false,
        errorType: ERROR_TYPES.MISSING_TAG,
        missingItems: missingItems,
        orderErrors: [],
        beforeHints: [],
      };
    }

    // 检查顺序错误
    const foundItems = positionResults.filter(r => r.found);

    for (let i = 1; i < foundItems.length; i++) {
      const current = foundItems[i];
      const previous = foundItems[i - 1];

      if (current.firstPosition < previous.firstPosition) {
        orderErrors.push({
          item: current.item,
          expectedAfter: previous.item,
          actualPosition: current.firstPosition,
          expectedAfterPosition: previous.firstPosition,
        });
      }
    }

    // 额外：生成“在X之前”的提示（对偶语义），基于相邻对判断
    const beforeHints = [];
    for (let i = 0; i < foundItems.length - 1; i++) {
      const current = foundItems[i];
      const next = foundItems[i + 1];
      if (current.firstPosition > next.firstPosition) {
        beforeHints.push({ item: next.item, expectedBefore: current.item, actualPosition: next.firstPosition, expectedBeforePosition: current.firstPosition });
      }
    }

    // 确定最终验证结果
    const isValid = missingItems.length === 0 && orderErrors.length === 0;
    if (!isValid && orderErrors.length > 0) {
      errorType = ERROR_TYPES.WRONG_ORDER;
    }

    return {
      isValid,
      errorType,
      missingItems,
      orderErrors,
      beforeHints,
    };
  }

  /**
   * 生成详细错误信息
   * @private
   * @param {string} content - 消息内容
   * @param {Array<Object>} positionResults - 位置验证结果
   * @param {Object} analysis - 分析结果
   * @returns {Array<Object>} 详细错误信息
   */
  _generateErrorDetails(content, positionResults, analysis) {
    const details = [];
    const lines = content.split('\n');

    if (analysis.errorType === ERROR_TYPES.MISSING_TAG) {
      for (const missingItem of analysis.missingItems) {
        // 查找可能的插入位置
        const insertPosition = this._findBestInsertPosition(content, missingItem, positionResults);

        details.push({
          type: 'missing',
          item: missingItem,
          message: `未识别到有效标签：${missingItem}` ,
          suggestedFix: this._generateMissingTagSuggestion(missingItem, insertPosition, lines),
          position: insertPosition,
        });
      }
    } else if (analysis.errorType === ERROR_TYPES.WRONG_ORDER) {
      for (const orderError of analysis.orderErrors) {
        const currentLine = this._getLineNumber(content, orderError.actualPosition);
        const expectedLine = this._getLineNumber(content, orderError.expectedAfterPosition);

        details.push({
          type: 'order',
          item: orderError.item,
          message: `标签 ${orderError.item} 位于第${currentLine}行，未满足“在 ${orderError.expectedAfter} 之后”的要求（${orderError.expectedAfter} 位于第${expectedLine}行）`,
          suggestedFix: `将 ${orderError.item} 移到 ${orderError.expectedAfter} 之后`,
          actualLine: currentLine,
          expectedAfterLine: expectedLine,
        });
      }
      // 对偶：补充“在X之前”的提示（不改变判定，仅作为附加信息）
      if (Array.isArray(analysis.beforeHints) && analysis.beforeHints.length) {
        for (const hint of analysis.beforeHints) {
          const curLine = this._getLineNumber(content, hint.actualPosition);
          const expLine = this._getLineNumber(content, hint.expectedBeforePosition);
          details.push({
            type: 'order',
            item: hint.item,
            message: `标签 ${hint.item} 位于第${curLine}行，未满足“在 ${hint.expectedBefore} 之前”的要求（${hint.expectedBefore} 位于第${expLine}行）`,
            suggestedFix: `将 ${hint.item} 移到 ${hint.expectedBefore} 之前`,
            actualLine: curLine,
            expectedBeforeLine: expLine,
          });
        }
      }
    }

    return details;
  }

  /**
   * 查找最佳插入位置
   * @private
   * @param {string} content - 消息内容
   * @param {string} missingItem - 缺失的项
   * @param {Array<Object>} positionResults - 位置结果
   * @returns {Object} 插入位置信息
   */
  _findBestInsertPosition(content, missingItem, positionResults) {
    // 简化逻辑：建议在内容末尾插入
    const lines = content.split('\n');

    return {
      line: lines.length,
      suggestion: `在第${lines.length}行末尾添加`,
      insertAfter: '内容末尾',
    };
  }

  /**
   * 生成缺失标签的修复建议
   * @private
   * @param {string} missingItem - 缺失的项
   * @param {Object} insertPosition - 插入位置
   * @param {Array<string>} lines - 内容行数组
   * @returns {string} 修复建议
   */
  _generateMissingTagSuggestion(missingItem, insertPosition, lines) {
    return `建议在${insertPosition.insertAfter}添加 "${missingItem}"`;
  }

  /**
   * 获取字符位置对应的行号
   * @private
   * @param {string} content - 内容
   * @param {number} position - 字符位置
   * @returns {number} 行号
   */
  _getLineNumber(content, position) {
    const beforePosition = content.substring(0, position);
    return beforePosition.split('\n').length;
  }

  /**
   * 检查内容是否包含指定项
   * @private
   * @param {string} content - 消息内容
   * @param {string} item - 要检查的内容项
   * @returns {boolean} 是否包含
   */
  _contentContains(content, item) {
    try {
      // 基础字符串包含检查
      if (content.includes(item)) {
        return true;
      }

      // 如果是XML标签，检查是否存在变体（如空格、换行等）
      if (item.startsWith('<') && item.endsWith('>')) {
        const tagName = item.slice(1, -1).split(' ')[0];
        const pattern = new RegExp(`<\\s*${tagName}[^>]*>`, 'i');
        return pattern.test(content);
      }

      return false;
    } catch (error) {
      console.error('内容检查出错:', error, { content: content.slice(0, 100), item });
      return false;
    }
  }

  /**
   * 更新活跃规则
   * @param {Array} rules - 新的规则列表
   */
  updateRules(rules) {
    this.activeRules = rules.filter(rule => rule.enabled);
    console.log(`规则已更新: ${this.activeRules.length}条活跃规则`);
  }

  /**
   * 启用/禁用验证引擎
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`验证引擎${enabled ? '已启用' : '已禁用'}`);
  }

  /**
   * 获取验证统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    return {
      validationCount: this.validationCount,
      activeRulesCount: this.activeRules.length,
      lastValidationTime: this.lastValidationTime,
      isEnabled: this.isEnabled,
    };
  }

  /**
   * 重置验证统计
   */
  resetStatistics() {
    this.validationCount = 0;
    this.lastValidationTime = null;
    console.log('验证统计已重置');
  }
}

// 导出验证引擎实例和错误类型常量
export const validationEngine = new ValidationEngine();
export { ERROR_TYPES };
