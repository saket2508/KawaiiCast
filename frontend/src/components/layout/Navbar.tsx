"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SmartSearchInput } from "../ui/SmartSearchInput";
import { GhostButton, IconButton } from "../ui/Button";

export interface NavbarProps {
  onSearch?: (query: string) => void;
  showSearch?: boolean;
  currentPath?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  showSearch = true,
  currentPath = "/",
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActivePath = (path: string) => currentPath === path;

  return (
    <>
      {/* Main Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/10">
        <nav className="container-app">
          <div className="flex items-center justify-between h-20">
            {/* Logo Section */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-gradient">
                  AnimeStream
                </span>
                <div className="text-xs text-gray-400 -mt-1">
                  Premium Experience
                </div>
              </div>
            </Link>

            {/* Search Section - Desktop */}
            {showSearch && (
              <div className="hidden md:flex flex-1 max-w-xl mx-8">
                <SmartSearchInput
                  variant="navbar"
                  onAnimeSearch={onSearch}
                  onMagnetSubmit={(magnet) => {
                    // Navigate to watch page for magnet URIs
                    window.location.href = `/watch/${encodeURIComponent(
                      magnet
                    )}`;
                  }}
                />
              </div>
            )}

            {/* Navigation Links - Desktop */}
            <div className="hidden lg:flex items-center space-x-2">
              <NavLink href="/" active={isActivePath("/")} label="Home" />
              <NavLink
                href="/search"
                active={isActivePath("/search")}
                label="Search"
              />
              <NavLink
                href="/trending"
                active={isActivePath("/trending")}
                label="Trending"
              />
              <NavLink
                href="/library"
                active={isActivePath("/library")}
                label="Library"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Search Toggle - Mobile */}
              {showSearch && (
                <IconButton
                  variant="ghost"
                  className="md:hidden"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </IconButton>
              )}

              {/* Settings */}
              <IconButton variant="ghost">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </IconButton>

              {/* Mobile Menu Toggle */}
              <IconButton
                variant="ghost"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </IconButton>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute top-20 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-b border-white/10 animate-fade-in-up">
            <div className="container-app py-6">
              {/* Mobile Search */}
              {showSearch && (
                <div className="mb-6">
                  <SmartSearchInput
                    variant="navbar"
                    onAnimeSearch={(query) => {
                      if (onSearch) onSearch(query);
                      setIsMobileMenuOpen(false);
                    }}
                    onMagnetSubmit={(magnet) => {
                      window.location.href = `/watch/${encodeURIComponent(
                        magnet
                      )}`;
                    }}
                  />
                </div>
              )}

              {/* Mobile Navigation */}
              <nav className="space-y-2">
                <MobileNavLink
                  href="/"
                  active={isActivePath("/")}
                  label="Home"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <MobileNavLink
                  href="/search"
                  active={isActivePath("/search")}
                  label="Search"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <MobileNavLink
                  href="/trending"
                  active={isActivePath("/trending")}
                  label="Trending"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <MobileNavLink
                  href="/library"
                  active={isActivePath("/library")}
                  label="Library"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              </nav>

              {/* Mobile Actions */}
              {/* <div className="mt-6 pt-6 border-t border-white/10">
                <Button variant="primary" fullWidth>
                  Sign In
                </Button>
              </div> */}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Desktop Navigation Link Component
const NavLink: React.FC<{ href: string; active: boolean; label: string }> = ({
  href,
  active,
  label,
}) => (
  <Link href={href}>
    <GhostButton
      className={`relative ${
        active ? "text-orange-400" : "text-gray-300"
      } hover:text-white transition-colors`}
    >
      {label}
      {active && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full"></div>
      )}
    </GhostButton>
  </Link>
);

// Mobile Navigation Link Component
const MobileNavLink: React.FC<{
  href: string;
  active: boolean;
  label: string;
  onClick: () => void;
}> = ({ href, active, label, onClick }) => (
  <Link href={href} onClick={onClick}>
    <div
      className={`block px-4 py-3 rounded-xl transition-all duration-200 ${
        active
          ? "bg-orange-500/20 text-orange-400 border-l-4 border-orange-500"
          : "text-gray-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="font-medium">{label}</span>
    </div>
  </Link>
);
