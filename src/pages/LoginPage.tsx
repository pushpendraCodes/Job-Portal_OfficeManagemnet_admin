import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { AdminUser } from "../lib/types";
import { useAppDispatch } from "../store/hooks";
import { setCredentials } from "../store/authSlice";

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
      <div className="auth-card">
        <div className="display" style={{ fontSize: "1.8rem" }}>
          {t("login")}
        </div>
        <p className="muted" style={{ marginTop: 6 }}>Default: admin@textilejobs.local / Admin@1234</p>
        <div className="field" style={{ marginTop: 16 }}>
          <label className="label">{t("email")}</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("password")}</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button
          type="button"
          className="btn"
          style={{ width: "100%" }}
          disabled={loading}
          onClick={() => void submit()}
        >
          {loading ? t("loading") : t("login")}
        </button>
      </div>
    </div>
  );
}
