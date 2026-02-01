'use client';

import { useEffect, useState } from 'react';

export default function BridgeTestPage() {
  const [bridgeInfo, setBridgeInfo] = useState<any>(null);

  useEffect(() => {
    const checkBridge = () => {
      const info = {
        timestamp: new Date().toISOString(),
        androidBridge: {
          exists: !!(window as any).AndroidWeChatBridge,
          type: typeof (window as any).AndroidWeChatBridge,
          hasLogin: !!((window as any).AndroidWeChatBridge?.login),
          loginType: typeof (window as any).AndroidWeChatBridge?.login,
        },
        handlers: {
          handleWeChatLoginSuccess: typeof (window as any).handleWeChatLoginSuccess,
          handleWeChatLoginError: typeof (window as any).handleWeChatLoginError,
        },
        windowKeys: Object.keys(window).filter(k =>
          k.includes('Android') || k.includes('WeChat') || k.includes('handle')
        ),
      };
      setBridgeInfo(info);
    };

    checkBridge();

    // Check again after 1 second
    setTimeout(checkBridge, 1000);
  }, []);

  const testBridge = () => {
    try {
      const bridge = (window as any).AndroidWeChatBridge;
      if (bridge && bridge.login) {
        console.log('Calling AndroidWeChatBridge.login()...');
        bridge.login();
        alert('Bridge login() called successfully!');
      } else {
        alert('Bridge not available!');
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Android Bridge Test</h1>

      <button
        onClick={testBridge}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          marginBottom: '20px',
          backgroundColor: '#07C160',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
        }}
      >
        Test WeChat Login
      </button>

      <h2>Bridge Information:</h2>
      <pre style={{
        backgroundColor: '#f5f5f5',
        padding: '10px',
        overflow: 'auto',
        fontSize: '12px',
      }}>
        {JSON.stringify(bridgeInfo, null, 2)}
      </pre>
    </div>
  );
}
