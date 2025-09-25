// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import MasterAdminSidebar from "../components/MasterAdminSidebar";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { authFetch, getToken } from "../lib/auth";

function Badge({ children, tone = "neutral" }) {
  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
      : tone === "danger"
      ? "bg-red-50 text-red-700 border border-red-100"
      : tone === "warning"
      ? "bg-amber-50 text-amber-700 border border-amber-100"
      : tone === "info"
      ? "bg-blue-50 text-blue-700 border border-blue-100"
      : "bg-gray-50 text-gray-700 border border-gray-200";
  return <span className={`${base} ${toneClass}`}>{children}</span>;
}

function StatCard({ title, value, delta, icon, tone = "neutral", loading = false, to }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="text-sm text-gray-500">{title}</div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="mt-2">
        {loading ? (
          <div className="h-7 w-20 bg-gray-100 rounded animate-pulse" />
        ) : (
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        )}
      </div>
      <div className="mt-2">
        {typeof delta === "string" ? (
          <Badge tone={tone}>{delta}</Badge>
        ) : (
          <div className="h-4 w-28 bg-gray-50 rounded" />
        )}
      </div>
      {to && (
        <div className="mt-3">
          <Link className="text-xs text-emerald-700 hover:text-emerald-800" to={to}>
            View details →
          </Link>
        </div>
      )}
    </div>
  );
}

function SkeletonLine({ width = "w-full" }) {
  return <div className={`h-4 ${width} bg-gray-100 rounded animate-pulse`} />;
}

function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5a7 7 0 100 14 7 7 0 000-14z" />
      </svg>
      <span>Error: {message}</span>
    </div>
  );
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (/(delivered|completed|paid|success)/.test(s)) return "success";
  if (/(cancel|failed|refunded)/.test(s)) return "danger";
  if (/(pending|await|hold)/.test(s)) return "warning";
  if (/(processing|in\s*progress)/.test(s)) return "info";
  return "neutral";
}

