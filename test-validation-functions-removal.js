// ValidationFunctions移除后的功能验证测试
// 测试ValidationFunctions是否通过模块系统正确可用

console.log('🧪 开始ValidationFunctions移除验证测试...');

// 测试1: 检查ValidationFunctions是否在全局可用
function testValidationFunctionsAvailable() {
  console.log('📋 测试1: 检查ValidationFunctions全局可用性');
  
  if (typeof window.ValidationFunctions !== 'undefined') {
    console.log('✅ window.ValidationFunctions 存在');
    
    // 检查关键方法
    const requiredMethods = [
      'triggerManualValidation',
      'showDetailedValidationNotification',
      'getErrorBadgeHtml',
      'getErrorTitle',
      'generateErrorDetailsHtml',
      'triggerAutoFix'
    ];
    
    let allMethodsExist = true;
    requiredMethods.forEach(method => {
      if (typeof window.ValidationFunctions[method] === 'function') {
        console.log(`  ✅ ${method} 方法存在`);
      } else {
        console.log(`  ❌ ${method} 方法缺失`);
        allMethodsExist = false;
      }
    });
    
    return allMethodsExist;
  } else {
    console.log('❌ window.ValidationFunctions 不存在');
    return false;
  }
}

// 测试2: 检查模块是否正确初始化
function testModuleInitialization() {
  console.log('📋 测试2: 检查模块初始化状态');
  
  if (window.ResponseLinter && window.ResponseLinter.ValidationFunctions) {
    console.log('✅ ResponseLinter.ValidationFunctions 存在');
    return true;
  } else {
    console.log('❌ ResponseLinter.ValidationFunctions 不存在');
    return false;
  }
}

// 测试3: 模拟手动验证功能
function testManualValidation() {
  console.log('📋 测试3: 模拟手动验证功能');
  
  try {
    if (window.ValidationFunctions && typeof window.ValidationFunctions.triggerManualValidation === 'function') {
      console.log('✅ triggerManualValidation 方法可调用');
      // 注意：不实际调用，只检查方法存在性
      return true;
    } else {
      console.log('❌ triggerManualValidation 方法不可用');
      return false;
    }
  } catch (error) {
    console.log('❌ triggerManualValidation 测试出错:', error);
    return false;
  }
}

// 测试4: 检查事件处理器中的调用
function testEventHandlerCalls() {
  console.log('📋 测试4: 检查事件处理器调用兼容性');
  
  // 模拟验证失败事件
  const mockResult = {
    ruleName: '测试规则',
    errorType: 'missing',
    missingContent: ['<test>'],
    errorDetails: []
  };
  
  try {
    if (window.ValidationFunctions && typeof window.ValidationFunctions.showDetailedValidationNotification === 'function') {
      console.log('✅ showDetailedValidationNotification 方法可调用');
      // 注意：不实际调用，只检查方法存在性
      return true;
    } else {
      console.log('❌ showDetailedValidationNotification 方法不可用');
      return false;
    }
  } catch (error) {
    console.log('❌ 事件处理器调用测试出错:', error);
    return false;
  }
}

// 执行所有测试
function runAllTests() {
  console.log('🚀 开始执行ValidationFunctions移除验证测试...');
  
  const tests = [
    { name: 'ValidationFunctions全局可用性', fn: testValidationFunctionsAvailable },
    { name: '模块初始化状态', fn: testModuleInitialization },
    { name: '手动验证功能', fn: testManualValidation },
    { name: '事件处理器调用兼容性', fn: testEventHandlerCalls }
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
    console.log('🎉 所有测试通过！ValidationFunctions移除成功，功能完整性保持。');
    return true;
  } else {
    console.log('⚠️ 部分测试失败，需要检查ValidationFunctions的模块化实现。');
    return false;
  }
}

// 导出测试函数供外部调用
if (typeof window !== 'undefined') {
  window.testValidationFunctionsRemoval = runAllTests;
}

// 如果在浏览器环境中，延迟执行测试以确保模块加载完成
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('⏰ 延迟执行ValidationFunctions移除验证测试...');
    runAllTests();
  }, 2000);
}
