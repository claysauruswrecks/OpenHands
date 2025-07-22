import React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import { SubmitButton } from "#/components/shared/buttons/submit-button";
import { StopButton } from "#/components/shared/buttons/stop-button";
import { FileAutocomplete } from "./file-autocomplete";
import { useFileAutocomplete } from "#/hooks/use-file-autocomplete";
import { useFileCache } from "#/hooks/use-file-cache";

interface ChatInputProps {
  name?: string;
  button?: "submit" | "stop";
  disabled?: boolean;
  showButton?: boolean;
  value?: string;
  maxRows?: number;
  onSubmit: (message: string) => void;
  onStop?: () => void;
  onChange?: (message: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onFilesPaste?: (files: File[]) => void;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
  buttonClassName?: React.HTMLAttributes<HTMLButtonElement>["className"];
}

export function ChatInput({
  name,
  button = "submit",
  disabled,
  showButton = true,
  value,
  maxRows = 8,
  onSubmit,
  onStop,
  onChange,
  onFocus,
  onBlur,
  onFilesPaste,
  className,
  buttonClassName,
}: ChatInputProps) {
  const { t } = useTranslation();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  // Get cache refresh function for focus handler
  const { refreshCache } = useFileCache();

  // File autocomplete functionality
  const {
    autocompleteState,
    handleFileSelect,
    handleClose,
    textAreaProps: autocompleteProps,
  } = useFileAutocomplete({
    onFileSelect: (filePath) => {
      // When a file is selected, we need to update the controlled value
      // The hook will update the textarea directly, but we need to sync with the controlled component
      if (textareaRef.current) {
        const newValue = textareaRef.current.value;
        onChange?.(newValue);
      }
    },
  });

  // Enhanced focus handler that refreshes cache
  const handleFocusWithCache = React.useCallback(
    (event: React.FocusEvent<HTMLTextAreaElement>) => {
      // Refresh cache when user focuses on input for fresh file list
      refreshCache();
      onFocus?.();
    },
    [onFocus, refreshCache],
  );

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Only handle paste if we have an image paste handler and there are files
    if (onFilesPaste && event.clipboardData.files.length > 0) {
      const files = Array.from(event.clipboardData.files);
      // Only prevent default if we found image files to handle
      event.preventDefault();
      onFilesPaste(files);
    }
    // For text paste, let the default behavior handle it
  };

  const handleDragOver = (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    if (event.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    if (onFilesPaste && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        onFilesPaste(files);
      }
    }
  };

  const handleSubmitMessage = () => {
    const message = value || textareaRef.current?.value || "";
    if (message.trim()) {
      onSubmit(message);
      onChange?.("");
      if (textareaRef.current) {
        textareaRef.current.value = "";
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !disabled &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      handleSubmitMessage();
    }
  };

  // Combine refs
  const combinedRef = React.useCallback(
    (element: HTMLTextAreaElement | null) => {
      textareaRef.current = element;
      autocompleteProps.ref(element);
    },
    [autocompleteProps.ref],
  );

  // Combine onChange handlers
  const handleChangeCombined = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      // First call the autocomplete handler
      autocompleteProps.onChange(event);
      // Then call the original onChange handler
      onChange?.(event.target.value);
    },
    [autocompleteProps.onChange, onChange],
  );

  // Combine onKeyDown handlers
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      autocompleteProps.onKeyDown(event);
      handleKeyPress(event);
    },
    [autocompleteProps.onKeyDown, handleKeyPress],
  );

  // Combine onBlur handlers
  const handleBlurCombined = React.useCallback(
    (event: React.FocusEvent<HTMLTextAreaElement>) => {
      autocompleteProps.onBlur();
      onBlur?.();
    },
    [autocompleteProps.onBlur, onBlur],
  );

  return (
    <div
      data-testid="chat-input"
      className="flex items-end justify-end grow gap-1 min-h-6 w-full relative"
    >
      <TextareaAutosize
        ref={combinedRef}
        name={name}
        placeholder={t(I18nKey.SUGGESTIONS$WHAT_TO_BUILD)}
        onKeyDown={handleKeyDown}
        onChange={handleChangeCombined}
        onFocus={handleFocusWithCache}
        onBlur={handleBlurCombined}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        value={value}
        minRows={1}
        maxRows={maxRows}
        data-dragging-over={isDraggingOver}
        className={cn(
          "grow text-sm self-center placeholder:text-neutral-400 text-white resize-none outline-hidden ring-0",
          "transition-all duration-200 ease-in-out",
          isDraggingOver
            ? "bg-neutral-600/50 rounded-lg px-2"
            : "bg-transparent",
          className,
        )}
      />
      {showButton && (
        <div className={buttonClassName}>
          {button === "submit" && (
            <SubmitButton isDisabled={disabled} onClick={handleSubmitMessage} />
          )}
          {button === "stop" && (
            <StopButton isDisabled={disabled} onClick={onStop} />
          )}
        </div>
      )}

      {/* File Autocomplete Dropdown */}
      <FileAutocomplete
        isVisible={autocompleteState.isVisible}
        query={autocompleteState.query}
        position={autocompleteState.position}
        onSelect={handleFileSelect}
        onClose={handleClose}
      />
    </div>
  );
}
