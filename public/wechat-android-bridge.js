// WeChat Android Bridge Handler
// This script handles WeChat login callbacks from the Android native app

(function() {
  'use strict';

  // Handler for WeChat login success
  window.handleWeChatLoginSuccess = async function(code) {
    console.log('🎉 WeChat login success, authorization code received:', code);

    try {
      // Send the authorization code to the backend
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

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ WeChat login successful, redirecting...');

        // Store user data in localStorage for CN environment
        if (result.user) {
          localStorage.setItem('cn_user', JSON.stringify({
            id: result.user.id,
            email: result.user.email,
            user_metadata: {
              display_name: result.user.displayName,
              avatar_url: result.user.avatarUrl,
            }
          }));
        }

        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        console.error('❌ WeChat login failed:', result.error);
        alert('微信登录失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('❌ WeChat login error:', error);
      alert('微信登录失败，请重试');
    }
  };

  // Handler for WeChat login error
  window.handleWeChatLoginError = function(error) {
    console.error('❌ WeChat login error:', error);
    alert('微信登录失败: ' + error);
  };

  console.log('✅ WeChat Android bridge handlers registered');
})();
