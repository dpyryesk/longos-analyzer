"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import {
  Wallet,
  ShoppingCart,
  BarChart2,
  Tag,
  TrendingDown,
  TrendingUp,
  Calendar,
  Search,
} from "lucide-react";

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

// Shared surface wrapper
function Surface({
  children,
  padded = true,
  style = {},
}: {
  children: React.ReactNode;
  padded?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow-sm)",
        ...(padded ? { padding: 24 } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function ItemDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
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
      .catch(() => {
        if (!cancelled) setFetchedSlug(slug);
      });
    return () => {
      cancelled = true;
    };
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
      try {
        const res = await fetch(`/api/items?search=${encodeURIComponent(search)}`);
        if (!res.ok) {
          if (!cancelled) setSuggestions([]);
          return;
        }
        const d = await res.json();
        if (!cancelled)
          setSuggestions((d.items as { name: string }[]).slice(0, 8).map((i) => i.name));
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  function handleSuggestionClick(name: string) {
    setSearch("");
    setSuggestions([]);
    setShowSuggestions(false);
    router.push(`/items/${encodeURIComponent(name)}`);
  }

  const name = decodeURIComponent(slug);

  // KPI card definition from stats
  const kpiCards = data
    ? [
        { label: "Total Spent", value: `$${data.stats.total_spent.toFixed(2)}`, Icon: Wallet },
        { label: "Purchases", value: `${data.stats.count}×`, Icon: ShoppingCart },
        { label: "Avg Price", value: `$${data.stats.avg_price.toFixed(2)}`, Icon: BarChart2 },
        { label: "On Sale", value: `${data.stats.sale_count}×`, Icon: Tag },
        { label: "Min Price", value: `$${data.stats.min_price.toFixed(2)}`, Icon: TrendingDown },
        { label: "Max Price", value: `$${data.stats.max_price.toFixed(2)}`, Icon: TrendingUp },
        { label: "First Seen", value: data.stats.first_seen, Icon: Calendar },
        { label: "Last Seen", value: data.stats.last_seen, Icon: Calendar },
      ]
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
      {/* Search field */}
      <div style={{ position: "relative" }}>
        <Search
          size={14}
          strokeWidth={1.75}
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--fg-muted)",
            pointerEvents: "none",
          }}
        />
        <input
          type="search"
          placeholder="Search another item…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowSuggestions(true);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => search && setShowSuggestions(true)}
          style={{
            width: "100%",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--fs-body)",
            color: "var(--fg-default)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--r-lg)",
            padding: "12px 16px 12px 38px",
            outline: "none",
            boxShadow: "var(--shadow-xs)",
          }}
          onFocusCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = "var(--border-brand)";
            (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px var(--focus-ring)";
          }}
          onBlurCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = "var(--border-default)";
            (e.target as HTMLInputElement).style.boxShadow = "var(--shadow-xs)";
          }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 50,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
            }}
          >
            {suggestions.map((s) => (
              <button
                key={s}
                onMouseDown={() => handleSuggestionClick(s)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 16px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--fs-body-sm)",
                  color: "var(--fg-default)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border-subtle)",
                  transition: "background var(--dur-fast)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-soft)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: "var(--fs-body-sm)",
          color: "var(--fg-muted)",
        }}
      >
        <Link
          href="/items"
          style={{ color: "var(--fg-muted)", textDecoration: "none" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--brand)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--fg-muted)";
          }}
        >
          Items
        </Link>
        <span style={{ color: "var(--fg-disabled)" }}>›</span>
        <span style={{ color: "var(--fg-default)", fontWeight: 500 }}>{name}</span>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            color: "var(--fg-muted)",
            padding: "80px 0",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--fs-body-sm)",
          }}
        >
          Loading…
        </div>
      ) : notFound ? (
        <div
          style={{
            textAlign: "center",
            color: "var(--fg-muted)",
            padding: "80px 0",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--fs-body-sm)",
          }}
        >
          Item &quot;{name}&quot; not found.{" "}
          <Link href="/items" style={{ color: "var(--brand)", textDecoration: "underline" }}>
            Back to items
          </Link>
        </div>
      ) : data ? (
        <>
          {/* Item name + category */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
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
              {data.stats.name}
            </h1>
            <span
              style={{
                fontSize: "var(--fs-caption)",
                fontWeight: 500,
                padding: "4px 12px",
                borderRadius: "var(--r-pill)",
                background: "var(--sage-50)",
                color: "var(--sage-600)",
              }}
            >
              {data.stats.category}
            </span>
          </div>

          {/* KPI grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {kpiCards.map(({ label, value, Icon }) => (
              <Surface key={label} style={{ padding: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "var(--fs-overline)",
                        fontWeight: 600,
                        letterSpacing: "var(--tracking-overline)",
                        textTransform: "uppercase",
                        color: "var(--fg-muted)",
                      }}
                    >
                      {label}
                    </span>
                    <Icon size={15} strokeWidth={1.75} style={{ color: "var(--fg-subtle)" }} />
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--fs-h3)",
                      fontWeight: 700,
                      color: "var(--fg-default)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {value}
                  </span>
                </div>
              </Surface>
            ))}
          </div>

          {/* Price history chart */}
          <Surface>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--fs-h2)",
                fontWeight: 600,
                color: "var(--fg-default)",
                margin: "0 0 4px",
              }}
            >
              Price History
            </h2>
            <p
              style={{
                fontSize: "var(--fs-caption)",
                color: "var(--fg-muted)",
                margin: "0 0 20px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "#4F6B40",
                  marginRight: 4,
                }}
              />
              Regular price
              <span style={{ margin: "0 8px", color: "var(--fg-disabled)" }}>·</span>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "#D4A23A",
                  marginRight: 4,
                }}
              />
              On sale
            </p>
            <PriceHistoryChart purchases={data.purchases} avgPrice={data.stats.avg_price} />
          </Surface>

          {/* All purchases table */}
          <Surface padded={false}>
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--fs-h2)",
                  fontWeight: 600,
                  color: "var(--fg-default)",
                  margin: 0,
                }}
              >
                All Purchases
              </h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{ width: "100%", fontSize: "var(--fs-body-sm)", borderCollapse: "collapse" }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: "var(--bg-surface-2)",
                    }}
                  >
                    {["Date", "Price", "Status"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
                          textAlign: h === "Price" || h === "Status" ? "right" : "left",
                          fontWeight: 600,
                          fontSize: "var(--fs-overline)",
                          letterSpacing: "var(--tracking-overline)",
                          textTransform: "uppercase",
                          color: "var(--fg-muted)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...data.purchases].reverse().map((p, i) => (
                    <tr
                      key={i}
                      style={{ borderTop: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-surface-2)")
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td
                        style={{
                          padding: "11px 16px",
                          fontFamily: "var(--font-mono)",
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--fg-muted)",
                        }}
                      >
                        {p.date}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 600,
                          color: "var(--fg-default)",
                        }}
                      >
                        ${p.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: "11px 16px", textAlign: "right" }}>
                        {p.on_sale ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "var(--fs-caption)",
                              fontWeight: 600,
                              color: "var(--warn-700)",
                              background: "var(--warn-50)",
                              borderRadius: "var(--r-pill)",
                              padding: "2px 8px",
                            }}
                          >
                            <Tag size={10} strokeWidth={2} />
                            SALE
                          </span>
                        ) : (
                          <span
                            style={{ color: "var(--fg-disabled)", fontSize: "var(--fs-caption)" }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
        </>
      ) : null}
    </div>
  );
}
