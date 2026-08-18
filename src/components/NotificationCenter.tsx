import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Cookies from "js-cookie";
import { api, type ApiSuccess } from "../lib/api";
import { useAppSelector } from "../store/hooks";

export type AdminNotification = {
  _id: string;
  titleEn: string;
  titleHi: string;
  bodyEn: string;
  bodyHi: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    link?: string;
    event?: string;
    jobId?: string;
    leadId?: string;
  };
};

function titleOf(n: AdminNotification, locale: string) {
  return locale === "hi" && n.titleHi ? n.titleHi : n.titleEn;
}

function bodyOf(n: AdminNotification, locale: string) {
  return locale === "hi" && n.bodyHi ? n.bodyHi : n.bodyEn;
}

function maybeBrowserNotify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    // ignore
  }
}

export function NotificationCenter() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { accessToken, hydrated } = useAppSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const locale = i18n.language?.startsWith("hi") ? "hi" : "en";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        api.get<ApiSuccess<AdminNotification[]>>("/notifications", {
          params: { limit: 20, sortBy: "createdAt", sortOrder: "desc" },
        }),
        api.get<ApiSuccess<{ count: number }>>("/notifications/unread-count"),
      ]);
      setItems(listRes.data.data);
      setUnread(countRes.data.data.count);
    } catch {
      // silent — bell remains available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void load();
  }, [hydrated, accessToken, load]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }
  }, [hydrated, accessToken]);

  // Realtime SSE stream (+ fallback poll)
  useEffect(() => {
    if (!hydrated || !accessToken) return;

    const token = Cookies.get("adminAccessToken") || accessToken;
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
    const url = `${base}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener("notification", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          notification?: AdminNotification;
          unreadCount?: number;
        };
        if (payload.notification) {
          setItems((prev) => {
            if (prev.some((n) => n._id === payload.notification!._id)) return prev;
            return [payload.notification!, ...prev].slice(0, 30);
          });
          maybeBrowserNotify(
            titleOf(payload.notification, locale),
            bodyOf(payload.notification, locale),
          );
        }
        if (typeof payload.unreadCount === "number") {
          setUnread(payload.unreadCount);
        } else {
          setUnread((c) => c + 1);
        }
      } catch {
        // ignore malformed events
      }
    });

    es.addEventListener("unread", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { unreadCount?: number };
        if (typeof payload.unreadCount === "number") setUnread(payload.unreadCount);
      } catch {
        // ignore
      }
    });

    const poll = window.setInterval(() => {
      void api
        .get<ApiSuccess<{ count: number }>>("/notifications/unread-count")
        .then(({ data }) => setUnread(data.data.count))
        .catch(() => undefined);
    }, 60000);

    return () => {
      es.close();
      window.clearInterval(poll);
    };
  }, [hydrated, accessToken, locale]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnread((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const markAll = async () => {
    try {
      await api.post("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      // ignore
    }
  };

  const openItem = async (n: AdminNotification) => {
    if (!n.isRead) await markRead(n._id);
    setOpen(false);
    const link = n.data?.link || (n.type.includes("job") ? "/app/jobs" : "/app/leads");
    navigate(link);
  };

  const badge = useMemo(() => (unread > 99 ? "99+" : String(unread)), [unread]);

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button
        type="button"
        className="notif-bell"
        aria-label={t("notifications")}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="notif-badge">{badge}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>{t("notifications")}</strong>
            <button type="button" className="btn btn-ghost" style={{ padding: "0.25rem 0.6rem" }} onClick={() => void markAll()}>
              {t("markAllRead")}
            </button>
          </div>
          <div className="notif-list">
            {loading && items.length === 0 ? (
              <p className="muted" style={{ padding: "0.85rem" }}>
                {t("loading")}
              </p>
            ) : items.length === 0 ? (
              <p className="muted" style={{ padding: "0.85rem" }}>
                {t("noNotifications")}
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  className={`notif-item${n.isRead ? "" : " unread"}`}
                  onClick={() => void openItem(n)}
                >
                  <div className="notif-item-title">{titleOf(n, locale)}</div>
                  <div className="notif-item-body">{bodyOf(n, locale)}</div>
                  <div className="notif-item-meta">{String(n.createdAt).replace("T", " ").slice(0, 16)}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
