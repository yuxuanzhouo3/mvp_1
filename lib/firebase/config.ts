/**
 * Firebase 配置
 * INTL 环境推送通知配置
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';

// Firebase 配置
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBtRL-wQLmcURI2xbNFilJS5kHFkQ5IayE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "personalink-91e90.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "personalink-91e90",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "personalink-91e90.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1098209902512",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1098209902512:web:6a1a1289bb0f3ae888e075",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-ZH0SEC18B8"
};

// VAPID Key (用于 Web Push)
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

// Firebase 实例
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

/**
 * 初始化 Firebase
 */
export function initializeFirebase(): FirebaseApp {
  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
  }
  return app;
}

/**
 * 获取 Firebase Messaging 实例
 */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!messaging) {
    const app = initializeFirebase();
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error('Failed to initialize Firebase Messaging:', error);
      return null;
    }
  }
  return messaging;
}

/**
 * 获取 Firebase Analytics 实例
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!analytics) {
    const supported = await isSupported();
    if (supported) {
      const app = initializeFirebase();
      analytics = getAnalytics(app);
    }
  }
  return analytics;
}

/**
 * 请求推送通知权限并获取 FCM Token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 检查浏览器是否支持通知
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return null;
    }

    // 检查是否支持 Service Worker
    if (!('serviceWorker' in navigator)) {
      console.warn('This browser does not support service workers');
      return null;
    }

    // 请求通知权限
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // 注册 Service Worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registered:', registration);

    // 获取 FCM Token
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('FCM Token:', token);
      return token;
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

/**
 * 监听前台消息
 */
export function onForegroundMessage(callback: (payload: unknown) => void): () => void {
  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
}

export default {
  initializeFirebase,
  getFirebaseMessaging,
  getFirebaseAnalytics,
  requestNotificationPermission,
  onForegroundMessage,
  firebaseConfig,
};

