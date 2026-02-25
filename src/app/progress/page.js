"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProgressDashboard from "@/src/components/progress/ProgressDashboard";
import ProgressSkeleton from "@/src/components/progress/ProgressSkeleton";
import { fetchProgress } from "@/lib/progressService";
import "../globals.css";

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [progress, setProgress] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/"); // redirect unauthenticated users to login
      return;
    }

    async function load() {
      try {
        const prog = await fetchProgress(user.uid);
        setProgress(prog);
      } catch (err) {
        setError("Failed to load progress. Please try again.");
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    }

    load();
  }, [user, authLoading, router]);

  if (authLoading || dataLoading) return <ProgressSkeleton />;

  if (error) {
    return (
      <div className="progress-container">
        <p className="progress-error">{error}</p>
      </div>
    );
  }

  return <ProgressDashboard progress={progress} />;
}
