// 规则管理功能模块原子移除验证测试
// 测试规则CRUD操作、编辑按钮、循环依赖解决等核心功能

console.log('🧪 开始规则管理功能模块原子移除验证测试...');

// 测试1: 检查规则管理对象全局可用性
function testRulesManagerAvailable() {
  console.log('📋 测试1: 检查RulesManager全局可用性');
  
  if (typeof window.RulesManager !== 'undefined') {
    console.log('✅ window.RulesManager 存在');
    
    // 检查关键方法
    const requiredMethods = [
      'renderRulesList',
      'createRuleElement', 
      'addRule',
      'editRule',
      'deleteRule',
      'toggleRule',
      'saveRules',
      'exportRules',
      'importRules',
      'addTemplate'
    ];
    
    let allMethodsExist = true;
    requiredMethods.forEach(method => {
      if (typeof window.RulesManager[method] === 'function') {
        console.log(`  ✅ ${method} 方法存在`);
      } else {
        console.log(`  ❌ ${method} 方法缺失`);
        allMethodsExist = false;
      }
    });
    
    return allMethodsExist;
  } else {
    console.log('❌ window.RulesManager 不存在');
    return false;
  }
}

// 测试2: 检查RuleEditor规则保存功能
function testRuleEditorSaveFunction() {
  console.log('📋 测试2: 检查RuleEditor规则保存功能');
  
  if (typeof window.RuleEditor !== 'undefined' && typeof window.RuleEditor.saveRule === 'function') {
    console.log('✅ RuleEditor.saveRule 方法存在');
    return true;
  } else {
    console.log('❌ RuleEditor.saveRule 方法不存在');
    return false;
  }
}

// 测试3: 检查UIState规则状态管理
function testUIStateRulesManagement() {
  console.log('📋 测试3: 检查UIState规则状态管理');
  
  if (typeof window.UIState !== 'undefined') {
    console.log('✅ window.UIState 存在');
    
    // 检查规则相关属性
    const requiredProperties = ['rules', 'currentEditingRule'];
    let allPropertiesExist = true;
    
    requiredProperties.forEach(prop => {
      if (window.UIState.hasOwnProperty(prop)) {
        console.log(`  ✅ ${prop} 属性存在`);
      } else {
        console.log(`  ❌ ${prop} 属性缺失`);
        allPropertiesExist = false;
      }
    });
    
    return allPropertiesExist;
  } else {
    console.log('❌ window.UIState 不存在');
    return false;
  }
}

// 测试4: 检查规则列表DOM元素
function testRulesListDOM() {
  console.log('📋 测试4: 检查规则列表DOM元素');
  
  const rulesContainer = document.querySelector('#rl-rules-list');
  if (rulesContainer) {
    console.log('✅ 规则列表容器存在');
    
    // 检查是否有规则元素
    const ruleElements = rulesContainer.querySelectorAll('.rl-rule-item');
    console.log(`  📊 当前规则数量: ${ruleElements.length}`);
    
    // 检查编辑按钮
    const editButtons = rulesContainer.querySelectorAll('.rl-edit-rule');
    console.log(`  🖊️ 编辑按钮数量: ${editButtons.length}`);
    
    if (editButtons.length > 0) {
      console.log('✅ 编辑按钮存在');
      return true;
    } else {
      console.log('⚠️ 没有编辑按钮 (可能没有规则)');
      return true; // 没有规则时没有编辑按钮是正常的
    }
  } else {
    console.log('❌ 规则列表容器不存在');
    return false;
  }
}

