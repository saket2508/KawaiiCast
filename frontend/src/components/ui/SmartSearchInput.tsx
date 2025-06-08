"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface SmartSearchInputProps {
  variant?: "landing" | "navbar";
  className?: string;
  onAnimeSearch?: (query: string) => void;
  onMagnetSubmit?: (magnet: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

type InputType = "search" | "magnet" | "hash";

// Detection utilities
const detectInputType = (input: string): InputType => {
  if (input.startsWith("magnet:?")) return "magnet";
  if (/^[a-f0-9]{40}$/i.test(input.trim())) return "hash";
  return "search";
};

const isValidMagnet = (input: string): boolean => {
  return input.startsWith("magnet:?xt=urn:btih:") && input.length > 25;
};

const formatInfoHash = (hash: string): string => {
  return `magnet:?xt=urn:btih:${hash}`;
};

export const SmartSearchInput: React.FC<SmartSearchInputProps> = ({
  variant = "landing",
  className = "",
  onAnimeSearch,
  onMagnetSubmit,
  placeholder,
  autoFocus = false,
}) => {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [inputType, setInputType] = useState<InputType>("search");
  const router = useRouter();

  // Detect input type as user types
  useEffect(() => {
    setInputType(detectInputType(input));
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();

    if (!trimmedInput) return;

    if (inputType === "magnet") {
      if (isValidMagnet(trimmedInput)) {
        if (onMagnetSubmit) {
          onMagnetSubmit(trimmedInput);
        } else {
          // Default: navigate to watch page
          const encodedMagnet = encodeURIComponent(trimmedInput);
          router.push(`/watch/${encodedMagnet}`);
        }
      }
    } else if (inputType === "hash") {
      const magnetUri = formatInfoHash(trimmedInput);
      if (onMagnetSubmit) {
        onMagnetSubmit(magnetUri);
      } else {
        const encodedMagnet = encodeURIComponent(magnetUri);
        router.push(`/watch/${encodedMagnet}`);
      }
    } else {
      // Anime search
      if (onAnimeSearch) {
        onAnimeSearch(trimmedInput);
      } else {
        // Default: navigate to search page
        router.push(`/search?q=${encodeURIComponent(trimmedInput)}`);
      }
    }
  };

  const getIcon = () => {
    switch (inputType) {
      case "magnet":
        return (
          <svg
            className="w-5 h-5 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        );
      case "hash":
        return (
          <svg
            className="w-5 h-5 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-gray-400"
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
        );
    }
  };

  const getValidationIcon = () => {
    if (inputType === "magnet" && input.length > 10) {
      return isValidMagnet(input) ? (
        <svg
          className="w-4 h-4 text-green-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 text-red-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    if (inputType === "hash" && input.length === 40) {
      return (
        <svg
          className="w-4 h-4 text-green-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return null;
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;

    if (focused && variant === "landing") {
      return "Try: 'one piece' or 'magnet:?xt=urn:btih:...'";
    }

    return variant === "landing"
      ? "Search anime or paste magnet link..."
      : "Search or paste magnet...";
  };

  const getHintText = () => {
    if (!focused || variant !== "landing") return null;

    switch (inputType) {
      case "magnet":
        return "🔗 Magnet URI detected - will start streaming directly";
      case "hash":
        return "🔢 Info hash detected - will convert to magnet URI";
      case "search":
        return input.length > 0 ? "🔍 Searching anime database" : null;
      default:
        return null;
    }
  };

  // Size classes based on variant
  const sizeClasses =
    variant === "landing"
      ? "px-5 py-4 text-lg rounded-xl"
      : "px-4 py-3 text-base rounded-xl";

  const containerClasses = variant === "landing" ? "w-full" : "flex-1";

  return (
    <div className={`${containerClasses} ${className}`}>
      <form onSubmit={handleSubmit}>
        <div
          className={`relative transition-all duration-300 ${
            focused && variant === "landing" ? "transform scale-105" : ""
          }`}
        >
          {/* Main Input */}
          <div className="relative">
            {/* Left Icon */}
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200">
              {getIcon()}
            </div>

            {/* Input Field */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={getPlaceholder()}
              autoFocus={autoFocus}
              className={`
                w-full ${sizeClasses} pl-11 pr-20
                bg-white/15 backdrop-blur-sm border border-white/30 
                text-white placeholder-gray-300
                hover:border-orange-400 focus:border-orange-500 focus:bg-white/20
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900
                transition-all duration-300
              `}
            />

            {/* Right Icons */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              {/* Validation Icon */}
              {getValidationIcon()}

              {/* Submit Button */}
              <button
                type="submit"
                className="text-gray-400 hover:text-orange-400 transition-colors p-1"
                disabled={!input.trim()}
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
                    d="M13 7l5 5-5 5M6 12h12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Hint Text - Landing Page Only */}
          {variant === "landing" && (
            <div className="mt-2 min-h-[1.25rem]">
              {getHintText() && (
                <p className="text-xs text-gray-300 animate-fade-in-up">
                  {getHintText()}
                </p>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
