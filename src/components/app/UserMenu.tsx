"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  Database,
  FileText,
  Headphones,
  HelpCircle,
  LogOut,
  Shield,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/utils";
import { useT } from "@/lib/i18n/LanguageContext";

function isImageSrc(value?: string | null) {
  return Boolean(value && (value.startsWith("http") || value.startsWith("data:")));
}

export function UserMenu() {
  const t = useT();
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const image = data?.user?.image;
  const photo = isImageSrc(image);

  return (
    <div ref={rootRef} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-black ring-2 ring-transparent transition hover:ring-brand/50"
        style={{ background: photo ? "#111113" : image || "#22d3ee" }}
        aria-label={t("profile")}
        aria-expanded={open}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image!} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(data?.user?.name || "U")
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[60] mt-2 w-72 overflow-hidden rounded-2xl border border-[var(--line)] bg-surface shadow-2xl">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <div className="text-sm font-semibold text-ink">
              {data?.user?.name || t("profile")}
            </div>
            <div className="truncate text-xs text-muted">{data?.user?.email}</div>
          </div>

          <div className="p-2">
            <MenuLink href="/account" icon={UserRound} onClick={() => setOpen(false)}>
              {t("profile")}
            </MenuLink>
            {data?.user?.isOwner && (
              <MenuLink href="/admin" icon={Database} onClick={() => setOpen(false)}>
                {t("ownerAccounts")}
              </MenuLink>
            )}
          </div>

          <div className="border-t border-[var(--line)] p-2">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t("legal")}
            </div>
            <MenuLink href="/legal/privacy" icon={Shield} onClick={() => setOpen(false)}>
              {t("privacyPolicy")}
            </MenuLink>
            <MenuLink href="/legal/terms" icon={FileText} onClick={() => setOpen(false)}>
              {t("termsOfService")}
            </MenuLink>
            <MenuLink href="/legal/security" icon={HelpCircle} onClick={() => setOpen(false)}>
              {t("securityPolicy")}
            </MenuLink>
            <MenuLink href="/legal/cookies" icon={FileText} onClick={() => setOpen(false)}>
              {t("cookiePolicy")}
            </MenuLink>
            <MenuLink href="/support" icon={Headphones} onClick={() => setOpen(false)}>
              {t("support")}
            </MenuLink>
          </div>

          <div className="border-t border-[var(--line)] p-2">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-rose hover:bg-paper"
            >
              <LogOut className="h-4 w-4" />
              {t("signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: typeof UserRound;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-paper"
    >
      <Icon className="h-4 w-4 text-brand" />
      {children}
    </Link>
  );
}
