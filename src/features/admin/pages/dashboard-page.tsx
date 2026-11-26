import { useMemo, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { paths } from "@/app/paths";
import { Icon } from "@/components/icons";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartLegend } from "@/components/charts/chart-tooltip";
import { DonutChart } from "@/components/charts/donut-chart";
import { RankedBars } from "@/components/charts/ranked-bars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  buildSeries,
  claimTimeHistogram,
  hourlyProfile,
  median,
  RANGES,
  rangeStart,
  ratio,
  toCsv,
  topMedications,
  topPharmacies,
  totalsOf,
  transactionsIn,
  type RangeKey,
} from "@/features/admin/lib/analytics";
import { authService } from "@/features/auth/auth-service";
import { platformSettings } from "@/features/platform/platform-settings";
import { formatUsd } from "@/features/requests/lib/formatters";
import { requestService } from "@/features/requests/services/request-service";
import { transactionStore } from "@/features/requests/services/transaction-store";
import { downloadText } from "@/lib/download";
import { useNow } from "@/lib/use-now";

const number = (value: number) => Math.round(value).toLocaleString("en-US");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const change = (current: number, previous: number) =>
  previous > 0 ? (current - previous) / previous : undefined;

function AttentionItem({
  to,
  children,
  badge,
}: {
  to?: string;
  children: ReactNode;
  badge?: ReactNode;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">{children}</span>
      {badge ??
        (to ? (
          <Icon name="chevronRight" className="size-4 text-muted" />
        ) : null)}
    </>
  );
  const className =
    "flex items-center gap-3 rounded-[14px] px-4 py-3 text-md ring-1 ring-line transition-colors";
  return to ? (
    <Link to={to} className={`${className} hover:bg-side-hover`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function DashboardPage() {
  const [params] = useSearchParams();
  const range = (RANGES.find((item) => item.key === params.get("range"))?.key ??
    "7d") as RangeKey;
  const now = useNow(60_000);
  const requests = requestService.use();
  const transactions = transactionStore.use();
  const pharmacies = authService.useAllPharmacies();
  const { feeCents, purgeTime, retentionHours } = platformSettings.use();

  const data = useMemo(() => {
    const series = buildSeries(range, now, requests);
    const previous = totalsOf(buildSeries(range, now, requests, 1));
    const totals = totalsOf(series);
    const inRange = transactionsIn(transactions, rangeStart(range, now));
    return {
      series,
      totals,
      previous,
      inRange,
      medianClaimMinutes: median(
        inRange.map((item) => item.timeToClaimMs / 60_000),
      ),
      refundedInRange: inRange.filter((item) => item.status === "refunded")
        .length,
      delivery: inRange.filter((item) => item.fulfilment === "delivery").length,
      compounding: inRange.filter((item) => item.needsCompounding).length,
    };
  }, [range, now, requests, transactions]);

  const { series, totals, previous, inRange } = data;
  const active = pharmacies.filter((item) => item.status === "active").length;
  const pending = pharmacies.filter((item) => item.status === "pending").length;
  const infoRequested = pharmacies.filter(
    (item) => item.status === "info_requested",
  ).length;
  const dense = series.length > 12;
  const tickEvery = range === "30d" ? 5 : range === "today" ? 3 : 1;

  const exportCsv = () =>
    downloadText(`findrx-dashboard-${range}.csv`, toCsv(series, feeCents));

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Dashboard"
        subtitle="Platform health from anonymized records. Counts survive the daily purge."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={<Icon name="download" className="size-4" />}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      <SegmentedTabs
        label="Date range"
        activeKey={range}
        items={RANGES.map((item) => ({
          key: item.key,
          label: item.label,
          to: `?range=${item.key}`,
        }))}
      />

      <section
        aria-label="Key figures"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Searches"
          value={totals.searches}
          format={number}
          caption="Requests submitted"
          change={change(totals.searches, previous.searches)}
        />
        <KpiCard
          label="Match rate"
          value={ratio(totals.claimed, totals.searches)}
          format={percent}
          caption="Claimed ÷ submitted"
          change={change(
            ratio(totals.claimed, totals.searches),
            ratio(previous.claimed, previous.searches),
          )}
          delay={40}
        />
        <KpiCard
          label="Payment conversion"
          value={ratio(totals.paid, totals.claimed)}
          format={percent}
          caption="Paid ÷ claimed"
          change={change(
            ratio(totals.paid, totals.claimed),
            ratio(previous.paid, previous.claimed),
          )}
          delay={80}
        />
        <KpiCard
          label="Expiration rate"
          value={ratio(totals.expired + totals.noMatch, totals.searches)}
          format={percent}
          caption="Closed with no charge"
          higherIsBetter={false}
          change={change(
            ratio(totals.expired + totals.noMatch, totals.searches),
            ratio(previous.expired + previous.noMatch, previous.searches),
          )}
          delay={120}
        />
        <KpiCard
          label="Revenue"
          value={(totals.paid * feeCents) / 100}
          format={(value) => formatUsd(Math.round(value * 100))}
          caption={`${number(totals.paid)} × ${formatUsd(feeCents)}`}
          change={change(totals.paid, previous.paid)}
          delay={160}
        />
        <KpiCard
          label="Refunds"
          value={totals.refunds}
          format={number}
          caption={`${(ratio(totals.refunds, totals.paid) * 100).toFixed(1)}% of paid`}
          higherIsBetter={false}
          change={change(totals.refunds, previous.refunds)}
          delay={200}
        />
        <KpiCard
          label="Active pharmacies"
          value={active}
          format={number}
          caption={`${pending} pending review`}
          delay={240}
        />
        <KpiCard
          label="Median time to claim"
          value={data.medianClaimMinutes}
          format={(value) => `${Math.round(value)} min`}
          caption="Broadcast to claim"
          delay={280}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Searches and matches"
          subtitle={range === "today" ? "By hour, today" : "By day"}
          action={
            <ChartLegend
              items={[
                { label: "Searches", color: "var(--accent-soft-solid)" },
                { label: "Claimed", color: "var(--accent)" },
              ]}
            />
          }
        >
          <BarChart
            ariaLabel="Searches and claimed requests over time"
            data={series.map((item) => ({
              label: item.label,
              detail: item.detail,
              value: item.searches,
              inner: item.claimed,
            }))}
            valueLabel="Searches"
            innerLabel="Claimed"
            showValues={!dense}
            tickEvery={tickEvery}
            height={260}
          />
        </Panel>

        <Panel title="Needs attention" delay={60}>
          <div className="grid gap-2.5">
            <AttentionItem to={`${paths.admin.pharmacies}?status=pending`}>
              <strong>{pending} pharmacies</strong> waiting for NPI review
            </AttentionItem>
            {infoRequested > 0 ? (
              <AttentionItem to={`${paths.admin.pharmacies}?status=pending`}>
                <strong>{infoRequested}</strong> waiting on information we asked
                for
              </AttentionItem>
            ) : null}
            <AttentionItem to={paths.admin.transactions}>
              <strong>{data.refundedInRange} refunds</strong> in this period
            </AttentionItem>
            <AttentionItem
              badge={<Badge tone="good">Last run OK · {purgeTime}</Badge>}
            >
              Daily purge job
            </AttentionItem>
            <AttentionItem badge={<Badge tone="good">Healthy</Badge>}>
              SMS and payments
            </AttentionItem>
          </div>
          <p className="mt-3 text-sm text-muted">
            Request details are deleted {retentionHours} hours after they close.
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Revenue"
          subtitle={`FindRx fees at ${formatUsd(feeCents)} each`}
          delay={40}
        >
          <AreaChart
            ariaLabel="Revenue over time"
            data={series.map((item) => ({
              label: item.label,
              detail: item.detail,
              value: (item.paid * feeCents) / 100,
            }))}
            valueLabel="Revenue"
            format={(value) => `$${Math.round(value).toLocaleString("en-US")}`}
            tickEvery={tickEvery}
          />
        </Panel>
        <Panel
          title="Request outcomes"
          subtitle="Where every search ended up"
          delay={80}
        >
          <DonutChart
            ariaLabel="Request outcomes"
            centerLabel="Searches"
            data={[
              {
                label: "Paid and connected",
                value: totals.paid,
                color: "var(--chart-3)",
              },
              {
                label: "Payment window missed",
                value: totals.expired,
                color: "var(--chart-4)",
              },
              {
                label: "No pharmacy found",
                value: totals.noMatch,
                color: "var(--chart-1)",
              },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="When people search"
          subtitle="Requests by hour of day"
          delay={40}
        >
          <BarChart
            ariaLabel="Requests by hour of day"
            data={hourlyProfile(totals)}
            valueLabel="Searches"
            showValues={false}
            height={220}
          />
        </Panel>
        <Panel
          title="Time to claim"
          subtitle="Minutes from posting to a pharmacy's claim (paid requests)"
          delay={80}
        >
          <BarChart
            ariaLabel="Distribution of minutes from posting to claim"
            data={claimTimeHistogram(inRange)}
            valueLabel="Requests"
            height={220}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Most requested" subtitle="Share of searches" delay={40}>
          <RankedBars items={topMedications(totals)} />
        </Panel>
        <Panel
          title="Top pharmacies"
          subtitle="Paid matches in this period"
          delay={80}
        >
          {topPharmacies(inRange).length ? (
            <RankedBars
              items={topPharmacies(inRange).map((item) => ({
                label: item.label,
                value: item.paid,
                detail: `· ${formatUsd(item.revenueCents)}`,
              }))}
            />
          ) : (
            <p className="text-md text-muted">
              No paid matches in this period yet.
            </p>
          )}
        </Panel>
        <Panel
          title="How patients get it"
          subtitle="Paid requests in this period"
          delay={120}
        >
          <div className="grid gap-5">
            {[
              {
                label: "Delivery requested",
                value: data.delivery,
                color: "var(--chart-2)",
              },
              {
                label: "Pickup",
                value: inRange.length - data.delivery,
                color: "var(--chart-1)",
              },
              {
                label: "Needed compounding",
                value: data.compounding,
                color: "var(--chart-5)",
              },
            ].map((item) => (
              <div key={item.label} className="grid gap-1.5">
                <div className="flex justify-between text-md">
                  <span className="text-ink-2">{item.label}</span>
                  <span className="font-semibold tabular-nums">
                    {item.value}{" "}
                    <span className="font-normal text-muted">
                      · {percent(ratio(item.value, inRange.length))}
                    </span>
                  </span>
                </div>
                <span className="h-2.5 overflow-hidden rounded-full bg-side-well">
                  <span
                    className="block h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: percent(ratio(item.value, inRange.length)),
                      background: item.color,
                    }}
                  />
                </span>
              </div>
            ))}
            <p className="text-sm text-muted">
              From {inRange.length} transactions.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
