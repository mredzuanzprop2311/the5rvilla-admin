export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const platform = (requestUrl.searchParams.get("platform") || "airbnb").toLowerCase();

  if (platform !== "airbnb") {
    return new Response("Only Airbnb calendar is enabled.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  const icalUrl = context.env.AIRBNB_ICAL_URL;
  if (!icalUrl) {
    return new Response("AIRBNB_ICAL_URL is not configured in Cloudflare Pages environment variables.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  try {
    const upstream = await fetch(icalUrl, {
      headers: {
        "Accept": "text/calendar,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent": "THE-5R-VILLA-Calendar-Sync/1.0"
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    const body = await upstream.text();

    if (!upstream.ok) {
      return new Response(`Airbnb upstream HTTP ${upstream.status}`, {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
      });
    }

    if (!/BEGIN:VCALENDAR/i.test(body)) {
      return new Response("Airbnb response is not a valid iCalendar feed.", {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
      });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache"
      }
    });
  } catch (error) {
    return new Response(`Calendar fetch failed: ${error?.message || error}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
}
