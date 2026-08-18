import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { EmployeeRow, EmployerRow } from "../lib/types";
import { emptyMeta, metaFromResponse, PAGE_SIZE, Pagination, type PageMeta } from "../components/Pagination";

export default function OfficeEmployeesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<EmployeeRow[]>([]);
  const [meta, setMeta] = useState<PageMeta>(emptyMeta());
  const [page, setPage] = useState(1);
  const [employers, setEmployers] = useState<EmployerRow[]>([]);
  const [employerId, setEmployerId] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadEmployers = async () => {
    const { data } = await api.get<ApiSuccess<EmployerRow[]>>("/admin/employers", {
      params: { limit: 200 },
    });
    setEmployers(data.data);
  };

  const load = async (opts?: { page?: number; employerId?: string; q?: string }) => {
    setLoading(true);
    setError("");
    try {
      const nextPage = opts?.page ?? page;
      const selectedEmployer = opts?.employerId ?? employerId;
      const search = opts?.q ?? q;
      const params: Record<string, string> = {
        page: String(nextPage),
        limit: String(PAGE_SIZE),
      };
      if (selectedEmployer) params.employerId = selectedEmployer;
      if (search.trim()) params.q = search.trim();
      const { data } = await api.get<ApiSuccess<EmployeeRow[]>>("/admin/employees", { params });
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
    void Promise.all([loadEmployers(), load({ page: 1, employerId: "", q: "" })]).catch((err) =>
      setError(getErrorMessage(err, t("error"))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("employees")}</p>
          <h2 className="display dash-title">{t("employeesTitle")}</h2>
          <p className="muted">{t("employeesSub")}</p>
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: 12 }}>
          <select
            className="select"
            style={{ maxWidth: 280 }}
            value={employerId}
            onChange={(e) => setEmployerId(e.target.value)}
          >
            <option value="">{t("allCompanies")}</option>
            {employers.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.profile?.companyName || emp.mobile || emp._id}
              </option>
            ))}
          </select>
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder={t("searchEmployees")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load({ page: 1 });
            }}
          />
          <button type="button" className="btn" onClick={() => void load({ page: 1 })}>
            {t("search")}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setEmployerId("");
              setQ("");
              void load({ page: 1, employerId: "", q: "" });
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
                <th>{t("companyName")}</th>
                <th>{t("designation")}</th>
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
                    <td>{row.fullName}</td>
                    <td>{row.mobile}</td>
                    <td>{row.employerProfileId?.companyName || "—"}</td>
                    <td>{row.designation || "—"}</td>
                    <td>
                      <span className={`badge ${row.status === "active" ? "ok" : "warn"}`}>{row.status}</span>
                    </td>
                    <td>
                      <Link to={`/app/employees/${row._id}`} className="btn btn-ghost">
                        {t("view")}
                      </Link>
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
