/**
 * Firebase Messaging Service Worker
 * 处理后台推送通知
 */

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyBtRL-wQLmcURI2xbNFilJS5kHFkQ5IayE",
  authDomain: "personalink-91e90.firebaseapp.com",
  projectId: "personalink-91e90",
  storageBucket: "personalink-91e90.firebasestorage.app",
  messagingSenderId: "1098209902512",
  appId: "1:1098209902512:web:6a1a1289bb0f3ae888e075",
  measurementId: "G-ZH0SEC18B8"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 获取 Messaging 实例
const messaging = firebase.messaging();

// 处理后台消息
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || '新消息';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/logo.png',
    image: payload.notification?.image,
    badge: '/logo.png',
    tag: 'chat-notification',
    renotify: true,
    data: payload.data,
    actions: [
      {
        action: 'open',
        title: '查看',
      },
      {
        action: 'close',
        title: '关闭',
      },
    ],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 处理通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // 获取消息数据
  const data = event.notification.data;
  let url = '/dashboard/messages';

  if (data?.room_id) {
    url = `/dashboard/messages/${data.room_id}`;
  }

  // 打开或聚焦窗口
  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // 查找已打开的窗口
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes('/dashboard') && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }

        // 如果没有找到，打开新窗口
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// 处理推送事件
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);

  if (event.data) {
    const data = event.data.json();
    console.log('[firebase-messaging-sw.js] Push data:', data);
  }
});

