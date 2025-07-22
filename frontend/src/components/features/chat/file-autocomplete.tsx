import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "#/utils/utils";
import { useFileCache, CachedFileItem } from "#/hooks/use-file-cache";
import {
  getIconForFilePath,
  getIconUrlForFilePath,
  type MaterialIcon,
} from "vscode-material-icons";

// Base URL for the material icons (served from public/assets)
const ICONS_BASE_URL = "/assets/material-icons";

// Helper to get the appropriate icon for a file
const getFileIcon = (
  filePath: string,
  isDirectory: boolean,
): { iconUrl: string; iconName: string } => {
  if (isDirectory) {
    // Use folder icon for directories
    return {
      iconUrl: `${ICONS_BASE_URL}/folder.svg`,
      iconName: "folder",
    };
  }

  try {
    // Get icon name from vscode-material-icons
    const iconName = getIconForFilePath(filePath);
    const iconUrl = getIconUrlForFilePath(filePath, ICONS_BASE_URL);

    return {
      iconUrl,
      iconName,
    };
  } catch (error) {
    // Fallback to default file icon
    return {
      iconUrl: `${ICONS_BASE_URL}/file.svg`,
      iconName: "file",
    };
  }
};

interface FileAutocompleteProps {
  isVisible: boolean;
  query: string;
  position: { top: number; left: number };
  onSelect: (filePath: string) => void;
  onClose: () => void;
}

export function FileAutocomplete({
  isVisible,
  query,
  position,
  onSelect,
  onClose,
}: FileAutocompleteProps) {
  const [filteredFiles, setFilteredFiles] = useState<CachedFileItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [maxHeight, setMaxHeight] = useState(288); // Default fallback (max-h-72)
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use the file cache hook
  const { getFilteredFiles, isLoading, lastRefresh } = useFileCache();

  // Filter files based on query using the cache
  useEffect(() => {
    const filtered = getFilteredFiles(query); // No limit - show all matching files
    setFilteredFiles(filtered);
    setSelectedIndex(0); // Reset selection when filtering
  }, [query, getFilteredFiles]);

  // Additional effect to refresh files when cache updates
  // This ensures the dropdown stays current with file system changes
  useEffect(() => {
    if (isVisible) {
      const filtered = getFilteredFiles(query); // No limit - show all matching files
      setFilteredFiles(filtered);
    }
  }, [isVisible, lastRefresh, query, getFilteredFiles]); // React to cache refresh

  // Calculate dynamic height based on chat container and position
  useEffect(() => {
    if (isVisible) {
      const chatContainer =
        document.querySelector('[data-testid="chat-messages-container"]') ||
        document.querySelector(".scrollbar.scrollbar-thin") ||
        document.querySelector(".overflow-y-auto");

      if (chatContainer) {
        const containerRect = chatContainer.getBoundingClientRect();
        const availableHeight = containerRect.bottom - position.top;
        const dropdownHeight = Math.max(
          200,
          Math.min(500, availableHeight * 0.4),
        );
        setMaxHeight(dropdownHeight);
      }
    }
  }, [isVisible, position.top]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredFiles.length - 1),
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          event.preventDefault();
          if (filteredFiles[selectedIndex]) {
            onSelect(filteredFiles[selectedIndex].path);
          }
          break;
        case "Escape":
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, filteredFiles, selectedIndex, onSelect, onClose]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={dropdownRef}
      className={cn(
        "fixed z-[9999] w-96 flex flex-col",
        "bg-neutral-800/95 border border-neutral-600 rounded-lg shadow-2xl",
        "text-xs backdrop-blur-md",
        "animate-in slide-in-from-top-2 duration-200 ease-out",
      )}
      style={{
        top: position.top,
        left: position.left,
        maxHeight: `${maxHeight}px`,
      }}
    >
      {/* Fixed Header */}
      <div className="px-1.5 py-0.5 border-b border-neutral-700 bg-neutral-750 rounded-t-lg flex-shrink-0">
        <div className="text-xs text-neutral-400 flex items-center gap-1">
          <span>📁</span>
          <span>Go to File...</span>
          {query && <span className="text-neutral-500">· "{query}"</span>}
        </div>
      </div>

      {/* Scrollable File List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && filteredFiles.length === 0 ? (
          <div className="px-1.5 py-1.5 text-neutral-400 text-center text-xs">
            Loading files...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="px-1.5 py-1.5 text-neutral-400 text-center text-xs">
            {query ? `No files found for "${query}"` : "No files found"}
          </div>
        ) : (
          <div className="py-0.5">
            {filteredFiles.map((file, index) => {
              const isRemoved = file.status === "removed";
              const isClickable = file.status === "exists";

              return (
                <div
                  key={file.path}
                  className={cn(
                    "px-1.5 py-0.5 flex items-center gap-1",
                    isClickable && "cursor-pointer hover:bg-neutral-700",
                    !isClickable && "cursor-not-allowed opacity-60",
                    index === selectedIndex && isClickable && "bg-neutral-700",
                    index === selectedIndex &&
                      !isClickable &&
                      "bg-neutral-700/30",
                  )}
                  onClick={() => isClickable && onSelect(file.path)}
                >
                  <span
                    className={cn(
                      "w-3 h-3 flex items-center justify-center flex-shrink-0",
                      isRemoved && "opacity-50",
                    )}
                  >
                    {(() => {
                      const { iconUrl } = getFileIcon(
                        file.path,
                        file.isDirectory,
                      );
                      return (
                        <img
                          src={iconUrl}
                          alt={file.path}
                          className="w-3 h-3"
                        />
                      );
                    })()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs leading-tight font-mono">
                      {(() => {
                        const pathParts = file.path.split("/");
                        const filename = pathParts[pathParts.length - 1];
                        const directory = pathParts.slice(0, -1).join("/");

                        return (
                          <>
                            {directory && (
                              <span
                                className={cn(
                                  isRemoved
                                    ? "text-neutral-600"
                                    : "text-neutral-400",
                                )}
                              >
                                {directory}/
                              </span>
                            )}
                            <span
                              className={cn(
                                "font-semibold",
                                isRemoved ? "text-neutral-500" : "text-white",
                              )}
                            >
                              {filename}
                              {isRemoved && " (removed)"}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {isRemoved && (
                    <span className="text-neutral-600 text-xs flex-shrink-0">
                      🗑️
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="border-t border-neutral-700 px-1.5 py-0.5 text-xs text-neutral-500 bg-neutral-750 rounded-b-lg flex-shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-xs">
            ↑↓ navigate • Enter select • Esc close
          </span>
          {isLoading && (
            <span className="text-neutral-400 flex items-center gap-0.5">
              <span className="inline-block animate-spin text-xs">⟳</span>
              {filteredFiles.length > 0 && (
                <span className="text-xs">Loading more...</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
