import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

function getConfiguredCookieDomain(hostname: string): string | undefined {
  const configured = process.env.SESSION_COOKIE_DOMAIN?.trim().replace(/^\./, "");
  if (!configured) return undefined;

  const matchesApiHost = hostname === configured || hostname.endsWith(`.${configured}`);
  if (!matchesApiHost || !configured.includes(".")) {
    console.warn("[Auth] Ignoring SESSION_COOKIE_DOMAIN because it does not match the API host");
    return undefined;
  }

  return configured;
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  return {
    // Host-only by default. An API on onrender.com cannot mint a cookie for
    // lastbenchbd.com, and guessing a broad parent domain can hit a public
    // suffix or leak the session to unrelated subdomains.
    domain: getConfiguredCookieDomain(req.hostname),
    httpOnly: true,
    path: "/",
    // Cross-origin production calls need None + Secure. Browsers reject that
    // combination on local HTTP, where Lax is the correct development mode.
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
