import React, { useState, ChangeEvent } from "react";
import { UploadCloud, LinkIcon } from "lucide-react";

interface TorrentInputProps {
  onTorrentSubmit: (data: string | ArrayBuffer) => void;
  isDisabled: boolean;
}

export const TorrentInput: React.FC<TorrentInputProps> = ({
  onTorrentSubmit,
  isDisabled,
}) => {
  const [torrentInput, setTorrentInput] = useState<string>("");
  const [actualTorrentData, setActualTorrentData] = useState<
    string | ArrayBuffer | null
  >(null);
  const [message, setMessage] = useState<string>("");

  const handleMagnetInput = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTorrentInput(value);
    setActualTorrentData(value);
    setMessage("");
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setMessage("No file selected.");
      return;
    }

    // Validate file
    if (!file.name.toLowerCase().endsWith(".torrent")) {
      setMessage("Error: Please select a .torrent file.");
      return;
    }

    if (file.size === 0) {
      setMessage("Error: The selected file is empty.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage(
        "Error: File too large. .torrent files should be much smaller."
      );
      return;
    }

    setMessage("Reading .torrent file...");

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (event.target?.result) {
        setActualTorrentData(event.target.result as ArrayBuffer);
        setTorrentInput(file.name);
        setMessage(
          `File "${file.name}" loaded successfully. Click "Load Torrent" to start streaming.`
        );
      } else {
        setMessage("Error: Failed to read the file.");
      }
    };

    reader.onerror = () => {
      setMessage("Error: Failed to read the .torrent file. Please try again.");
    };

    reader.onabort = () => {
      setMessage("File reading was aborted.");
    };

    try {
      reader.readAsArrayBuffer(file);
    } catch {
      setMessage("Error: Could not read the file. Please try again.");
    }
  };

  const handleSubmit = () => {
    if (actualTorrentData) {
      onTorrentSubmit(actualTorrentData);
      setMessage("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          className="flex-grow p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-500 focus:ring-blue-500 text-white placeholder-gray-400 shadow-md"
          placeholder="Enter Magnet URI or .torrent file URL"
          value={torrentInput}
          onChange={handleMagnetInput}
        />

        <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg cursor-pointer flex items-center justify-center transition duration-300 ease-in-out transform hover:scale-105">
          <UploadCloud size={20} className="mr-2" /> Select .torrent
          <input
            type="file"
            className="hidden"
            accept=".torrent"
            onChange={handleFileUpload}
          />
        </label>

        <button
          onClick={handleSubmit}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-center transition duration-300 ease-in-out transform hover:scale-105"
          disabled={isDisabled || !actualTorrentData}
        >
          <LinkIcon size={20} className="mr-2" /> Load Torrent
        </button>
      </div>

      {message && (
        <div className="bg-blue-900 bg-opacity-30 border border-blue-700 text-blue-200 p-3 rounded-lg text-sm shadow-inner">
          {message}
        </div>
      )}
    </div>
  );
};
