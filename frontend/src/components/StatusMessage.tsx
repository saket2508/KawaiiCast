import React from "react";
import { Info } from "lucide-react";

interface StatusMessageProps {
  message: string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <div className="bg-blue-900 bg-opacity-30 border border-blue-700 text-blue-200 p-3 rounded-lg flex items-center text-sm shadow-inner">
      <Info size={18} className="mr-2 flex-shrink-0" />
      {message}
    </div>
  );
};
