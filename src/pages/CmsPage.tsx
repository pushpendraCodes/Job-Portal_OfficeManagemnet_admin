import { useEffect, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import { uploadFile } from "../lib/upload";

type Banner = {
  _id: string;
  titleEn: string;
  titleHi: string;
  imageUrl: string;
  linkUrl?: string;
  placement: string;
  isActive: boolean;
};

type HeroForm = {
  titleEn: string;
  titleHi: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
};

type ToggleDef = {
  key: string;
  group: "platform" | "admin" | "employer" | "seeker" | "employee" | "channels";
  labelKey: string;
  hintKey: string;
  defaultValue: boolean;
};

const TOGGLE_DEFS: ToggleDef[] = [
  {
    key: "job_approval_required",
    group: "platform",
    labelKey: "setJobApproval",
    hintKey: "setJobApprovalHint",
    defaultValue: true,
  },
  {
    key: "launch_free_posting",
    group: "platform",
    labelKey: "setFreePosting",
    hintKey: "setFreePostingHint",
    defaultValue: true,
  },
  {
    key: "registration_open",
    group: "platform",
    labelKey: "setRegistrationOpen",
    hintKey: "setRegistrationOpenHint",
    defaultValue: true,
  },
  {
    key: "notify_admin_job_pending",
    group: "admin",
    labelKey: "setNotifyAdminJobPending",
    hintKey: "setNotifyAdminJobPendingHint",
    defaultValue: true,
  },
  {
    key: "notify_admin_incomplete_lead",
    group: "admin",
    labelKey: "setNotifyAdminIncompleteLead",
    hintKey: "setNotifyAdminIncompleteLeadHint",
    defaultValue: true,
  },
  {
    key: "notify_admin_lead_abandoned",
    group: "admin",
    labelKey: "setNotifyAdminLeadAbandoned",
    hintKey: "setNotifyAdminLeadAbandonedHint",
    defaultValue: true,
  },
  {
    key: "notify_employer_job_approved",
    group: "employer",
    labelKey: "setNotifyJobApproved",
    hintKey: "setNotifyJobApprovedHint",
    defaultValue: true,
  },
  {
    key: "notify_employer_job_rejected",
    group: "employer",
    labelKey: "setNotifyJobRejected",
    hintKey: "setNotifyJobRejectedHint",
    defaultValue: true,
  },
  {
    key: "notify_employer_new_application",
    group: "employer",
    labelKey: "setNotifyNewApplication",
    hintKey: "setNotifyNewApplicationHint",
    defaultValue: true,
  },
  {
    key: "notify_seeker_application_updates",
    group: "seeker",
    labelKey: "setNotifySeekerApplication",
    hintKey: "setNotifySeekerApplicationHint",
    defaultValue: true,
  },
  {
    key: "notify_seeker_new_job_alerts",
    group: "seeker",
    labelKey: "setNotifySeekerJobAlerts",
    hintKey: "setNotifySeekerJobAlertsHint",
    defaultValue: true,
  },
  {
    key: "notify_employee_task_assigned",
    group: "employee",
    labelKey: "setNotifyTaskAssigned",
    hintKey: "setNotifyTaskAssignedHint",
    defaultValue: true,
  },
  {
    key: "notify_employee_added",
    group: "employee",
    labelKey: "setNotifyEmployeeAdded",
    hintKey: "setNotifyEmployeeAddedHint",
    defaultValue: true,
  },
  {
    key: "notify_employee_salary_update",
    group: "employee",
    labelKey: "setNotifySalaryUpdate",
    hintKey: "setNotifySalaryUpdateHint",
    defaultValue: true,
  },
  {
    key: "notify_channel_in_app",
    group: "channels",
    labelKey: "setChannelInApp",
    hintKey: "setChannelInAppHint",
    defaultValue: true,
  },
  {
    key: "notify_channel_push",
    group: "channels",
    labelKey: "setChannelPush",
    hintKey: "setChannelPushHint",
    defaultValue: true,
  },
  {
    key: "notify_channel_email",
    group: "channels",
    labelKey: "setChannelEmail",
    hintKey: "setChannelEmailHint",
    defaultValue: true,
  },
];

const GROUP_ORDER: Array<ToggleDef["group"]> = [
  "platform",
  "admin",
  "employer",
  "seeker",
  "employee",
  "channels",
];

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`switch${checked ? " on" : ""}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  );
}

export default function CmsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"pages" | "banners" | "settings">("banners");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingKey, setSavingKey] = useState("");

  const [page, setPage] = useState({
    slug: "about",
    titleEn: "",
    titleHi: "",
    bodyEn: "",
    bodyHi: "",
  });

  const [hero, setHero] = useState<HeroForm>({
    titleEn: "Home hero",
    titleHi: "होम हीरो",
    imageUrl: "",
    linkUrl: "",
    isActive: true,
  });
  const [banners, setBanners] = useState<Banner[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, unknown>>({});

  const loadBanners = async () => {
    const { data } = await api.get<ApiSuccess<Banner[]>>("/cms/banners/manage");
    setBanners(data.data);
    const homeHero = data.data.find((b) => b.placement === "home_hero");
    if (homeHero) {
      setHero({
        titleEn: homeHero.titleEn,
        titleHi: homeHero.titleHi,
        imageUrl: homeHero.imageUrl,
        linkUrl: homeHero.linkUrl ?? "",
        isActive: homeHero.isActive,
      });
    }
  };

  const loadSettings = async () => {
    const { data } = await api.get<ApiSuccess<Record<string, unknown>>>("/cms/settings");
    setSettingsMap(data.data ?? {});
  };

  useEffect(() => {
    void loadSettings().catch(() => undefined);
    void loadBanners().catch(() => undefined);
    void api
      .get<ApiSuccess<{ slug: string; titleEn: string; titleHi: string; bodyEn: string; bodyHi: string }>>(
        "/cms/pages/about",
      )
      .then(({ data }) => {
        setPage({
          slug: data.data.slug,
          titleEn: data.data.titleEn,
          titleHi: data.data.titleHi,
          bodyEn: data.data.bodyEn,
          bodyHi: data.data.bodyHi,
        });
      })
      .catch(() => undefined);
  }, []);

  const savePage = async () => {
    setError("");
    setMsg("");
    setSaving(true);
    try {
      await api.post("/cms/pages", { ...page, isPublished: true });
      setMsg(t("cmsPageSaved"));
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setSaving(false);
    }
  };

  const onHeroUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadFile(file, "banners");
      setHero((prev) => ({ ...prev, imageUrl: url }));
      setMsg(t("cmsImageUploaded"));
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setUploading(false);
    }
  };

  const saveHero = async () => {
    setError("");
    setMsg("");
    if (!hero.imageUrl) {
      setError(t("cmsBannerImageRequired"));
      return;
    }
    setSaving(true);
    try {
      await api.put("/cms/banners/hero", {
        titleEn: hero.titleEn || "Home hero",
        titleHi: hero.titleHi || "होम हीरो",
        imageUrl: hero.imageUrl,
        linkUrl: hero.linkUrl || "",
        isActive: hero.isActive,
        placement: "home_hero",
      });
      setMsg(t("cmsHeroSaved"));
      await loadBanners();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setSaving(false);
    }
  };

  const toggleBannerActive = async (banner: Banner) => {
    setError("");
    try {
      await api.patch(`/cms/banners/${banner._id}`, { isActive: !banner.isActive });
      await loadBanners();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    }
  };

  const deleteBanner = async (id: string) => {
    if (!window.confirm(t("cmsDeleteBannerConfirm"))) return;
    setError("");
    try {
      await api.delete(`/cms/banners/${id}`);
      setMsg(t("cmsBannerDeleted"));
      await loadBanners();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    }
  };

  const settingValue = (key: string, fallback: boolean) => {
    if (!(key in settingsMap)) return fallback;
    return Boolean(settingsMap[key]);
  };

  const setToggle = async (def: ToggleDef, next: boolean) => {
    setError("");
    setMsg("");
    setSavingKey(def.key);
    const prev = settingsMap[def.key];
    setSettingsMap((m) => ({ ...m, [def.key]: next }));
    try {
      await api.put(`/cms/settings/${def.key}`, {
        value: next,
        group:
          def.key === "job_approval_required"
            ? "jobs"
            : def.key === "launch_free_posting"
              ? "subscriptions"
              : def.group === "platform"
                ? "general"
                : "notifications",
      });
      setMsg(t("cmsSettingSaved"));
    } catch (err) {
      setSettingsMap((m) => ({ ...m, [def.key]: prev }));
      setError(getErrorMessage(err, t("error")));
    } finally {
      setSavingKey("");
    }
  };

  return (
    <div>
      <div className="dash-hero panel" style={{ marginBottom: 16 }}>
        <div>
          <p className="eyebrow">{t("cmsEyebrow")}</p>
          <h2 className="display" style={{ margin: "0.25rem 0 0" }}>
            {t("cms")}
          </h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            {t("cmsSub")}
          </p>
        </div>
      </div>

      <div className="tabs">
        <button type="button" className={`tab${tab === "banners" ? " active" : ""}`} onClick={() => setTab("banners")}>
          {t("banners")}
        </button>
        <button type="button" className={`tab${tab === "settings" ? " active" : ""}`} onClick={() => setTab("settings")}>
          {t("settings")}
        </button>
        <button type="button" className={`tab${tab === "pages" ? " active" : ""}`} onClick={() => setTab("pages")}>
          {t("pages")}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {msg && <p className="muted">{msg}</p>}

      {tab === "banners" && (
        <div className="cms-stack">
          <div className="panel">
            <h3 className="display" style={{ marginTop: 0, fontSize: "1.15rem" }}>
              {t("cmsHeroTitle")}
            </h3>
            <p className="muted" style={{ marginTop: 0 }}>
              {t("cmsHeroHint")}
            </p>

            <div className="hero-preview">
              {hero.imageUrl ? (
                <img src={hero.imageUrl} alt="" />
              ) : (
                <div className="hero-preview-empty">{t("cmsNoBannerImage")}</div>
              )}
            </div>

            <div className="field">
              <label className="label">{t("cmsUploadBanner")}</label>
              <div className="row">
                <input type="file" accept="image/*" onChange={(e) => void onHeroUpload(e)} disabled={uploading} />
                {hero.imageUrl && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setHero((h) => ({ ...h, imageUrl: "" }))}
                  >
                    {t("removeImage")}
                  </button>
                )}
              </div>
              {uploading && <p className="muted">{t("uploading")}</p>}
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label">{t("titleEn")}</label>
                <input
                  className="input"
                  value={hero.titleEn}
                  onChange={(e) => setHero({ ...hero, titleEn: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">{t("titleHi")}</label>
                <input
                  className="input"
                  value={hero.titleHi}
                  onChange={(e) => setHero({ ...hero, titleHi: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label className="label">{t("cmsLinkUrl")}</label>
              <input
                className="input"
                placeholder="https://…"
                value={hero.linkUrl}
                onChange={(e) => setHero({ ...hero, linkUrl: e.target.value })}
              />
            </div>

            <div className="setting-row" style={{ marginBottom: 16 }}>
              <div>
                <p className="setting-label">{t("cmsBannerActive")}</p>
                <p className="setting-hint">{t("cmsBannerActiveHint")}</p>
              </div>
              <Toggle checked={hero.isActive} onChange={(next) => setHero({ ...hero, isActive: next })} />
            </div>

            <button type="button" className="btn" disabled={saving || uploading} onClick={() => void saveHero()}>
              {saving ? t("loading") : t("cmsSaveHero")}
            </button>
          </div>

          <div className="panel">
            <h3 className="display" style={{ marginTop: 0, fontSize: "1.15rem" }}>
              {t("cmsAllBanners")}
            </h3>
            {banners.length === 0 ? (
              <p className="muted">{t("noData")}</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("preview")}</th>
                      <th>{t("titleEn")}</th>
                      <th>{t("cmsPlacement")}</th>
                      <th>{t("status")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {banners.map((banner) => (
                      <tr key={banner._id}>
                        <td>
                          <img
                            src={banner.imageUrl}
                            alt=""
                            style={{ width: 72, height: 40, objectFit: "cover", borderRadius: 8 }}
                          />
                        </td>
                        <td>{banner.titleEn}</td>
                        <td>
                          <span className="badge">{banner.placement}</span>
                        </td>
                        <td>
                          <span className={`badge ${banner.isActive ? "ok" : "warn"}`}>
                            {banner.isActive ? t("userStatus.active") : t("userStatus.inactive")}
                          </span>
                        </td>
                        <td>
                          <div className="row">
                            <button type="button" className="btn btn-ghost" onClick={() => void toggleBannerActive(banner)}>
                              {banner.isActive ? t("deactivate") : t("activate")}
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => void deleteBanner(banner._id)}>
                              {t("delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="cms-stack">
          {GROUP_ORDER.map((group) => {
            const items = TOGGLE_DEFS.filter((d) => d.group === group);
            return (
              <div key={group} className="panel">
                <h3 className="display" style={{ marginTop: 0, fontSize: "1.15rem" }}>
                  {t(`cmsGroup_${group}`)}
                </h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  {t(`cmsGroupHint_${group}`)}
                </p>
                <div className="settings-list">
                  {items.map((def) => {
                    const checked = settingValue(def.key, def.defaultValue);
                    return (
                      <div key={def.key} className="setting-row">
                        <div>
                          <p className="setting-label">{t(def.labelKey)}</p>
                          <p className="setting-hint">{t(def.hintKey)}</p>
                        </div>
                        <Toggle
                          checked={checked}
                          disabled={savingKey === def.key}
                          onChange={(next) => void setToggle(def, next)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "pages" && (
        <div className="panel">
          <div className="field">
            <label className="label">{t("slug")}</label>
            <input className="input" value={page.slug} onChange={(e) => setPage({ ...page, slug: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label">{t("titleEn")}</label>
              <input className="input" value={page.titleEn} onChange={(e) => setPage({ ...page, titleEn: e.target.value })} />
            </div>
            <div className="field">
              <label className="label">{t("titleHi")}</label>
              <input className="input" value={page.titleHi} onChange={(e) => setPage({ ...page, titleHi: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label className="label">{t("bodyEn")}</label>
            <textarea className="textarea" rows={5} value={page.bodyEn} onChange={(e) => setPage({ ...page, bodyEn: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">{t("bodyHi")}</label>
            <textarea className="textarea" rows={5} value={page.bodyHi} onChange={(e) => setPage({ ...page, bodyHi: e.target.value })} />
          </div>
          <button type="button" className="btn" disabled={saving} onClick={() => void savePage()}>
            {saving ? t("loading") : t("save")}
          </button>
        </div>
      )}
    </div>
  );
}
