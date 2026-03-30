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

// Standard headers for YouTube requests
const youtubeHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  // Consent cookies to bypass GDPR consent wall
  Cookie:
    "CONSENT=PENDING+987; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMxMjE5LjA3X3AxGgJlbiACGgYIgJnsBhACGgYIgJnsBhAC",
};

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
  } catch (e) {
    console.error("oEmbed failed:", e);
    return null;
  }
}

// Fetch YouTube video details via Innertube API (description, caption tracks)
async function fetchYouTubeInnertube(videoId: string): Promise<{
  title: string;
  description: string;
  captionTracks: { baseUrl: string; languageCode: string }[];
}> {
  const result = {
    title: "",
    description: "",
    captionTracks: [] as { baseUrl: string; languageCode: string }[],
  };

  // Try WEB client first, then MWEB (mobile web) as fallback
  const clients = [
    { clientName: "WEB", clientVersion: "2.20241126.01.00" },
    { clientName: "MWEB", clientVersion: "2.20241126.01.00" },
  ];

  for (const client of clients) {
    try {
      const res = await fetch(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": youtubeHeaders["User-Agent"],
            Origin: "https://www.youtube.com",
            Referer: `https://www.youtube.com/watch?v=${videoId}`,
            "X-YouTube-Client-Name": client.clientName === "WEB" ? "1" : "2",
            "X-YouTube-Client-Version": client.clientVersion,
            Cookie: youtubeHeaders.Cookie,
          },
          body: JSON.stringify({
            videoId,
            context: {
              client: {
                clientName: client.clientName,
                clientVersion: client.clientVersion,
                hl: "en",
                gl: "US",
              },
            },
          }),
        }
      );

      if (!res.ok) {
        console.error(
          `Innertube ${client.clientName} failed: ${res.status} ${res.statusText}`
        );
        continue;
      }

      const data = await res.json();

      // Check for playability errors
      const status = data?.playabilityStatus?.status;
      if (status === "ERROR" || status === "LOGIN_REQUIRED") {
        console.error(`Innertube ${client.clientName} playability: ${status}`);
        continue;
      }

      result.title = data?.videoDetails?.title || "";
      result.description =
        data?.videoDetails?.shortDescription ||
        data?.microformat?.playerMicroformatRenderer?.description?.simpleText ||
        "";

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

      // If we got useful data, stop trying other clients
      if (result.description || result.captionTracks.length > 0) {
        console.log(
          `Innertube ${client.clientName} success: desc=${result.description.length}chars, tracks=${result.captionTracks.length}`
        );
        return result;
      }
    } catch (e) {
      console.error(`Innertube ${client.clientName} error:`, e);
    }
  }

  return result;
}

// Fallback: scrape YouTube watch page for description and caption URLs
async function fetchYouTubePageData(videoId: string): Promise<{
  title: string;
  description: string;
  captionBaseUrl: string | null;
}> {
  const result = { title: "", description: "", captionBaseUrl: null as string | null };

  try {
    const res = await fetch(
      `https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US&has_verified=1`,
      { headers: youtubeHeaders }
    );

    if (!res.ok) {
      console.error(`YouTube page fetch failed: ${res.status}`);
      return result;
    }

    const html = await res.text();
    console.log(`YouTube page fetched: ${html.length} chars`);

    // Extract title from og:title
    const ogTitle = html.match(
      /<meta\s+(?:property|name)="og:title"\s+content="([^"]*)"[^>]*>/i
    );
    if (ogTitle) result.title = decodeHtmlEntities(ogTitle[1]);

    // Fallback title from <title>
    if (!result.title) {
      const titleTag = html.match(/<title[^>]*>(.*?)<\/title>/is);
      if (titleTag) result.title = decodeHtmlEntities(titleTag[1].trim());
    }

    // Extract description from ytInitialPlayerResponse
    const playerMatch = html.match(
      /var\s+ytInitialPlayerResponse\s*=\s*(\{.*?\});\s*(?:var|<\/script)/s
    );
    if (playerMatch) {
      try {
        const data = JSON.parse(playerMatch[1]);
        result.description =
          data?.videoDetails?.shortDescription ||
          data?.microformat?.playerMicroformatRenderer?.description
            ?.simpleText ||
          "";

        // Also try to get caption tracks from here
        const tracks =
          data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(tracks) && tracks.length > 0) {
          const englishTrack = tracks.find((t: { languageCode?: string }) =>
            t.languageCode?.startsWith("en")
          );
          const track = englishTrack || tracks[0];
          if (track?.baseUrl) {
            result.captionBaseUrl = track.baseUrl.replace(/\\u0026/g, "&");
          }
        }
      } catch (e) {
        console.error("Failed to parse ytInitialPlayerResponse:", e);
      }
    }

    // Fallback: try to extract captions URL from raw HTML
    if (!result.captionBaseUrl) {
      const captionsMatch = html.match(
        /"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"/s
      );
      if (captionsMatch) {
        const urlMatch = captionsMatch[1].match(
          /"baseUrl"\s*:\s*"(https:[^"]+)"/
        );
        if (urlMatch) {
          result.captionBaseUrl = urlMatch[1].replace(/\\u0026/g, "&");
        }
      }
    }

    // Fallback description from og:description
    if (!result.description) {
      const ogDesc = html.match(
        /<meta\s+(?:property|name)="og:description"\s+content="([^"]*)"[^>]*>/i
      );
      if (ogDesc) result.description = decodeHtmlEntities(ogDesc[1]);
    }

    console.log(
      `Page scrape: title=${result.title.length}chars, desc=${result.description.length}chars, captions=${!!result.captionBaseUrl}`
    );
  } catch (e) {
    console.error("YouTube page scrape error:", e);
  }

  return result;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

