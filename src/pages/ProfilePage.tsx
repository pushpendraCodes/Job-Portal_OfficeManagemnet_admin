import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import { useAppSelector } from "../store/hooks";

type ProfileUser = {
  _id?: string;
  id?: string;
  email?: string;
  mobile?: string;
  accountType?: string;
  status?: string;
  preferredLocale?: string;
  lastLoginAt?: string;
  createdAt?: string;
  isMpinSet?: boolean;
};

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="detail-item">
      <div className="label">{label}</div>
      <div>{value || "—"}</div>
    </div>
  );
}

function fmtDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value).slice(0, 19);
  }
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const authUser = useAppSelector((s) => s.auth.user);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void api
      .get<ApiSuccess<{ user: ProfileUser; profile: unknown }>>("/profile/me")
      .then(({ data: res }) => {
        if (!alive) return;
        setUser(res.data.user);
      })
      .catch((err) => {
        if (!alive) return;
        setError(getErrorMessage(err, t("error")));
        setUser(authUser as ProfileUser | null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [authUser, t]);

  if (loading) return <p className="muted">{t("loading")}</p>;
  if (error && !user) return <p className="error">{error}</p>;

  const display = user || authUser;

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("profile")}</p>
          <h2 className="display dash-title">{t("myProfile")}</h2>
          <p className="muted">{t("profileSub")}</p>
        </div>
        <span className={`badge ${display?.status === "active" ? "ok" : "warn"}`}>
          {display?.status || "—"}
        </span>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="panel">
        <h3 className="chart-card-title">{t("accountDetails")}</h3>
        <div className="detail-grid" style={{ marginTop: 12 }}>
          <Detail label={t("email")} value={display?.email} />
          <Detail label={t("mobile")} value={display?.mobile} />
          <Detail label={t("accountType")} value={t("adminRole")} />
          <Detail label={t("status")} value={display?.status} />
          <Detail
            label={t("language")}
            value={
              display?.preferredLocale === "hi"
                ? "हिन्दी"
                : display?.preferredLocale === "en"
                  ? "English"
                  : display?.preferredLocale
            }
          />
          <Detail label={t("lastLogin")} value={fmtDate(display?.lastLoginAt)} />
          <Detail label={t("createdAt")} value={fmtDate(display?.createdAt)} />
          <Detail label="ID" value={display?._id || display?.id || authUser?.id} />
        </div>
      </div>
    </div>
  );
}
