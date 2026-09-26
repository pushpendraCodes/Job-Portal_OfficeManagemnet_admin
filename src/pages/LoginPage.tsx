import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { AdminUser } from "../lib/types";
import { useAppDispatch } from "../store/hooks";
import { setCredentials } from "../store/authSlice";
import { ThemeToggle } from "../components/ThemeToggle";

export default function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@textilejobs.local");
  const [password, setPassword] = useState("Admin@1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post<
        ApiSuccess<{ user: AdminUser; accessToken: string; refreshToken: string }>
      >("/auth/admin/login", { email, password });
      dispatch(
        setCredentials({
          user: data.data.user,
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        }),
      );
      navigate("/app");
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <ThemeToggle className="auth-theme" />
      <div className="auth-card">
        <div className="sidebar-brand">
          <div className="brand-mark">L</div>
          <div>
            <div className="brand-title">{t("brand")}</div>
            <div className="brand-sub">{t("sidebarAdmin")}</div>
          </div>
        </div>
        <h1 className="auth-title">{t("login")}</h1>
        <p className="muted auth-hint">{t("loginHint")}</p>
        <div className="field">
          <label className="label" htmlFor="admin-email">
            {t("email")}
          </label>
          <input
            id="admin-email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="admin-password">
            {t("password")}
          </label>
          <input
            id="admin-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button
          type="button"
          className="btn btn-block"
          disabled={loading}
          onClick={() => void submit()}
        >
          {loading ? t("loading") : t("login")}
        </button>
      </div>
    </div>
  );
}
