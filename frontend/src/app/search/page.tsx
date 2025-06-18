"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "../../components/layout/Navbar";
import { SearchHeader } from "../../components/search/SearchHeader";
import { SearchResults } from "../../components/search/SearchResults";

// Loading component
const SearchPageSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <div className="pt-20">
      <div className="container-app py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded-lg w-1/4"></div>
          <div className="h-12 bg-gray-700 rounded-xl"></div>
          <div className="anime-grid gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] bg-gray-700 rounded-xl"
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SearchPageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [resultsCount, setResultsCount] = useState(0);

  // Update query when URL search params change
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [searchParams, query]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    // Update the URL to reflect the new search query
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push("/search");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Navbar */}
      <Navbar onSearch={handleSearch} showSearch={true} currentPath="/search" />

      {/* Main Content */}
      <div className="pt-20">
        <div className="container-app py-8">
          {/* Search Header */}
          <SearchHeader
            query={query}
            onSearch={handleSearch}
            view={view}
            onViewChange={setView}
            resultsCount={resultsCount}
          />

          {/* Results Section */}
          <div className="mt-8">
            <SearchResults
              query={query}
              view={view}
              onResultsCountChange={setResultsCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Search Page Component with Suspense
const SearchPage: React.FC = () => {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
};

export default SearchPage;
