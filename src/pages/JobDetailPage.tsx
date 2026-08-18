import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import { StatCard, formatINR } from "../components/charts";

type Tab = "overview" | "applicants" | "description";

interface JobDetailPayload {
  job: {
    _id: string;
    titleEn: string;
    titleHi?: string;
    descriptionEn?: string;
    descriptionHi?: string;
    city: string;
    state?: string;
    locationText?: string;
    employmentType?: string;
    experienceMin?: number;
    experienceMax?: number;
    salaryMin?: number;
    salaryMax?: number;
    salaryType?: string;
    vacancies?: number;
    skills?: string[];
    status: string;
    rejectionReason?: string;
    publishedAt?: string;
    approvedAt?: string;
    expiresAt?: string;
    createdAt?: string;
    updatedAt?: string;
    viewsCount?: number;
    applicationsCount?: number;
    employerId?: string;
    employerProfileId?: {
      companyName?: string;
      city?: string;
      ownerName?: string;
      contactMobile?: string;
      contactEmail?: string;
      _id?: string;
    };
    categoryId?: { nameEn?: string; nameHi?: string };
    subcategoryId?: { nameEn?: string; nameHi?: string };
  };
  applications: Array<{
    _id: string;
    status: string;
    coverNote?: string;
    resumeUrl?: string;
    createdAt: string;
    seekerId?: { _id?: string; mobile?: string; email?: string; status?: string };
    seekerProfileId?: {
      _id?: string;
      fullName?: string;
      city?: string;
      headline?: string;
      skills?: string[];
      experienceYears?: number;
      photoUrl?: string;
      resumeUrl?: string;
      email?: string;
      expectedSalary?: number;
    };
  }>;
  counts: {
    applications: number;
    totalApplications: number;
    views: number;
    byStatus: Array<{ status: string; count: number }>;
  };
}

function fmtDate(value?: string) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

function fmtDateTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
  return d.toLocaleString();
}

function jobStatusBadge(status: string) {
  if (status === "published") return "ok";
  if (status === "rejected" || status === "closed") return "danger";
  return "warn";
}

