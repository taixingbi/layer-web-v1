/** Shared Platform header + admin sub-navigation (Overview, Train, CI/CD, Observability). */

export type PlatformSubNavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export const PLATFORM_SUB_NAV: PlatformSubNavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/train", label: "Train" },
  { href: "/admin/argocd", label: "CI/CD" },
  { href: "/admin/observability", label: "Observability" },
];

export function platformNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
