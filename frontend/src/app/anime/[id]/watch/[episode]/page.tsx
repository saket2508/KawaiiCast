"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { ContextualWatchPage } from "@/components/watch/ContextualWatchPage";

// Loading skeleton for the watch page
const WatchPageSkeleton = () => (
  <div className="min-h-screen bg-black">
    <div className="pt-20">
      <div className="animate-pulse">
        {/* Context bar skeleton */}
        <div className="bg-gray-900 border-b border-gray-700 px-6 py-4">
          <div className="container-app">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-6 bg-gray-700 rounded w-48"></div>
                <div className="h-4 bg-gray-700 rounded w-32"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-700 rounded w-16"></div>
                <div className="h-8 bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Video player skeleton */}
        <div className="aspect-video bg-gray-800 flex items-center justify-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full"></div>
        </div>

        {/* Episode info skeleton */}
        <div className="bg-gray-900 px-6 py-4">
          <div className="container-app">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-700 rounded w-64"></div>
                <div className="h-3 bg-gray-700 rounded w-48"></div>
              </div>
              <div className="h-6 bg-gray-700 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ContextualWatchPageContent: React.FC = () => {
  const params = useParams();
  const animeId = parseInt(params.id as string);
  const episodeNumber = parseInt(params.episode as string);

  return (
    <div className="min-h-screen bg-black">
      {/* Navbar with minimal styling for watch mode */}
      <Navbar showSearch={false} currentPath="/watch" />

      {/* Watch Content */}
      <div className="pt-20">
        <ContextualWatchPage animeId={animeId} episodeNumber={episodeNumber} />
      </div>
    </div>
  );
};

// Main Contextual Watch Page Component with Suspense
const ContextualWatchPageRoute: React.FC = () => {
  return (
    <Suspense fallback={<WatchPageSkeleton />}>
      <ContextualWatchPageContent />
    </Suspense>
  );
};

export default ContextualWatchPageRoute;