// Extract recipe-related URLs from video description
function extractRecipeUrls(description: string): string[] {
  if (!description) return [];

  // Find all URLs in the description
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/g;
  const urls = description.match(urlRegex) || [];

  // Filter for likely recipe URLs (exclude social media, merchandise, etc.)
  const recipeIndicators = [
    /recipe/i,
    /cook/i,
    /food/i,
    /kitchen/i,
    /blog/i,
    /ingredients/i,
  ];
  const excludePatterns = [
    /youtube\.com/i,
    /youtu\.be/i,
    /instagram\.com/i,
    /facebook\.com/i,
    /twitter\.com/i,
    /x\.com/i,
    /tiktok\.com/i,
    /amazon\./i,
    /amzn\./i,
    /bit\.ly/i,
    /linktr\.ee/i,
    /patreon\.com/i,
    /ko-fi\.com/i,
  ];

  return urls.filter((u) => {
    if (excludePatterns.some((p) => p.test(u))) return false;
    // Include if URL or description context suggests recipe content
    return recipeIndicators.some((p) => p.test(u));
  }).slice(0, 2); // Max 2 recipe URLs to avoid slow requests
}

// Fetch recipe page content (text extraction)
async function fetchRecipePage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": youtubeHeaders["User-Agent"],
        Accept: "text/html",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Try to find JSON-LD recipe schema (most reliable)
    const jsonLdMatches = html.matchAll(
      /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    );
    for (const m of jsonLdMatches) {
      try {
        const data = JSON.parse(m[1]);
        const recipes = Array.isArray(data) ? data : [data];
        for (const item of recipes) {
          if (
            item["@type"] === "Recipe" ||
            (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))
          ) {
            const parts: string[] = [];
            if (item.name) parts.push(`Recipe: ${item.name}`);
            if (item.description) parts.push(item.description);
            if (Array.isArray(item.recipeIngredient)) {
              parts.push(
                "Ingredients:\n" + item.recipeIngredient.join("\n")
              );
            }
            if (Array.isArray(item.recipeInstructions)) {
              const steps = item.recipeInstructions.map(
                (s: { text?: string } | string) =>
                  typeof s === "string" ? s : s.text || ""
              );
              parts.push("Instructions:\n" + steps.join("\n"));
            }
            if (item.nutrition?.calories) {
              parts.push(`Calories: ${item.nutrition.calories}`);
            }
            if (parts.length > 0) return parts.join("\n\n");
          }
          // Handle @graph
          if (Array.isArray(item["@graph"])) {
            for (const g of item["@graph"]) {
              if (
                g["@type"] === "Recipe" ||
                (Array.isArray(g["@type"]) && g["@type"].includes("Recipe"))
              ) {
                const parts: string[] = [];
                if (g.name) parts.push(`Recipe: ${g.name}`);
                if (g.description) parts.push(g.description);
                if (Array.isArray(g.recipeIngredient)) {
                  parts.push(
                    "Ingredients:\n" + g.recipeIngredient.join("\n")
                  );
                }
                if (Array.isArray(g.recipeInstructions)) {
                  const steps = g.recipeInstructions.map(
                    (s: { text?: string } | string) =>
                      typeof s === "string" ? s : s.text || ""
                  );
                  parts.push("Instructions:\n" + steps.join("\n"));
                }
                if (g.nutrition?.calories) {
                  parts.push(`Calories: ${g.nutrition.calories}`);
                }
                if (parts.length > 0) return parts.join("\n\n");
              }
            }
          }
        }
      } catch {
        // Not valid JSON-LD, skip
      }
    }

    // Fallback: extract og metadata from recipe page
    const meta = extractPageMetadata(html);
    if (meta.title || meta.description) {
      return `Linked Recipe Page - ${meta.title}\n${meta.description}`;
    }

    return null;
  } catch (e) {
    console.error(`Failed to fetch recipe page ${url}:`, e);
    return null;
  }
}

