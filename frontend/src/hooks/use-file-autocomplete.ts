import { useState, useCallback, useRef, useEffect } from "react";

export interface FileAutocompleteState {
  isVisible: boolean;
  query: string;
  position: { top: number; left: number };
  triggerIndex: number;
}

interface UseFileAutocompleteProps {
  onFileSelect?: (filePath: string) => void;
}

export function useFileAutocomplete({
  onFileSelect,
}: UseFileAutocompleteProps = {}) {
  const [autocompleteState, setAutocompleteState] =
    useState<FileAutocompleteState>({
      isVisible: false,
      query: "",
      position: { top: 0, left: 0 },
      triggerIndex: -1,
    });

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  // Store the current autocomplete state in a ref for stable access
  const autocompleteStateRef = useRef(autocompleteState);

  // Update ref whenever state changes
  useEffect(() => {
    autocompleteStateRef.current = autocompleteState;
  }, [autocompleteState]);

  // Calculate position for the dropdown - VSCode style at top center of chat area
  const calculatePosition = useCallback(() => {
    // Find the main chat messages container - need to be more specific to avoid small elements
    const chatContainers = document.querySelectorAll(
      '[data-testid="chat-messages-container"]',
    );

    let chatContainer: Element | null = null;

    // If multiple containers, find the one that's actually the main scrollable area
    if (chatContainers.length > 1) {
      for (const container of chatContainers) {
        const rect = container.getBoundingClientRect();
        // Main chat container should be reasonably large (height > 100px)
        if (rect.height > 100) {
          chatContainer = container;
          break;
        }
      }
    } else if (chatContainers.length === 1) {
      chatContainer = chatContainers[0];
    }

    // Fallback selectors if no good chat container found
    if (!chatContainer) {
      chatContainer =
        document.querySelector(
          ".scrollbar.scrollbar-thin.flex.flex-col.grow.overflow-y-auto",
        ) ||
        document.querySelector(".overflow-y-auto.flex.flex-col.grow") ||
        document.querySelector(".overflow-y-auto");
    }

    if (!chatContainer) {
      // Fallback to viewport center top if no chat container found
      console.log(
        "FileAutocomplete: No chat container found, using fallback position",
      );
      return {
        top: 100,
        left: window.innerWidth / 2 - 200, // 200 = half of dropdown width (400px)
      };
    }

    const containerRect = chatContainer.getBoundingClientRect();
    console.log("FileAutocomplete: Container rect:", containerRect);

    // Check if we're in an empty chat by looking for chat suggestions
    const chatSuggestions = document.querySelector(
      '[data-testid="chat-suggestions"]',
    );

    if (chatSuggestions) {
      // Use chat suggestions container for positioning when no messages exist
      const suggestionsRect = chatSuggestions.getBoundingClientRect();
      const position = {
        top: suggestionsRect.top + 60, // Position near top of suggestions area
        left: suggestionsRect.left + suggestionsRect.width / 2 - 200, // Center horizontally
      };
      console.log(
        "FileAutocomplete: Empty chat with suggestions, using suggestions position:",
        position,
      );
      return position;
    }

    // Position at top center of the chat messages area when there are messages
    // Ensure we're positioning relative to viewport, not the container's scroll position
    const viewportTop = Math.max(containerRect.top, 60); // Don't go above 60px from top of viewport
    const position = {
      top: viewportTop + 20, // 20px from visible top of chat area
      left: containerRect.left + containerRect.width / 2 - 200, // Center horizontally (200 = half of 400px width)
    };

    console.log(
      "FileAutocomplete: Chat with messages, using top position:",
      position,
    );
    return position;
  }, []);

  // Handle text input changes
  const handleInputChange = useCallback(
    (value: string, textArea: HTMLTextAreaElement) => {
      const caretPosition = textArea.selectionStart || 0;
      const textBeforeCaret = value.substring(0, caretPosition);

      // Find the last @ symbol before the caret
      const lastAtIndex = textBeforeCaret.lastIndexOf("@");

      if (lastAtIndex === -1) {
        // No @ found, hide autocomplete
        setAutocompleteState((prev) => ({ ...prev, isVisible: false }));
        return;
      }

      // Check if there's a space after the @ (which would invalidate the autocomplete)
      const textAfterAt = textBeforeCaret.substring(lastAtIndex + 1);
      if (textAfterAt.includes(" ") || textAfterAt.includes("\n")) {
        // Space found after @, hide autocomplete
        setAutocompleteState((prev) => ({ ...prev, isVisible: false }));
        return;
      }

      // Check if @ is at start of line or preceded by space
      const charBeforeAt =
        lastAtIndex > 0 ? textBeforeCaret[lastAtIndex - 1] : " ";
      if (charBeforeAt !== " " && charBeforeAt !== "\n" && lastAtIndex !== 0) {
        // @ is not at valid position, hide autocomplete
        setAutocompleteState((prev) => ({ ...prev, isVisible: false }));
        return;
      }

      // Calculate position for dropdown
      const position = calculatePosition();

      // Show autocomplete with query
      setAutocompleteState({
        isVisible: true,
        query: textAfterAt,
        position,
        triggerIndex: lastAtIndex,
      });
    },
    [calculatePosition],
  );

  // Handle file selection - use ref for stable function
  const handleFileSelect = useCallback(
    (filePath: string) => {
      if (
        !textAreaRef.current ||
        autocompleteStateRef.current.triggerIndex === -1
      )
        return;

      const textArea = textAreaRef.current;
      const value = textArea.value;
      const caretPosition = textArea.selectionStart || 0;

      // Find the end of the current query
      const beforeAt = value.substring(
        0,
        autocompleteStateRef.current.triggerIndex,
      );
      const afterCaret = value.substring(caretPosition);

      // Replace @query with @filePath
      const newValue = `${beforeAt}@${filePath}${afterCaret}`;
      const newCaretPosition = beforeAt.length + filePath.length + 1; // +1 for @

      // Update the textarea
      textArea.value = newValue;
      textArea.setSelectionRange(newCaretPosition, newCaretPosition);

      // Hide autocomplete
      setAutocompleteState((prev) => ({ ...prev, isVisible: false }));

      // Call the callback if provided
      onFileSelect?.(filePath);

      // Trigger change event
      const event = new Event("input", { bubbles: true });
      textArea.dispatchEvent(event);
    },
    [onFileSelect], // Removed autocompleteState.triggerIndex dependency
  );

  // Handle closing autocomplete
  const handleClose = useCallback(() => {
    setAutocompleteState((prev) => ({ ...prev, isVisible: false }));
  }, []);

  // Set textarea ref
  const setTextAreaRef = useCallback((element: HTMLTextAreaElement | null) => {
    textAreaRef.current = element;
  }, []);

  // Create event handlers for textarea
  const textAreaProps = {
    ref: setTextAreaRef,
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const target = event.target as HTMLTextAreaElement;
      handleInputChange(target.value, target);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Close autocomplete on certain keys when it's visible
      if (autocompleteState.isVisible) {
        if (event.key === "Escape") {
          event.preventDefault();
          handleClose();
        }
        // Arrow keys and Enter are handled by the FileAutocomplete component
      }
    },
    onBlur: () => {
      // Small delay to allow clicking on autocomplete items
      setTimeout(() => {
        setAutocompleteState((prev) => ({ ...prev, isVisible: false }));
      }, 150);
    },
  };

  return {
    autocompleteState,
    handleFileSelect,
    handleClose,
    textAreaProps,
  };
}
