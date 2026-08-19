import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout, setLocale } from "../store/authSlice";
import { api } from "../lib/api";
import i18n from "../i18n";
import { NotificationCenter } from "./NotificationCenter";
import { PushRegistrar } from "./PushRegistrar";

type NavItem = { to: string; end?: boolean; key: string; icon: string };

type NavGroup = { labelKey: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    labelKey: "navGroupOverview",
    items: [
      { to: "/app", end: true, key: "dashboard", icon: "dashboard" },
      { to: "/app/profile", key: "profile", icon: "user" },
    ],
  },
  {
    labelKey: "navGroupPeople",
    items: [
      { to: "/app/employers", key: "employers", icon: "building" },
      { to: "/app/employees", key: "employees", icon: "users" },
      { to: "/app/seekers", key: "seekers", icon: "user" },
    ],
  },
  {
    labelKey: "navGroupHiring",
    items: [
      { to: "/app/jobs", key: "jobs", icon: "briefcase" },
      { to: "/app/leads", key: "leads", icon: "leads" },
      { to: "/app/categories", key: "categories", icon: "grid" },
    ],
  },
  {
    labelKey: "navGroupOps",
    items: [
      { to: "/app/expenditure", key: "expenditure", icon: "wallet" },
      { to: "/app/cms", key: "cms", icon: "settings" },
    ],
  },
];

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <path d="M4 20V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" />
          <path d="M16 10h2a2 2 0 0 1 2 2v8" />
          <path d="M9 20v-4h2v4" />
          <path d="M8 8h.01M12 8h.01M8 12h.01M12 12h.01" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a3 3 0 0 1 0 5.74" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="3" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 12h18" />
        </svg>
      );
    case "leads":
      return (
        <svg {...common}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2H3V7z" />
          <path d="M3 9v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5h-5a2 2 0 0 0 0 4h5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    default:
      return null;
  }
}

export function AppLayout() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const onLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    dispatch(logout());
    navigate("/login");
  };

  const switchLang = (lng: "en" | "hi") => {
    dispatch(setLocale(lng));
    void i18n.changeLanguage(lng);
  };

  const sidebar = (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">LH</div>
        <div>
          <div className="brand-title">{t("brand")}</div>
          <div className="brand-sub">{t("sidebarAdmin")}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div key={group.labelKey} className="nav-group">
            <div className="nav-group-label">{t(group.labelKey)}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">
                  <NavIcon name={item.icon} />
                </span>
                <span>{t(item.key)}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/app/profile"
          className={({ isActive }) => `sidebar-user nav-link${isActive ? " active" : ""}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="sidebar-avatar">{(user?.email || "A").slice(0, 1).toUpperCase()}</div>
          <div className="sidebar-user-meta">
            <div className="sidebar-user-name">{t("adminRole")}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
        </NavLink>
        <button type="button" className="nav-link logout-link" onClick={() => void onLogout()}>
          <span className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span>{t("logout")}</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className={`shell${open ? " sidebar-open" : ""}`}>
      <PushRegistrar />
      {open && <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}
      {sidebar}
      <div className="content">
        <div className="topbar">
          <div className="topbar-left">
            <button type="button" className="menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <div className="display topbar-title">{t("brand")}</div>
              <div className="muted topbar-sub">{t("sidebarAdmin")}</div>
            </div>
          </div>
          <div className="row">
            <NotificationCenter />
            <div className="lang-switch">
              <button
                type="button"
                className={`lang-btn${i18n.language === "en" ? " active" : ""}`}
                onClick={() => switchLang("en")}
              >
                EN
              </button>
              <button
                type="button"
                className={`lang-btn${i18n.language?.startsWith("hi") ? " active" : ""}`}
                onClick={() => switchLang("hi")}
              >
                हिं
              </button>
            </div>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
