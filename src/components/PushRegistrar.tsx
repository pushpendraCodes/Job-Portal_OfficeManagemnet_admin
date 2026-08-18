import { useEffect, useRef } from "react";
import { useAppSelector } from "../store/hooks";
import { registerWebPushToken } from "../lib/firebaseMessaging";

export function PushRegistrar() {
  const { user, accessToken, hydrated } = useAppSelector((s) => s.auth);
  const tried = useRef(false);

  useEffect(() => {
    if (!hydrated || !user || !accessToken || tried.current) return;
    tried.current = true;
    void registerWebPushToken().catch((err) => {
      console.warn("[fcm] register failed", err);
    });
  }, [hydrated, user, accessToken]);

  return null;
}
