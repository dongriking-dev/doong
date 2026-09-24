// Firebase Messaging 用 Service Worker
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDsoktNvfhnMSBrHLyhSjgLBLYiih7cMFE",
  authDomain: "doong-672e7.firebaseapp.com",
  databaseURL: "https://doong-672e7-default-rtdb.firebaseio.com",
  projectId: "doong-672e7",
  storageBucket: "doong-672e7.firebasestorage.app",
  messagingSenderId: "95643976140",
  appId: "1:95643976140:web:cdcb757a9bc25bc7a75d69"
});

const messaging = firebase.messaging();

// バックグラウンド通知
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "通知";
  const options = {
    body: payload.notification?.body || "",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png"
  };
  self.registration.showNotification(title, options);
});

// 通知クリック
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes("/client/") && "focus" in c) return c.focus();
      }
      return clients.openWindow("./");
    })
  );
});

// インストール即時反映
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
