export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function showsTabBar(pathname: string) {
  return !/^\/races\/[^/]+\/day\/?$/.test(pathname);
}
