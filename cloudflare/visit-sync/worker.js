const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const SOURCE = "cloudflare_graphql_httpRequestsAdaptiveGroups.sum.visits";
const RECENT_DAYS_TO_REFRESH = 3;
const MAX_BACKFILL_DAYS_PER_RUN = 31;
const MAX_DATE_SCAN_DAYS = 3660;

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function shanghaiDate(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(timestamp));
}

function utcWindowForShanghaiDate(dateString) {
  const start = new Date(`${dateString}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function dateRange(startDate, endDate) {
  const dates = [];
  let currentDate = startDate;

  while (currentDate <= endDate && dates.length < MAX_DATE_SCAN_DAYS) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  if (currentDate <= endDate) {
    throw new Error(`Visit sync date range exceeds ${MAX_DATE_SCAN_DAYS} days.`);
  }

  return dates;
}

async function datesToRefresh(timestamp, env) {
  const latestCompletedDate = addDays(shanghaiDate(timestamp), -1);
  const syncStartDate = env.SYNC_START_DATE;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(syncStartDate || "")) {
    throw new Error("SYNC_START_DATE must use YYYY-MM-DD format.");
  }

  if (latestCompletedDate < syncStartDate) return [];

  const existingRows = await env.VISITS_DB.prepare(`
    SELECT visit_date
    FROM daily_visits
    WHERE visit_date >= ?1 AND visit_date <= ?2
  `).bind(syncStartDate, latestCompletedDate).all();
  const existingDates = new Set(
    (existingRows.results || []).map((row) => String(row.visit_date))
  );
  const missingDates = dateRange(syncStartDate, latestCompletedDate)
    .filter((date) => !existingDates.has(date))
    .slice(0, MAX_BACKFILL_DAYS_PER_RUN);
  const recentDates = [];

  for (let offset = RECENT_DAYS_TO_REFRESH - 1; offset >= 0; offset -= 1) {
    const date = addDays(latestCompletedDate, -offset);
    if (date >= syncStartDate) recentDates.push(date);
  }

  return [...new Set([...missingDates, ...recentDates])].sort();
}

async function fetchCloudflareVisits(env, dateString) {
  const window = utcWindowForShanghaiDate(dateString);
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_ANALYTICS_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query: `query DailyVisits($zoneTag: string, $start: Time, $end: Time, $hostname: string) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            groups: httpRequestsAdaptiveGroups(
              limit: 1000
              filter: {
                datetime_geq: $start
                datetime_lt: $end
                clientRequestHTTPHost: $hostname
                requestSource: "eyeball"
              }
            ) {
              sum { visits }
            }
          }
        }
      }`,
      variables: {
        zoneTag: env.CLOUDFLARE_ZONE_ID,
        start: window.start,
        end: window.end,
        hostname: env.PUBLIC_HOSTNAME
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Cloudflare Analytics returned HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  const groups = payload.data?.viewer?.zones?.[0]?.groups;
  if (!Array.isArray(groups)) {
    throw new Error("Cloudflare Analytics response did not contain visit groups.");
  }

  const visits = groups.reduce((sum, group) => sum + Number(group?.sum?.visits || 0), 0);
  if (!Number.isFinite(visits) || visits < 0) {
    throw new Error("Cloudflare Analytics returned an invalid visit count.");
  }

  return { visits: Math.round(visits), window };
}

async function recordSuccess(env, dateString, result, startedAt) {
  const finishedAt = new Date().toISOString();
  await env.VISITS_DB.batch([
    env.VISITS_DB.prepare(`
      INSERT INTO daily_visits (
        visit_date, visits, window_start, window_end, source, synced_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      ON CONFLICT(visit_date) DO UPDATE SET
        visits = excluded.visits,
        window_start = excluded.window_start,
        window_end = excluded.window_end,
        source = excluded.source,
        synced_at = excluded.synced_at
    `).bind(dateString, result.visits, result.window.start, result.window.end, SOURCE, finishedAt),
    env.VISITS_DB.prepare(`
      UPDATE visit_counter
      SET
        total = baseline + COALESCE((SELECT SUM(visits) FROM daily_visits), 0),
        data_through = COALESCE((SELECT MAX(visit_date) FROM daily_visits), data_through),
        updated_at = ?1
      WHERE id = 1
    `).bind(finishedAt),
    env.VISITS_DB.prepare(`
      INSERT INTO visit_sync_runs (
        visit_date, status, visits, message, started_at, finished_at
      ) VALUES (?1, 'success', ?2, ?3, ?4, ?5)
    `).bind(dateString, result.visits, SOURCE, startedAt, finishedAt)
  ]);

  env.VISIT_SYNC_ANALYTICS?.writeDataPoint({
    indexes: [env.PUBLIC_HOSTNAME],
    blobs: [dateString, "success"],
    doubles: [result.visits]
  });
}

async function recordError(env, dateString, error, startedAt) {
  const finishedAt = new Date().toISOString();
  const message = String(error?.message || error).slice(0, 1000);
  await env.VISITS_DB.prepare(`
    INSERT INTO visit_sync_runs (
      visit_date, status, visits, message, started_at, finished_at
    ) VALUES (?1, 'error', NULL, ?2, ?3, ?4)
  `).bind(dateString, message, startedAt, finishedAt).run();

  env.VISIT_SYNC_ANALYTICS?.writeDataPoint({
    indexes: [env.PUBLIC_HOSTNAME],
    blobs: [dateString, "error"],
    doubles: [0]
  });
}

async function syncVisits(env, timestamp) {
  if (!env.CLOUDFLARE_ANALYTICS_TOKEN) {
    throw new Error("CLOUDFLARE_ANALYTICS_TOKEN is not configured.");
  }

  const failures = [];
  const dates = await datesToRefresh(timestamp, env);

  for (const dateString of dates) {
    const startedAt = new Date().toISOString();
    try {
      const result = await fetchCloudflareVisits(env, dateString);
      await recordSuccess(env, dateString, result, startedAt);
    } catch (error) {
      await recordError(env, dateString, error, startedAt);
      failures.push(`${dateString}: ${String(error?.message || error)}`);
      console.error(`Visit sync failed for ${dateString}`, error);
    }
  }

  if (failures.length) {
    throw new Error(`Visit sync completed with ${failures.length} failure(s): ${failures.join(" | ")}`);
  }
}

export default {
  async fetch() {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" }
    });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(syncVisits(env, controller.scheduledTime));
  }
};
