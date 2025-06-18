"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { AnimeDetailsContent } from "@/components/anime/AnimeDetailsContent";

// Loading skeleton for the anime detail page
const AnimeDetailSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <div className="pt-20">
      <div className="animate-pulse">
        {/* Banner skeleton */}
        <div className="h-80 md:h-96 bg-gray-700"></div>

        {/* Content skeleton */}
        <div className="container-app py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Poster skeleton */}
            <div className="lg:col-span-1">
              <div className="aspect-[3/4] bg-gray-700 rounded-2xl"></div>
            </div>

            {/* Details skeleton */}
            <div className="lg:col-span-3 space-y-6">
              <div className="h-8 bg-gray-700 rounded w-3/4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                <div className="h-4 bg-gray-700 rounded w-4/6"></div>
              </div>
              <div className="flex space-x-4">
                <div className="h-10 bg-gray-700 rounded w-32"></div>
                <div className="h-10 bg-gray-700 rounded w-24"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AnimeDetailPageContent: React.FC = () => {
  const params = useParams();
  const animeId = params.id as string;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Navbar */}
      <Navbar showSearch={true} currentPath="/anime" />

      {/* Main Content */}
      <div className="pt-20">
        <AnimeDetailsContent animeId={parseInt(animeId)} />
      </div>
    </div>
  );
};

// Main Anime Detail Page Component with Suspense
const AnimeDetailPage: React.FC = () => {
  return (
    <Suspense fallback={<AnimeDetailSkeleton />}>
      <AnimeDetailPageContent />
    </Suspense>
  );
};

export default AnimeDetailPage;
