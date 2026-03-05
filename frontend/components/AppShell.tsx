"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: "⬛" },
    { href: "/reports", label: "Reports", icon: "📋" },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0b0b14" }}>
      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col flex-shrink-0"
        style={{
          background: "#0d0d14",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <div
          className="px-6 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                boxShadow: "0 0 16px rgba(99,102,241,0.5), 0 0 32px rgba(99,102,241,0.2)",
              }}
            >
              W
            </div>
            <div>
              <p className="text-white font-bold text-base leading-none">WorkPulse</p>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                Developer Analytics
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative"
                style={{
                  background: active ? "rgba(99,102,241,0.15)" : "transparent",
                  color: active ? "#a5b4fc" : "#64748b",
                  borderLeft: active ? "2px solid #6366f1" : "2px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#64748b";
                  }
                }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div
          className="px-3 pb-4 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {user && (
            <div
              className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div className="relative flex-shrink-0">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full"
                    style={{ outline: "2px solid rgba(99,102,241,0.4)" }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
                  >
                    {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Online dot */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                  style={{
                    background: "#22c55e",
                    borderColor: "#0d0d14",
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: "#e2e8f0" }}>
                  {user.displayName || "User"}
                </p>
                <p className="text-xs truncate" style={{ color: "#475569" }}>
                  {user.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-150"
            style={{ color: "#475569" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#f87171";
              (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#475569";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <span>→</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: "#0b0b14" }}>
        {children}
      </main>
    </div>
  );
}
