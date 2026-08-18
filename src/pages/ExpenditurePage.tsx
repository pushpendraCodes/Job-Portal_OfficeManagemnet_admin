import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { EmployeeRow, EmployerRow, ExpenditureRow } from "../lib/types";
import {
  CategoryBarChart,
  ChartCard,
  StatCard,
  TypePieChart,
  formatINR,
} from "../components/charts";
import { emptyMeta, metaFromResponse, PAGE_SIZE, Pagination, type PageMeta } from "../components/Pagination";

type Scope = "employer" | "employee";

interface ExpenditureSummary {
  credit: number;
  debit: number;
  balance: number;
  count: number;
  byCategory: Array<{ category: string; type: string; total: number; count: number }>;
}

interface ExpenditureResponse {
  items: ExpenditureRow[];
  summary: ExpenditureSummary;
}

export default function ExpenditurePage() {
  const { t } = useTranslation();
  const [scope, setScope] = useState<Scope>("employer");
  const [items, setItems] = useState<ExpenditureRow[]>([]);
  const [meta, setMeta] = useState<PageMeta>(emptyMeta());
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<ExpenditureSummary | null>(null);
  const [employers, setEmployers] = useState<EmployerRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [employerId, setEmployerId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadEmployers = async () => {
    const { data } = await api.get<ApiSuccess<EmployerRow[]>>("/admin/employers", {
      params: { limit: 200 },
    });
    setEmployers(data.data);
  };

  const loadEmployees = async (selectedEmployer = employerId) => {
    const params: Record<string, string> = { limit: "200" };
    if (selectedEmployer) params.employerId = selectedEmployer;
    const { data } = await api.get<ApiSuccess<EmployeeRow[]>>("/admin/employees", { params });
    setEmployees(data.data);
  };

  const load = async (opts?: {
    page?: number;
    scope?: Scope;
    employerId?: string;
    employeeId?: string;
  }) => {
    setLoading(true);
    setError("");
    try {
      const nextPage = opts?.page ?? page;
      const nextScope = opts?.scope ?? scope;
      const selectedEmployer = opts?.employerId ?? employerId;
      const selectedEmployee = opts?.employeeId ?? employeeId;
      const params: Record<string, string> = {
        page: String(nextPage),
        limit: String(PAGE_SIZE),
        scope: nextScope,
        sortBy: "transactionDate",
        sortOrder: "desc",
      };
      if (selectedEmployer) params.employerId = selectedEmployer;
      if (nextScope === "employee" && selectedEmployee) params.employeeId = selectedEmployee;

      const { data } = await api.get<ApiSuccess<ExpenditureResponse>>("/admin/expenditures", {
        params,
      });
      setItems(data.data.items);
      setSummary(data.data.summary);
      setMeta(metaFromResponse(data.meta, data.data.items.length, nextPage));
      setPage(nextPage);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEmployers().catch(() => undefined);
    void load({ page: 1, scope: "employer", employerId: "", employeeId: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scope !== "employee") return;
    void loadEmployees(employerId).catch(() => undefined);
  }, [scope, employerId]);

  const categoryChart = useMemo(() => {
    if (!summary) return [];
    const debitOnly = summary.byCategory.filter((row) => row.type === "debit" || !row.type);
    if (debitOnly.length > 0) {
      return debitOnly.map((row) => ({ category: row.category, total: row.total }));
    }
    return summary.byCategory.map((row) => ({ category: row.category, total: row.total }));
  }, [summary]);

  const switchScope = (next: Scope) => {
    setScope(next);
    setEmployeeId("");
    setPage(1);
    void load({ page: 1, scope: next, employeeId: "" });
  };

  const applyFilters = () => {
    void load({ page: 1 });
  };

  const clearFilters = () => {
    setEmployerId("");
    setEmployeeId("");
    void load({ page: 1, employerId: "", employeeId: "" });
  };

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("expenditure")}</p>
          <h2 className="display dash-title">{t("expTitle")}</h2>
          <p className="muted">{t("expSub")}</p>
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab${scope === "employer" ? " active" : ""}`}
          onClick={() => switchScope("employer")}
        >
          {t("expTabEmployers")}
        </button>
        <button
          type="button"
          className={`tab${scope === "employee" ? " active" : ""}`}
          onClick={() => switchScope("employee")}
        >
          {t("expTabEmployees")}
        </button>
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: 12 }}>
          <select
            className="select"
            style={{ maxWidth: 280 }}
            value={employerId}
            onChange={(e) => {
              setEmployerId(e.target.value);
              setEmployeeId("");
            }}
          >
            <option value="">{t("allCompanies")}</option>
            {employers.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.profile?.companyName || emp.mobile || emp._id}
              </option>
            ))}
          </select>

          {scope === "employee" && (
            <select
              className="select"
              style={{ maxWidth: 280 }}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">{t("allEmployees")}</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName}
                  {emp.employerProfileId?.companyName
                    ? ` · ${emp.employerProfileId.companyName}`
                    : ""}
                </option>
              ))}
            </select>
          )}

          <button type="button" className="btn" onClick={applyFilters} disabled={loading}>
            {t("search")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>
            {t("clearFilters")}
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {loading && !summary ? <p className="muted">{t("loading")}</p> : null}

        {summary && (
          <>
            <div className="grid-4" style={{ marginBottom: 12 }}>
              <StatCard label={t("expCredit")} value={formatINR(summary.credit)} tone="ok" />
              <StatCard label={t("expDebit")} value={formatINR(summary.debit)} tone="warn" />
              <StatCard
                label={t("expBalance")}
                value={formatINR(summary.balance)}
                tone={summary.balance >= 0 ? "ok" : "warn"}
              />
              <StatCard label={t("expTransactions")} value={summary.count} />
            </div>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <ChartCard title={t("chartExpType")} subtitle={t("chartExpTypeSub")}>
                <TypePieChart credit={summary.credit} debit={summary.debit} />
              </ChartCard>
              <ChartCard title={t("chartExpCategory")} subtitle={t("chartExpCategorySub")}>
                <CategoryBarChart data={categoryChart} />
              </ChartCard>
            </div>
          </>
        )}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("companyName")}</th>
                {scope === "employee" && <th>{t("name")}</th>}
                <th>{t("category")}</th>
                <th>{t("status")}</th>
                <th>{t("amount")}</th>
                <th>{t("description")}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={scope === "employee" ? 7 : 6}>{t("noData")}</td>
                </tr>
              ) : (
                items.map((tx) => (
                  <tr key={tx._id}>
                    <td>{String(tx.transactionDate).slice(0, 10)}</td>
                    <td>
                      {typeof tx.employerProfileId === "object" && tx.employerProfileId
                        ? tx.employerProfileId.companyName
                        : "—"}
                    </td>
                    {scope === "employee" && (
                      <td>
                        {typeof tx.employeeId === "object" && tx.employeeId
                          ? tx.employeeId.fullName
                          : "—"}
                      </td>
                    )}
                    <td>{tx.category}</td>
                    <td>
                      <span className={`badge ${tx.type === "credit" ? "ok" : "warn"}`}>{tx.type}</span>
                    </td>
                    <td>{formatINR(Number(tx.amount || 0))}</td>
                    <td>{tx.description || "—"}</td>
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
