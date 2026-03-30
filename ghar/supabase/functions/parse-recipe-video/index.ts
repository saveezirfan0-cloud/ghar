import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Detect platform from URL
function detectPlatform(
  url: string
): "youtube" | "instagram" | "facebook" | "unknown" {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/instagram\.com/.test(url)) return "instagram";
  if (/facebook\.com|fb\.watch/.test(url)) return "facebook";
  return "unknown";
}

// Fetch YouTube video metadata via oEmbed API (reliable, no scraping)
async function fetchYouTubeOEmbed(
  videoId: string
): Promise<{ title: string; author: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || "",
      author: data.author_name || "",
    };
  } catch {
    return null;
  }
}

// Fetch YouTube video details via Innertube API (description, caption tracks)
async function fetchYouTubeInnertube(videoId: string): Promise<{
  description: string;
  captionTracks: { baseUrl: string; languageCode: string }[];
}> {
  const result = { description: "", captionTracks: [] as { baseUrl: string; languageCode: string }[] };

  try {
    const res = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20241126.01.00",
              hl: "en",
              gl: "US",
            },
          },
        }),
      }
    );

    if (!res.ok) return result;

    const data = await res.json();

    // Extract description
    result.description =
      data?.videoDetails?.shortDescription ||
      data?.microformat?.playerMicroformatRenderer?.description?.simpleText ||
      "";

    // Extract caption tracks
    const tracks =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (Array.isArray(tracks)) {
      result.captionTracks = tracks
        .filter(
          (t: { baseUrl?: string; languageCode?: string }) =>
            t.baseUrl && t.languageCode
        )
        .map((t: { baseUrl: string; languageCode: string }) => ({
          baseUrl: t.baseUrl,
          languageCode: t.languageCode,
        }));
    }

    return result;
  } catch {
    return result;
  }
}

// Fetch transcript from a caption track URL
async function fetchTranscriptFromTrack(
  captionUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(captionUrl);
    if (!res.ok) return null;
    const xml = await res.text();

    const textParts: string[] = [];
    const regex = /<text[^>]*>(.*?)<\/text>/gs;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      textParts.push(
        match[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
      );
    }
    return textParts.length > 0 ? textParts.join(" ") : null;
  } catch {
    return null;
  }
}

// Fetch YouTube transcript using caption tracks from Innertube
async function fetchYouTubeTranscript(
  captionTracks: { baseUrl: string; languageCode: string }[]
): Promise<string | null> {
  if (captionTracks.length === 0) return null;

  // Prefer English captions, fall back to first available
  const englishTrack = captionTracks.find((t) =>
    t.languageCode.startsWith("en")
  );
  const track = englishTrack || captionTracks[0];

  return fetchTranscriptFromTrack(track.baseUrl);
}

