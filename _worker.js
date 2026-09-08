const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

async function readVisitCounter(env) {
  if (!env.VISITS_DB) {
    return json({ error: "Visit counter database is not configured." }, 503);
  }

  try {
    const row = await env.VISITS_DB.prepare(`
      SELECT total, data_through AS dataThrough, updated_at AS updatedAt
      FROM visit_counter
      WHERE id = 1
    `).first();

    if (!row) {
      return json({ error: "Visit counter has not been initialized." }, 503);
    }

    return json({
      total: Number(row.total),
      dataThrough: row.dataThrough,
      updatedAt: row.updatedAt
    });
  } catch (error) {
    console.error("Failed to read visit counter", error);
    return json({ error: "Visit counter is temporarily unavailable." }, 503);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/visits") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json(
          { error: "Method not allowed." },
          405,
          { Allow: "GET, HEAD" }
        );
      }

      const response = await readVisitCounter(env);
      return request.method === "HEAD"
        ? new Response(null, { status: response.status, headers: response.headers })
        : response;
    }

    return env.ASSETS.fetch(request);
  }
};
