// Response Linter 模块测试脚本
// 用于验证所有UI模块是否正确初始化和工作

/**
 * 测试所有UI模块的初始化和基本功能
 */
async function testUIModules() {
  console.log('🧪 开始UI模块测试...');

  try {
    // 测试模块管理器
    const moduleManager = window.ResponseLinterUIModuleManager;
    if (!moduleManager) {
      throw new Error('UI模块管理器未找到');
    }

    const status = moduleManager.getInitializationStatus();
    console.log('📊 模块管理器状态:', status);

    // 测试各个模块的存在性
    const expectedModules = ['UIState', 'RulesManager', 'RuleEditor', 'ConfigWizard'];
    const missingModules = [];

    expectedModules.forEach(moduleName => {
      if (!window[moduleName]) {
        missingModules.push(moduleName);
      } else {
        console.log(`✅ ${moduleName} 模块已正确初始化`);
      }
    });

    if (missingModules.length > 0) {
      console.error('❌ 缺失的模块:', missingModules);
      return false;
    }

    // 测试基本功能
    console.log('🔧 测试基本功能...');

    // 测试UIState
    if (window.UIState && typeof window.UIState.updateStatusIndicator === 'function') {
      console.log('✅ UIState 基本功能正常');
    } else {
      console.error('❌ UIState 功能异常');
      return false;
    }

    // 测试RulesManager
    if (window.RulesManager && typeof window.RulesManager.renderRulesList === 'function') {
      console.log('✅ RulesManager 基本功能正常');
    } else {
      console.error('❌ RulesManager 功能异常');
      return false;
    }

    // 测试RuleEditor
    if (window.RuleEditor && typeof window.RuleEditor.showAddModal === 'function') {
      console.log('✅ RuleEditor 基本功能正常');
    } else {
      console.error('❌ RuleEditor 功能异常');
      return false;
    }

    // 测试ConfigWizard
    if (window.ConfigWizard && typeof window.ConfigWizard.show === 'function') {
      console.log('✅ ConfigWizard 基本功能正常');
    } else {
      console.error('❌ ConfigWizard 功能异常');
      return false;
    }

    console.log('🎉 所有UI模块测试通过！');
    return true;
  } catch (error) {
    console.error('💥 UI模块测试失败:', error);
    return false;
  }
}

// 在扩展加载后自动运行测试
setTimeout(() => {
  if (typeof window !== 'undefined' && window.ResponseLinter) {
    testUIModules().then(success => {
      if (success) {
        console.log('🌟 Response Linter UI模块重构成功完成！');
      } else {
        console.error('⚠️ Response Linter UI模块重构存在问题，将使用兼容模式');
      }
    });
  }
}, 2000); // 给扩展初始化2秒时间

// 导出测试函数用于手动调用
if (typeof window !== 'undefined') {
  window.testResponseLinterModules = testUIModules;
}
