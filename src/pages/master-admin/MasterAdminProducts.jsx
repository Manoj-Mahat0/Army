// src/pages/master-admin/MasterAdminProducts.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import MasterAdminSidebar from "../../components/MasterAdminSidebar";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { API_BASE, API_HOST } from "../../lib/config";
import { getToken } from "../../lib/auth";
import {
  FiBox,
  FiEye,
  FiEyeOff,
  FiEdit3,
  FiTrash2,
  FiSearch,
  FiPlus,
  FiImage,
  FiList,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

/* ---------- helpers ---------- */
function formatIN(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

/* ---------- MultiSelectDropdown ---------- */
function MultiSelectDropdown({ options = [], selected = [], onChange, placeholder = "Select" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggleId(id) {
    const arr = Array.isArray(selected) ? [...selected] : [];
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(id);
    onChange(arr);
  }

  const selectedNames = options.filter((o) => selected.includes(o.id)).map((o) => o.name);
  const label =
    selectedNames.length === 0 ? placeholder : selectedNames.length <= 3 ? selectedNames.join(", ") : `${selectedNames.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full text-left px-3 py-2 border rounded bg-white flex items-center justify-between text-sm"
      >
        <div className="truncate text-gray-700">{label}</div>
        <div className="ml-2 text-gray-400">▾</div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-56 overflow-auto">
          <div className="p-2">
            {options.length === 0 ? (
              <div className="text-sm text-gray-500">No options</div>
            ) : (
              options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.id)}
                    onChange={() => toggleId(opt.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{opt.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- ProductRow with Active Toggle ---------- */
function ProductRow({ p, onEdit, onDelete, onToggleActive, busyToggleId, onOpenBatches, tagsById, latestBatchTsByProductId }) {
  const isBusy = busyToggleId === p.id;
  const isActive = Boolean(p.active);
  const latestTs = latestBatchTsByProductId?.[Number(p.id)] ?? (p.created_at ? new Date(p.created_at).getTime() : null);
  const monthsOld = (() => {
    if (!latestTs) return null;
    const ms = Date.now() - latestTs;
    const months = ms / (1000 * 60 * 60 * 24 * 30);
    return months;
  })();
  const toneClass = (() => {
    if (monthsOld == null) return "bg-gray-50 text-gray-600 border-gray-200";
    if (monthsOld < 3) return "bg-emerald-50 text-emerald-700 border-emerald-100"; // new arrived
    if (monthsOld < 6) return "bg-blue-50 text-blue-700 border-blue-100"; // 3 months
    if (monthsOld < 9) return "bg-amber-50 text-amber-700 border-amber-100"; // 6 months
    if (monthsOld < 12) return "bg-orange-50 text-orange-700 border-orange-100"; // 9 months
    return "bg-red-50 text-red-700 border-red-100"; // 12 months
  })();
  const stockValue = p.stocklevel_quantity ?? p.stock_quantity ?? p.stocklevel_quantity ?? 0;
  const productTagIds = Array.isArray(p.tag_ids)
    ? p.tag_ids
    : Array.isArray(p.tags)
    ? p.tags.map((t) => (typeof t === "object" ? t.id : t))
    : [];
  const productTagNames = (productTagIds || []).map((id) => tagsById?.[id]).filter(Boolean);
  return (
    <tr>
      <td className="px-4 py-4 whitespace-nowrap align-top">
        <div className="h-14 w-14 rounded-md overflow-hidden bg-gray-50 flex items-center justify-center border">
          {p.image_url ? (
            <img
              src={p.image_url.startsWith("http") ? p.image_url : `${API_HOST}${p.image_url}`}
              alt={p.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-gray-300">
              <FiImage size={20} />
            </div>
          )}
        </div>
      </td>

      <td className="px-4 py-4 align-top">
        <div className="flex items-center gap-2">
          <div className="font-medium text-gray-900">{p.name}</div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">{p.sku}</div>
        {productTagNames.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {productTagNames.slice(0, 3).map((name) => (
              <span key={name} className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200">
                {name}
              </span>
            ))}
            {productTagNames.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">+{productTagNames.length - 3}</span>
            )}
          </div>
        )}
      </td>

      <td className="px-4 py-4 align-top text-sm text-gray-600">{p.category}</td>

      <td className="px-4 py-4 align-top text-sm">
        <span
          className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border ${toneClass}`}
          title={
            monthsOld == null
              ? "Unknown"
              : `${monthsOld.toFixed(1)} mo old • since ${latestTs ? new Date(latestTs).toLocaleDateString() : "-"}`
          }
        >
          {stockValue}
        </span>
      </td>

      <td className="px-4 py-4 align-top text-sm font-semibold text-gray-900">₹{p.price}</td>

      <td className="px-4 py-4 align-top text-sm text-gray-600">{p.gst_rate}%</td>

      <td className="px-4 py-4 align-top text-right">
        <div className="inline-flex gap-2 items-center">
          <button
            onClick={() => onOpenBatches(p)}
            className="p-2 rounded-md bg-white border text-sm hover:bg-gray-50"
            title="View batches"
          >
            <FiList />
          </button>

          <button
            onClick={() => onToggleActive(p)}
            className={`p-2 rounded-md ${isActive ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
            title={isActive ? "Deactivate" : "Activate"}
            disabled={isBusy}
          >
            {isBusy ? <FiRefreshCw className="animate-spin" /> : isActive ? <FiEye /> : <FiEyeOff />}
          </button>

          <button onClick={() => onEdit(p)} className="p-2 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100" title="Edit">
            <FiEdit3 />
          </button>

          <button onClick={() => onDelete(p)} className="p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100" title="Delete">
            <FiTrash2 />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ---------- Main component (API switched to products-with-stock) ---------- */
export default function MasterAdminProducts() {
  const { token } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [stockMax, setStockMax] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | category | price | gst_rate | stock
  const [sortDir, setSortDir] = useState("asc"); // asc | desc
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    sku: "",
    name: "",
    weight: "",
    min_quantity: "",
    max_quantity: "",
    price: "",
    gst_rate: "",
    category_ids: [],
    tag_ids: [],
    description: "",
    file: null,
    initial_quantity: "",
    stocklevel_quantity: "",
    unit: "pcs",
    expire_date: "",
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [busyToggleId, setBusyToggleId] = useState(null);

  const [batches, setBatches] = useState([]);
  const [batchesDrawer, setBatchesDrawer] = useState({ open: false, product: null, list: [], loading: false });

  const drawerFormRef = useRef(null);
  const tagsById = useMemo(() => {
    const map = {};
    (tags || []).forEach((t) => {
      if (t && (t.id != null)) map[t.id] = t.name || String(t.id);
    });
    return map;
  }, [tags]);
  const latestBatchTsByProductId = useMemo(() => {
    const map = {};
    (batches || []).forEach((b) => {
      const pid = Number(b.product_id);
      const ts = new Date(b.added_at || b.created_at || b.expire_date || 0).getTime();
      if (!Number.isFinite(ts)) return;
      if (!map[pid] || ts > map[pid]) map[pid] = ts;
    });
    return map;
  }, [batches]);

  // generic apiRequest uses configured HOST + BASE
  async function apiRequest(path, { method = "GET", body = null, raw = false } = {}) {
    const headers = {};
    const localToken = token || getToken();
    if (localToken) headers["Authorization"] = `Bearer ${localToken}`;

    const isForm = typeof FormData !== "undefined" && body instanceof FormData;

    if (!isForm && !raw) headers["Content-Type"] = "application/json";

    const res = await fetch(`${API_HOST}${API_BASE}${path}`, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const err = new Error(data?.detail || data?.message || `Request failed: ${res.status}`);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  /* ---------- load products ---------- */
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await apiRequest("/products-with-stock/products", { method: "GET" });
        if (!mounted) return;
        setProducts(Array.isArray(data) ? data.map((d) => ({ ...d, active: d.active ?? true })) : []);
      } catch (err) {
        console.error(err);
        toast(err.message || "Failed to load products", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [token]);

  /* ---------- load categories + tags ---------- */
  useEffect(() => {
    let mounted = true;
    async function loadMeta() {
      try {
        setMetaLoading(true);
        const cats = await apiRequest("/categories/", { method: "GET" });
        const tgs = await apiRequest("/tags/", { method: "GET" });
        if (!mounted) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setTags(Array.isArray(tgs) ? tgs : []);
      } catch (err) {
        console.error(err);
        toast(err.message || "Failed to load categories/tags", "error");
      } finally {
        if (mounted) setMetaLoading(false);
      }
    }
    loadMeta();
    return () => (mounted = false);
  }, [token]);

  /* ---------- load global batches ---------- */
  useEffect(() => {
    let mounted = true;
    async function loadBatches() {
      try {
        const res = await apiRequest("/products-with-stock/stock?only_active=true&limit=200", { method: "GET" });
        if (!mounted) return;
        setBatches(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("batches load err", err);
        setBatches([]);
      }
    }
    loadBatches();
    return () => (mounted = false);
  }, [token]);

  // Reset to first page when filters/sorts change
  useEffect(() => {
    setPage(1);
  }, [query, selectedCategoryIds, selectedTagIds, priceMin, priceMax, stockMin, stockMax, sortBy, sortDir]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      // search
      if (q) {
        const hit =
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q));
        if (!hit) return false;
      }

      // category chips
      if (selectedCategoryIds.length > 0) {
        const catIds = Array.isArray(p.category_ids)
          ? p.category_ids
          : Array.isArray(p.categories)
          ? p.categories.map((c) => (typeof c === "object" ? c.id : c))
          : [];
        const intersects = catIds.some((id) => selectedCategoryIds.includes(id));
        if (!intersects) return false;
      }

      // tag chips
      if (selectedTagIds.length > 0) {
        const tagIds = Array.isArray(p.tag_ids)
          ? p.tag_ids
          : Array.isArray(p.tags)
          ? p.tags.map((t) => (typeof t === "object" ? t.id : t))
          : [];
        const intersects = tagIds.some((id) => selectedTagIds.includes(id));
        if (!intersects) return false;
      }

      // price range
      const priceNum = Number(p.price ?? 0);
      if (priceMin !== "" && priceNum < Number(priceMin)) return false;
      if (priceMax !== "" && priceNum > Number(priceMax)) return false;

      // stock range
      const stockNum = Number(p.stocklevel_quantity ?? p.stock_quantity ?? 0);
      if (stockMin !== "" && stockNum < Number(stockMin)) return false;
      if (stockMax !== "" && stockNum > Number(stockMax)) return false;

      return true;
    });
  }, [products, query, selectedCategoryIds, selectedTagIds, priceMin, priceMax, stockMin, stockMax]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let va;
      let vb;
      if (sortBy === "name") {
        va = (a.name || "").toLowerCase();
        vb = (b.name || "").toLowerCase();
      } else if (sortBy === "category") {
        va = (a.category || "").toLowerCase();
        vb = (b.category || "").toLowerCase();
      } else if (sortBy === "price") {
        va = Number(a.price ?? 0);
        vb = Number(b.price ?? 0);
      } else if (sortBy === "gst_rate") {
        va = Number(a.gst_rate ?? 0);
        vb = Number(b.gst_rate ?? 0);
      } else if (sortBy === "stock") {
        va = Number(a.stocklevel_quantity ?? a.stock_quantity ?? 0);
        vb = Number(b.stocklevel_quantity ?? b.stock_quantity ?? 0);
      } else {
        va = 0;
        vb = 0;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  function toggleSort(column) {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  function toggleCategoryFilter(id) {
    setSelectedCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleTagFilter(id) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function clearAllFilters() {
    setSelectedCategoryIds([]);
    setSelectedTagIds([]);
    setPriceMin("");
    setPriceMax("");
    setStockMin("");
    setStockMax("");
    setQuery("");
  }

  function getDomain(values, fallbackMax) {
    const nums = values.filter((v) => Number.isFinite(v));
    if (nums.length === 0) return { min: 0, max: fallbackMax };
    return { min: Math.min(...nums), max: Math.max(...nums) };
  }

  const priceDomain = useMemo(() => {
    const values = products.map((p) => Number(p.price ?? 0)).filter((n) => !Number.isNaN(n));
    const { min, max } = getDomain(values, 1000);
    return { min, max };
  }, [products]);

  const stockDomain = useMemo(() => {
    const values = products.map((p) => Number(p.stocklevel_quantity ?? p.stock_quantity ?? 0)).filter((n) => !Number.isNaN(n));
    const { min, max } = getDomain(values, 100);
    return { min, max };
  }, [products]);

  function openAdd() {
    setEditing(null);
    setForm({
      sku: "",
      name: "",
      weight: "",
      min_quantity: "",
      max_quantity: "",
      price: "",
      gst_rate: "",
      category_ids: [],
      tag_ids: [],
      description: "",
      file: null,
      initial_quantity: "",
      stocklevel_quantity: "",
      unit: "pcs",
      expire_date: "",
    });
    setPreviewUrl(null);
    setShowDrawer(true);
    setTimeout(() => drawerFormRef.current?.focus?.(), 50);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      sku: p.sku ?? "",
      name: p.name ?? "",
      weight: p.weight ? String(p.weight) : "",
      min_quantity: p.min_quantity ? String(p.min_quantity) : "",
      max_quantity: p.max_quantity ? String(p.max_quantity) : "",
      price: p.price ? String(p.price) : "",
      gst_rate: p.gst_rate ? String(p.gst_rate) : "",
      category_ids: Array.isArray(p.category_ids) ? p.category_ids : [],
      tag_ids: Array.isArray(p.tag_ids) ? p.tag_ids : [],
      description: p.description ?? "",
      file: null,
      initial_quantity: "",
      stocklevel_quantity: p.stocklevel_quantity ?? p.stock_quantity ?? "",
      unit: p.unit ?? "pcs",
      expire_date: "",
    });
    setPreviewUrl(p.image_url ? (p.image_url.startsWith("http") ? p.image_url : `${API_HOST}${p.image_url}`) : null);
    setShowDrawer(true);
    setTimeout(() => drawerFormRef.current?.focus?.(), 50);
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    setForm((s) => ({ ...s, file: f }));
    if (f) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  /* ---------- Save (create or update) ---------- */
  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) {
      toast("Name and Product ID are required", "error");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("sku", form.sku);
      fd.append("name", form.name);
      if (form.weight !== "") fd.append("weight", form.weight);
      if (form.min_quantity !== "") fd.append("min_quantity", form.min_quantity);
      if (form.max_quantity !== "") fd.append("max_quantity", form.max_quantity);
      if (form.price !== "") fd.append("price", form.price);
      if (form.gst_rate !== "") fd.append("gst_rate", form.gst_rate);
      fd.append("description", form.description || "");
      // Send JSON strings for arrays — server accepts e.g. [1,2] and [1]
      if (form.category_ids && form.category_ids.length) fd.append("category_ids", JSON.stringify(form.category_ids));
      if (form.tag_ids && form.tag_ids.length) fd.append("tag_ids", JSON.stringify(form.tag_ids));
      if (form.file) fd.append("file", form.file);

      if (!editing) {
        if (form.initial_quantity !== "") fd.append("initial_quantity", form.initial_quantity);
        fd.append("unit", form.unit || "pcs");
        if (form.expire_date) {
          const exp = String(form.expire_date);
          const expStr = exp.includes("T") ? exp : `${exp}T00:00:00`;
          fd.append("expire_date", expStr);
        }
        const response = await apiRequest("/products-with-stock/create", { method: "POST", body: fd });
        setProducts((prev) => [response, ...prev]);
        toast("Product created", "success");
      } else {
        if (form.stocklevel_quantity !== "") fd.append("stocklevel_quantity", form.stocklevel_quantity);
        const response = await apiRequest(`/products-with-stock/products/${editing.id}`, { method: "PATCH", body: fd });
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? response : p)));
        toast("Product updated", "success");
      }

      setShowDrawer(false);
      setPreviewUrl(null);

      try {
        const res = await apiRequest("/products-with-stock/stock?only_active=true&limit=200", { method: "GET" });
        setBatches(Array.isArray(res) ? res : []);
      } catch {}
    } catch (err) {
      console.error("save err", err);
      const msg = err.body?.detail || err.body?.message || err.message || "Request failed";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Delete (hard) ---------- */
  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/products-with-stock/products/${deleteTarget.id}?hard=true`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast("Product deleted", "success");
      setDeleteTarget(null);
    } catch (err) {
      console.error("delete err", err);
      toast(err.body?.detail || err.message || "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  /* ---------- Toggle active ---------- */
  async function handleToggleActive(p) {
    if (!p?.id) return;
    setBusyToggleId(p.id);
    try {
      const action = p.active ? "deactivate" : "activate";
      const res = await apiRequest(`/products-with-stock/products/${p.id}/${action}`, { method: "POST" });
      const newActive = res?.status === "activated" || action === "activate";
      setProducts((prev) => prev.map((it) => (it.id === p.id ? { ...it, active: newActive } : it)));
      toast(res?.status === "activated" ? "Product activated" : "Product deactivated", "success");
    } catch (err) {
      console.error("toggle active err", err);
      toast(err.body?.detail || err.message || "Failed to change state", "error");
    } finally {
      setBusyToggleId(null);
    }
  }

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /* ---------- Batches drawer actions ---------- */
  function openBatchesDrawer(product) {
    const list = batches.filter((b) => Number(b.product_id) === Number(product.id));
    setBatchesDrawer({ open: true, product, list, loading: false });
  }

  function closeBatchesDrawer() {
    setBatchesDrawer({ open: false, product: null, list: [], loading: false });
  }

  async function createBatchForProduct(payload) {
    try {
      const res = await apiRequest("/products-with-stock/stock/batches", { method: "POST", body: payload });
      setBatchesDrawer((s) => ({ ...s, list: [...s.list, res] }));
      setBatches((prev) => [...prev, res]);
      toast("Batch created", "success");
    } catch (err) {
      console.error("create batch err", err);
      toast(err.body?.detail || err.message || "Failed to create batch", "error");
    }
  }

  async function patchBatch(batchId, body) {
    try {
      const res = await apiRequest(`/products-with-stock/stock/batches/${batchId}`, { method: "PATCH", body });
      setBatchesDrawer((s) => ({ ...s, list: s.list.map((b) => (b.id === res.id ? res : b)) }));
      setBatches((prev) => prev.map((b) => (b.id === res.id ? res : b)));
      toast("Batch updated", "success");
    } catch (err) {
      console.error("patch batch err", err);
      toast(err.body?.detail || err.message || "Failed to update batch", "error");
    }
  }

  async function deactivateBatch(batchId) {
    if (!window.confirm("Deactivate this batch?")) return;
    await patchBatch(batchId, { active: false });
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <MasterAdminSidebar />

      <div className="flex-1 p-6 md:p-8">
        {/* header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-3 rounded-lg">
              <FiBox className="text-indigo-600 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Products</h1>
              <p className="text-sm text-gray-500">Manage your product inventory and catalog</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, sku or category"
                className="w-72 pl-4 pr-10 py-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute right-3 top-2 text-gray-400">
                <FiSearch />
              </div>
            </div>

            <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              <FiPlus />
              <span>Add product</span>
            </button>

            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  const [prods, bts] = await Promise.all([
                    apiRequest("/products-with-stock/products", { method: "GET" }),
                    apiRequest("/products-with-stock/stock?only_active=true&limit=200", { method: "GET" }),
                  ]);
                  setProducts(Array.isArray(prods) ? prods : []);
                  setBatches(Array.isArray(bts) ? bts : []);
                  toast("Refreshed", "success");
                } catch (err) {
                  toast(err?.message || "Refresh failed", "error");
                } finally {
                  setLoading(false);
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm hover:bg-gray-50"
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </div>

        {/* Inline filters */}
        <div className="mt-6 bg-white rounded-xl border border-gray-100 p-3">
          <div className="flex flex-col gap-3">
            {/* Legend for stock age colors */}
            <div className="flex items-center gap-2 text-[11px] text-gray-600 flex-wrap">
              <span className="text-gray-500">Stock age:</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" /> &lt;3m</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-300" /> &lt;6m</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-300" /> &lt;9m</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 border border-orange-300" /> &lt;12m</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 border border-red-300" /> ≥12m</span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto">
              <span className="text-xs text-gray-500 flex-shrink-0">Categories:</span>
              <button
                className={`text-xs px-2 py-1 rounded-full border ${selectedCategoryIds.length === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-white text-gray-700 border-gray-200"}`}
                onClick={() => setSelectedCategoryIds([])}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`text-xs px-2 py-1 rounded-full border ${selectedCategoryIds.includes(c.id) ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-white text-gray-700 border-gray-200"}`}
                  onClick={() => toggleCategoryFilter(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 overflow-x-auto">
              <span className="text-xs text-gray-500 flex-shrink-0">Tags:</span>
              <button
                className={`text-xs px-2 py-1 rounded-full border ${selectedTagIds.length === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-white text-gray-700 border-gray-200"}`}
                onClick={() => setSelectedTagIds([])}
              >
                All
              </button>
              {tags.map((t) => (
                <button
                  key={t.id}
                  className={`text-xs px-2 py-1 rounded-full border ${selectedTagIds.includes(t.id) ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-white text-gray-700 border-gray-200"}`}
                  onClick={() => toggleTagFilter(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
            {/* Range sliders */}
            <RangeSliders
              priceDomain={priceDomain}
              stockDomain={stockDomain}
              priceMin={priceMin}
              priceMax={priceMax}
              stockMin={stockMin}
              stockMax={stockMax}
              setPriceMin={setPriceMin}
              setPriceMax={setPriceMax}
              setStockMin={setStockMin}
              setStockMax={setStockMax}
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">{filtered.length} matching products</div>
              <button onClick={clearAllFilters} className="text-xs px-3 py-1.5 rounded border">Clear filters</button>
            </div>
          </div>
        </div>

        {/* table card */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Image</th>
                <th onClick={() => toggleSort("name")} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none">
                  Product {sortBy === "name" && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
                <th onClick={() => toggleSort("category")} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none">
                  Category {sortBy === "category" && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
                <th onClick={() => toggleSort("stock")} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none">
                  Stock {sortBy === "stock" && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
                <th onClick={() => toggleSort("price")} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none">
                  Price {sortBy === "price" && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
                <th onClick={() => toggleSort("gst_rate")} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none">
                  GST {sortBy === "gst_rate" && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-6">
                      <div className="h-14 w-14 bg-gray-100 rounded animate-pulse" />
                    </td>
                    <td className="px-4 py-6">
                      <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
                      <div className="h-3 bg-gray-100 rounded w-32 mt-2 animate-pulse" />
                    </td>
                    <td className="px-4 py-6">
                      <div className="h-4 bg-gray-100 rounded w-24 animate-pulse" />
                    </td>
                    <td className="px-4 py-6">
                      <div className="h-4 bg-gray-100 rounded w-16 animate-pulse" />
                    </td>
                    <td className="px-4 py-6">
                      <div className="h-4 bg-gray-100 rounded w-20 animate-pulse" />
                    </td>
                    <td className="px-4 py-6">
                      <div className="h-4 bg-gray-100 rounded w-12 animate-pulse" />
                    </td>
                    <td className="px-4 py-6 text-right">
                      <div className="flex gap-2 justify-end">
                        <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
                        <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
                        <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <ProductRow
                    key={p.id}
                    p={p}
                    onEdit={openEdit}
                    onDelete={(prod) => setDeleteTarget(prod)}
                    onToggleActive={handleToggleActive}
                    busyToggleId={busyToggleId}
                    onOpenBatches={openBatchesDrawer}
                    tagsById={tagsById}
                    latestBatchTsByProductId={latestBatchTsByProductId}
                  />
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">Page {currentPage} of {totalPages} • {totalItems} items</div>
            <div className="flex items-center gap-3">
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="text-sm border rounded px-2 py-1">
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <div className="flex items-center gap-1">
                <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 text-sm rounded border disabled:opacity-50">Prev</button>
                <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-2 py-1 text-sm rounded border disabled:opacity-50">Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer: add/edit */}
        {showDrawer && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => { setShowDrawer(false); setPreviewUrl(null); }} />
            <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-white shadow-xl border-l border-gray-100 flex flex-col">
              <form onSubmit={handleSave} className="flex flex-col h-full" role="dialog" aria-modal="true">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{editing ? "Edit product" : "Add product"}</h3>
                  <button type="button" onClick={() => { setShowDrawer(false); setPreviewUrl(null); }} className="p-2 rounded hover:bg-gray-50">
                    <FiX />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-5">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Product ID</label>
                      <input
                        ref={drawerFormRef}
                        value={form.sku}
                        onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border rounded"
                        placeholder="Product ID"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Name</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border rounded"
                        placeholder="Product name"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600">Price (₹)</label>
                        <input
                          value={form.price}
                          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border rounded"
                          type="number"
                          step="0.01"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">GST Rate (%)</label>
                        <input
                          value={form.gst_rate}
                          onChange={(e) => setForm((f) => ({ ...f, gst_rate: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border rounded"
                          type="number"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600">Weight (g)</label>
                        <input
                          value={form.weight}
                          onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border rounded"
                          type="number"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Min quantity</label>
                        <input
                          value={form.min_quantity}
                          onChange={(e) => setForm((f) => ({ ...f, min_quantity: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border rounded"
                          type="number"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600">Max quantity</label>
                        <input
                          value={form.max_quantity}
                          onChange={(e) => setForm((f) => ({ ...f, max_quantity: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border rounded"
                          type="number"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Image</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="mt-1 w-full" required={!editing} />
                      </div>
                    </div>

                    {previewUrl && (
                      <div className="w-40 h-28 rounded overflow-hidden border">
                        <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">Categories</label>
                        <MultiSelectDropdown
                          options={categories}
                          selected={form.category_ids}
                          onChange={(arr) => setForm((f) => ({ ...f, category_ids: arr }))}
                          placeholder="Choose categories"
                        />
                        <div className="mt-2 text-xs text-gray-500">{form.category_ids.length === 0 ? "No categories selected" : `${form.category_ids.length} selected`}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">Tags</label>
                        <MultiSelectDropdown
                          options={tags}
                          selected={form.tag_ids}
                          onChange={(arr) => setForm((f) => ({ ...f, tag_ids: arr }))}
                          placeholder="Choose tags"
                        />
                        <div className="mt-2 text-xs text-gray-500">{form.tag_ids.length === 0 ? "No tags selected" : `${form.tag_ids.length} selected`}</div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border rounded"
                        rows="3"
                        required
                      />
                    </div>

                    {/* Initial quantity (create) / Stock-level (edit) */}
                    {!editing ? (
                      <div>
                        <label className="text-sm text-gray-600">Initial quantity</label>
                        <input
                          value={form.initial_quantity}
                          onChange={(e) => setForm((f) => ({ ...f, initial_quantity: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border rounded"
                          type="number"
                        />
                        <div className="text-xs text-gray-500">This will create initial batch for product when created.</div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-600">Unit</label>
                            <select
                              value={form.unit}
                              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border rounded bg-white"
                            >
                              <option value="pcs">pcs</option>
                              <option value="box">box</option>
                              <option value="kg">kg</option>
                              <option value="g">g</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Expire date</label>
                            <input
                              value={form.expire_date}
                              onChange={(e) => setForm((f) => ({ ...f, expire_date: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border rounded"
                              type="date"
                            />
                            <div className="text-xs text-gray-500">Will be sent as YYYY-MM-DDT00:00:00</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm text-gray-600">Stock-level quantity</label>
                        <input
                          value={form.stocklevel_quantity}
                          onChange={(e) => setForm((f) => ({ ...f, stocklevel_quantity: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border rounded"
                          type="number"
                        />
                        <div className="text-xs text-gray-500">Adjust product's stock level on save (server will handle diff).</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t bg-white px-5 py-3 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => { setShowDrawer(false); setPreviewUrl(null); }} className="px-4 py-2 rounded-md border bg-white" disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60" disabled={saving}>
                    {saving ? (editing ? "Saving..." : "Creating...") : editing ? "Save" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* delete confirm modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-30" onClick={() => setDeleteTarget(null)} />
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm p-6 z-10">
              <h3 className="text-lg font-semibold text-gray-900">Delete product</h3>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to delete <span className="font-medium text-gray-900">{deleteTarget.name}</span>?
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-md border bg-white" disabled={deleting}>
                  Cancel
                </button>
                <button onClick={handleDeleteConfirmed} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60" disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Batches Drawer */}
        {batchesDrawer.open && batchesDrawer.product && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={closeBatchesDrawer} />
            <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-white shadow-xl border-l border-gray-100 flex flex-col">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Batches — {batchesDrawer.product.name}</h3>
                  <div className="text-xs text-gray-500 mt-1">
                    Product ID: {batchesDrawer.product.id} • Current stock: {batchesDrawer.product.stocklevel_quantity ?? batchesDrawer.product.stock_quantity ?? 0}
                  </div>
                </div>
                <button type="button" onClick={closeBatchesDrawer} className="p-2 rounded hover:bg-gray-50"><FiX /></button>
              </div>

              <div className="flex-1 overflow-auto p-5 space-y-4">
                <div className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Active batches</div>
                    <div className="text-xs text-gray-400">GET /products-with-stock/stock?only_active=true</div>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-auto">
                    {batchesDrawer.list.length === 0 ? (
                      <div className="text-xs text-gray-400">No active batches.</div>
                    ) : (
                      batchesDrawer.list.map((b) => (
                        <div key={b.id} className="flex items-start justify-between gap-3 bg-gray-50 p-2 rounded">
                          <div className="text-sm">
                            <div className="font-medium">{b.batch_no || `#${b.id}`}</div>
                            <div className="text-xs text-gray-600">Qty: {b.quantity} {b.unit || ""}</div>
                            <div className="text-xs text-gray-500">Expiry: {b.expire_date ? formatIN(b.expire_date) : "-"}</div>
                            <div className="text-xs text-gray-500 mt-1">Added: {b.added_at ? formatIN(b.added_at) : "-"}</div>
                            {b.notes && <div className="text-xs text-gray-500 mt-1">Notes: {b.notes}</div>}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button onClick={() => deactivateBatch(b.id)} className="inline-flex items-center gap-2 px-2 py-1 rounded border text-sm hover:bg-red-50">
                              <FiTrash2 className="w-4 h-4 text-red-600" /> Deactivate
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border rounded p-3">
                  <div className="text-sm font-medium mb-2">Create batch</div>
                  <CreateBatchForm product={batchesDrawer.product} onCreate={(payload) => createBatchForProduct(payload)} />
                </div>
              </div>

              <div className="border-t bg-white px-5 py-3 flex items-center justify-end">
                <button onClick={closeBatchesDrawer} className="px-4 py-2 rounded border">Done</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- CreateBatchForm component ---------- */
function CreateBatchForm({ product, onCreate }) {
  const [batchNo, setBatchNo] = useState(() => `init-${product?.id || "x"}-${Math.random().toString(36).slice(2, 8)}`);
  const [quantity, setQuantity] = useState("");
  const [unit] = useState("pcs");
  const [expireDate, setExpireDate] = useState("");
  const [notes, setNotes] = useState("ok");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(e) {
    e?.preventDefault();
    if (!product || !product.id) {
      toast("No product selected", "error");
      return;
    }
    if (quantity === "" || Number.isNaN(Number(quantity))) {
      toast("Enter valid quantity", "error");
      return;
    }
    const payload = {
      product_id: product.id,
      batch_no: batchNo,
      quantity: Number(quantity),
      unit: unit,
      expire_date: expireDate ? new Date(expireDate).toISOString() : new Date().toISOString(),
      notes: notes,
    };
    try {
      setBusy(true);
      await onCreate(payload);
      setBatchNo(`init-${product.id}-${Math.random().toString(36).slice(2, 8)}`);
      setQuantity("");
      setExpireDate("");
      setNotes("ok");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-2">
      <input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} className="px-3 py-2 border rounded" placeholder="Batch no (auto)" />
      <input value={quantity} onChange={(e) => setQuantity(e.target.value)} className="px-3 py-2 border rounded" placeholder="Quantity" type="number" />
      <input value={unit} disabled className="px-3 py-2 border rounded bg-gray-50 text-gray-600" placeholder="Unit" />
      <input value={expireDate} onChange={(e) => setExpireDate(e.target.value)} className="px-3 py-2 border rounded" placeholder="Expiry date" type="date" />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="px-3 py-2 border rounded" placeholder="Notes" rows="2" />
      <div className="flex justify-end gap-2">
        <button type="submit" disabled={busy} className="px-3 py-1 rounded bg-indigo-600 text-white">{busy ? "Creating..." : "Create"}</button>
      </div>
    </form>
  );
}

/* ---------- RangeSliders component (price & stock) ---------- */
function RangeSliders({
  priceDomain,
  stockDomain,
  priceMin,
  priceMax,
  stockMin,
  stockMax,
  setPriceMin,
  setPriceMax,
  setStockMin,
  setStockMax,
}) {
  const [pMin, setPMin] = useState(priceMin === "" ? priceDomain.min : Number(priceMin));
  const [pMax, setPMax] = useState(priceMax === "" ? priceDomain.max : Number(priceMax));
  const [sMin, setSMin] = useState(stockMin === "" ? stockDomain.min : Number(stockMin));
  const [sMax, setSMax] = useState(stockMax === "" ? stockDomain.max : Number(stockMax));

  useEffect(() => {
    setPMin(priceMin === "" ? priceDomain.min : Number(priceMin));
  }, [priceMin, priceDomain.min]);
  useEffect(() => {
    setPMax(priceMax === "" ? priceDomain.max : Number(priceMax));
  }, [priceMax, priceDomain.max]);
  useEffect(() => {
    setSMin(stockMin === "" ? stockDomain.min : Number(stockMin));
  }, [stockMin, stockDomain.min]);
  useEffect(() => {
    setSMax(stockMax === "" ? stockDomain.max : Number(stockMax));
  }, [stockMax, stockDomain.max]);

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-3 border rounded">
        <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
          <span>Price</span>
          <span>
            ₹{pMin} - ₹{pMax}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={priceDomain.min}
            max={priceDomain.max}
            value={pMin}
            onChange={(e) => setPMin(clamp(Number(e.target.value), priceDomain.min, pMax))}
            className="w-full"
          />
          <input
            type="range"
            min={priceDomain.min}
            max={priceDomain.max}
            value={pMax}
            onChange={(e) => setPMax(clamp(Number(e.target.value), pMin, priceDomain.max))}
            className="w-full"
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button
            className="text-xs px-2 py-1 rounded border"
            onClick={() => {
              setPMin(priceDomain.min);
              setPMax(priceDomain.max);
              setPriceMin("");
              setPriceMax("");
            }}
          >
            Reset
          </button>
          <button
            className="text-xs px-2 py-1 rounded bg-emerald-600 text-white"
            onClick={() => {
              setPriceMin(String(pMin));
              setPriceMax(String(pMax));
            }}
          >
            Apply
          </button>
        </div>
      </div>

      <div className="p-3 border rounded">
        <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
          <span>Stock</span>
          <span>
            {sMin} - {sMax}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={stockDomain.min}
            max={stockDomain.max}
            value={sMin}
            onChange={(e) => setSMin(clamp(Number(e.target.value), stockDomain.min, sMax))}
            className="w-full"
          />
          <input
            type="range"
            min={stockDomain.min}
            max={stockDomain.max}
            value={sMax}
            onChange={(e) => setSMax(clamp(Number(e.target.value), sMin, stockDomain.max))}
            className="w-full"
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button
            className="text-xs px-2 py-1 rounded border"
            onClick={() => {
              setSMin(stockDomain.min);
              setSMax(stockDomain.max);
              setStockMin("");
              setStockMax("");
            }}
          >
            Reset
          </button>
          <button
            className="text-xs px-2 py-1 rounded bg-emerald-600 text-white"
            onClick={() => {
              setStockMin(String(sMin));
              setStockMax(String(sMax));
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

