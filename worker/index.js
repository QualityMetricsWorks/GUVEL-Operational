const PLATFORM_HOST = "operational.guvelsystems.com";
const CORPORATE_HOST = "guvelsystems.com";
const WWW_HOST = "www.guvelsystems.com";

function isReservedTenantHost(hostname) {
  const reserved = new Set([
    "www",
    "operational",
    "api",
    "app",
    "admin",
    "support",
    "status",
    "mail",
    "smtp",
    "ftp",
    "cdn",
  ]);

  const parts = hostname.toLowerCase().split(".");
  return parts.length === 3 && parts[1] === "guvelsystems" && reserved.has(parts[0]);
}

function isTenantHost(hostname) {
  const normalized = hostname.toLowerCase();
  const parts = normalized.split(".");
  return (
    parts.length === 3 &&
    parts[1] === "guvelsystems" &&
    parts[2] === "com" &&
    parts[0].length > 0 &&
    !isReservedTenantHost(normalized)
  );
}

function redirectToCorporate(request) {
  const url = new URL(request.url);
  url.hostname = CORPORATE_HOST;
  url.protocol = "https:";
  return Response.redirect(url.toString(), 301);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();

    // The corporate www hostname must never render GUVEL Operational.
    if (hostname === WWW_HOST) {
      return redirectToCorporate(request);
    }

    // The apex corporate site is not an application tenant.
    // The wildcard route should not normally reach the apex, but keep this guard explicit.
    if (hostname === CORPORATE_HOST) {
      return env.ASSETS.fetch(request);
    }

    // Production platform hostname and valid tenant hostnames serve the same GUVEL app.
    if (hostname === PLATFORM_HOST || isTenantHost(hostname)) {
      return env.ASSETS.fetch(request);
    }

    // Reserved/unknown first-level subdomains should not expose the application.
    if (isReservedTenantHost(hostname)) {
      return new Response("GUVEL hostname reserved.", {
        status: 404,
        headers: { "content-type": "text/plain; charset=UTF-8" },
      });
    }

    return new Response("GUVEL hostname not configured.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=UTF-8" },
    });
  },
};
