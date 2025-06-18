import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg" | "xl" | "icon";
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const getVariantClasses = (variant: ButtonProps["variant"]) => {
  switch (variant) {
    case "primary":
      return "btn-primary";
    case "secondary":
      return "btn-secondary";
    case "ghost":
      return "btn-ghost";
    case "destructive":
      return "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105";
    case "outline":
      return "border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white bg-transparent";
    default:
      return "btn-primary";
  }
};

const getSizeClasses = (size: ButtonProps["size"]) => {
  switch (size) {
    case "sm":
      return "px-4 py-2 text-sm rounded-lg";
    case "md":
      return "px-6 py-3 text-base rounded-xl";
    case "lg":
      return "px-8 py-4 text-lg rounded-xl";
    case "xl":
      return "px-10 py-5 text-xl rounded-2xl";
    case "icon":
      return "w-10 h-10 rounded-lg";
    default:
      return "px-6 py-3 text-base rounded-xl";
  }
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      "btn focus-ring inline-flex items-center justify-center font-semibold transition-all duration-300",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
      getVariantClasses(variant),
      getSizeClasses(size),
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
        )}

        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}

        <span className={loading ? "opacity-70" : ""}>{children}</span>

        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

// Convenience components for common use cases
export const PrimaryButton: React.FC<Omit<ButtonProps, "variant">> = (
  props
) => <Button variant="primary" {...props} />;

export const SecondaryButton: React.FC<Omit<ButtonProps, "variant">> = (
  props
) => <Button variant="secondary" {...props} />;

export const GhostButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button variant="ghost" {...props} />
);

export const IconButton: React.FC<Omit<ButtonProps, "size">> = (props) => (
  <Button size="icon" {...props} />
);
