"use client";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "@/src/components/Navbar";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not loading and no user, and not on login page, redirect to login
    if (!loading && !user && pathname !== "/") {
      router.push("/");
    }
    // If user is logged in and on login page, redirect to landing page
    if (!loading && user && pathname === "/") {
      // Force a hard refresh to ensure layout scripts and themes apply properly without React hydration conflicts
      window.location.href = "/landingPage";
    }
  }, [user, loading, router, pathname]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#cfd0e8'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  // If on login page and not authenticated, show login page without navbar
  if (pathname === "/" && !user) {
    return <>{children}</>;
  }

  // If user is authenticated and not on login page, show the navbar and protected content
  if (user && pathname !== "/") {
    return (
      <>
        <Navbar />
        {children}
      </>
    );
  }

  // If not authenticated and not on login page, don't show anything
  // (will redirect in useEffect)
  return null;
}
