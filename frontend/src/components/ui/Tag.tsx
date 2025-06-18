import React from "react";

interface TagProps {
  children: React.ReactNode;
  color?: "gray" | "blue" | "green" | "yellow" | "red" | "purple";
  className?: string;
}

const colorClasses = {
  gray: "bg-gray-700 text-gray-300",
  blue: "bg-blue-600/20 text-blue-400",
  green: "bg-green-600/20 text-green-400",
  yellow: "bg-yellow-600/20 text-yellow-400",
  red: "bg-red-600/20 text-red-400",
  purple: "bg-purple-600/20 text-purple-400",
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
