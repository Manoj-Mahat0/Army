// src/pages/master-admin/MasterOrdersMovementDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import MasterAdminSidebar from "../../components/MasterAdminSidebar";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { API_BASE, API_HOST } from "../../lib/config";

function StatusBadge({ status }) {
  const map = {
    placed: "bg-indigo-100 text-indigo-700",
    confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-yellow-100 text-yellow-700",
    shipped: "bg-orange-100 text-orange-700",
    received: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    returned: "bg-red-200 text-red-800",
  };
  const cls = map[String(status || "").toLowerCase()] || "bg-gray-100 text-gray-700";
  const label = String(status || "").replaceAll("_", " ");
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>{label}</span>;
}
function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}
function fmtCurrency(val) {
  const num = Number(val ?? 0);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(num);
  } catch {
    return `₹${num.toFixed(2)}`;
  }
}
function formatDateTime(d) {
  return d ? new Date(d).toLocaleString("en-IN") : "-";
}

export default function MasterOrdersMovementDetails() {
  const { id: routeId } = useParams();
  const query = useQuery();
  const queryOrderId = query.get("order");
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [vendorOrdersOpen, setVendorOrdersOpen] = useState(false);
  const [vendorOrdersLoading, setVendorOrdersLoading] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editRows, setEditRows] = useState([]);
  const [editReason, setEditReason] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  async function apiRequest(path, options = {}) {
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    headers["Accept"] = "application/json";
    const opts = { method: options.method || "GET", headers };
    if (options.body != null) {
      if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(options.body);
      } else {
        opts.body = options.body;
      }
    }
    const res = await fetch(`${API_HOST}${API_BASE}${path}`, opts);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = (data && (data.detail || data.message || data.error)) || (typeof data === "string" ? data : `Request failed: ${res.status}`);
      const err = new Error(msg);
      err.status = res.status;
      err.raw = data;
      throw err;
    }
    return data;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [ordersData, usersData, productsData] = await Promise.all([
          apiRequest("/orders/all?limit=500&offset=0"),
          apiRequest("/users/"),
          apiRequest("/products-with-stock/products"),
        ]);
        if (cancelled) return;
        setUsers(Array.isArray(usersData) ? usersData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
        const ordersArray = Array.isArray(ordersData) ? ordersData : [];
        let found = null;
        if (queryOrderId) found = ordersArray.find((o) => Number(o?.id) === Number(queryOrderId));
        if (!found && routeId) found = ordersArray.find((o) => Number(o?.id) === Number(routeId));
        if (!found && routeId) found = ordersArray.find((o) => Number(o?.vendor_id) === Number(routeId));
        setOrder(found || null);
      } catch (err) {
        console.error("load order details", err);
        toast(err?.message || "Failed to load order data", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [routeId, queryOrderId, token]);

  const usersMap = useMemo(() => {
    const m = {};
    (users || []).forEach((u) => { if (u && typeof u.id !== "undefined") m[u.id] = u; });
    return m;
  }, [users]);

  const productsMap = useMemo(() => {
    const m = {};
    (products || []).forEach((p) => { if (p && typeof p.id !== "undefined") m[p.id] = p; });
    return m;
  }, [products]);

  const vendorId = (order && (order.customer_id ?? order.vendor_id)) ?? null;
  const vendorUser = vendorId ? usersMap[vendorId] : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!vendorId) { setVendorOrders([]); return; }
      try {
        setVendorOrdersLoading(true);
        const data = await apiRequest(`/orders/vendor/${vendorId}?limit=100&offset=0`);
        if (cancelled) return;
        setVendorOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("vendor orders load", err);
      } finally {
        if (!cancelled) setVendorOrdersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [vendorId, token]);

  const totals = useMemo(() => {
    if (!order || !Array.isArray(order.items)) return { qty: 0, subtotal: 0 };
    let qty = 0, subtotal = 0;
    order.items.forEach((it) => {
      const q = Number(it.final_qty ?? it.original_qty ?? 0);
      const u = Number(it.unit_price ?? 0);
      qty += q;
      subtotal += Number(it.subtotal ?? u * q);
    });
    return { qty, subtotal };
  }, [order]);

  const filteredVendorOrders = useMemo(() => {
    if (!vendorSearch) return vendorOrders || [];
    const s = vendorSearch.trim().toLowerCase();
    return (vendorOrders || []).filter((o) => {
      return String(o.id).includes(s) ||
             String(o.customer_id).includes(s) ||
             (o.status || "").toLowerCase().includes(s) ||
             (o.created_at || "").toLowerCase().includes(s);
    });
  }, [vendorOrders, vendorSearch]);

  function openEditModal() {
    if (!order) return;
    const rows = (order.items || []).map((it) => ({
      id: it.id,
      product_id: it.product_id,
      qty: Number(it.final_qty ?? it.original_qty ?? 0),
      unit_price: Number(it.unit_price ?? 0),
      _isNew: false,
    }));
    setEditRows(rows);
    setEditReason("");
    setEditErrors({});
    setEditOpen(true);
  }
  function addEmptyRow() {
    setEditRows((r) => [...r, { tempId: `t-${Date.now()}-${Math.random()}`, product_id: "", qty: 0, unit_price: 0, _isNew: true }]);
  }
  function updateRow(idx, patch) {
    setEditRows((r) => { const copy = [...r]; copy[idx] = { ...copy[idx], ...patch }; return copy; });
  }
  function removeRow(idx) {
    setEditRows((r) => { const copy = [...r]; copy.splice(idx, 1); return copy; });
  }
  function validateEdit() {
    const errs = {};
    if (!Array.isArray(editRows) || editRows.length === 0) errs.global = "At least one item required";
    editRows.forEach((row, i) => {
      if (!row.product_id) errs[`row_${i}`] = "product required";
      if (!Number.isFinite(Number(row.qty)) || Number(row.qty) <= 0) errs[`row_qty_${i}`] = "qty must be > 0";
      if (!Number.isFinite(Number(row.unit_price)) || Number(row.unit_price) < 0) errs[`row_price_${i}`] = "unit_price must be >= 0";
    });
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  }
  async function submitEdit() {
    if (!validateEdit()) { toast("Fix validation errors", "error"); return; }
    if (!order) return;
    setEditSaving(true);
    try {
      const itemsPayload = editRows.map((r) => ({ product_id: Number(r.product_id), qty: Number(r.qty), unit_price: Number(r.unit_price) }));
      const payload = { items: itemsPayload, reason: editReason || "Admin edit" };
      const res = await apiRequest(`/orders/${order.id}/items`, { method: "PATCH", body: payload });
      toast(res?.message || res?.status || "Order items updated", "success");
      try {
        const ordersData = await apiRequest("/orders/all?limit=500&offset=0");
        const ordersArray = Array.isArray(ordersData) ? ordersData : [];
        const found = ordersArray.find((o) => Number(o.id) === Number(order.id));
        setOrder(found || null);
      } catch {}
      setEditOpen(false);
    } catch (err) {
      console.error("submitEdit err", err);
      toast(err?.message || "Failed to update items", "error");
    } finally {
      setEditSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <MasterAdminSidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-1/3 bg-gray-200 rounded" />
            <div className="h-64 bg-white rounded shadow p-6" />
          </div>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <MasterAdminSidebar />
        <main className="flex-1 p-6 md:p-8">
          <button onClick={() => navigate(-1)} className="mb-4 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">← Back</button>
          <div className="p-6 bg_WHITE rounded shadow-sm">Order not found for vendor / order id provided.</div>
        </main>
      </div>
    );
  }

  const customer = usersMap ? usersMap[order.customer_id] : null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <MasterAdminSidebar />
      <main className="flex-1 p-6 md:p-8">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <button onClick={() => navigate(-1)} className="mr-2 mb-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">← Back</button>
            <h1 className="text-2xl font-bold">Order <span className="text-gray-500">#{order.id}</span></h1>
            <div className="text-sm text-gray-500">Created: {formatDateTime(order.created_at)}</div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <button onClick={() => setVendorOrdersOpen(true)} className="px-3 py-1 bg-indigo-600 text_WHITE text-sm rounded hover:bg-indigo-700">View Previous Orders</button>
            <button onClick={() => {
              const blob = new Blob([JSON.stringify(order, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `order-${order.id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }} className="px-3 py-1 border rounded text-sm">Export</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            <div className="bg_WHITE rounded-lg border shadow-sm p-4">
              <div className="flex items-center justify_between mb-3">
                <h2 className="text-lg font-semibold">Items ({order.items?.length || 0})</h2>
                <div className="flex gap-2">
                  <button onClick={openEditModal} className="px-3 py-1 bg-green-600 text_WHITE rounded text-sm hover:bg-green-700">Admin Edit Items</button>
                </div>
              </div>

              {order.items && order.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3">Unit Price</th>
                        <th className="py-2 px-3">Qty</th>
                        <th className="py-2 px-3">Subtotal</th>
                        <th className="py-2 px-3">Item ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {order.items.map((it) => {
                        const prod = productsMap[it.product_id];
                        const qty = Number(it.final_qty ?? it.original_qty ?? 0);
                        const unit = Number(it.unit_price ?? 0);
                        const subtotal = Number(it.subtotal ?? unit * qty);
                        return (
                          <tr key={it.id ?? `${it.product_id}-${Math.random()}`} className="bg-gray-50">
                            <td className="py-3 px-3 align-top">
                              <div className="flex items-center gap-3">
                                {prod && (prod.image_url || prod.image) ? (
                                  <img src={(prod.image || prod.image_url).startsWith("http") ? (prod.image || prod.image_url) : `${API_HOST}${prod.image || prod.image_url}`} alt={prod.name} className="w-12 h-12 object_cover rounded" />
                                ) : (
                                  <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500">No Image</div>
                                )}
                                <div>
                                  <div className="font-medium">{prod ? prod.name : `Product #${it.product_id}`}</div>
                                  <div className="text-xs text-gray-500">
                                    {prod?.sku || prod?.code || "—"}
                                    {prod ? (
                                      <span className="ml-3 text-xs text-gray-600">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded">Stock: {typeof prod.stocklevel_quantity !== "undefined" ? prod.stocklevel_quantity : "—"}</span>
                                        <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded">Batches: {typeof prod.batches_total_quantity !== "undefined" ? prod.batches_total_quantity : "—"}</span>
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 align-top">{fmtCurrency(unit)}</td>
                            <td className="py-3 px-3 align-top">{qty}</td>
                            <td className="py-3 px-3 align-top font-semibold">{fmtCurrency(subtotal)}</td>
                            <td className="py-3 px-3 align-top text-xs text-gray-500">{it.id}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-gray-500">No items.</p>}

              <div className="mt-4 flex justify-end gap-4 items-center">
                <div className="text-sm text-gray-500">Total items: {totals.qty}</div>
                <div className="text-lg font-bold">Order total: {fmtCurrency(order.total_amount ?? order.total ?? totals.subtotal)}</div>
              </div>
            </div>

            <div className="mt-4 bg_WHITE rounded-lg border shadow-sm p-4">
              <h3 className="text-lg font-semibold mb-2">Shipping & Notes</h3>
              <div className="text-sm text-gray-500">Address</div>
              <div className="font-medium">{order.shipping_address || "-"}</div>
              <div className="mt-3 text-sm text-gray-500">Notes</div>
              <div className="">{order.notes || "-"}</div>
            </div>
          </section>

          <aside>
            <div className="bg_WHITE rounded-lg border shadow-sm p-4 mb-4">
              <h3 className="text-md font-semibold">Vendor</h3>
              <div className="mt-2 text-sm text-gray-600">
                {vendorUser ? (
                  <>
                    <div className="font-medium">{vendorUser.name}</div>
                    <div className="text-xs text-gray-500">{vendorUser.email}</div>
                    <div className="text-xs text-gray-500">Phone: {vendorUser.phone || "-"}</div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">#{vendorId}</div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={() => navigator.clipboard?.writeText(vendorUser?.email || "")} className="flex-1 px-3 py-1 border rounded text-sm">Copy Email</button>
                <button onClick={() => { if (vendorUser) navigate(`/staff/users/${vendorUser.id}`); else toast("No vendor details", "error"); }} className="flex-1 px-3 py-1 bg-indigo-600 text_WHITE rounded text-sm">View</button>
              </div>
            </div>

            <div className="bg_WHITE rounded-lg border shadow-sm p-4">
              <h3 className="text-md font-semibold">Order Timeline</h3>
              <ol className="mt-3 space-y-3">
                {["placed", "confirmed", "processing", "shipped", "received"].map((s) => {
                  const happened = order.status === s || (order.history && order.history.find && order.history.find((h) => h.status === s));
                  const time = (order.history && order.history.find && order.history.find((h) => h.status === s)?.at) || (s === order.status ? order.updated_at : null);
                  return (
                    <li key={s} className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-1 ${happened ? "bg-indigo-600" : "bg-gray-300"}`} />
                      <div>
                        <div className="text-sm font-medium capitalize">{s}</div>
                        <div className="text-xs text-gray-500">{time ? formatDateTime(time) : (happened ? formatDateTime(order.updated_at) : "Not yet")}</div>
                      </div>
                    </li>
                  );
                })}

                {order.status === "cancelled" && (
                  <li className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full mt-1 bg-red-500" />
                    <div>
                      <div className="text-sm font-medium">cancelled</div>
                      <div className="text-xs text-gray-500">{formatDateTime(order.cancelled_at || order.updated_at)}</div>
                    </div>
                  </li>
                )}
              </ol>
            </div>
          </aside>
        </div>

        {vendorOrdersOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-end z-50">
            <div className="w-full max-w-md bg_WHITE h-full shadow-lg p-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Previous Orders — Vendor {vendorUser?.name || `#${vendorId}`}</h2>
                <button onClick={() => setVendorOrdersOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>

              <div className="mb-3">
                <input value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} placeholder="Search by order id / status / date..." className="w-full px-3 py-2 border rounded" />
              </div>

              <div className="overflow-y-auto space-y-2">
                {vendorOrdersLoading ? <p className="text-gray-500">Loading…</p> :
                  (vendorOrders.length === 0 ? <p className="text-gray-500">No previous orders for this vendor.</p> :
                    filteredVendorOrders.filter((o) => o.id !== order.id).map((o) => (
                      <div key={o.id} className="p-3 border rounded hover:bg-gray-50 cursor-pointer" onClick={() => {
                        const navId = o.customer_id ?? o.vendor_id;
                        navigate(`/master-admin/orders/movement/${navId}?order=${o.id}`);
                        setVendorOrdersOpen(false);
                      }}>
                        <div className="flex justify-between">
                          <span className="font-medium">Order #{o.id}</span>
                          <span>{fmtCurrency(o.total_amount ?? o.total ?? 0)}</span>
                        </div>
                        <div className="text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleString("en-IN") : "-"}</div>
                      </div>
                    ))
                  )}
              </div>
            </div>
          </div>
        )}

        {editOpen && (
          <div className="fixed inset-0 z-60 flex items-start justify-center pt-16 px-4">
            <div className="absolute inset-0 bg-black opacity-40" onClick={() => { if (!editSaving) setEditOpen(false); }} />
            <div className="relative bg_WHITE w-full max-w-4xl rounded-lg shadow-xl p-6 z-50 flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold">Edit Items — Order #{order.id}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditOpen(false)} disabled={editSaving} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">Close</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                {editErrors.global && <div className="mb-3 p-2 rounded bg-red-50 text-red-700 text-sm">{editErrors.global}</div>}

                <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-500 px-1 py-2 border-b">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">Unit price</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>

                <div className="space-y-3 mt-3">
                  {editRows.map((row, idx) => {
                    const err = editErrors[`row_${idx}`];
                    const errQty = editErrors[`row_qty_${idx}`];
                    const errPrice = editErrors[`row_price_${idx}`];
                    const prod = productsMap[row.product_id];
                    const qty = Number(row.qty || 0);
                    const unit = Number(row.unit_price || 0);
                    const subtotal = Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : 0;

                    return (
                      <div key={row.id ?? row.tempId ?? idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded">
                        <div className="col-span-12 sm:col-span-6 flex gap-3 items-start">
                          {prod && (prod.image_url || prod.image) ? (
                            <img src={(prod.image || prod.image_url).startsWith("http") ? (prod.image || prod.image_url) : `${API_HOST}${prod.image || prod.image_url}`} alt={prod.name} className="w-10 h-10 object_cover rounded" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500">No Img</div>
                          )}

                          <div className="flex-1">
                            <select value={row.product_id} onChange={(e) => {
                              const val = e.target.value;
                              const p = products.find((pp) => String(pp.id) === String(val));
                              updateRow(idx, { product_id: val, unit_price: p ? (p.price ?? p.unit_price ?? "") : row.unit_price });
                            }} className="w-full px-2 py-1 border rounded text-sm" aria-label={`Product for row ${idx + 1}`}>
                              <option value="">— pick product —</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}{p.sku ? ` · ${p.sku}` : ""}{typeof p.price !== "undefined" ? ` · ₹${p.price}` : ""}
                                </option>
                              ))}
                            </select>

                            <div className="text-xs text-gray-500 mt-1">
                              {prod ? (
                                <>
                                  {prod.sku ? <span>SKU: {prod.sku}</span> : <span>ID: {prod.id}</span>}
                                  <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">Stock: {typeof prod.stocklevel_quantity !== "undefined" ? prod.stocklevel_quantity : "—"}</span>
                                  <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">Batches: {typeof prod.batches_total_quantity !== "undefined" ? prod.batches_total_quantity : "—"}</span>
                                </>
                              ) : <span>Choose product</span>}
                              {err && <div className="text-xs text-red-600 mt-1">{err}</div>}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                          <input type="number" min="0" value={row.qty} onChange={(e) => updateRow(idx, { qty: e.target.value === "" ? "" : Number(e.target.value) })} className={`w-full px-2 py-1 border rounded text-sm ${errQty ? "border-red-500" : ""}`} />
                          {errQty && <div className="text-xs text-red-600 mt-1">{errQty}</div>}
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                          <input type="number" min="0" value={row.unit_price} onChange={(e) => updateRow(idx, { unit_price: e.target.value === "" ? "" : Number(e.target.value) })} className={`w-full px-2 py-1 border rounded text-sm ${errPrice ? "border-red-500" : ""}`} />
                          {errPrice && <div className="text-xs text-red-600 mt-1">{errPrice}</div>}
                        </div>

                        <div className="col-span-12 sm:col-span-2 flex items-center justify-between">
                          <div className="text-sm font-semibold">{subtotal ? `₹${subtotal}` : "—"}</div>
                          <div>
                            <button onClick={() => removeRow(idx)} disabled={editSaving} className="text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50">Remove</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div>
                    <button onClick={addEmptyRow} disabled={editSaving} className="inline-flex items-center gap-2 px-3 py-2 border rounded bg_WHITE text-sm hover:bg-gray-50">+ Add another item</button>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">Reason</label>
                  <input value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Reason for change (required)" className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              <div className="mt-4 sticky bottom-0 bg_WHITE pt-4 -mx-6 px-6 pb-6 border-t">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    <div>Total rows: <span className="font-semibold">{editRows.length}</span></div>
                    <div className="mt-1">Preview total: <span className="font-bold">{
                      (() => {
                        const total = editRows.reduce((s, r) => {
                          const q = Number(r.qty || 0);
                          const u = Number(r.unit_price || 0);
                          return s + (Number.isFinite(q) && Number.isFinite(u) ? q * u : 0);
                        }, 0);
                        return total ? ` ₹${total}` : " —";
                      })()
                    }</span></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setEditOpen(false); }} disabled={editSaving} className="px-4 py-2 rounded border text-sm">Cancel</button>
                    <button onClick={submitEdit} disabled={editSaving} className={`px-4 py-2 rounded text-sm text_WHITE ${editSaving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                      {editSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

