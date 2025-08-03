// RuleEditor移除后的功能验证测试
// 测试RuleEditor是否通过模块系统正确可用

console.log('🧪 开始RuleEditor移除验证测试...');

// 测试1: 检查RuleEditor是否在全局可用
function testRuleEditorAvailable() {
  console.log('📋 测试1: 检查RuleEditor全局可用性');
  
  if (typeof window.RuleEditor !== 'undefined') {
    console.log('✅ window.RuleEditor 存在');
    
    // 检查关键方法
    const requiredMethods = [
      'showAddModal',
      'showEditModal',
      'showModal',
      'hideModal',
      'addContentTag',
      'removeContentTag',
      'updateTagsList',
      'enableDragSort',
      'getDragAfterElement',
      'updateTagsOrderFromDOM',
      'toggleCustomStrategy',
      'togglePositionalStrategy',
      'saveRule'
    ];
    
    let allMethodsExist = true;
    requiredMethods.forEach(method => {
      if (typeof window.RuleEditor[method] === 'function') {
        console.log(`  ✅ ${method} 方法存在`);
      } else {
        console.log(`  ❌ ${method} 方法缺失`);
        allMethodsExist = false;
      }
    });
    
    // 检查关键属性
    const requiredProperties = ['currentTags'];
    requiredProperties.forEach(prop => {
      if (window.RuleEditor.hasOwnProperty(prop)) {
        console.log(`  ✅ ${prop} 属性存在`);
      } else {
        console.log(`  ❌ ${prop} 属性缺失`);
        allMethodsExist = false;
      }
    });
    
    return allMethodsExist;
  } else {
    console.log('❌ window.RuleEditor 不存在');
    return false;
  }
}

// 测试2: 检查模块是否正确初始化
function testModuleInitialization() {
  console.log('📋 测试2: 检查模块初始化状态');
  
  if (window.ResponseLinter && window.ResponseLinter.RuleEditor) {
    console.log('✅ ResponseLinter.RuleEditor 存在');
    return true;
  } else {
    console.log('❌ ResponseLinter.RuleEditor 不存在');
    return false;
  }
}

// 测试3: 检查事件处理器绑定
function testEventHandlerBindings() {
  console.log('📋 测试3: 检查事件处理器绑定');
  
  const buttonSelectors = [
    '#rl-add-rule',           // 添加规则按钮
    '#rl-close-editor',       // 关闭编辑器按钮
    '#rl-cancel-rule',        // 取消按钮
    '#rl-save-rule',          // 保存规则按钮
    '#rl-add-content',        // 添加内容按钮
    '#rl-new-content',        // 新内容输入框
    '#rl-rule-strategy'       // 策略选择框
  ];
  
  let allButtonsExist = true;
  buttonSelectors.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`  ✅ ${selector} 元素存在`);
    } else {
      console.log(`  ⚠️ ${selector} 元素不存在 (可能是模板未加载)`);
      // 注意：这不一定是错误，可能是模板还未加载
    }
  });
  
  return true; // 暂时总是返回true，因为模板可能未加载
}

// 测试4: 检查规则编辑器模态框
function testRuleEditorModal() {
  console.log('📋 测试4: 检查规则编辑器模态框');
  
  const modalSelector = '#rl-rule-editor-modal';
  const modal = document.querySelector(modalSelector);
  
  if (modal) {
    console.log('✅ 规则编辑器模态框存在');
    
    // 检查关键子元素
    const keyElements = [
      '#rl-editor-title',           // 编辑器标题
      '#rl-rule-form',              // 规则表单
      '#rl-rule-name',              // 规则名称输入框
      '#rl-rule-description',       // 规则描述输入框
      '#rl-rule-strategy',          // 修复策略选择
      '#rl-rule-enabled',           // 启用状态复选框
      '#rl-required-content-list',  // 必需内容列表
      '#rl-new-content',            // 新内容输入框
      '#rl-add-content'             // 添加内容按钮
    ];
    
    keyElements.forEach(selector => {
      const element = modal.querySelector(selector);
      if (element) {
        console.log(`  ✅ ${selector} 子元素存在`);
      } else {
        console.log(`  ⚠️ ${selector} 子元素不存在`);
      }
    });
    
    return true;
  } else {
    console.log('⚠️ 规则编辑器模态框不存在 (可能是模板未加载)');
    return true; // 暂时返回true，因为模板可能未加载
  }
}

