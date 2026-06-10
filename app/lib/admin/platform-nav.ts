/** Shared Platform header + admin sub-navigation (Overview, Train, ArgoCD, Logs). */

export type PlatformSubNavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export const PLATFORM_SUB_NAV: PlatformSubNavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/train", label: "Train" },
  { href: "/admin/argocd", label: "ArgoCD" },
  { href: "/admin/logs", label: "Logs" },
];

export function platformNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
