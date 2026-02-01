// WeChat Android Bridge Handler
// This script handles WeChat login callbacks from the Android native app

(function() {
  'use strict';

  console.log('📱 ========================================');
  console.log('📱 WeChat Android Bridge Script Loading...');
  console.log('📱 ========================================');

  // Handler for WeChat login success
  window.handleWeChatLoginSuccess = async function(code) {
    console.log('🎉 ========================================');
    console.log('🎉 WeChat login success callback triggered!');
    console.log('🎉 Authorization code received:', code);
    console.log('🎉 ========================================');

    try {
      console.log('📤 Sending authorization code to backend...');
      console.log('📤 API endpoint: /api/auth/wechat/callback');
      console.log('📤 Request body:', JSON.stringify({ code: code, loginType: 'mobile_app' }));

      const response = await fetch('/api/auth/wechat/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          code: code,
          loginType: 'mobile_app'
        })
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      const result = await response.json();
      console.log('📥 Response data:', JSON.stringify(result, null, 2));

      if (response.ok && result.success) {
        console.log('✅ WeChat login successful!');

        // Store user data in localStorage for CN environment
        if (result.user) {
          console.log('💾 Storing user data in localStorage...');
          const userData = {
            id: result.user.id,
            email: result.user.email,
            user_metadata: {
              display_name: result.user.displayName,
              avatar_url: result.user.avatarUrl,
            }
          };
          console.log('💾 User data:', JSON.stringify(userData, null, 2));
          localStorage.setItem('cn_user', JSON.stringify(userData));
          console.log('✅ User data stored successfully');
        }

        // Redirect to dashboard
        console.log('🔄 Redirecting to /dashboard...');
        window.location.href = '/dashboard';
      } else {
        console.error('❌ WeChat login failed!');
        console.error('❌ Error:', result.error);
        alert('微信登录失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('❌ ========================================');
      console.error('❌ WeChat login error!');
      console.error('❌ Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ ========================================');
      alert('微信登录失败，请重试');
    }
  };

  // Handler for WeChat login error
  window.handleWeChatLoginError = function(error) {
    console.error('❌ ========================================');
    console.error('❌ WeChat login error callback triggered!');
    console.error('❌ Error:', error);
    console.error('❌ ========================================');
    alert('微信登录失败: ' + error);
  };

  console.log('✅ WeChat Android bridge handlers registered');
  console.log('✅ window.handleWeChatLoginSuccess:', typeof window.handleWeChatLoginSuccess);
  console.log('✅ window.handleWeChatLoginError:', typeof window.handleWeChatLoginError);
})();
