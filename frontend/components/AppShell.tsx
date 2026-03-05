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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-lg">W</div>
            <div>
              <p className="text-white font-bold text-base leading-none">WorkPulse</p>
              <p className="text-slate-400 text-xs mt-0.5">Developer Analytics</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-slate-700/50 pt-4">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-slate-800/60">
              {user.photoURL
                ? <Image src={user.photoURL} alt="" width={32} height={32} className="rounded-full ring-2 ring-slate-600" />
                : <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">{(user.displayName || user.email || "U").charAt(0).toUpperCase()}</div>
              }
              <div className="min-w-0 flex-1">
                <p className="text-slate-200 text-xs font-semibold truncate">{user.displayName || "User"}</p>
                <p className="text-slate-500 text-xs truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150">
            <span>→</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
