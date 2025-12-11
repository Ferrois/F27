import { useEffect, useState, useCallback } from "react";
import { useApi } from "../Context/ApiContext";
import { config } from "../config";

// Convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { auth, authRequest } = useApi();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [publicVapidKey, setPublicVapidKey] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    ) {
      setIsSupported(true);
    }
  }, []);

  // Get public VAPID key
  useEffect(() => {
    if (auth?.accessToken) {
      fetch(`${config.API_URL}/user/push/vapid-key`)
        .then((res) => res.json())
        .then((data) => {
          if (data.publicKey) {
            setPublicVapidKey(data.publicKey);
          }
        })
        .catch((err) => console.error("Failed to get VAPID key:", err));
    }
  }, [auth?.accessToken]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !publicVapidKey || !auth?.accessToken) {
      return { success: false, error: "Push notifications not supported or not ready" };
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return { success: false, error: "Notification permission denied" };
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/serviceworker.js");
      console.log("Service Worker registered:", registration);

      // Subscribe to push service
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      // Send subscription to backend
      // Convert ArrayBuffer keys to base64 strings
      const p256dhKey = pushSubscription.getKey("p256dh");
      const authKey = pushSubscription.getKey("auth");
      
      const p256dhArray = new Uint8Array(p256dhKey);
      const authArray = new Uint8Array(authKey);
      
      const p256dhBase64 = btoa(String.fromCharCode.apply(null, p256dhArray));
      const authBase64 = btoa(String.fromCharCode.apply(null, authArray));
      
      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: p256dhBase64,
          auth: authBase64,
        },
      };

      const response = await authRequest("POST", "/user/push/subscribe", subscriptionData);
      
      if (response.success) {
        setSubscription(pushSubscription);
        setIsSubscribed(true);
        return { success: true };
      } else {
        return { success: false, error: response.error?.message || "Failed to subscribe" };
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      return { success: false, error: error.message };
    }
  }, [isSupported, publicVapidKey, auth?.accessToken, authRequest]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      return { success: false, error: "No active subscription" };
    }

    try {
      await subscription.unsubscribe();
      const response = await authRequest("POST", "/user/push/unsubscribe", {
        endpoint: subscription.endpoint,
      });

      if (response.success) {
        setSubscription(null);
        setIsSubscribed(false);
        return { success: true };
      } else {
        return { success: false, error: response.error?.message || "Failed to unsubscribe" };
      }
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      return { success: false, error: error.message };
    }
  }, [subscription, authRequest]);

  // Toggle push notifications
  const toggle = useCallback(async (enabled) => {
    try {
      const response = await authRequest("PUT", "/user/push/toggle", { enabled });
      if (response.success) {
        setIsSubscribed(enabled);
        return { success: true };
      } else {
        return { success: false, error: response.error?.message || "Failed to toggle" };
      }
    } catch (error) {
      console.error("Error toggling push notifications:", error);
      return { success: false, error: error.message };
    }
  }, [authRequest]);

  return {
    isSupported,
    isSubscribed,
    subscription,
    subscribe,
    unsubscribe,
    toggle,
  };
}

