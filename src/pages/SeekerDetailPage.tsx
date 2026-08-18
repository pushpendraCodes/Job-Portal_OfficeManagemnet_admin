import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import { StatCard, formatINR } from "../components/charts";

type Tab = "overview" | "applications" | "experience" | "education";

interface SeekerProfile {
  _id?: string;
  fullName?: string;
  fullNameHi?: string;
  fatherName?: string;
  gender?: string;
  dateOfBirth?: string;
  maritalStatus?: string;
  email?: string;
  altMobile?: string;
  photoUrl?: string;
  headline?: string;
  summary?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  skills?: string[];
  languages?: string[];
  experienceYears?: number;
  experienceMonths?: number;
  education?: Array<{
    degree?: string;
    institute?: string;
    boardUniversity?: string;
    yearOfPassing?: number;
    marksPercentage?: number;
  }>;
  experience?: Array<{
    companyName?: string;
    designation?: string;
    city?: string;
    fromDate?: string;
    toDate?: string;
    currentlyWorking?: boolean;
    monthlySalary?: number;
    description?: string;
  }>;
  highestQualification?: string;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriodDays?: number;
  preferredCities?: string[];
  preferredEmploymentType?: string;
  willingToRelocate?: boolean;
  resumeUrl?: string;
  resumeName?: string;
  registrationCompleted?: boolean;
}

interface SeekerDetail {
  user: {
    _id: string;
    mobile?: string;
    email?: string;
    status: string;
    preferredLocale?: string;
    createdAt?: string;
    lastLoginAt?: string;
  };
  profile: SeekerProfile | null;
  applications: Array<{
    _id: string;
    status: string;
    coverNote?: string;
    resumeUrl?: string;
    createdAt: string;
    jobId?: {
      _id?: string;
      titleEn?: string;
      titleHi?: string;
      city?: string;
      status?: string;
      salaryMin?: number;
      salaryMax?: number;
      employerProfileId?: { companyName?: string; city?: string };
    };
  }>;
  counts: {
    applications: number;
    totalApplications: number;
    byStatus: Array<{ status: string; count: number }>;
  };
}

function fmtDate(value?: string) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

function statusBadge(status: string) {
  if (status === "active" || status === "hired" || status === "shortlisted") return "ok";
  if (status === "suspended" || status === "rejected") return "danger";
  if (status === "pending" || status === "applied" || status === "viewed") return "warn";
  return "";
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="detail-item">
      <div className="label">{label}</div>
      <div>{value}</div>
    </div>
  );
}

