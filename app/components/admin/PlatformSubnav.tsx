"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PLATFORM_SUB_NAV, platformNavActive } from "@/lib/admin/platform-nav";

export function PlatformSubnav() {
  const pathname = usePathname();

  return (
    <div className="admin-subnav">
      {PLATFORM_SUB_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`admin-subnav-link${
            platformNavActive(pathname, item.href, item.exact) ? " admin-subnav-link--active" : ""
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
