import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { EmployerRow } from "../lib/types";
import { emptyMeta, metaFromResponse, PAGE_SIZE, Pagination, type PageMeta } from "../components/Pagination";

export default function EmployersPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<EmployerRow[]>([]);
  const [meta, setMeta] = useState<PageMeta>(emptyMeta());
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (opts?: { page?: number; q?: string }) => {
    setLoading(true);
    setError("");
    try {
      const nextPage = opts?.page ?? page;
      const search = opts?.q ?? q;
      const params: Record<string, string> = {
        page: String(nextPage),
        limit: String(PAGE_SIZE),
      };
      if (search.trim()) params.q = search.trim();
      const { data } = await api.get<ApiSuccess<EmployerRow[]>>("/admin/employers", { params });
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
    void load({ page: 1, q: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (userId: string, status: string) => {
    await api.patch(`/admin/employers/${userId}/status`, { status });
    await load();
  };

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("employers")}</p>
          <h2 className="display dash-title">{t("employersTitle")}</h2>
          <p className="muted">{t("employersSub")}</p>
        </div>
        <Link to="/app/employers/new" className="btn">
          + {t("addEmployer")}
        </Link>
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: 12 }}>
          <input
            className="input"
            style={{ maxWidth: 320 }}
            placeholder={t("searchEmployers")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load({ page: 1 });
            }}
          />
          <button type="button" className="btn" onClick={() => void load({ page: 1 })}>
            {t("search")}
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? <p className="muted">{t("loading")}</p> : null}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("companyName")}</th>
                <th>{t("ownerName")}</th>
                <th>{t("mobile")}</th>
                <th>{t("city")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("noData")}</td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row._id}>
                    <td>{row.profile?.companyName || "—"}</td>
                    <td>{row.profile?.ownerName || "—"}</td>
                    <td>{row.mobile || "—"}</td>
                    <td>{row.profile?.city || "—"}</td>
                    <td>
                      <span className={`badge ${row.status === "active" ? "ok" : "warn"}`}>{row.status}</span>
                    </td>
                    <td>
                      <div className="row">
                        <Link to={`/app/employers/${row._id}`} className="btn btn-ghost">
                          {t("view")}
                        </Link>
                        <Link to={`/app/employers/${row._id}/edit`} className="btn btn-ghost">
                          {t("edit")}
                        </Link>
                        {row.status !== "active" ? (
                          <button
                            type="button"
                            className="btn btn-ok"
                            onClick={() => void setStatus(row._id, "active")}
                          >
                            {t("activate")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => void setStatus(row._id, "suspended")}
                          >
                            {t("suspend")}
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
