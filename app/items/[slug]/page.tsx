"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PriceHistoryChart from "@/components/PriceHistoryChart";

interface ItemStats {
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

interface Purchase {
  date: string;
  amount: number;
  on_sale: number;
  inv_number: string;
}

interface ApiResponse {
  stats: ItemStats;
  purchases: Purchase[];
}

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  // fetchedSlug tracks the last slug for which a fetch completed; loading is derived
  const [fetchedSlug, setFetchedSlug] = useState<string | null>(null);
  const loading = fetchedSlug !== slug;
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch item data
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/items/${slug}`)
      .then((r) => {
        if (r.status === 404) return Promise.resolve(null);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setNotFound(d === null);
          setData(d as ApiResponse | null);
          setFetchedSlug(slug);
        }
      })
      .catch(() => { if (!cancelled) setFetchedSlug(slug); });
    return () => { cancelled = true; };
  }, [slug]);

  // Search suggestions
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      if (!search.trim()) {
        setSuggestions([]);
        return;
      }
      const res = await fetch(`/api/items?search=${encodeURIComponent(search)}`);
      const d = await res.json();
      if (!cancelled) setSuggestions(
        (d.items as { name: string }[]).slice(0, 8).map((i) => i.name)
      );
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search]);

  function handleSuggestionClick(name: string) {
    setSearch("");
    setSuggestions([]);
    setShowSuggestions(false);
    router.push(`/items/${encodeURIComponent(name)}`);
  }

  const name = decodeURIComponent(slug);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Search field */}
      <div className="relative">
        <input
          type="search"
          placeholder="Search another item…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => search && setShowSuggestions(true)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s}
                onMouseDown={() => handleSuggestionClick(s)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 hover:text-green-700 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/items" className="hover:text-green-700">Items</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{name}</span>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">Loading…</div>
      ) : notFound ? (
        <div className="text-center text-gray-400 py-20">
          Item &quot;{name}&quot; not found.{" "}
          <Link href="/items" className="text-green-700 hover:underline">
            Back to items
          </Link>
        </div>
      ) : data ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Spent", value: `$${data.stats.total_spent.toFixed(2)}`, icon: "💰" },
              { label: "Purchases", value: `${data.stats.count}×`, icon: "🛒" },
              { label: "Avg Price", value: `$${data.stats.avg_price.toFixed(2)}`, icon: "📊" },
              { label: "On Sale", value: `${data.stats.sale_count}×`, icon: "🏷️" },
              { label: "Min Price", value: `$${data.stats.min_price.toFixed(2)}`, icon: "⬇️" },
              { label: "Max Price", value: `$${data.stats.max_price.toFixed(2)}`, icon: "⬆️" },
              { label: "First Seen", value: data.stats.first_seen, icon: "📅" },
              { label: "Last Seen", value: data.stats.last_seen, icon: "📅" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white rounded-xl shadow p-4 flex flex-col gap-1">
                <span className="text-xl">{icon}</span>
                <span className="text-xs text-gray-500 font-medium">{label}</span>
                <span className="text-base font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>

          {/* Category badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Category:</span>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
              {data.stats.category}
            </span>
          </div>

          {/* Price history chart */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Price History</h2>
            <p className="text-xs text-gray-400 mb-4">
              🟩 Regular price &nbsp;|&nbsp; 🟨 On sale
            </p>
            <PriceHistoryChart
              purchases={data.purchases}
              avgPrice={data.stats.avg_price}
            />
          </div>

          {/* Recent purchases */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-800 mb-4">All Purchases</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Price</th>
                    <th className="pb-2 font-medium">On Sale?</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.purchases].reverse().map((p, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 pr-4 text-gray-700">{p.date}</td>
                      <td className="py-2 pr-4 font-semibold text-gray-900">
                        ${p.amount.toFixed(2)}
                      </td>
                      <td className="py-2">
                        {p.on_sale ? (
                          <span className="text-amber-600 font-medium text-xs">🏷 SALE</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
