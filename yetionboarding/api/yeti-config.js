function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const yetiId = req.query?.id;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!yetiId || !supabaseUrl || !supabaseKey) {
    res.status(400).json({ error: "Missing config" });
    return;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/yeti_configs?yeti_id=eq.${encodeURIComponent(yetiId)}&select=prompt,business_name`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );

    if (!response.ok) {
      res.status(response.status).json({ error: "Could not load Yeti config" });
      return;
    }

    const data = await response.json();
    const config = Array.isArray(data) ? data[0] : null;

    if (!config?.prompt) {
      res.status(404).json({ error: "Yeti not found" });
      return;
    }

    res.status(200).json({
      prompt: config.prompt,
      business_name: config.business_name,
    });
  } catch (error) {
    console.error("[Yeti API] Config failed", error);
    res.status(500).json({ error: "Could not load Yeti config" });
  }
}
