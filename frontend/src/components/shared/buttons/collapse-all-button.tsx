import AngleUpIcon from "#/icons/angle-up-solid.svg?react";

interface CollapseAllButtonProps {
  onClick: () => void;
}

export function CollapseAllButton({ onClick }: CollapseAllButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="collapse-all"
      className="button-base p-1 hover:bg-neutral-500"
      title="Collapse all messages"
    >
      <AngleUpIcon width={15} height={15} />
    </button>
  );
}
