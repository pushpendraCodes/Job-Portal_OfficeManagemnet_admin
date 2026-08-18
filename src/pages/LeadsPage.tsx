import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { LeadRow } from "../lib/types";
import { emptyMeta, metaFromResponse, PAGE_SIZE, Pagination, type PageMeta } from "../components/Pagination";

export default function LeadsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<LeadRow[]>([]);
  const [meta, setMeta] = useState<PageMeta>(emptyMeta());
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("in_progress");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (opts?: { page?: number; status?: string }) => {
    setLoading(true);
    setError("");
    try {
      const nextPage = opts?.page ?? page;
      const selectedStatus = opts?.status ?? status;
      const params: Record<string, string> = {
        page: String(nextPage),
        limit: String(PAGE_SIZE),
      };
      if (selectedStatus) params.status = selectedStatus;
      const { data } = await api.get<ApiSuccess<LeadRow[]>>("/leads", { params });
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
    void load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = async (id: string, patch: Record<string, unknown>) => {
    await api.patch(`/leads/${id}`, patch);
    await load();
  };

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("leads")}</p>
          <h2 className="display dash-title">{t("leads")}</h2>
          <p className="muted">{t("leadsSub")}</p>
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: 12 }}>
          <select
            className="select"
            style={{ maxWidth: 220 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{t("allStatuses")}</option>
            <option value="in_progress">in_progress</option>
            <option value="abandoned">abandoned</option>
            <option value="contacted">contacted</option>
            <option value="converted">converted</option>
          </select>
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
                <th>Type</th>
                <th>Mobile</th>
                <th>Progress</th>
                <th>Form data</th>
                <th>{t("status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("noData")}</td>
                </tr>
              ) : (
                items.map((lead) => (
                  <tr key={lead._id}>
                    <td>{lead.accountType}</td>
                    <td>{lead.mobile}</td>
                    <td>
                      {lead.progressPercent}% · {lead.lastStep || "—"}
                    </td>
                    <td>
                      <code style={{ fontSize: 12 }}>{JSON.stringify(lead.formData)}</code>
                    </td>
                    <td>
                      <span className="badge warn">{lead.status}</span>
                    </td>
                    <td className="row">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() =>
                          void update(lead._id, {
                            status: "contacted",
                            contactedAt: new Date().toISOString(),
                          })
                        }
                      >
                        {t("contact")}
                      </button>
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