function appStatusBadge(status: string) {
  if (status === "hired" || status === "shortlisted") return "ok";
  if (status === "rejected") return "danger";
  return "warn";
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

function formatSalary(job: JobDetailPayload["job"]) {
  if (job.salaryMin == null && job.salaryMax == null) return undefined;
  const fmt = (n: number) => formatINR(n);
  if (job.salaryMin != null && job.salaryMax != null) {
    return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}${job.salaryType ? ` / ${job.salaryType}` : ""}`;
  }
  return `${fmt((job.salaryMin ?? job.salaryMax)!)}${job.salaryType ? ` / ${job.salaryType}` : ""}`;
}

export default function JobDetailPage() {
  const { t } = useTranslation();
  const { jobId } = useParams();
  const [data, setData] = useState<JobDetailPayload | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    if (!jobId) return;
    setError("");
    try {
      const { data: res } = await api.get<ApiSuccess<JobDetailPayload>>(`/admin/jobs/${jobId}`);
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const approve = async () => {
    if (!jobId) return;
    setBusy(true);
    try {
      await api.post(`/admin/jobs/${jobId}/approve`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!jobId) return;
    const reason = rejectReason.trim() || t("rejectReasonDefault");
    if (!reason.trim()) {
      setError(t("rejectReasonRequired"));
      return;
    }
    setBusy(true);
    try {
      await api.post(`/admin/jobs/${jobId}/reject`, { rejectionReason: reason });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!jobId) return;
    if (!window.confirm(t("closeJobConfirm"))) return;
    setBusy(true);
    try {
      await api.delete(`/admin/jobs/${jobId}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">{t("loading")}</p>;

  const { job, applications, counts } = data;
  const company = job.employerProfileId?.companyName || "—";

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "overview", label: t("overview") },
    { id: "description", label: t("description") },
    { id: "applicants", label: t("applicants"), count: counts.totalApplications },
  ];

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("jobDetail")}</p>
          <h2 className="display dash-title">{job.titleEn}</h2>
          {job.titleHi && <p className="muted">{job.titleHi}</p>}
          <p className="muted">
            {[company, job.city, job.state].filter(Boolean).join(" · ")}
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <span className={`badge ${jobStatusBadge(job.status)}`}>
              {t(`jobStatus.${job.status}`, { defaultValue: job.status })}
            </span>
            {job.categoryId?.nameEn && <span className="badge">{job.categoryId.nameEn}</span>}
            {job.employmentType && <span className="badge">{job.employmentType}</span>}
          </div>
        </div>
        <div className="row">
          {job.status === "pending_approval" && (
            <>
              <button type="button" className="btn btn-ok" disabled={busy} onClick={() => void approve()}>
                {t("approve")}
              </button>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void reject()}>
                {t("reject")}
              </button>
            </>
          )}
          {job.status !== "closed" && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void close()}>
              {t("closeJob")}
            </button>
          )}
          <Link to="/app/jobs" className="btn btn-ghost">
            {t("back")}
          </Link>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {job.status === "pending_approval" && (
        <div className="panel">
          <label className="label">{t("rejectReasonHint")}</label>
          <input
            className="input"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t("rejectReasonDefault")}
          />
        </div>
      )}

      <div className="grid-4">
        <StatCard label={t("applications")} value={counts.totalApplications} tone="accent" />
        <StatCard label={t("views")} value={counts.views} tone="ok" />
        <StatCard label={t("vacancies")} value={job.vacancies ?? 1} />
        <StatCard label={t("publishedAt")} value={fmtDate(job.publishedAt)} tone="warn" />
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
            <h3 className="chart-card-title">{t("jobDetails")}</h3>
            <div className="detail-grid" style={{ marginTop: 12 }}>
              <Detail label={t("jobTitle")} value={job.titleEn} />
              <Detail label={t("companyName")} value={company} />
              <Detail label={t("ownerName")} value={job.employerProfileId?.ownerName} />
              <Detail label={t("contactMobile")} value={job.employerProfileId?.contactMobile} />
              <Detail label={t("contactEmail")} value={job.employerProfileId?.contactEmail} />
              <Detail label={t("city")} value={[job.city, job.state].filter(Boolean).join(", ")} />
              <Detail label={t("location")} value={job.locationText} />
              <Detail label={t("category")} value={job.categoryId?.nameEn} />
              <Detail label={t("subcategory")} value={job.subcategoryId?.nameEn} />
              <Detail label={t("employmentType")} value={job.employmentType} />
              <Detail
                label={t("experience")}
                value={
                  job.experienceMin != null || job.experienceMax != null
                    ? `${job.experienceMin ?? 0} – ${job.experienceMax ?? "∞"} yrs`
                    : undefined
                }
              />
              <Detail label={t("salary")} value={formatSalary(job)} />
              <Detail label={t("vacancies")} value={job.vacancies} />
              <Detail label={t("createdAt")} value={fmtDateTime(job.createdAt)} />
              <Detail label={t("publishedAt")} value={fmtDateTime(job.publishedAt)} />
              <Detail label={t("approvedAt")} value={fmtDateTime(job.approvedAt)} />
              <Detail label={t("expiresAt")} value={fmtDate(job.expiresAt)} />
              <Detail label={t("updatedAt")} value={fmtDateTime(job.updatedAt)} />
              <Detail label={t("rejectReason")} value={job.rejectionReason} />
            </div>
          </div>

          <div className="panel">
            <h3 className="chart-card-title">{t("skills")}</h3>
            <div className="row" style={{ marginTop: 12 }}>
              {(job.skills || []).length === 0 ? (
                <span className="muted">{t("noData")}</span>
              ) : (
                job.skills?.map((skill) => (
                  <span key={skill} className="badge">
                    {skill}
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

            {job.employerId && (
              <div style={{ marginTop: 20 }}>
                <Link to={`/app/employers/${job.employerId}`} className="btn btn-ghost">
                  {t("viewCompany")}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "description" && (
        <div className="grid-2">
          <div className="panel">
            <h3 className="chart-card-title">{t("descriptionEn")}</h3>
            <p style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
              {job.descriptionEn || t("noData")}
            </p>
          </div>
          <div className="panel">
            <h3 className="chart-card-title">{t("descriptionHi")}</h3>
            <p style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
              {job.descriptionHi || t("noData")}
            </p>
          </div>
        </div>
      )}

      {tab === "applicants" && (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("mobile")}</th>
                <th>{t("city")}</th>
                <th>{t("experience")}</th>
                <th>{t("status")}</th>
                <th>{t("appliedOn")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={7}>{t("noData")}</td>
                </tr>
              ) : (
                applications.map((app) => {
                  const seeker = app.seekerProfileId;
                  const seekerUserId =
                    typeof app.seekerId === "object" && app.seekerId?._id
                      ? String(app.seekerId._id)
                      : undefined;
                  return (
                    <tr key={app._id}>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          {seeker?.photoUrl ? (
                            <img
                              src={seeker.photoUrl}
                              alt=""
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                objectFit: "cover",
                              }}
                            />
                          ) : null}
                          <div>
                            <div>{seeker?.fullName || "—"}</div>
                            {seeker?.headline && (
                              <div className="muted" style={{ fontSize: "0.8rem" }}>
                                {seeker.headline}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{app.seekerId?.mobile || "—"}</td>
                      <td>{seeker?.city || "—"}</td>
                      <td>
                        {seeker?.experienceYears != null ? `${seeker.experienceYears} yrs` : "—"}
                      </td>
                      <td>
                        <span className={`badge ${appStatusBadge(app.status)}`}>
                          {t(`appStatus.${app.status}`, { defaultValue: app.status })}
                        </span>
                      </td>
                      <td>{fmtDateTime(app.createdAt)}</td>
                      <td>
                        <div className="row">
                          {seekerUserId && (
                            <Link to={`/app/seekers/${seekerUserId}`} className="btn btn-ghost">
                              {t("view")}
                            </Link>
                          )}
                          {(app.resumeUrl || seeker?.resumeUrl) && (
                            <a
                              href={app.resumeUrl || seeker?.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost"
                            >
                              {t("resume")}
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
