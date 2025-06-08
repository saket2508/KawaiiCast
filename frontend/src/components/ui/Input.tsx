import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "search" | "ghost";
  inputSize?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  error?: string;
  label?: string;
  fullWidth?: boolean;
}

const getVariantClasses = (variant: InputProps["variant"]) => {
  switch (variant) {
    case "default":
      return "bg-white/10 border-white/20 hover:border-white/30 focus:border-orange-500";
    case "search":
      return "bg-white/15 border-white/30 hover:border-orange-400 focus:border-orange-500 focus:bg-white/20";
    case "ghost":
      return "bg-transparent border-transparent hover:bg-white/5 focus:bg-white/10 focus:border-orange-500";
    default:
      return "bg-white/10 border-white/20 hover:border-white/30 focus:border-orange-500";
  }
};

const getSizeClasses = (size: InputProps["inputSize"]) => {
  switch (size) {
    case "sm":
      return "px-3 py-2 text-sm rounded-lg";
    case "md":
      return "px-4 py-3 text-base rounded-xl";
    case "lg":
      return "px-5 py-4 text-lg rounded-xl";
    default:
      return "px-4 py-3 text-base rounded-xl";
  }
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = "",
      variant = "default",
      inputSize = "md",
      leftIcon,
      rightIcon,
      loading = false,
      error,
      label,
      fullWidth = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      "transition-all duration-300 text-white placeholder-gray-400 backdrop-blur-sm",
      "focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      getVariantClasses(variant),
      getSizeClasses(inputSize),
      fullWidth ? "w-full" : "",
      leftIcon ? "pl-10" : "",
      rightIcon || loading ? "pr-10" : "",
      error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label className="block text-sm font-medium text-gray-200 mb-2">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            className={baseClasses}
            disabled={disabled || loading}
            {...props}
          />

          {(rightIcon || loading) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1 text-sm text-red-400 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// Search Input with built-in search icon
export const SearchInput: React.FC<Omit<InputProps, "variant" | "leftIcon">> = (
  props
) => (
  <Input
    variant="search"
    leftIcon={
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
    }
    {...props}
  />
);

// URL Input with link icon
export const UrlInput: React.FC<Omit<InputProps, "variant" | "leftIcon">> = (
  props
) => (
  <Input
    variant="default"
    leftIcon={
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
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    }
    {...props}
  />
);
