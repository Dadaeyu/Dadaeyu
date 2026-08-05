type AllowedRequestOriginOptions = {
  configuredOrigins: string | undefined;
  origin: string | null;
  requestOrigin: string;
};

const LOCAL_REQUEST_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"] as const;

export function getAllowedRequestOrigins({
  configuredOrigins,
  requestOrigin
}: Omit<AllowedRequestOriginOptions, "origin">) {
  const allowedOrigins = new Set([
    requestOrigin,
    ...(configuredOrigins ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  ]);
  for (const localOrigin of getLocalRequestOriginAliases(requestOrigin)) {
    allowedOrigins.add(localOrigin);
  }
  return allowedOrigins;
}

export function isAllowedRequestOrigin({
  configuredOrigins,
  origin,
  requestOrigin
}: AllowedRequestOriginOptions) {
  if (!origin) return true;
  return getAllowedRequestOrigins({ configuredOrigins, requestOrigin }).has(origin.trim());
}

function getLocalRequestOriginAliases(origin: string) {
  try {
    const url = new URL(origin);
    if (!LOCAL_REQUEST_HOSTS.some((host) => host === url.hostname)) return [];
    return LOCAL_REQUEST_HOSTS.map((host) => {
      const aliasUrl = new URL(url.origin);
      aliasUrl.hostname = host;
      return aliasUrl.origin;
    });
  } catch {
    return [];
  }
}
