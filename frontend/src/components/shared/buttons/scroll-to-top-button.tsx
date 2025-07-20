import ArrowSendIcon from "#/icons/arrow-send.svg?react";

interface ScrollToTopButtonProps {
  onClick: () => void;
}

export function ScrollToTopButton({ onClick }: ScrollToTopButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="scroll-to-top"
      className="button-base p-1 hover:bg-neutral-500"
    >
      <ArrowSendIcon width={15} height={15} />
    </button>
  );
}
