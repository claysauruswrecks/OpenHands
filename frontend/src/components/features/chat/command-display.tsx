import React from "react";
import { CopyToClipboardButton } from "#/components/shared/buttons/copy-to-clipboard-button";

interface CommandDisplayProps {
  command: string;
}

export function CommandDisplay({ command }: CommandDisplayProps) {
  const [isCopy, setIsCopy] = React.useState(false);
  const [isHovering, setIsHovering] = React.useState(false);

  const handleCopyToClipboard = async () => {
    await navigator.clipboard.writeText(command);
    setIsCopy(true);
  };

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isCopy) {
      timeout = setTimeout(() => {
        setIsCopy(false);
      }, 2000);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [isCopy]);

  return (
    <div className="relative group">
      <div
        className="flex items-center bg-neutral-800 rounded-md p-2 pr-10"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="flex-1 overflow-x-auto">
          <code className="text-sm font-mono text-neutral-300 whitespace-nowrap">
            {command}
          </code>
        </div>
        <div
          className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity duration-150 ${isHovering ? "opacity-100" : "opacity-0"}`}
        >
          <CopyToClipboardButton
            isHidden={false}
            isDisabled={isCopy}
            onClick={handleCopyToClipboard}
            mode={isCopy ? "copied" : "copy"}
          />
        </div>
      </div>
    </div>
  );
}