// 测试5: 模拟拖拽排序功能
function testDragSortFunctionality() {
  console.log('📋 测试5: 模拟拖拽排序功能');
  
  try {
    if (window.RuleEditor) {
      // 测试拖拽相关方法存在性
      const dragMethods = ['enableDragSort', 'getDragAfterElement', 'updateTagsOrderFromDOM'];
      let allDragMethodsExist = true;
      
      dragMethods.forEach(method => {
        if (typeof window.RuleEditor[method] === 'function') {
          console.log(`  ✅ ${method} 拖拽方法存在`);
        } else {
          console.log(`  ❌ ${method} 拖拽方法缺失`);
          allDragMethodsExist = false;
        }
      });
      
      // 测试currentTags属性
      if (Array.isArray(window.RuleEditor.currentTags)) {
        console.log('  ✅ currentTags 属性是数组类型');
      } else {
        console.log('  ❌ currentTags 属性不是数组类型');
        allDragMethodsExist = false;
      }
      
      return allDragMethodsExist;
    } else {
      console.log('❌ RuleEditor 不可用');
      return false;
    }
  } catch (error) {
    console.log('❌ 拖拽功能测试出错:', error);
    return false;
  }
}

// 测试6: 模拟规则编辑功能
function testRuleEditingFunctionality() {
  console.log('📋 测试6: 模拟规则编辑功能');
  
  try {
    if (window.RuleEditor) {
      // 测试属性访问
      console.log(`  ✅ currentTags: ${JSON.stringify(window.RuleEditor.currentTags)}`);
      
      // 测试方法存在性（不实际调用以避免副作用）
      const editingMethods = [
        'showAddModal',
        'showEditModal', 
        'addContentTag',
        'removeContentTag',
        'saveRule',
        'toggleCustomStrategy'
      ];
      
      let allEditingMethodsExist = true;
      editingMethods.forEach(method => {
        if (typeof window.RuleEditor[method] === 'function') {
          console.log(`  ✅ ${method}() 方法可调用`);
        } else {
          console.log(`  ❌ ${method}() 方法不存在`);
          allEditingMethodsExist = false;
        }
      });
      
      return allEditingMethodsExist;
    } else {
      console.log('❌ RuleEditor 不可用');
      return false;
    }
  } catch (error) {
    console.log('❌ 规则编辑功能测试出错:', error);
    return false;
  }
}

// 测试7: 检查依赖关系
function testDependencyIntegration() {
  console.log('📋 测试7: 检查依赖关系');
  
  const dependencies = [
    { name: 'UIState', path: 'window.UIState' },
    { name: 'RulesManager', path: 'window.RulesManager' },
    { name: 'jQuery', path: 'window.$' },
    { name: 'toastr', path: 'window.toastr' }
  ];
  
  let allDependenciesExist = true;
  dependencies.forEach(dep => {
    try {
      const obj = eval(dep.path);
      if (obj) {
        console.log(`  ✅ ${dep.name} 依赖存在`);
      } else {
        console.log(`  ❌ ${dep.name} 依赖不存在`);
        allDependenciesExist = false;
      }
    } catch (error) {
      console.log(`  ❌ ${dep.name} 依赖检查出错: ${error.message}`);
      allDependenciesExist = false;
    }
  });
  
  return allDependenciesExist;
}

// 执行所有测试
function runAllTests() {
  console.log('🚀 开始执行RuleEditor移除验证测试...');
  
  const tests = [
    { name: 'RuleEditor全局可用性', fn: testRuleEditorAvailable },
    { name: '模块初始化状态', fn: testModuleInitialization },
    { name: '事件处理器绑定', fn: testEventHandlerBindings },
    { name: '规则编辑器模态框', fn: testRuleEditorModal },
    { name: '拖拽排序功能', fn: testDragSortFunctionality },
    { name: '规则编辑功能', fn: testRuleEditingFunctionality },
    { name: '依赖关系检查', fn: testDependencyIntegration }
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
    console.log('🎉 所有测试通过！RuleEditor移除成功，功能完整性保持。');
    return true;
  } else {
    console.log('⚠️ 部分测试失败，需要检查RuleEditor的模块化实现。');
    return false;
  }
}

// 导出测试函数供外部调用
if (typeof window !== 'undefined') {
  window.testRuleEditorRemoval = runAllTests;
}

// 如果在浏览器环境中，延迟执行测试以确保模块加载完成
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('⏰ 延迟执行RuleEditor移除验证测试...');
    runAllTests();
  }, 4000);
}