// Extract metadata from page HTML (Open Graph tags, title, description)
function extractPageMetadata(html: string): {
  title: string;
  description: string;
} {
  let title = "";
  let description = "";

  // Open Graph title
  const ogTitle = html.match(
    /<meta\s+(?:property|name)="og:title"\s+content="([^"]*)"[^>]*>/i
  );
  if (ogTitle) title = ogTitle[1];

  // Fallback to <title>
  if (!title) {
    const titleTag = html.match(/<title[^>]*>(.*?)<\/title>/is);
    if (titleTag) title = titleTag[1].trim();
  }

  // Open Graph description
  const ogDesc = html.match(
    /<meta\s+(?:property|name)="og:description"\s+content="([^"]*)"[^>]*>/i
  );
  if (ogDesc) description = ogDesc[1];

  // Fallback to meta description
  if (!description) {
    const metaDesc = html.match(
      /<meta\s+name="description"\s+content="([^"]*)"[^>]*>/i
    );
    if (metaDesc) description = metaDesc[1];
  }

  // Decode HTML entities
  const decode = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/");

  return { title: decode(title), description: decode(description) };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platform = detectPlatform(url);
    let pageTitle = "";
    let pageDescription = "";
    let transcript = "";
    let videoDescription = "";

    if (platform === "youtube") {
      const videoId = extractYouTubeId(url);

      if (!videoId) {
        return new Response(
          JSON.stringify({ error: "Could not extract YouTube video ID" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch oEmbed metadata and Innertube data in parallel
      const [oembedResult, innertubeResult] = await Promise.all([
        fetchYouTubeOEmbed(videoId),
        fetchYouTubeInnertube(videoId),
      ]);

      // Use oEmbed for title (most reliable)
      if (oembedResult) {
        pageTitle = oembedResult.title;
      }

      // Use Innertube for description and captions
      videoDescription = innertubeResult.description;

      // Fetch transcript from caption tracks
      if (innertubeResult.captionTracks.length > 0) {
        transcript =
          (await fetchYouTubeTranscript(innertubeResult.captionTracks)) || "";
      }
    } else {
      // Instagram / Facebook / Unknown - fetch page and extract metadata
      try {
        const pageRes = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
          redirect: "follow",
        });
        const pageHtml = await pageRes.text();
        const meta = extractPageMetadata(pageHtml);
        pageTitle = meta.title;
        pageDescription = meta.description;
      } catch {
        // If we can't fetch the page, we'll still try with whatever we have
      }
    }

    // Build context for Claude
    const contextParts: string[] = [];
    if (pageTitle) contextParts.push(`Video Title: ${pageTitle}`);
    if (videoDescription)
      contextParts.push(`Video Description:\n${videoDescription}`);
    if (pageDescription && pageDescription !== videoDescription)
      contextParts.push(`Page Description: ${pageDescription}`);
    if (transcript) contextParts.push(`Video Transcript:\n${transcript}`);

    if (contextParts.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "Could not extract any information from this video. Try a YouTube link with captions enabled.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const context = contextParts.join("\n\n---\n\n");

    // Call Claude API to parse the recipe
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a recipe parser. Extract the recipe from this cooking video's information.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "name": "Recipe Name",
  "category": "one of: Daal, Salan, Pulao, Pasta, Breakfast, Snack, Other",
  "calories_per_serving": number or null,
  "ingredients": [
    { "name": "Ingredient Name", "qty": "amount", "unit": "g|kg|ml|ltr|cup|tbsp|tsp|pc|bunch|pack|can|slice or empty string" }
  ]
}

Rules:
- Use the most common/recognizable name for the dish
- Category should best match one of: Daal, Salan, Pulao, Pasta, Breakfast, Snack, Other
- For South Asian dishes: Daal = lentil dishes, Salan = curries/gravies, Pulao = rice dishes
- Include ALL ingredients mentioned, even basic ones like salt, oil, water
- Normalize quantities: use standard measurements where possible
- If exact quantities aren't given, estimate reasonable amounts for 2-4 servings
- calories_per_serving should be an estimate per single serving, or null if truly uncertain
- Unit must be one of: g, kg, ml, ltr, cup, tbsp, tsp, pc, bunch, pack, can, slice, or empty string for unitless items

Video information:
${context}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Claude API error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to parse recipe. Please try again." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    const aiText =
      aiData.content?.[0]?.text || "";

    // Parse the JSON from Claude's response
    let recipe;
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      recipe = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(
        JSON.stringify({
          error: "Could not parse recipe from this video. The video may not contain a clear recipe.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate and normalize
    const result = {
      name: recipe.name || pageTitle || "Untitled Recipe",
      category: recipe.category || "Other",
      calories_per_serving: recipe.calories_per_serving || null,
      ingredients: Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map(
            (ing: { name?: string; qty?: string; unit?: string }) => ({
              name: String(ing.name || "").trim(),
              qty: String(ing.qty || "").trim(),
              unit: String(ing.unit || "").trim(),
            })
          )
        .filter((ing: { name: string }) => ing.name)
        : [],
      source_url: url,
      platform,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
