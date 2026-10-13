import type { AppRole } from "@/lib/database.types";

const ADMIN_ROLES: AppRole[] = ["staff", "admin", "super_admin"];

export function isAdminRole(role: string | null | undefined): role is AppRole {
  return ADMIN_ROLES.includes(role as AppRole);
}

export function safeInternalPath(value: FormDataEntryValue | string | null | undefined, fallback: string) {
  const path = typeof value === "string" ? value : fallback;
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

export function resolvePostAuthPath(role: string | null | undefined, requested?: FormDataEntryValue | string | null) {
  const admin = isAdminRole(role);
  const fallback = admin ? "/admin" : "/compte";
  const path = safeInternalPath(requested, fallback);
  if (admin && path === "/compte") return "/admin";
  if (!admin && path.startsWith("/admin")) return "/compte";
  return path;
}
