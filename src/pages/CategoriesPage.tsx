import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import { uploadFile } from "../lib/upload";
import type { CategoryRow } from "../lib/types";
import { emptyMeta, metaFromResponse, PAGE_SIZE, Pagination, type PageMeta } from "../components/Pagination";

type CategoryForm = {
  nameEn: string;
  nameHi: string;
  parentId: string;
  descriptionEn: string;
  descriptionHi: string;
  iconUrl: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm = (): CategoryForm => ({
  nameEn: "",
  nameHi: "",
  parentId: "",
  descriptionEn: "",
  descriptionHi: "",
  iconUrl: "",
  sortOrder: "0",
  isActive: true,
});

interface ManageResponse {
  items: CategoryRow[];
  parents: Array<{ _id: string; nameEn: string; nameHi: string; isActive: boolean }>;
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<CategoryRow[]>([]);
  const [parents, setParents] = useState<ManageResponse["parents"]>([]);
  const [meta, setMeta] = useState<PageMeta>(emptyMeta());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const load = async (opts?: { page?: number; q?: string; status?: string }) => {
    setLoading(true);
    setError("");
    try {
      const nextPage = opts?.page ?? page;
      const params: Record<string, string | number> = {
        page: nextPage,
        limit: PAGE_SIZE,
        sortBy: "sortOrder",
        sortOrder: "asc",
      };
      const search = opts?.q ?? q;
      const selectedStatus = opts?.status ?? status;
      if (search.trim()) params.q = search.trim();
      if (selectedStatus) params.status = selectedStatus;

      const { data } = await api.get<ApiSuccess<ManageResponse>>("/categories/manage", { params });
      setItems(data.data.items);
      setParents(data.data.parents);
      setMeta(metaFromResponse(data.meta, data.data.items.length, nextPage));
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

  const openCreate = (parentId = "") => {
    setEditingId(null);
    setForm({ ...emptyForm(), parentId });
    setModalOpen(true);
  };

  const openEdit = (cat: CategoryRow, parentId?: string | null) => {
    setEditingId(cat._id);
    setForm({
      nameEn: cat.nameEn || "",
      nameHi: cat.nameHi || "",
      parentId: parentId || cat.parentId || "",
      descriptionEn: cat.descriptionEn || "",
      descriptionHi: cat.descriptionHi || "",
      iconUrl: cat.iconUrl || "",
      sortOrder: String(cat.sortOrder ?? 0),
      isActive: cat.isActive !== false,
    });
    setModalOpen(true);
  };

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadFile(file, "categories");
      setForm((prev) => ({ ...prev, iconUrl: url }));
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        nameEn: form.nameEn.trim(),
        nameHi: form.nameHi.trim(),
        parentId: form.parentId || null,
        descriptionEn: form.descriptionEn.trim() || undefined,
        descriptionHi: form.descriptionHi.trim() || undefined,
        iconUrl: form.iconUrl || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };

      if (editingId) {
        await api.patch(`/categories/${editingId}`, payload);
      } else {
        await api.post("/categories", payload);
      }

      setModalOpen(false);
      setForm(emptyForm());
      setEditingId(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/categories/${id}`, { isActive });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    }
  };

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("categories")}</p>
          <h2 className="display dash-title">{t("categoriesTitle")}</h2>
          <p className="muted">{t("categoriesSub")}</p>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => openCreate("")}>
            + {t("addParentCategory")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => openCreate(parents[0]?._id || "")}>
            + {t("addSubCategory")}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: 12 }}>
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder={t("searchCategories")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                void load({ page: 1 });
              }
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
            <option value="inactive">{t("userStatus.inactive")}</option>
          </select>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setPage(1);
              void load({ page: 1 });
            }}
          >
            {t("search")}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setQ("");
              setStatus("");
              setPage(1);
              void load({ page: 1, q: "", status: "" });
            }}
          >
            {t("clearFilters")}
          </button>
        </div>

        {error && !modalOpen && <p className="error">{error}</p>}
        {loading ? <p className="muted">{t("loading")}</p> : null}

        {!loading && items.length === 0 ? (
          <p className="muted">{t("noData")}</p>
        ) : (
          items.map((cat) => {
            const subCount = cat.subcategories?.length ?? 0;
            const isExpanded = expandedIds.has(cat._id);
            return (
            <div
              key={cat._id}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="row" style={{ gap: 12 }}>
                  {subCount > 0 ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{
                        width: 36,
                        height: 36,
                        padding: 0,
                        borderRadius: 10,
                        fontSize: "1rem",
                        lineHeight: 1,
                      }}
                      aria-label={isExpanded ? t("collapseSubs") : t("expandSubs")}
                      title={isExpanded ? t("collapseSubs") : t("expandSubs")}
                      onClick={() => toggleExpand(cat._id)}
                    >
                      {isExpanded ? "▾" : "▸"}
                    </button>
                  ) : (
                    <span style={{ width: 36, display: "inline-block" }} />
                  )}
                  {cat.iconUrl ? (
                    <img
                      src={cat.iconUrl}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: "var(--mist)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                      }}
                    >
                      {cat.nameEn?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <strong>
                      {cat.nameEn} / {cat.nameHi}
                    </strong>
                    <div className="muted" style={{ fontSize: "0.82rem" }}>
                      {cat.slug} · {t("subcategories")}: {subCount}
                    </div>
                  </div>
                  <span className={`badge ${cat.isActive ? "ok" : "warn"}`}>
                    {cat.isActive ? t("userStatus.active") : t("userStatus.inactive")}
                  </span>
                </div>
                <div className="row">
                  {subCount > 0 && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => toggleExpand(cat._id)}
                    >
                      {isExpanded ? t("hideSubs") : t("showSubs")}
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={() => openCreate(cat._id)}>
                    + {t("addSubCategory")}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => openEdit(cat, null)}>
                    {t("edit")}
                  </button>
                  {cat.isActive ? (
                    <button type="button" className="btn btn-danger" onClick={() => void setActive(cat._id, false)}>
                      {t("deactivate")}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ok" onClick={() => void setActive(cat._id, true)}>
                      {t("activate")}
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && subCount > 0 && (
                <table className="table" style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>{t("image")}</th>
                      <th>{t("nameEn")}</th>
                      <th>{t("nameHi")}</th>
                      <th>{t("status")}</th>
                      <th>{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.subcategories?.map((sub) => (
                      <tr key={sub._id}>
                        <td>
                          {sub.iconUrl ? (
                            <img
                              src={sub.iconUrl}
                              alt=""
                              style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }}
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{sub.nameEn}</td>
                        <td>{sub.nameHi}</td>
                        <td>
                          <span className={`badge ${sub.isActive ? "ok" : "warn"}`}>
                            {sub.isActive ? t("userStatus.active") : t("userStatus.inactive")}
                          </span>
                        </td>
                        <td>
                          <div className="row">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => openEdit(sub, cat._id)}
                            >
                              {t("edit")}
                            </button>
                            {sub.isActive ? (
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => void setActive(sub._id, false)}
                              >
                                {t("deactivate")}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-ok"
                                onClick={() => void setActive(sub._id, true)}
                              >
                                {t("activate")}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            );
          })
        )}

        <Pagination meta={meta} loading={loading} onPageChange={(p) => void load({ page: p })} />
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => !saving && setModalOpen(false)}>
          <div className="panel modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="display" style={{ marginTop: 0 }}>
              {editingId
                ? t("editCategory")
                : form.parentId
                  ? t("addSubCategory")
                  : t("addParentCategory")}
            </h3>

            <form onSubmit={(e) => void submit(e)}>
              <div className="form-grid">
                <div className="field">
                  <label className="label">{t("nameEn")} *</label>
                  <input
                    className="input"
                    required
                    value={form.nameEn}
                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="label">{t("nameHi")} *</label>
                  <input
                    className="input"
                    required
                    value={form.nameHi}
                    onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="label">{t("parent")}</label>
                  <select
                    className="select"
                    value={form.parentId}
                    onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                    disabled={Boolean(editingId && !form.parentId && (items.find((i) => i._id === editingId)?.subcategories?.length ?? 0) > 0)}
                  >
                    <option value="">{t("noParent")}</option>
                    {parents
                      .filter((p) => p._id !== editingId)
                      .map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.nameEn}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">{t("sortOrder")}</label>
                  <input
                    className="input"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">{t("descriptionEn")}</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={form.descriptionEn}
                  onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">{t("descriptionHi")}</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={form.descriptionHi}
                  onChange={(e) => setForm({ ...form, descriptionHi: e.target.value })}
                />
              </div>

              <div className="field">
                <label className="label">{t("categoryImage")}</label>
                <div className="row">
                  {form.iconUrl ? (
                    <img
                      src={form.iconUrl}
                      alt=""
                      style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }}
                    />
                  ) : null}
                  <input type="file" accept="image/*" onChange={(e) => void onUpload(e)} />
                  {form.iconUrl && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setForm({ ...form, iconUrl: "" })}
                    >
                      {t("removeImage")}
                    </button>
                  )}
                </div>
                {uploading && <p className="muted">{t("uploading")}</p>}
              </div>

              <label className="row" style={{ marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <span>{t("userStatus.active")}</span>
              </label>

              {error && <p className="error">{error}</p>}

              <div className="row">
                <button type="submit" className="btn" disabled={saving || uploading}>
                  {saving ? t("loading") : t("save")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
