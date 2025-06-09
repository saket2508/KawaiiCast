import React from "react";

interface TagProps {
  children: React.ReactNode;
  color?: "gray" | "blue" | "green" | "yellow" | "red" | "purple";
  className?: string;
}

const colorClasses = {
  gray: "bg-gray-200 text-gray-800",
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  purple: "bg-purple-100 text-purple-800",
};

export const Tag: React.FC<TagProps> = ({
  children,
  color = "gray",
  className = "",
}) => {
  const classes = [
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
    colorClasses[color],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
};