export default function SeekerDetailPage() {
  const { t } = useTranslation();
  const { userId } = useParams();
  const [data, setData] = useState<SeekerDetail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!userId) return;
    setError("");
    try {
      const { data: res } = await api.get<ApiSuccess<SeekerDetail>>(`/admin/job-seekers/${userId}`);
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const setStatus = async (status: string) => {
    if (!userId || !data) return;
    const confirmMsg =
      status === "suspended" ? t("blockSeekerConfirm") : t("unblockSeekerConfirm");
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await api.patch(`/admin/job-seekers/${userId}/status`, { status });
      setData({ ...data, user: { ...data.user, status } });
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">{t("loading")}</p>;

  const { user, profile, applications, counts } = data;
  const name = profile?.fullName || user.mobile || t("seekers");
  const address = [
    profile?.addressLine1,
    profile?.addressLine2,
    profile?.city,
    profile?.district,
    profile?.state,
    profile?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "overview", label: t("overview") },
    { id: "applications", label: t("applications"), count: counts.totalApplications },
    { id: "experience", label: t("workExperience"), count: profile?.experience?.length ?? 0 },
    { id: "education", label: t("education"), count: profile?.education?.length ?? 0 },
  ];

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              overflow: "hidden",
              background: "var(--mist)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {profile?.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontWeight: 700 }}>{name?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          <div>
            <p className="eyebrow">{t("seekerDetail")}</p>
            <h2 className="display dash-title">{name}</h2>
            <p className="muted">
              {[user.mobile ? `+91 ${user.mobile}` : null, profile?.city, profile?.headline]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="row" style={{ marginTop: 10 }}>
              <span className={`badge ${statusBadge(user.status)}`}>
                {t(`userStatus.${user.status}`, { defaultValue: user.status })}
              </span>
              {profile?.registrationCompleted === false && (
                <span className="badge warn">{t("userStatus.pending")}</span>
              )}
            </div>
          </div>
        </div>
        <div className="row">
          {user.status === "suspended" ? (
            <button
              type="button"
              className="btn btn-ok"
              disabled={busy}
              onClick={() => void setStatus("active")}
            >
              {t("unblock")}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={() => void setStatus("suspended")}
            >
              {t("block")}
            </button>
          )}
          {profile?.resumeUrl && (
            <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
              {t("resume")}
            </a>
          )}
          <Link to="/app/seekers" className="btn btn-ghost">
            {t("back")}
          </Link>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="grid-4">
        <StatCard label={t("applications")} value={counts.totalApplications} tone="accent" />
        <StatCard
          label={t("experience")}
          value={
            profile?.experienceYears != null
              ? `${profile.experienceYears}y${profile.experienceMonths ? ` ${profile.experienceMonths}m` : ""}`
              : "—"
          }
          tone="ok"
        />
        <StatCard
          label={t("skills")}
          value={profile?.skills?.length ?? 0}
        />
        <StatCard
          label={t("education")}
          value={profile?.education?.length ?? 0}
          tone="warn"
        />
      </div>

      <div className="tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab${tab === item.id ? " active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {typeof item.count === "number" ? ` (${item.count})` : ""}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid-2">
          <div className="panel">
            <h3 className="chart-card-title">{t("seekerDetails")}</h3>
            <div className="detail-grid" style={{ marginTop: 12 }}>
              <Detail label={t("name")} value={profile?.fullName} />
              <Detail label={t("mobile")} value={user.mobile} />
              <Detail label={t("contactEmail")} value={profile?.email || user.email} />
              <Detail label={t("fatherName")} value={profile?.fatherName} />
              <Detail label={t("gender")} value={profile?.gender} />
              <Detail label={t("dob")} value={fmtDate(profile?.dateOfBirth)} />
              <Detail label={t("maritalStatus")} value={profile?.maritalStatus} />
              <Detail label={t("qualification")} value={profile?.highestQualification} />
              <Detail
                label={t("currentSalary")}
                value={
                  profile?.currentSalary != null
                    ? formatINR(Number(profile.currentSalary))
                    : undefined
                }
              />
              <Detail
                label={t("expectedSalary")}
                value={
                  profile?.expectedSalary != null
                    ? formatINR(Number(profile.expectedSalary))
                    : undefined
                }
              />
              <Detail
                label={t("noticePeriod")}
                value={
                  profile?.noticePeriodDays != null
                    ? `${profile.noticePeriodDays} ${t("days")}`
                    : undefined
                }
              />
              <Detail
                label={t("relocate")}
                value={
                  profile?.willingToRelocate == null
                    ? undefined
                    : profile.willingToRelocate
                      ? t("yes") || "Yes"
                      : t("no") || "No"
                }
              />
              <Detail
                label={t("preferredCities")}
                value={profile?.preferredCities?.join(", ")}
              />
              <Detail label={t("createdAt")} value={fmtDate(user.createdAt)} />
            </div>
            {address && (
              <p className="muted" style={{ marginTop: 12 }}>
                <strong>{t("address")}:</strong> {address}
              </p>
            )}
            {profile?.summary && (
              <p className="muted" style={{ marginTop: 12 }}>
                {profile.summary}
              </p>
            )}
          </div>

          <div className="panel">
            <h3 className="chart-card-title">{t("skills")}</h3>
            <div className="row" style={{ marginTop: 12 }}>
              {(profile?.skills || []).length === 0 ? (
                <span className="muted">{t("noData")}</span>
              ) : (
                profile?.skills?.map((skill) => (
                  <span key={skill} className="badge">
                    {skill}
                  </span>
                ))
              )}
            </div>

            <h3 className="chart-card-title" style={{ marginTop: 20 }}>
              {t("languages")}
            </h3>
            <div className="row" style={{ marginTop: 12 }}>
              {(profile?.languages || []).length === 0 ? (
                <span className="muted">{t("noData")}</span>
              ) : (
                profile?.languages?.map((lang) => (
                  <span key={lang} className="badge">
                    {lang}
                  </span>
                ))
              )}
            </div>

            <h3 className="chart-card-title" style={{ marginTop: 20 }}>
              {t("applicationStatus")}
            </h3>
            <div className="detail-grid" style={{ marginTop: 12 }}>
              {counts.byStatus.length === 0 ? (
                <span className="muted">{t("noData")}</span>
              ) : (
                counts.byStatus.map((row) => (
                  <Detail
                    key={row.status}
                    label={t(`appStatus.${row.status}`, { defaultValue: row.status })}
                    value={row.count}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "applications" && (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>{t("jobTitle")}</th>
                <th>{t("companyName")}</th>
                <th>{t("city")}</th>
                <th>{t("status")}</th>
                <th>{t("appliedOn")}</th>
                <th>{t("resume")}</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("noData")}</td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app._id}>
                    <td>{app.jobId?.titleEn || "—"}</td>
                    <td>{app.jobId?.employerProfileId?.companyName || "—"}</td>
                    <td>{app.jobId?.city || "—"}</td>
                    <td>
                      <span className={`badge ${statusBadge(app.status)}`}>
                        {t(`appStatus.${app.status}`, { defaultValue: app.status })}
                      </span>
                    </td>
                    <td>{fmtDate(app.createdAt)}</td>
                    <td>
                      {app.resumeUrl || profile?.resumeUrl ? (
                        <a
                          href={app.resumeUrl || profile?.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost"
                        >
                          {t("view")}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "experience" && (
        <div className="panel">
          {(profile?.experience || []).length === 0 ? (
            <p className="muted">{t("noData")}</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {profile?.experience?.map((item, index) => (
                <li
                  key={`${item.companyName}-${index}`}
                  style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}
                >
                  <div style={{ fontWeight: 700 }}>{item.designation}</div>
                  <div className="muted">
                    {[item.companyName, item.city].filter(Boolean).join(" · ")}
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {fmtDate(item.fromDate)} –{" "}
                    {item.currentlyWorking ? t("present") : fmtDate(item.toDate)}
                    {item.monthlySalary != null
                      ? ` · ${formatINR(Number(item.monthlySalary))}`
                      : ""}
                  </div>
                  {item.description && <p style={{ marginTop: 6 }}>{item.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "education" && (
        <div className="panel">
          {(profile?.education || []).length === 0 ? (
            <p className="muted">{t("noData")}</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {profile?.education?.map((item, index) => (
                <li
                  key={`${item.degree}-${index}`}
                  style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}
                >
                  <div style={{ fontWeight: 700 }}>{item.degree}</div>
                  <div className="muted">
                    {[item.institute, item.boardUniversity].filter(Boolean).join(" · ")}
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {[
                      item.yearOfPassing ? String(item.yearOfPassing) : "",
                      item.marksPercentage != null ? `${item.marksPercentage}%` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
