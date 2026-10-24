export function sessionPanelHref(sessionKey: string) {
  return `/plan/sessions/${encodeURIComponent(sessionKey)}`;
}
