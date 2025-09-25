// src/pages/vendor/MyOrders.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import VendorSidebar from "../../components/VendorSidebar";
import { authFetch } from "../../lib/auth";
import { useToast } from "../../components/Toast";

const API_UPLOADS = "http://127.0.0.1:8000";

const ORDER_STATUS_SEQUENCE = [
  "placed",
  "confirmed",
  "processing",
  "shipped",
  "received",
  "payment_checked",
  "cancelled",
  "returned",
];

const STATUS_LABEL = {
  placed: "Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  received: "Received",
  payment_checked: "Payment Checked",
  cancelled: "Cancelled",
  returned: "Returned",
};

function statusLabel(s) {
  return STATUS_LABEL[s] || String(s || "");
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d || "-";
  }
}

function formatINR(n) {
  try {
    return `₹${Number(n || 0).toLocaleString("en-IN")}`;
  } catch {
    return `₹${n}`;
  }
}

function StatusPill({ status }) {
  const map = {
    placed: "bg-purple-50 text-purple-700",
    confirmed: "bg-purple-100 text-purple-800",
    processing: "bg-yellow-50 text-yellow-800",
    shipped: "bg-blue-50 text-blue-700",
    received: "bg-green-50 text-green-700",
    payment_checked: "bg-green-100 text-green-800",
    cancelled: "bg-red-50 text-red-700",
    returned: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded ${map[status] || "bg-gray-50 text-gray-700"}`}>
      {statusLabel(status)}
    </span>
  );
}

function HorizontalStepper({ currentStatus }) {
  const idx = ORDER_STATUS_SEQUENCE.indexOf(currentStatus);
  const currentIndex = idx === -1 ? Math.max(0, ORDER_STATUS_SEQUENCE.length - 1) : idx;

  return (
    <div className="w-full overflow-auto">
      <div className="flex items-center gap-2 px-2">
        {ORDER_STATUS_SEQUENCE.map((s, i) => {
          const completed = i < currentIndex && currentIndex >= 0;
          const active = i === currentIndex;
          const circleBase = "flex items-center justify-center w-9 h-9 rounded-full border transition-all";
          const circleClass = completed
            ? "bg-purple-600 text-white border-purple-600"
            : active
            ? "bg-white text-purple-700 border-purple-300 shadow-sm"
            : "bg-white text-gray-400 border-gray-200";
          const connectorClass = completed ? "bg-purple-500" : active ? "bg-purple-300" : "bg-gray-200";

          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center min-w-[84px]">
                <div className={`${circleBase} ${circleClass}`}>
                  {completed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 10-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : active ? (
                    <span className="text-sm font-semibold">{i + 1}</span>
                  ) : (
                    <span className="text-sm">{i + 1}</span>
                  )}
                </div>
                <div className={`mt-2 text-[11px] text-center truncate ${active ? "text-purple-700 font-medium" : "text-gray-500"}`} style={{ maxWidth: 84 }}>
                  {statusLabel(s)}
                </div>
              </div>
              {i !== ORDER_STATUS_SEQUENCE.length - 1 && (
                <div className={`flex-1 h-0.5 ${connectorClass}`} style={{ minWidth: 28 }} aria-hidden />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {(currentStatus === "cancelled" || currentStatus === "returned") && (
        <div className="mt-2">
          <StatusPill status={currentStatus} />
        </div>
      )}
    </div>
  );
}

export default function VendorMyOrders() {
  const toast = useToast();
  const mounted = useRef(true);

  const [orders, setOrders] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [expanded, setExpanded] = useState({});
  const [drawer, setDrawer] = useState({ open: false, order: null });
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    async function fetchProducts() {
      try {
        const cached = sessionStorage.getItem("products_cache_v1");
        if (cached) {
          setProductsMap(JSON.parse(cached).reduce((m, p) => ((m[p.id] = p), m), {}));
          return;
        }
        const data = await authFetch("/products/", { method: "GET", signal: controller.signal });
        if (!mounted.current) return;
        const map = (Array.isArray(data) ? data : []).reduce((m, p) => ((m[p.id] = p), m), {});
        setProductsMap(map);
        try { sessionStorage.setItem("products_cache_v1", JSON.stringify(Array.isArray(data) ? data : [])); } catch {}
      } catch (err) {
        if (err.name !== "AbortError") console.error("products fetch", err);
      }
    }
    async function fetchOrders() {
      setLoading(true);
      try {
        const data = await authFetch("/orders/me?limit=50&offset=0", { method: "GET", signal: controller.signal });
        if (!mounted.current) return;
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("orders fetch", err);
          toast(err?.message || "Failed to load orders", "error");
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchProducts();
    fetchOrders();
    return () => { mounted.current = false; controller.abort(); };
  }, [refreshKey, toast]);

  const totals = useMemo(() => {
    const list = orders.filter((o) => statusFilter === "all" ? true : o.status === statusFilter);
    const ql = q.trim().toLowerCase();
    const list2 = ql ? list.filter((o) => String(o.id).includes(ql) || (o.shipping_address || "").toLowerCase().includes(ql)) : list;
    const count = list2.length;
    const amount = list2.reduce((s, o) => {
      const val = o.total_amount !== undefined && o.total_amount !== null ? Number(o.total_amount) : (o.total !== undefined && o.total !== null ? Number(o.total) : 0);
      return s + (Number(val) || 0);
    }, 0);
    return { count, amount, list: list2 };
  }, [orders, statusFilter, q]);

  function prodName(id) {
    const p = productsMap?.[id];
    return p ? `${p.name}` : `#${id}`;
  }
  function toggleExpand(id) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <VendorSidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-600 mt-1">Orders with progress steppers — click an order to expand.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders..." className="w-52 pl-3 pr-3 py-2 rounded-md border" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-md border text-sm">
              <option value="all">All</option>
              {ORDER_STATUS_SEQUENCE.map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
            <button type="button" onClick={() => setRefreshKey((k) => k + 1)} className="px-4 py-2 rounded-md bg-white border text-sm hover:bg-gray-50">
              Refresh
            </button>
            <div className="text-right">
              <div className="text-sm text-gray-500">Orders</div>
              <div className="text-lg font-semibold text-gray-900">{totals.count}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total amount</div>
              <div className="text-lg font-semibold text-gray-900">{formatINR(totals.amount)}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="p-6 rounded-lg bg-white border text-center text-gray-500">Loading orders…</div>
          ) : totals.list.length === 0 ? (
            <div className="p-6 rounded-lg bg-white border text-center text-gray-500">No orders found.</div>
          ) : (
            totals.list.map((o) => {
              const isOpen = !!expanded[o.id];
              return (
                <article key={o.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">#{o.id}</div>

                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">Order #{o.id}</h3>
                          <StatusPill status={o.status} />
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Created: {fmtDate(o.created_at)} {o.expected_date ? <>· Expected: {fmtDate(o.expected_date)}</> : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right mr-2">
                        <div className="text-sm text-gray-500">Total</div>
                        <div className="text-lg font-semibold">{formatINR(o.total_amount !== undefined && o.total_amount !== null ? o.total_amount : (o.total ?? 0))}</div>
                      </div>
                      <button onClick={() => toggleExpand(o.id)} aria-expanded={isOpen} className="px-3 py-2 rounded-md bg-white border text-sm hover:bg-gray-50">
                        {isOpen ? "Collapse" : "Expand"}
                      </button>
                    </div>
                  </div>

                  <div className={`mt-4 transition-all duration-200 ease-in-out ${isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2">
                        <div className="text-sm text-gray-700">
                          <div className="mb-2 font-medium">Items</div>
                          <ul className="space-y-2">
                            {Array.isArray(o.items) && o.items.length > 0 ? (
                              o.items.map((it) => {
                                const qty = (it.final_qty !== undefined && it.final_qty !== null) ? it.final_qty : (it.original_qty !== undefined && it.original_qty !== null ? it.original_qty : (it.qty ?? 0));
                                const unit = (it.unit_price !== undefined && it.unit_price !== null) ? it.unit_price : (it.unitPrice !== undefined && it.unitPrice !== null ? it.unitPrice : (it.price ?? "-"));
                                const computedSubtotal = (it.subtotal !== undefined && it.subtotal !== null) ? it.subtotal : (it.sub_total !== undefined && it.sub_total !== null ? it.sub_total : (Number(unit) * qty));
                                const subtotal = (computedSubtotal !== undefined && computedSubtotal !== null) ? computedSubtotal : "-";
                                const key = it.id !== undefined && it.id !== null ? it.id : `${o.id}-${it.product_id}`;
                                return (
                                  <li key={key} className="flex items-center justify-between gap-4">
                                    <div>
                                      <div className="text-sm font-medium">{prodName(it.product_id)}</div>
                                      <div className="text-xs text-gray-500">Qty: {qty} · {unit !== "-" ? `₹${unit}` : "—"} each</div>
                                    </div>
                                    <div className="text-sm text-gray-700 font-medium">{subtotal === "-" ? "-" : formatINR(subtotal)}</div>
                                  </li>
                                );
                              })
                            ) : (
                              <li className="text-gray-500">No items</li>
                            )}
                          </ul>
                          {o.shipping_address || o.notes ? (
                            <div className="mt-3 text-xs text-gray-500">
                              {o.shipping_address ? <div><strong>Shipping:</strong> {o.shipping_address}</div> : null}
                              {o.notes ? <div><strong>Notes:</strong> {o.notes}</div> : null}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="lg:col-span-1">
                        <div>
                          <div className="mb-2 font-medium">Order progress</div>
                          <div className="bg-gray-50 p-3 rounded">
                            <HorizontalStepper currentStatus={o.status} />
                            <div className="mt-3 text-xs text-gray-500">Tip: steps show progress; completed steps have checkmarks.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

