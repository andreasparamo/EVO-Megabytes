"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import ProfileModal from "@/src/components/ProfileModal";
import SettingsModal from "@/src/components/SettingsModal";

const NAV_ITEMS = [
  { href: "/battle", label: "Battle" },
  { href: "/tests", label: "Tests" },
  { href: "/lessons", label: "Lessons" },
  { href: "/games", label: "Games" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/progress", label: "Progress" },
];

const toggleDropdown = () => {
  const dropdown = document.getElementById("myDropdown");
  dropdown?.classList.toggle("show");
};

export default function Navbar() {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const openProfileModal = (e) => {
    e.preventDefault();
    setIsProfileModalOpen(true);
    const dropdown = document.getElementById("myDropdown");
    dropdown?.classList.remove("show");
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const openSettingsModal = (e) => {
    e.preventDefault();
    setIsSettingsModalOpen(true);
    const dropdown = document.getElementById("myDropdown");
    dropdown?.classList.remove("show");
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".user-menu")) {
        const dropdowns = document.getElementsByClassName("dropdown-menu");
        for (let i = 0; i < dropdowns.length; i++) {
          dropdowns[i].classList.remove("show");
        }
      }
    };

    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <>
      <header className="header game-header">
        {/* Scanline overlay */}
        <div className="header-scanlines" aria-hidden="true" />

        <div className="nav-container">
          {/* Logo with glitch effect */}
          <Link href="/landingPage" className="logo game-logo">
            <span className="game-logo-text" data-text="LearnToType">
              LearnToType
            </span>
            <span className="game-logo-badge">XP</span>
          </Link>

          {/* Navigation with gaming buttons */}
          <nav>
            <ul className="nav-links game-nav-links">
              {NAV_ITEMS.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <motion.div
                      onHoverStart={() => setHoveredIndex(index)}
                      onHoverEnd={() => setHoveredIndex(null)}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Link
                        href={item.href}
                        className={`game-nav-btn ${isActive ? "game-nav-btn--active" : ""}`}
                      >
                        {/* Glow background on hover */}
                        {hoveredIndex === index && (
                          <motion.span
                            className="game-nav-btn__glow"
                            layoutId="navGlow"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}

                        {/* Active indicator bar */}
                        {isActive && (
                          <motion.span
                            className="game-nav-btn__active-bar"
                            layoutId="activeBar"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}

                        <span className="game-nav-btn__label">{item.label}</span>

                        {/* Corner accents */}
                        <span className="game-nav-btn__corner game-nav-btn__corner--tl" />
                        <span className="game-nav-btn__corner game-nav-btn__corner--br" />
                      </Link>
                    </motion.div>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User menu */}
          <div className="user-menu">
            <motion.button
              className="dropdown-toggle game-avatar-btn"
              onClick={toggleDropdown}
              aria-label="User menu"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <div className="game-avatar-ring">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </motion.button>
            <div className="dropdown-menu game-dropdown" id="myDropdown">
              <a href="#" onClick={openProfileModal} className="game-dropdown-item">
                Profile
              </a>
              <a href="#" onClick={openSettingsModal} className="game-dropdown-item">
                Settings
              </a>
              <a href="#" onClick={handleLogout} className="game-dropdown-item game-dropdown-item--danger">
                Logout
              </a>
            </div>
          </div>
        </div>
      </header>

      <ProfileModal isOpen={isProfileModalOpen} onClose={closeProfileModal} />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
      />
    </>
  );
}
