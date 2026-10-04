export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ ok: false, error: "CRON_SECRET is not configured." });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized." });
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(503).json({ ok: false, error: "Supabase is not configured." });
  }

  // Supabase measures database activity. Fetching static pages does not count.
  // Read only the ID of at most one row; never return customer data.
  try {
    const endpoint = new URL("/rest/v1/orders", url);
    endpoint.searchParams.set("select", "id");
    endpoint.searchParams.set("limit", "1");
    for (let query = 0; query < 3; query += 1) {
      const response = await fetch(endpoint, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) {
        await response.body?.cancel();
        return res.status(502).json({
          ok: false,
          error: "Supabase database check failed.",
          upstreamStatus: response.status
        });
      }
      // Consume the response so each request finishes before starting the next.
      await response.json();
    }
    return res.status(200).json({ ok: true, databaseChecks: 3 });
  } catch {
    return res.status(502).json({ ok: false, error: "Supabase database check could not finish." });
  }
}
