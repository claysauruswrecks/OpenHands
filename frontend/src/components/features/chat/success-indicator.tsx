import {
  FaClock,
  FaCheckCircle,
  FaRegCheckCircle,
  FaTimesCircle,
  FaEye,
  FaRegEye,
  FaEdit,
  FaRegEdit,
} from "react-icons/fa";
import { BiTerminal } from "react-icons/bi"; // Terminal for run
import { LuBrainCircuit } from "react-icons/lu"; // Neural network for think
import { TbSatellite } from "react-icons/tb"; // Satellite for browse
import { GiCrystalBall } from "react-icons/gi"; // Crystal ball for run_ipython
import { LuSend } from "react-icons/lu"; // Send/paper plane for delegate
import { MdOutlineInventory2 } from "react-icons/md"; // Archive for recall
import { TbPuzzle } from "react-icons/tb"; // Puzzle piece for mcp
import { VscWorkspaceUnknown } from "react-icons/vsc"; // State flow for agent_state_changed
import { ObservationResultStatus } from "./event-content-helpers/get-observation-result";

interface SuccessIndicatorProps {
  status: ObservationResultStatus;
  observationType?: string;
}

export function SuccessIndicator({
  status,
  observationType,
}: SuccessIndicatorProps) {
  // Common styles for all icons - use fixed larger size instead of percentage
  const baseIconClassName = "ml-2 inline-block";
  const successIconClassName = `${baseIconClassName} text-success`;
  const errorIconClassName = `${baseIconClassName} text-danger`;
  const timeoutIconClassName = `${baseIconClassName} text-yellow-500`;

  // Use fixed size that's larger and more prominent
  const iconStyle = {
    height: "24px",
    width: "24px",
    minHeight: "24px",
    minWidth: "24px",
  };

  // Select icon based on observation type and status
  const getIcon = () => {
    if (status === "success" || status === "partial") {
      // Use specific icons for different observation types
      switch (observationType) {
        case "read":
          // Eye icon - solid for success, outline for partial
          return status === "partial" ? (
            <FaRegEye
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          ) : (
            <FaEye
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          );
        case "edit":
          // Edit icon - solid for success, outline for partial
          return status === "partial" ? (
            <FaRegEdit
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          ) : (
            <FaEdit
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          );
        case "run":
          return (
            <BiTerminal
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          );
        case "think":
          return (
            <LuBrainCircuit
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          );
        case "browse":
        case "browse_interactive":
          return (
            <TbSatellite
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          );
        case "run_ipython":
          return (
            <GiCrystalBall
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          );
        case "delegate":
          return (
            <LuSend
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          );
        case "recall":
          return (
            <MdOutlineInventory2
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          );
        case "mcp":
          return (
            <TbPuzzle
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          );
        case "agent_state_changed":
          return (
            <VscWorkspaceUnknown
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          );
        default:
          // Fall back to regular check circles for other types
          return status === "partial" ? (
            <FaRegCheckCircle
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          ) : (
            <FaCheckCircle
              data-testid="status-icon"
              className={successIconClassName}
              style={iconStyle}
            />
          );
      }
    }

    // Error icons - use same icons as success but solid red versions
    if (status === "error") {
      switch (observationType) {
        case "read":
          return (
            <FaEye
              data-testid="status-icon"
              className={errorIconClassName}
              style={iconStyle}
            />
          );
        case "edit":
          return (
            <FaEdit
              data-testid="status-icon"
              className={errorIconClassName}
              style={iconStyle}
            />
          );
        case "run":
          return (
            <BiTerminal
              data-testid="status-icon"
              className={errorIconClassName}
              style={iconStyle}
            />
          );
        case "think":
          return (
            <LuBrainCircuit
              data-testid="status-icon"
              className={errorIconClassName}
              style={iconStyle}
            />
          );
        case "browse":
        case "browse_interactive":
          return (
            <TbSatellite
              data-testid="status-icon"
              className={errorIconClassName}
              style={iconStyle}
            />
          );
        case "run_ipython":
          return (
            <GiCrystalBall
              data-testid="status-icon"
              className={errorIconClassName}
              style={iconStyle}
            />
          );
        case "delegate":
          return (
            <LuSend
              data-testid="status-icon"
              className={errorIconClassName}
              style={iconStyle}
            />
          );
        case "recall":
          return (
            <MdOutlineInventory2
              data-testid="status-icon"
              className={errorIconClassName}
              style={iconStyle}
            />
          );
        case "mcp":
          return (
            <TbPuzzle
              data-testid="status-icon"
              className={errorIconClassName}
              style={iconStyle}
            />
          );
        case "agent_state_changed":
          return (
            <VscWorkspaceUnknown
              data-testid="status-icon"
              className={errorIconClassName}
              style={iconStyle}
            />
          );
        default:
          // Fall back to regular X circle for other error types
          return (
            <FaTimesCircle
              data-testid="status-icon"
              className={errorIconClassName}
              style={iconStyle}
            />
          );
      }
    }

    if (status === "timeout") {
      return (
        <FaClock
          data-testid="status-icon"
          className={timeoutIconClassName}
          style={iconStyle}
        />
      );
    }

    return null;
  };

  return (
    <span className="flex-shrink-0 inline-flex items-center">{getIcon()}</span>
  );
}
