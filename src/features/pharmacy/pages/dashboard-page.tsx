import { useMemo, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { paths } from "@/app/paths";
import { Icon } from "@/components/icons";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartLegend } from "@/components/charts/chart-tooltip";
import { DonutChart } from "@/components/charts/donut-chart";
import { RankedBars } from "@/components/charts/ranked-bars";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { Panel } from "@/components/ui/panel";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { PageHeader } from "@/features/pharmacy/components/page-header";
import { usePharmacyWorkspace } from "@/features/pharmacy/hooks/pharmacy-workspace";
import { stockList } from "@/features/pharmacy/services/stock-list";
import { claimsByHour, claimSeries, RANGES, rangeStart, ratio, timeToPayHistogram, topMedications, totals, type RangeKey } from "@/features/pharmacy/lib/stats";
import { transactionStore } from "@/features/requests/services/transaction-store";
import { median } from "@/lib/math";

const number = (value: number) => Math.round(value).toLocaleString("en-US");
const percent = (value: number) => `${Math.round(value * 100)}%`;

function ActionRow({ to, icon, count, children }: { to: string; icon: "inbox" | "clock" | "phone" | "upload"; count: number; children: ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-[14px] px-3 py-3 ring-1 ring-line transition-colors hover:bg-side-hover">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
        <Icon name={icon} className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-md">{children}</span>
      <span className="text-xl font-bold tabular-nums">{count}</span>
      <Icon name="chevronRight" className="size-4 text-muted" />
    </Link>
  );
}

/** How this pharmacy is doing on FindRx: claims, how many patients paid, and when demand comes in. */
export function PharmacyDashboardPage() {
  const [params] = useSearchParams();
  const range = (RANGES.find((item) => item.key === params.get("range"))?.key ?? "7d") as RangeKey;
  const { account, ledger, feed, stats, now } = usePharmacyWorkspace();
  const stock = stockList.use(account.id);
  const transactions = transactionStore.use();

  const data = useMemo(() => {
    const from = rangeStart(range, now);
    const series = claimSeries(range, ledger, now);
    const inRange = ledger.filter((entry) => entry.claimedAt >= from);
    const paidHere = transactions.filter((item) => item.pharmacyId === account.id && item.paidAt >= from);
    return {
      series,
      total: totals(series),
      byHour: claimsByHour(inRange),
      medications: topMedications(paidHere),
      payTimes: timeToPayHistogram(paidHere),
      paidHere,
      medianClaimMinutes: median(paidHere.map((item) => item.timeToClaimMs / 60_000)),
      delivery: paidHere.filter((item) => item.fulfilment === "delivery").length,
    };
  }, [range, ledger, now, transactions, account.id]);

  const { total } = data;
  const tickEvery = range === "30d" ? 5 : range === "today" ? 3 : 1;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Dashboard"
        subtitle={`How ${account.pharmacy.name} is doing on FindRx.`}
        action={
          <Badge tone={account.acceptingRequests ? "good" : "warn"}>{account.acceptingRequests ? "Accepting requests" : "Paused"}</Badge>
        }
      />

      <SegmentedTabs label="Date range" activeKey={range} items={RANGES.map((item) => ({ key: item.key, label: item.label, to: `?range=${item.key}` }))} />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label="Claims" value={total.claimed} format={number} caption="Requests you confirmed" />
        <KpiCard label="Patients connected" value={total.paid} format={number} caption="Ready for you to call" delay={40} />
        <KpiCard label="Conversion" value={ratio(total.paid, total.claimed - total.awaiting)} format={percent} caption="Connected ÷ settled claims" delay={80} />
        <KpiCard
          label="Median time to claim"
          value={data.medianClaimMinutes}
          format={(value) => (value ? `${Math.round(value)} min` : "–")}
          caption="From posting to your claim"
          delay={120}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Claims and patients connected"
          subtitle={range === "today" ? "By hour, today" : "By day"}
          action={<ChartLegend items={[{ label: "Claims", color: "var(--accent-soft-solid)" }, { label: "Connected", color: "var(--accent)" }]} />}
        >
          <BarChart
            ariaLabel="Claims and paid claims over time"
            data={data.series.map((item) => ({ label: item.label, detail: item.detail, value: item.claimed, inner: item.paid }))}
            valueLabel="Claims"
            innerLabel="Connected"
            showValues={data.series.length <= 8}
            tickEvery={tickEvery}
            height={260}
          />
        </Panel>

        <Panel title="Right now" delay={60}>
          <div className="grid gap-2.5">
            <ActionRow to={paths.pharmacy.medications} icon="upload" count={stock.length}>
              Import medications
            </ActionRow>
            <ActionRow to={paths.pharmacy.requests} icon="inbox" count={feed.length}>
              Open requests near you
            </ActionRow>
            <ActionRow to={paths.pharmacy.claimsTab("awaiting")} icon="clock" count={stats.awaitingPayment}>
              Waiting for the patient to connect
            </ActionRow>
            <ActionRow to={paths.pharmacy.claimsTab("paid")} icon="phone" count={stats.toContact}>
              Connected: call the patient
            </ActionRow>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Claim outcomes" subtitle="What happened after you claimed" delay={40}>
          <DonutChart
            ariaLabel="Claim outcomes"
            centerLabel="Claims"
            data={[
              { label: "Patient connected", value: total.paid, color: "var(--chart-3)" },
              { label: "Didn't connect", value: total.expired, color: "var(--chart-4)" },
              { label: "Waiting to connect", value: total.awaiting, color: "var(--chart-1)" },
            ]}
          />
        </Panel>
        <Panel title="When you claim" subtitle="Claims by hour of day" delay={80}>
          <BarChart ariaLabel="Claims by hour of day" data={data.byHour} valueLabel="Claims" showValues={false} height={220} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Most requested from you" subtitle="Connections in this period" delay={40}>
          {data.medications.length ? <RankedBars items={data.medications} /> : <p className="text-md text-muted">No connections in this period yet.</p>}
        </Panel>
        <Panel title="How fast patients connect" subtitle="Minutes from your claim to the connection" delay={80}>
          <BarChart ariaLabel="Minutes from claim to connection" data={data.payTimes} valueLabel="Patients" height={200} />
        </Panel>
        <Panel title="How patients get it" subtitle="Connections in this period" delay={120}>
          <div className="grid gap-5">
            {[
              { label: "Pickup", value: data.paidHere.length - data.delivery, color: "var(--chart-1)" },
              { label: "Delivery requested", value: data.delivery, color: "var(--chart-2)" },
            ].map((item) => (
              <div key={item.label} className="grid gap-1.5">
                <div className="flex justify-between text-md">
                  <span className="text-ink-2">{item.label}</span>
                  <span className="font-semibold tabular-nums">
                    {item.value} <span className="font-normal text-muted">· {percent(ratio(item.value, data.paidHere.length))}</span>
                  </span>
                </div>
                <span className="h-2.5 overflow-hidden rounded-full bg-side-well">
                  <span
                    className="block h-full rounded-full transition-[width] duration-700"
                    style={{ width: percent(ratio(item.value, data.paidHere.length)), background: item.color }}
                  />
                </span>
              </div>
            ))}
            <p className="text-sm text-muted">From {data.paidHere.length} connections.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
