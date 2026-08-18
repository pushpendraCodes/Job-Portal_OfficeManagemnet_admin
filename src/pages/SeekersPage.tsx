import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { SeekerRow } from "../lib/types";
import { emptyMeta, metaFromResponse, PAGE_SIZE, Pagination, type PageMeta } from "../components/Pagination";

function statusBadge(status: string) {
  if (status === "active") return "ok";
  if (status === "suspended") return "danger";
  if (status === "pending") return "warn";
  return "";
}

function statusLabel(status: string, t: (key: string) => string) {
  const key = `userStatus.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

export default function SeekersPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<SeekerRow[]>([]);
  const [meta, setMeta] = useState<PageMeta>(emptyMeta());
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (opts?: { page?: number; q?: string; status?: string }) => {
    setLoading(true);
    setError("");
    try {
      const nextPage = opts?.page ?? page;
      const search = opts?.q ?? q;
      const selectedStatus = opts?.status ?? status;
      const params: Record<string, string> = {
        page: String(nextPage),
        limit: String(PAGE_SIZE),
      };
      if (search.trim()) params.q = search.trim();
      if (selectedStatus) params.status = selectedStatus;
      const { data } = await api.get<ApiSuccess<SeekerRow[]>>("/admin/job-seekers", { params });
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
    void load({ page: 1, q: "", status: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setUserStatus = async (userId: string, nextStatus: string) => {
    const confirmMsg =
      nextStatus === "suspended" ? t("blockSeekerConfirm") : t("unblockSeekerConfirm");
    if (!window.confirm(confirmMsg)) return;
    setBusyId(userId);
    setError("");
    try {
      await api.patch(`/admin/job-seekers/${userId}/status`, { status: nextStatus });
      setItems((prev) =>
        prev.map((row) => (row._id === userId ? { ...row, status: nextStatus } : row)),
      );
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
          <p className="eyebrow">{t("seekers")}</p>
          <h2 className="display dash-title">{t("seekersTitle")}</h2>
          <p className="muted">{t("seekersSub")}</p>
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: 12 }}>
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder={t("searchSeekers")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load({ page: 1 });
            }}
          />
          <select
            className="select"
            style={{ maxWidth: 180 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{t("allStatuses")}</option>
            <option value="active">{t("userStatus.active")}</option>
            <option value="pending">{t("userStatus.pending")}</option>
            <option value="inactive">{t("userStatus.inactive")}</option>
            <option value="suspended">{t("userStatus.suspended")}</option>
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
              void load({ page: 1, q: "", status: "" });
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
                <th>{t("name")}</th>
                <th>{t("mobile")}</th>
                <th>{t("city")}</th>
                <th>{t("skills")}</th>
                <th>{t("applications")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7}>{t("noData")}</td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row._id}>
                    <td>{row.profile?.fullName || "—"}</td>
                    <td>{row.mobile || "—"}</td>
                    <td>{row.profile?.city || "—"}</td>
                    <td>{row.profile?.skills?.slice(0, 4).join(", ") || "—"}</td>
                    <td>{row.applicationsCount ?? 0}</td>
                    <td>
                      <span className={`badge ${statusBadge(row.status)}`}>
                        {statusLabel(row.status, t)}
                      </span>
                    </td>
                    <td>
                      <div className="row">
                        <Link to={`/app/seekers/${row._id}`} className="btn btn-ghost">
                          {t("view")}
                        </Link>
                        {row.status === "suspended" ? (
                          <button
                            type="button"
                            className="btn btn-ok"
                            disabled={busyId === row._id}
                            onClick={() => void setUserStatus(row._id, "active")}
                          >
                            {t("unblock")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-danger"
                            disabled={busyId === row._id}
                            onClick={() => void setUserStatus(row._id, "suspended")}
                          >
                            {t("block")}
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