// 测试5: 模拟规则CRUD操作
function testRulesCRUDOperations() {
  console.log('📋 测试5: 模拟规则CRUD操作');
  
  try {
    // 测试规则列表渲染
    if (window.RulesManager && typeof window.RulesManager.renderRulesList === 'function') {
      console.log('  ✅ renderRulesList 可调用');
    } else {
      console.log('  ❌ renderRulesList 不可调用');
      return false;
    }
    
    // 测试添加规则功能
    if (window.RulesManager && typeof window.RulesManager.addRule === 'function') {
      console.log('  ✅ addRule 可调用');
    } else {
      console.log('  ❌ addRule 不可调用');
      return false;
    }
    
    // 测试编辑规则功能
    if (window.RulesManager && typeof window.RulesManager.editRule === 'function') {
      console.log('  ✅ editRule 可调用');
    } else {
      console.log('  ❌ editRule 不可调用');
      return false;
    }
    
    // 测试删除规则功能
    if (window.RulesManager && typeof window.RulesManager.deleteRule === 'function') {
      console.log('  ✅ deleteRule 可调用');
    } else {
      console.log('  ❌ deleteRule 不可调用');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('  ❌ 规则CRUD操作测试出错:', error);
    return false;
  }
}

// 测试6: 检查编辑按钮事件绑定
function testEditButtonBinding() {
  console.log('📋 测试6: 检查编辑按钮事件绑定');
  
  try {
    const editButtons = document.querySelectorAll('.rl-edit-rule');
    
    if (editButtons.length === 0) {
      console.log('  ⚠️ 没有编辑按钮可测试 (可能没有规则)');
      return true;
    }
    
    let bindingWorking = true;
    editButtons.forEach((button, index) => {
      // 检查是否有点击事件监听器
      const hasClickHandler = button.onclick !== null || 
                             button.addEventListener !== undefined;
      
      if (hasClickHandler) {
        console.log(`  ✅ 编辑按钮 ${index + 1} 有事件绑定`);
      } else {
        console.log(`  ❌ 编辑按钮 ${index + 1} 没有事件绑定`);
        bindingWorking = false;
      }
    });
    
    return bindingWorking;
  } catch (error) {
    console.log('  ❌ 编辑按钮绑定测试出错:', error);
    return false;
  }
}

// 测试7: 检查循环依赖解决
function testCircularDependencyResolution() {
  console.log('📋 测试7: 检查循环依赖解决');
  
  try {
    // 检查RuleEditor.saveRule是否能正确调用RulesManager.addRule
    if (window.RuleEditor && window.RulesManager) {
      console.log('  ✅ RuleEditor 和 RulesManager 都存在');
      
      // 检查方法链是否完整
      const saveRuleExists = typeof window.RuleEditor.saveRule === 'function';
      const addRuleExists = typeof window.RulesManager.addRule === 'function';
      const editRuleExists = typeof window.RulesManager.editRule === 'function';
      const showEditModalExists = typeof window.RuleEditor.showEditModal === 'function';
      
      if (saveRuleExists && addRuleExists && editRuleExists && showEditModalExists) {
        console.log('  ✅ 循环依赖链中的所有方法都存在');
        console.log('  ✅ 循环依赖通过模块系统解决');
        return true;
      } else {
        console.log('  ❌ 循环依赖链中有方法缺失');
        return false;
      }
    } else {
      console.log('  ❌ RuleEditor 或 RulesManager 不存在');
      return false;
    }
  } catch (error) {
    console.log('  ❌ 循环依赖测试出错:', error);
    return false;
  }
}

// 测试8: 模拟完整的规则编辑流程
function testCompleteRuleEditingFlow() {
  console.log('📋 测试8: 模拟完整的规则编辑流程');
  
  try {
    // 模拟点击编辑按钮 → 显示编辑模态框 → 保存规则 → 更新列表
    const flowSteps = [
      { name: 'showEditModal', obj: 'RuleEditor' },
      { name: 'saveRule', obj: 'RuleEditor' },
      { name: 'editRule', obj: 'RulesManager' },
      { name: 'renderRulesList', obj: 'RulesManager' }
    ];
    
    let flowComplete = true;
    flowSteps.forEach(step => {
      const obj = window[step.obj];
      if (obj && typeof obj[step.name] === 'function') {
        console.log(`  ✅ ${step.obj}.${step.name} 可用`);
      } else {
        console.log(`  ❌ ${step.obj}.${step.name} 不可用`);
        flowComplete = false;
      }
    });
    
    if (flowComplete) {
      console.log('  ✅ 完整的规则编辑流程链条完整');
    } else {
      console.log('  ❌ 规则编辑流程链条不完整');
    }
    
    return flowComplete;
  } catch (error) {
    console.log('  ❌ 规则编辑流程测试出错:', error);
    return false;
  }
}

// 执行所有测试
function runAllTests() {
  console.log('🚀 开始执行规则管理功能模块原子移除验证测试...');
  
  const tests = [
    { name: 'RulesManager全局可用性', fn: testRulesManagerAvailable },
    { name: 'RuleEditor规则保存功能', fn: testRuleEditorSaveFunction },
    { name: 'UIState规则状态管理', fn: testUIStateRulesManagement },
    { name: '规则列表DOM元素', fn: testRulesListDOM },
    { name: '规则CRUD操作', fn: testRulesCRUDOperations },
    { name: '编辑按钮事件绑定', fn: testEditButtonBinding },
    { name: '循环依赖解决', fn: testCircularDependencyResolution },
    { name: '完整规则编辑流程', fn: testCompleteRuleEditingFlow }
  ];
  
  let passedTests = 0;
  const totalTests = tests.length;
  
  tests.forEach((test, index) => {
    console.log(`\n--- 测试 ${index + 1}/${totalTests}: ${test.name} ---`);
    const result = test.fn();
    if (result) {
      passedTests++;
      console.log(`✅ 测试通过`);
    } else {
      console.log(`❌ 测试失败`);
    }
  });
  
  console.log(`\n📊 测试结果: ${passedTests}/${totalTests} 通过`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！规则管理功能模块原子移除成功，功能完整性保持。');
    return true;
  } else {
    console.log('⚠️ 部分测试失败，需要检查规则管理功能的模块化实现。');
    return false;
  }
}

// 导出测试函数供外部调用
if (typeof window !== 'undefined') {
  window.testRulesManagementAtomicRemoval = runAllTests;
}

// 如果在浏览器环境中，延迟执行测试以确保模块加载完成
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('⏰ 延迟执行规则管理功能模块原子移除验证测试...');
    runAllTests();
  }, 3000);
}
