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

  // Calculate position for the dropdown - VSCode style at top center of chat area
  const calculatePosition = useCallback(() => {
    // Find the chat messages container (scrollable area)
    const chatContainer =
      document.querySelector('[data-testid="chat-messages-container"]') ||
      document.querySelector(".scrollbar.scrollbar-thin") || // fallback to scrollbar class
      document.querySelector(".overflow-y-auto"); // last fallback

    if (!chatContainer) {
      // Fallback to viewport center top if no chat container found
      return {
        top: 100,
        left: window.innerWidth / 2 - 200, // 200 = half of dropdown width (400px)
      };
    }

    const containerRect = chatContainer.getBoundingClientRect();

    // Position at top center of the chat messages area
    return {
      top: containerRect.top + 20, // 20px from top of chat area
      left: containerRect.left + containerRect.width / 2 - 200, // Center horizontally (200 = half of 400px width)
    };
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

  // Handle file selection
  const handleFileSelect = useCallback(
    (filePath: string) => {
      if (!textAreaRef.current || autocompleteState.triggerIndex === -1) return;

      const textArea = textAreaRef.current;
      const value = textArea.value;
      const caretPosition = textArea.selectionStart || 0;

      // Find the end of the current query
      const beforeAt = value.substring(0, autocompleteState.triggerIndex);
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
    [autocompleteState.triggerIndex, onFileSelect],
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