// Fetch transcript from a caption track URL
async function fetchTranscriptFromUrl(
  captionUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(captionUrl);
    if (!res.ok) {
      console.error(`Caption fetch failed: ${res.status}`);
      return null;
    }
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
  } catch (e) {
    console.error("Transcript fetch error:", e);
    return null;
  }
}

// Extract metadata from page HTML (for non-YouTube platforms)
function extractPageMetadata(html: string): {
  title: string;
  description: string;
} {
  let title = "";
  let description = "";

  const ogTitle = html.match(
    /<meta\s+(?:property|name)="og:title"\s+content="([^"]*)"[^>]*>/i
  );
  if (ogTitle) title = ogTitle[1];

  if (!title) {
    const titleTag = html.match(/<title[^>]*>(.*?)<\/title>/is);
    if (titleTag) title = titleTag[1].trim();
  }

  const ogDesc = html.match(
    /<meta\s+(?:property|name)="og:description"\s+content="([^"]*)"[^>]*>/i
  );
  if (ogDesc) description = ogDesc[1];

  if (!description) {
    const metaDesc = html.match(
      /<meta\s+name="description"\s+content="([^"]*)"[^>]*>/i
    );
    if (metaDesc) description = metaDesc[1];
  }

  return {
    title: decodeHtmlEntities(title),
    description: decodeHtmlEntities(description),
  };
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

      console.log(`Processing YouTube video: ${videoId}`);

      // Strategy 1: oEmbed + Innertube (in parallel)
      const [oembedResult, innertubeResult] = await Promise.all([
        fetchYouTubeOEmbed(videoId),
        fetchYouTubeInnertube(videoId),
      ]);

      if (oembedResult) {
        pageTitle = oembedResult.title;
      }

      videoDescription = innertubeResult.description;

      // Fetch transcript from Innertube caption tracks
      if (innertubeResult.captionTracks.length > 0) {
        const englishTrack = innertubeResult.captionTracks.find((t) =>
          t.languageCode.startsWith("en")
        );
        const track = englishTrack || innertubeResult.captionTracks[0];
        transcript = (await fetchTranscriptFromUrl(track.baseUrl)) || "";
      }

      // Strategy 2: If Innertube didn't give us enough, fall back to page scraping
      if (!videoDescription && !transcript) {
        console.log("Innertube insufficient, falling back to page scraping...");
        const pageData = await fetchYouTubePageData(videoId);

        if (!pageTitle && pageData.title) {
          pageTitle = pageData.title;
        }
        if (!videoDescription && pageData.description) {
          videoDescription = pageData.description;
        }
        if (!transcript && pageData.captionBaseUrl) {
          transcript =
            (await fetchTranscriptFromUrl(pageData.captionBaseUrl)) || "";
        }
      }

      // Use Innertube title as fallback
      if (!pageTitle && innertubeResult.title) {
        pageTitle = innertubeResult.title;
      }

      console.log(
        `Final data: title=${pageTitle.length}chars, desc=${videoDescription.length}chars, transcript=${transcript.length}chars`
      );
    } else {
      // Instagram / Facebook / Unknown - fetch page and extract metadata
      try {
        const pageRes = await fetch(url, {
          headers: {
            "User-Agent": youtubeHeaders["User-Agent"],
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

    // If we have a video description, check for recipe links and fetch them
    let linkedRecipeContent = "";
    if (videoDescription) {
      const recipeUrls = extractRecipeUrls(videoDescription);
      if (recipeUrls.length > 0) {
        console.log(`Found recipe URLs in description: ${recipeUrls.join(", ")}`);
        const recipePages = await Promise.all(
          recipeUrls.map((u) => fetchRecipePage(u))
        );
        const validPages = recipePages.filter(Boolean);
        if (validPages.length > 0) {
          linkedRecipeContent = validPages.join("\n\n---\n\n");
          console.log(
            `Fetched ${validPages.length} recipe page(s): ${linkedRecipeContent.length}chars`
          );
        }
      }
    }

    // Build context for Claude
    const contextParts: string[] = [];
    if (pageTitle) contextParts.push(`Video Title: ${pageTitle}`);
    if (videoDescription)
      contextParts.push(`Video Description:\n${videoDescription}`);
    if (linkedRecipeContent)
      contextParts.push(`Linked Recipe Page Content:\n${linkedRecipeContent}`);
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
    const aiText = aiData.content?.[0]?.text || "";

    // Parse the JSON from Claude's response
    let recipe;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      recipe = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(
        JSON.stringify({
          error:
            "Could not parse recipe from this video. The video may not contain a clear recipe.",
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
        ? recipe.ingredients
            .map((ing: { name?: string; qty?: string; unit?: string }) => ({
              name: String(ing.name || "").trim(),
              qty: String(ing.qty || "").trim(),
              unit: String(ing.unit || "").trim(),
            }))
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
