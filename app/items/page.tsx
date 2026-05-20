"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Tag } from "lucide-react";

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
  if (sort !== col)
    return (
      <ChevronsUpDown
        size={12}
        strokeWidth={2}
        style={{ color: "var(--fg-disabled)", marginLeft: 4 }}
      />
    );
  return sort === col && order === "desc" ? (
    <ChevronDown size={12} strokeWidth={2} style={{ color: "var(--brand)", marginLeft: 4 }} />
  ) : (
    <ChevronUp size={12} strokeWidth={2} style={{ color: "var(--brand)", marginLeft: 4 }} />
  );
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const currentParams = new URLSearchParams({
    category,
    search: debouncedSearch,
    sort,
    order,
  }).toString();
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
      .catch(() => {
        if (!cancelled) setFetchedParams(paramsStr);
      });
    return () => {
      cancelled = true;
    };
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
      {/* Page header */}
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-h1)",
            fontWeight: 700,
            lineHeight: "var(--lh-h1)",
            letterSpacing: "var(--tracking-h1)",
            color: "var(--fg-default)",
            margin: 0,
          }}
        >
          Items
        </h1>
        <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--fg-muted)", marginTop: 4 }}>
          All products purchased, aggregated across receipts
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search
            size={14}
            strokeWidth={1.75}
            style={{
              position: "absolute",
              left: 12,
              color: "var(--fg-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--fs-body-sm)",
              color: "var(--fg-default)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-sm)",
              padding: "8px 12px 8px 34px",
              width: 240,
              outline: "none",
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = "var(--brand)";
              (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px var(--focus-ring)";
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = "var(--border-default)";
              (e.target as HTMLInputElement).style.boxShadow = "none";
            }}
          />
        </div>

        {/* Category filter */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--fs-body-sm)",
            color: "var(--fg-default)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--r-sm)",
            padding: "8px 12px",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Count */}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "var(--fs-body-sm)",
            color: "var(--fg-subtle)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {loading ? "Loading…" : `${items.length} item${items.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", fontSize: "var(--fs-body-sm)", borderCollapse: "collapse" }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--bg-surface-2)",
                  borderBottom: "1px solid var(--border-subtle)",
                  textAlign: "left",
                  color: "var(--fg-muted)",
                }}
              >
                {(
                  [
                    { key: "name" as SortKey, label: "Item", sortable: true },
                    { key: null, label: "Category", sortable: false },
                    {
                      key: "total_spent" as SortKey,
                      label: "Total Spent",
                      sortable: true,
                      right: true,
                    },
                    { key: "count" as SortKey, label: "Purchases", sortable: true, right: true },
                    {
                      key: "avg_price" as SortKey,
                      label: "Avg Price",
                      sortable: true,
                      right: true,
                    },
                    { key: null, label: "Min / Max", sortable: false, right: true },
                    { key: null, label: "On Sale", sortable: false, right: true },
                    { key: null, label: "Last Seen", sortable: false },
                  ] as { key: SortKey | null; label: string; sortable: boolean; right?: boolean }[]
                ).map(({ key, label, sortable, right }) => (
                  <th
                    key={label}
                    style={{
                      padding: "10px 16px",
                      fontWeight: 600,
                      fontSize: "var(--fs-overline)",
                      letterSpacing: "var(--tracking-overline)",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      textAlign: right ? "right" : "left",
                    }}
                  >
                    {sortable && key ? (
                      <button
                        onClick={() => toggleSort(key)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          fontWeight: "inherit",
                          fontSize: "inherit",
                          letterSpacing: "inherit",
                          textTransform: "inherit",
                          color: "inherit",
                        }}
                      >
                        {label}
                        <SortIcon col={key} sort={sort} order={order} />
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "48px 16px",
                      textAlign: "center",
                      color: "var(--fg-muted)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--fs-body-sm)",
                    }}
                  >
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "48px 16px",
                      textAlign: "center",
                      color: "var(--fg-muted)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--fs-body-sm)",
                    }}
                  >
                    No items found. Sync your receipts to get started.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={`${item.name}-${item.category}`}
                    style={{ borderTop: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Name */}
                    <td style={{ padding: "12px 16px" }}>
                      <Link
                        href={`/items/${encodeURIComponent(item.name)}`}
                        style={{
                          fontWeight: 500,
                          color: "var(--brand)",
                          textDecoration: "none",
                          fontSize: "var(--fs-body-sm)",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.color = "var(--brand-hover)";
                          (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.color = "var(--brand)";
                          (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
                        }}
                      >
                        {item.name}
                      </Link>
                    </td>

                    {/* Category badge */}
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "var(--fs-caption)",
                          fontWeight: 500,
                          padding: "3px 10px",
                          borderRadius: "var(--r-pill)",
                          background: "var(--sage-50)",
                          color: "var(--sage-600)",
                        }}
                      >
                        {item.category}
                      </span>
                    </td>

                    {/* Total spent */}
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--fg-default)",
                      }}
                    >
                      ${item.total_spent.toFixed(2)}
                    </td>

                    {/* Count */}
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--fg-muted)",
                      }}
                    >
                      {item.count}×
                    </td>

                    {/* Avg price */}
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--fg-muted)",
                      }}
                    >
                      ${item.avg_price.toFixed(2)}
                    </td>

                    {/* Min / Max */}
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: "var(--fs-caption)",
                        color: "var(--fg-subtle)",
                      }}
                    >
                      ${item.min_price.toFixed(2)} – ${item.max_price.toFixed(2)}
                    </td>

                    {/* On sale */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {item.sale_count > 0 ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "var(--fs-caption)",
                            fontWeight: 600,
                            color: "var(--warn-700)",
                          }}
                        >
                          <Tag size={11} strokeWidth={2} />
                          {item.sale_count}×
                        </span>
                      ) : (
                        <span
                          style={{ color: "var(--fg-disabled)", fontSize: "var(--fs-caption)" }}
                        >
                          —
                        </span>
                      )}
                    </td>

                    {/* Last seen */}
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "var(--fs-caption)",
                        color: "var(--fg-subtle)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {item.last_seen}
                    </td>
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
