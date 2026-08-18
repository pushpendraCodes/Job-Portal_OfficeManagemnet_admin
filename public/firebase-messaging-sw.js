/* Firebase Cloud Messaging service worker */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBcSplijQV_g1i7ap6sXfn0OHR1-WyCgeQ",
  authDomain: "jobportal-3800e.firebaseapp.com",
  projectId: "jobportal-3800e",
  messagingSenderId: "993457679480",
  appId: "1:993457679480:web:03590a9c9a2b7111f5518d",
});

firebase.messaging().onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "LoomHire Admin";
  self.registration.showNotification(title, {
    body: payload.notification?.body || "",
    data: payload.data || {},
  });
});
