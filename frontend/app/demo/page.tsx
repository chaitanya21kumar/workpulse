"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";

const DEMO_USERS = [
  { username: "torvalds", tagline: "Creator of Linux & Git" },
  { username: "gaearon", tagline: "React core team" },
  { username: "sindresorhus", tagline: "OSS legend, 1000+ packages" },
];

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function DemoCard({ username, tagline }: { username: string; tagline: string }) {
  const { data: user, isLoading } = useQuery<GitHubUser>({
    queryKey: ["gh-user", username],
    queryFn: async () => {
      const res = await fetch(`https://api.github.com/users/${username}`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-pulse">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-100 rounded w-32" />
            <div className="h-3 bg-slate-100 rounded w-20" />
          </div>
        </div>
        <div className="h-4 bg-slate-100 rounded mb-3" />
        <div className="h-4 bg-slate-100 rounded w-3/4 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-16 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600" />
      <div className="px-6 pb-6">
        <div className="flex items-end gap-4 -mt-8 mb-4">
          <Image
            src={user.avatar_url}
            alt={user.name || username}
            width={64}
            height={64}
            className="rounded-2xl ring-4 ring-white shadow-md"
          />
          <div className="pb-1">
            <h3 className="font-bold text-slate-900 text-lg leading-tight">{user.name || username}</h3>
            <p className="text-slate-400 text-sm">@{user.login}</p>
          </div>
        </div>

        <p className="text-slate-500 text-sm mb-4 min-h-[2.5rem] line-clamp-2">
          {user.bio || tagline}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center bg-slate-50 rounded-xl p-3">
            <p className="text-lg font-bold text-slate-800">{user.public_repos}</p>
            <p className="text-xs text-slate-400">Repos</p>
          </div>
          <div className="text-center bg-slate-50 rounded-xl p-3">
            <p className="text-lg font-bold text-slate-800">{formatCount(user.followers)}</p>
            <p className="text-xs text-slate-400">Followers</p>
          </div>
          <div className="text-center bg-slate-50 rounded-xl p-3">
            <p className="text-lg font-bold text-slate-800">{user.following}</p>
            <p className="text-xs text-slate-400">Following</p>
          </div>
        </div>

        <a
          href={user.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          View on GitHub →
        </a>
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            W
          </div>
          <span className="text-slate-800 font-bold text-lg">WorkPulse</span>
          <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full">
            Demo
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
            Home
          </Link>
          <Link href="/login"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            Login for Full Access
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Demo banner */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-start gap-4 mb-8">
          <span className="text-2xl shrink-0">🎮</span>
          <div>
            <p className="font-semibold text-indigo-900">Demo Mode</p>
            <p className="text-indigo-600 text-sm mt-0.5">
              Showing public GitHub profiles.{" "}
              <Link href="/login" className="underline font-medium">Login</Link>{" "}
              to add your team and unlock AI-powered developer scoring, commit analytics, and
              leaderboards.
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Featured Developers</h1>
        <p className="text-slate-500 text-sm mb-6">
          Public GitHub data only —{" "}
          <span className="text-slate-700 font-medium">
            login to unlock WorkPulse AI scoring and insights
          </span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEMO_USERS.map((u) => (
            <DemoCard key={u.username} username={u.username} tagline={u.tagline} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 bg-slate-900 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Unlock Full WorkPulse</h2>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            Add your team&apos;s GitHub accounts to get performance scores, commit history,
            PR analytics, and Groq AI-generated insights.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {[
              "🤖 AI insights",
              "🏆 Leaderboard",
              "📊 Score tracking",
              "🔀 PR analytics",
              "📝 Commit history",
            ].map((f) => (
              <span key={f}
                className="text-sm text-slate-400 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
                {f}
              </span>
            ))}
          </div>
          <Link href="/login"
            className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors">
            Get Started — It&apos;s Free →
          </Link>
        </div>
      </div>
    </div>
  );
}
