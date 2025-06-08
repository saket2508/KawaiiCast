"use client";

import React from "react";
import Image from "next/image";
import { SmartSearchInput } from "../components/ui/SmartSearchInput";

const Home = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <Image
        src="/landing1.png"
        alt="One Piece characters background"
        fill
        className="object-cover"
        priority
        quality={100}
      />

      {/* Lighter overlay for better character visibility */}
      <div className="absolute inset-0 bg-black/30 z-10"></div>

      {/* Content - positioned to not cover main characters */}
      <div className="relative z-20 min-h-screen flex items-center justify-center p-8 pt-16">
        <div className="bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          {/* Logo/Title */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-3 mb-2">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg
                    className="w-7 h-7 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl blur opacity-30"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">
                  AnimeStream
                </h1>
                <div className="text-xs text-gray-300 -mt-1">
                  Premium Experience
                </div>
              </div>
            </div>
            <p className="text-gray-100 text-sm">
              Stream your favorite anime instantly
            </p>
          </div>

          {/* Description */}
          <div className="text-center mb-6">
            <p className="text-gray-50 text-base leading-relaxed">
              Search for anime titles or paste magnet URIs for instant
              streaming. Your gateway to the world of anime torrents.
            </p>
          </div>

          {/* Smart Search Bar */}
          <div className="mb-5">
            <SmartSearchInput variant="landing" autoFocus />
          </div>

          {/* Action Button */}
          <button
            onClick={() => {
              // TODO: Navigate to streaming screen
              console.log("Navigate to streaming screen");
            }}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Start Streaming
          </button>

          {/* Features */}
          <div className="mt-6 grid grid-cols-2 gap-3 text-center">
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2">
              <div className="text-xl mb-1">⚡</div>
              <div className="text-white text-xs font-medium">
                Fast Streaming
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2">
              <div className="text-xl mb-1">🎬</div>
              <div className="text-white text-xs font-medium">HD Quality</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2">
              <div className="text-xl mb-1">🔒</div>
              <div className="text-white text-xs font-medium">Secure</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2">
              <div className="text-xl mb-1">📱</div>
              <div className="text-white text-xs font-medium">Multi-Device</div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className="text-gray-200 text-xs">Powered by WebTorrent</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
