import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { JobRow } from "../lib/types";
import { emptyMeta, metaFromResponse, PAGE_SIZE, Pagination, type PageMeta } from "../components/Pagination";

function jobStatusBadge(status: string) {
  if (status === "published") return "ok";
  if (status === "rejected" || status === "closed") return "danger";
  if (status === "pending_approval" || status === "draft") return "warn";
  return "";
}

function fmtDate(value?: string) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

export default function JobsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<JobRow[]>([]);
  const [meta, setMeta] = useState<PageMeta>(emptyMeta());
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (opts?: { page?: number; status?: string; q?: string }) => {
    setLoading(true);
    setError("");
    try {
      const nextPage = opts?.page ?? page;
      const selectedStatus = opts?.status ?? status;
      const search = opts?.q ?? q;
      const params: Record<string, string> = {
        page: String(nextPage),
        limit: String(PAGE_SIZE),
        sortBy: "createdAt",
        sortOrder: "desc",
      };
      if (selectedStatus) params.status = selectedStatus;
      if (search.trim()) params.q = search.trim();
      const { data } = await api.get<ApiSuccess<JobRow[]>>("/admin/jobs", { params });
      setItems(data.data);
      setMeta(metaFromResponse(data.meta, data.data.length, nextPage));
      setPage(nextPage);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load({ page: 1, status: "", q: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/admin/jobs/${id}/approve`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt(t("rejectReasonPrompt"), t("rejectReasonDefault"));
    if (reason === null) return;
    if (!reason.trim()) {
      setError(t("rejectReasonRequired"));
      return;
    }
    setBusyId(id);
    try {
      await api.post(`/admin/jobs/${id}/reject`, { rejectionReason: reason.trim() });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setBusyId(null);
    }
  };

  const close = async (id: string) => {
    if (!window.confirm(t("closeJobConfirm"))) return;
    setBusyId(id);
    try {
      await api.delete(`/admin/jobs/${id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("jobs")}</p>
          <h2 className="display dash-title">{t("jobsTitle")}</h2>
          <p className="muted">{t("jobsSub")}</p>
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: 12 }}>
          <input
            className="input"
            style={{ maxWidth: 260 }}
            placeholder={t("searchJobs")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load({ page: 1 });
            }}
          />
          <select
            className="select"
            style={{ maxWidth: 200 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{t("allStatuses")}</option>
            <option value="pending_approval">{t("jobStatus.pending_approval")}</option>
            <option value="published">{t("jobStatus.published")}</option>
            <option value="draft">{t("jobStatus.draft")}</option>
            <option value="rejected">{t("jobStatus.rejected")}</option>
            <option value="closed">{t("jobStatus.closed")}</option>
          </select>
          <button type="button" className="btn" onClick={() => void load({ page: 1 })}>
            {t("search")}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setQ("");
              setStatus("");
              void load({ page: 1, status: "", q: "" });
            }}
          >
            {t("clearFilters")}
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? <p className="muted">{t("loading")}</p> : null}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("jobTitle")}</th>
                <th>{t("companyName")}</th>
                <th>{t("city")}</th>
                <th>{t("applications")}</th>
                <th>{t("publishedAt")}</th>
                <th>{t("createdAt")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={8}>{t("noData")}</td>
                </tr>
              ) : (
                items.map((job) => (
                  <tr key={job._id}>
                    <td>{job.titleEn}</td>
                    <td>{job.employerProfileId?.companyName || "—"}</td>
                    <td>{job.city}</td>
                    <td>{job.applicationsCount ?? 0}</td>
                    <td>{fmtDate(job.publishedAt)}</td>
                    <td>{fmtDate(job.createdAt)}</td>
                    <td>
                      <span className={`badge ${jobStatusBadge(job.status)}`}>
                        {t(`jobStatus.${job.status}`, { defaultValue: job.status })}
                      </span>
                    </td>
                    <td>
                      <div className="row">
                        <Link to={`/app/jobs/${job._id}`} className="btn btn-ghost">
                          {t("view")}
                        </Link>
                        {job.status === "pending_approval" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-ok"
                              disabled={busyId === job._id}
                              onClick={() => void approve(job._id)}
                            >
                              {t("approve")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={busyId === job._id}
                              onClick={() => void reject(job._id)}
                            >
                              {t("reject")}
                            </button>
                          </>
                        )}
                        {job.status !== "closed" && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={busyId === job._id}
                            onClick={() => void close(job._id)}
                          >
                            {t("closeJob")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} loading={loading} onPageChange={(p) => void load({ page: p })} />
      </div>
    </div>
  );
}