export default function Dashboard() {
  const { user } = useAuth();

  // stock & products
  const [stock, setStock] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [lowStock, setLowStock] = useState([]);
  const [exceedStock, setExceedStock] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockError, setStockError] = useState(null);

  // orders
  const [orders, setOrders] = useState([]);
  const [latestOrder, setLatestOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  // users (customers = vendors)
  const [customersCount, setCustomersCount] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);

  // vehicles (count)
  const [vehicleCount, setVehicleCount] = useState(0);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehiclesError, setVehiclesError] = useState(null);

  // ---------- Fetch stock & build product map ----------
  useEffect(() => {
    let mounted = true;
    async function fetchStock() {
      setLoadingStock(true);
      setStockError(null);
      try {
        const token = getToken();
        if (!token) throw new Error("No auth token. Please login.");
        const data = await authFetch("/reports/stock-summary", { method: "GET" });
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : [];
        setStock(arr);
        setLowStock(arr.filter((p) => Number(p.qty) < 50));
        setExceedStock(arr.filter((p) => Number(p.qty) > 150));

        const map = {};
        arr.forEach((p) => {
          map[String(p.product_id)] = { name: p.name, sku: p.sku };
        });
        setProductMap(map);
      } catch (err) {
        console.error("Stock fetch error:", err);
        if (mounted) setStockError(err.message || "Failed to load stock");
      } finally {
        if (mounted) setLoadingStock(false);
      }
    }

    fetchStock();
    return () => (mounted = false);
  }, [user]);

  // ---------- Fetch orders (for count + latest) ----------
  useEffect(() => {
    let mounted = true;
    async function fetchOrders() {
      setLoadingOrders(true);
      setOrdersError(null);
      try {
        const token = getToken();
        if (!token) throw new Error("No auth token. Please login.");
        const data = await authFetch("/vendor/admin/orders?skip=0&limit=100", { method: "GET" });
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : [];
        setOrders(arr);

        if (arr.length) {
          const sorted = [...arr].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setLatestOrder(sorted[0]);
        } else {
          setLatestOrder(null);
        }
      } catch (err) {
        console.error("Orders fetch error:", err);
        if (mounted) setOrdersError(err.message || "Failed to load orders");
      } finally {
        if (mounted) setLoadingOrders(false);
      }
    }

    fetchOrders();
    return () => (mounted = false);
  }, [user]);

  // ---------- Fetch users (count vendors as customers) ----------
  useEffect(() => {
    let mounted = true;
    async function fetchUsers() {
      setLoadingUsers(true);
      setUsersError(null);
      try {
        const token = getToken();
        if (!token) throw new Error("No auth token. Please login.");
        const data = await authFetch("/users/", { method: "GET" });
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : [];
        const vendors = arr.filter((u) => u.role === "vendor");
        setCustomersCount(vendors.length);
      } catch (err) {
        console.error("Users fetch error:", err);
        if (mounted) setUsersError(err.message || "Failed to load users");
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    }

    fetchUsers();
    return () => (mounted = false);
  }, [user]);

  // ---------- Fetch vehicles (count) ----------
  useEffect(() => {
    let mounted = true;
    async function fetchVehicles() {
      setLoadingVehicles(true);
      setVehiclesError(null);
      try {
        const token = getToken();
        if (!token) throw new Error("No auth token. Please login.");
        const data = await authFetch("/vehicles/?me_only=false", { method: "GET" });
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : [];
        setVehicleCount(arr.length);
      } catch (err) {
        console.error("Vehicles fetch error:", err);
        if (mounted) setVehiclesError(err.message || "Failed to load vehicles");
      } finally {
        if (mounted) setLoadingVehicles(false);
      }
    }

    fetchVehicles();
    return () => (mounted = false);
  }, [user]);

  function getProductLabel(item) {
    const pid = String(item.product_id);
    const meta = productMap[pid];
    if (meta && meta.name) return `${meta.name} — Qty: ${item.qty}`;
    if (meta && meta.sku) return `${meta.sku} — Qty: ${item.qty}`;
    return `Product ID: ${item.product_id} — Qty: ${item.qty}`;
  }

  const statIconCls = "w-5 h-5";
  const stats = [
    {
      title: "Total Customers",
      value: loadingUsers ? "…" : customersCount,
      delta: customersCount ? `${customersCount} vendors` : "—",
      icon: (
        <svg className={statIconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zM8 11c1.657 0 3-1.79 3-4S9.657 3 8 3 5 4.79 5 7s1.343 4 3 4zM8 13c-3.314 0-6 2.686-6 6h6m8 0h6c0-3.314-2.686-6-6-6" />
        </svg>
      ),
      tone: "info",
    },
    {
      title: "Total Products",
      value: loadingStock ? "…" : stock.length ?? "—",
      delta: "+5% from last month",
      icon: (
        <svg className={statIconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 0 0-1.106-1.789l-7-3.5a2 2 0 0 0-1.788 0l-7 3.5A2 2 0 0 0 3 8v8a2 2 0 0 0 1.106 1.789l7 3.5a2 2 0 0 0 1.788 0l7-3.5A2 2 0 0 0 21 16z" />
        </svg>
      ),
      tone: "neutral",
    },
    {
      title: "Total Vehicles",
      value: loadingVehicles ? "…" : vehicleCount,
      delta: vehiclesError ? "Error loading vehicles" : `${vehicleCount} vehicles`,
      icon: (
        <svg className={statIconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 13l2-5h14l2 5M5 13h14M6 17a2 2 0 11.001-3.999A2 2 0 016 17zm12 0a2 2 0 11.001-3.999A2 2 0 0118 17z" />
        </svg>
      ),
      tone: vehiclesError ? "danger" : "info",
    },
    {
      title: "Total Orders",
      value: loadingOrders ? "…" : orders.length,
      delta: orders.length ? `${orders.length} fetched` : "—",
      icon: (
        <svg className={statIconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M6 3h12a1 1 0 011 1v16l-7-3-7 3V4a1 1 0 011-1z" />
        </svg>
      ),
      tone: "success",
    },
  ];

  const lowStockTone = (qty) => {
    const n = Number(qty || 0);
    if (n < 10) return "danger";
    if (n < 30) return "warning";
    return "info";
  };

  const latestOrderItems = useMemo(() => {
    return Array.isArray(latestOrder?.items) ? latestOrder.items : [];
  }, [latestOrder]);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <MasterAdminSidebar />

      <div className="flex-1 p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back! Here's what's happening with your business.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-gray-600">{user?.name || user?.email}</div>
            <div className="flex items-center gap-2">
              <Link to="/orders" className="px-3 py-1.5 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700">Orders</Link>
              <Link to="/inventory" className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">Inventory</Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <StatCard
              key={s.title}
              title={s.title}
              value={s.value}
              delta={s.delta}
              icon={s.icon}
              tone={s.tone}
              loading={s.value === "…"}
            />
          ))}
        </div>

        {/* Latest Order + Low Stock */}
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Latest Order */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 xl:col-span-2">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Latest Order</h4>
              <Link className="text-sm text-emerald-700 hover:text-emerald-800" to="/orders">See all</Link>
            </div>

            <div className="mt-4">
              {loadingOrders ? (
                <div className="space-y-3">
                  <SkeletonLine width="w-48" />
                  <SkeletonLine width="w-64" />
                  <SkeletonLine width="w-40" />
                </div>
              ) : ordersError ? (
                <ErrorAlert message={ordersError} />
              ) : latestOrder ? (
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="font-medium text-gray-800">Order #{latestOrder.id}</div>
                    <Badge tone={statusTone(latestOrder.status)}>{latestOrder.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    Created: {new Date(latestOrder.created_at).toLocaleString()}
                  </div>
                  <div className="mt-2 text-sm">Total: ₹{latestOrder.total}</div>

                  <div className="mt-4">
                    <div className="text-sm font-semibold">Items</div>
                    <ul className="mt-2 divide-y divide-gray-100">
                      {latestOrderItems.length ? (
                        latestOrderItems.map((it) => (
                          <li key={it.id} className="py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-semibold">
                              {(productMap[String(it.product_id)]?.name || String(it.product_id))
                                .split(" ")
                                .map((s) => s[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-800 truncate">{getProductLabel(it)}</div>
                            </div>
                            <Badge tone="info">Qty: {it.qty}</Badge>
                          </li>
                        ))
                      ) : (
                        <li className="py-3 text-sm text-gray-500">No items</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No orders found.</div>
              )}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h4>
              <Link className="text-sm text-emerald-700 hover:text-emerald-800" to="/inventory">Manage</Link>
            </div>
            <div className="mt-4 space-y-3">
              {loadingStock ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonLine key={i} />
                  ))}
                </div>
              ) : stockError ? (
                <ErrorAlert message={stockError} />
              ) : lowStock.length === 0 ? (
                <div className="text-sm text-gray-500">No low stock items.</div>
              ) : (
                lowStock.slice(0, 6).map((p) => (
                  <div key={p.product_id} className="flex items-center justify-between p-3 rounded-md border border-red-100 bg-red-50">
                    <div className="min-w-0">
                      <div className="font-medium text-red-700 truncate">{p.name}</div>
                      <div className="text-xs text-red-600">Only {p.qty} units left</div>
                    </div>
                    <Badge tone={lowStockTone(p.qty)}>{Number(p.qty)} left</Badge>
                  </div>
                ))
              )}
              {!loadingStock && lowStock.length > 6 && (
                <div className="text-xs text-gray-500">Showing top 6 low-stock items.</div>
              )}
            </div>
            {exceedStock.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-gray-900">Overstocked</h5>
                  <Badge tone="warning">{exceedStock.length}</Badge>
                </div>
                <div className="mt-2 space-y-2">
                  {exceedStock.slice(0, 3).map((p) => (
                    <div key={p.product_id} className="flex items-center justify-between p-2 rounded border border-amber-100 bg-amber-50">
                      <div className="text-sm text-amber-800 truncate">{p.name}</div>
                      <span className="text-xs text-amber-700">Qty: {p.qty}</span>
                    </div>
                  ))}
                  {exceedStock.length > 3 && (
                    <div className="text-xs text-gray-500">And {exceedStock.length - 3} more…</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">Recent Orders</h4>
            <Link className="text-sm text-emerald-700 hover:text-emerald-800" to="/orders">View all</Link>
          </div>
          <div className="mt-4">
            {loadingOrders ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonLine key={i} />
                ))}
              </div>
            ) : ordersError ? (
              <ErrorAlert message={ordersError} />
            ) : orders.length === 0 ? (
              <div className="text-sm text-gray-500">No recent orders.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {orders
                  .slice()
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .slice(0, 5)
                  .map((o) => (
                    <li key={o.id} className="py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-semibold">
                        #{o.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm text-gray-800 truncate">₹{o.total}</div>
                          <div className="text-xs text-gray-500 flex-shrink-0">{new Date(o.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{Array.isArray(o.items) ? `${o.items.length} item(s)` : "—"}</div>
                      </div>
                      <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

