from dataclasses import dataclass
from typing import ClassVar

from openhands.core.schema import ActionType
from openhands.events.action.action import Action, ActionSecurityRisk


@dataclass
class VSCodeOpenFileAction(Action):
    """Opens a file in the VSCode server running in the runtime container."""

    file_path: str
    thought: str = ''
    action: str = ActionType.VSCODE_OPEN_FILE
    runnable: ClassVar[bool] = True
    security_risk: ActionSecurityRisk | None = None

    @property
    def message(self) -> str:
        return f'Opening file in VSCode: {self.file_path}'

    def __str__(self) -> str:
        ret = '**VSCodeOpenFileAction**\n'
        if self.thought:
            ret += f'THOUGHT: {self.thought}\n'
        ret += f'FILE_PATH: {self.file_path}'
        return ret
