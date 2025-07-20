import AngleDownIcon from "#/icons/angle-down-solid.svg?react";

interface ExpandAllButtonProps {
  onClick: () => void;
}

export function ExpandAllButton({ onClick }: ExpandAllButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="expand-all"
      className="button-base p-1 hover:bg-neutral-500"
      title="Expand all messages"
    >
      <AngleDownIcon width={15} height={15} />
    </button>
  );
}
