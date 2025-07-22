import { useState, useCallback, useEffect, useRef } from "react";
import { FileService } from "#/api/file-service/file-service.api";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";

export interface CachedFileItem {
  path: string;
  name: string;
  isDirectory: boolean;
  status: "exists" | "removed" | "loading";
  lastSeen: number; // timestamp
}

interface UseFileCacheProps {
  refreshInterval?: number; // ms between refresh checks
  maxAge?: number; // ms after which files are considered stale
}

export function useFileCache({
  refreshInterval = 30000, // 30 seconds
  maxAge = 300000, // 5 minutes
}: UseFileCacheProps = {}) {
  const [cache, setCache] = useState<Map<string, CachedFileItem>>(new Map());
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isStreamingFiles, setIsStreamingFiles] = useState(false); // Track streaming discovery
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [cacheVersion, setCacheVersion] = useState<number>(0); // Force re-renders
  const { data: conversation } = useActiveConversation();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const loadingRef = useRef<Promise<void> | null>(null); // Track active loading

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current !== null) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      // Clear any pending loading operation
      loadingRef.current = null;
    };
  }, []);

  // Recursively discover all files in the workspace with streaming cache updates
  const discoverAllFiles = useCallback(
    async (
      conversationId: string,
      path: string = "",
      updateCache: (files: string[]) => void,
    ): Promise<void> => {
      try {
        const items = await FileService.getFiles(
          conversationId,
          path || undefined,
        );
        console.debug(
          `Exploring path "${path}" - found ${items.length} items:`,
          items,
        );

        const currentFiles: string[] = [];
        const directoryPromises: Promise<void>[] = [];

        for (const item of items) {
          if (item.endsWith("/")) {
            // It's a directory - recursively explore it
            // Remove trailing slash for consistent path building
            const dirName = item.slice(0, -1);
            const dirPath = path ? `${path}/${dirName}` : dirName;
            console.debug(
              `Found directory: "${item}" -> exploring "${dirPath}"`,
            );
            // Start exploring directory in background
            directoryPromises.push(
              discoverAllFiles(conversationId, dirPath, updateCache),
            );
          } else {
            // It's a file - build the full path
            const filePath = path ? `${path}/${item}` : item;
            console.debug(`Found file: "${item}" -> "${filePath}"`);
            currentFiles.push(filePath);
          }
        }

        // Immediately update cache with files found at this level
        if (currentFiles.length > 0) {
          console.debug(
            `Streaming update: adding ${currentFiles.length} files from "${path}"`,
          );
          updateCache(currentFiles);
        }

        // Continue exploring subdirectories in parallel
        await Promise.all(directoryPromises);

        console.debug(`Completed exploration of path "${path}"`);
      } catch (error) {
        console.error(`Failed to discover files in path "${path}":`, error);
      }
    },
    [],
  );

  // Load files from API and update cache
  const loadFiles = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!conversation?.conversation_id) return;

      // If there's already a loading operation, return the existing promise
      // This prevents concurrent requests and implements the "return current cache + streaming updates" behavior
      if (loadingRef.current) {
        console.debug(
          "File loading already in progress, returning existing promise",
        );
        return loadingRef.current;
      }

      const loadPromise = (async () => {
        try {
          // Show loading states
          if (!isBackgroundRefresh) {
            setCache((prevCache) => {
              if (prevCache.size === 0) {
                setIsInitialLoading(true);
              }
              return prevCache;
            });
          }

          // Always show streaming indicator during discovery
          setIsStreamingFiles(true);

          // Create a streaming update function that adds files to cache as they're discovered
          const discoveredPaths = new Set<string>();

          const streamingUpdate = (newFiles: string[]) => {
            if (!isMountedRef.current) return;

            const now = Date.now();
            console.debug(
              `Streaming update: received ${newFiles.length} files`,
            );

            setCache((prevCache) => {
              const newCache = new Map(prevCache);

              // Add the newly discovered files
              newFiles.forEach((path) => {
                discoveredPaths.add(path);
                const existing = newCache.get(path);

                newCache.set(path, {
                  path,
                  name: path.split("/").pop() || path,
                  isDirectory: false, // Only files are returned from our recursive discovery
                  status: "exists",
                  lastSeen: now,
                  // Preserve any additional metadata
                  ...existing,
                });
              });

              return newCache;
            });

            // Update cache version to trigger re-renders
            setCacheVersion((v) => v + 1);
          };

          // Start recursive discovery with streaming updates
          await discoverAllFiles(
            conversation.conversation_id,
            "",
            streamingUpdate,
          );

          if (!isMountedRef.current) return;

          // Final cleanup: mark missing files as removed
          const now = Date.now();
          setCache((prevCache) => {
            const newCache = new Map(prevCache);

            // Mark files not found in this discovery as removed
            for (const [path, item] of newCache.entries()) {
              if (!discoveredPaths.has(path) && item.status === "exists") {
                newCache.set(path, {
                  ...item,
                  status: "removed",
                  lastSeen: item.lastSeen, // Keep original lastSeen
                });
              }
            }

            // Remove files that have been marked as removed for too long
            const cutoffTime = now - maxAge;
            for (const [path, item] of newCache.entries()) {
              if (item.status === "removed" && item.lastSeen < cutoffTime) {
                newCache.delete(path);
              }
            }

            return newCache;
          });

          setLastRefresh(now);
          setCacheVersion((v) => v + 1); // Force re-renders for components using the cache
        } catch (error) {
          console.error("Failed to load files for cache:", error);
        } finally {
          if (!isBackgroundRefresh && isMountedRef.current) {
            setIsInitialLoading(false);
          }
          // Clear loading states when done
          setIsStreamingFiles(false);
          // Clear the loading reference when done
          loadingRef.current = null;
        }
      })();

      // Store the promise to prevent concurrent requests
      loadingRef.current = loadPromise;
      return loadPromise;
    },
    [conversation?.conversation_id, maxAge, discoverAllFiles], // Added discoverAllFiles dependency
  );

  // Schedule periodic refresh
  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current !== null) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    refreshTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        loadFiles(true); // Background refresh
        scheduleRefresh(); // Schedule next refresh
      }
    }, refreshInterval) as NodeJS.Timeout;
  }, [loadFiles, refreshInterval]);

  // Start periodic refresh when cache is first loaded
  useEffect(() => {
    if (lastRefresh > 0) {
      scheduleRefresh();
    }
    return () => {
      if (refreshTimeoutRef.current !== null) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [lastRefresh, scheduleRefresh]);

  // Pre-load files when conversation changes or on initial mount
  useEffect(() => {
    if (conversation?.conversation_id) {
      // Load files immediately when conversation is available
      loadFiles();
    }
  }, [conversation?.conversation_id, loadFiles]);

  // Additional effect to ensure files are loaded on component mount
  // This handles cases where the conversation is already available when the hook mounts
  useEffect(() => {
    if (
      conversation?.conversation_id &&
      cache.size === 0 &&
      !isInitialLoading &&
      !loadingRef.current // Don't load if already in progress
    ) {
      // Only load if cache is empty and not already loading
      loadFiles();
    }
  }, [conversation?.conversation_id, isInitialLoading, loadFiles]); // Removed cache.size

  // Get filtered files for autocomplete
  const getFilteredFiles = useCallback(
    (query: string, limit?: number): CachedFileItem[] => {
      const files = Array.from(cache.values());

      if (!query.trim()) {
        // Show existing files first, then recently removed ones
        const sorted = files.sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === "exists" ? -1 : 1;
          }
          return b.lastSeen - a.lastSeen;
        });
        return limit ? sorted.slice(0, limit) : sorted;
      }

      const searchQuery = query.toLowerCase();
      const filtered = files
        .filter((file) => {
          return (
            file.name.toLowerCase().includes(searchQuery) ||
            file.path.toLowerCase().includes(searchQuery)
          );
        })
        .sort((a, b) => {
          // Prioritize existing files
          if (a.status !== b.status) {
            return a.status === "exists" ? -1 : 1;
          }

          // Then prioritize exact name matches
          const aNameMatch = a.name.toLowerCase().includes(searchQuery);
          const bNameMatch = b.name.toLowerCase().includes(searchQuery);
          if (aNameMatch !== bNameMatch) {
            return aNameMatch ? -1 : 1;
          }

          // Finally sort by last seen
          return b.lastSeen - a.lastSeen;
        });
      return limit ? filtered.slice(0, limit) : filtered;
    },
    [cacheVersion], // Use cacheVersion instead of cache to trigger re-renders properly
  );

  // Force refresh cache (always background, non-blocking)
  const refreshCache = useCallback(() => {
    loadFiles(true); // true = isBackgroundRefresh
  }, [loadFiles]);

  // Get cache stats
  const getCacheStats = useCallback(() => {
    const files = Array.from(cache.values());
    return {
      total: files.length,
      exists: files.filter((f) => f.status === "exists").length,
      removed: files.filter((f) => f.status === "removed").length,
      lastRefresh,
      isLoading: isInitialLoading && cache.size === 0,
    };
  }, [cacheVersion, lastRefresh, isInitialLoading]); // Use cacheVersion instead of cache

  return {
    getFilteredFiles,
    refreshCache,
    getCacheStats,
    isLoading: (isInitialLoading && cache.size === 0) || isStreamingFiles,
    lastRefresh,
  };
}
