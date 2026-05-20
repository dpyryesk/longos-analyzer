"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ItemRow {
  name: string;
  category: string;
  total_spent: number;
  count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  first_seen: string;
  last_seen: string;
  sale_count: number;
}

type SortKey = "total_spent" | "count" | "avg_price" | "name";

function SortIcon({ col, sort, order }: { col: SortKey; sort: SortKey; order: "asc" | "desc" }) {
  if (sort !== col) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-green-700 ml-1">{order === "desc" ? "↓" : "↑"}</span>;
}

export default function ItemsPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [fetchedParams, setFetchedParams] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("total_spent");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const currentParams = new URLSearchParams({ category, search: debouncedSearch, sort, order }).toString();
  // loading is derived: true whenever the last completed fetch used different params
  const loading = fetchedParams !== currentParams;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ category, search: debouncedSearch, sort, order });
    const paramsStr = params.toString();
    fetch(`/api/items?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setItems(data.items ?? []);
          setCategories(data.categories ?? []);
          setFetchedParams(paramsStr);
        }
      })
      .catch(() => { if (!cancelled) setFetchedParams(paramsStr); });
    return () => { cancelled = true; };
  }, [category, debouncedSearch, sort, order]);

  function toggleSort(key: SortKey) {
    if (sort === key) {
      setOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSort(key);
      setOrder("desc");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Items</h1>
        <p className="text-sm text-gray-500 mt-1">
          All products purchased, aggregated across receipts
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-400 ml-auto">
          {loading ? "Loading…" : `${items.length} item${items.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => toggleSort("name")} className="flex items-center hover:text-gray-900">
                    Item <SortIcon col="name" sort={sort} order={order} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => toggleSort("total_spent")} className="flex items-center hover:text-gray-900">
                    Total Spent <SortIcon col="total_spent" sort={sort} order={order} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => toggleSort("count")} className="flex items-center hover:text-gray-900">
                    Purchases <SortIcon col="count" sort={sort} order={order} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => toggleSort("avg_price")} className="flex items-center hover:text-gray-900">
                    Avg Price <SortIcon col="avg_price" sort={sort} order={order} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Min/Max</th>
                <th className="px-4 py-3 font-medium">On Sale</th>
                <th className="px-4 py-3 font-medium">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    No items found. Sync your receipts to get started.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={`${item.name}-${item.category}`}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/items/${encodeURIComponent(item.name)}`}
                        className="text-green-700 hover:underline font-medium"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      ${item.total_spent.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.count}×</td>
                    <td className="px-4 py-3 text-gray-600">${item.avg_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      ${item.min_price.toFixed(2)} – ${item.max_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {item.sale_count > 0 ? (
                        <span className="text-amber-600 font-medium">
                          🏷 {item.sale_count}×
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{item.last_seen}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
