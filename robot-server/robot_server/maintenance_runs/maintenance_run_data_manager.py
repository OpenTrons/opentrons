"""Manage current and historical run data."""
from datetime import datetime
from typing import List, Optional

from opentrons.protocol_engine import (
    EngineStatus,
    LabwareOffsetCreate,
    StateSummary,
    CommandSlice,
    CurrentCommand,
    Command,
)

from .maintenance_engine_store import EngineStore
from .maintenance_run_models import MaintenanceRun


def _build_run(
    run_id: str,
    created_at: datetime,
    state_summary: Optional[StateSummary],
    current: bool,
) -> MaintenanceRun:
    # TODO(mc, 2022-05-16): improve persistence strategy
    # such that this default summary object is not needed
    state_summary = state_summary or StateSummary.construct(
        status=EngineStatus.STOPPED,
        errors=[],
        labware=[],
        labwareOffsets=[],
        pipettes=[],
        modules=[],
        liquids=[],
    )
    return MaintenanceRun.construct(
        id=run_id,
        createdAt=created_at,
        status=state_summary.status,
        actions=[],  # TODO (spp, 2023-04-23): wire up actions once they are allowed
        errors=state_summary.errors,
        labware=state_summary.labware,
        labwareOffsets=state_summary.labwareOffsets,
        pipettes=state_summary.pipettes,
        modules=state_summary.modules,
        current=current,
        completedAt=state_summary.completedAt,
        startedAt=state_summary.startedAt,
        liquids=state_summary.liquids,
    )


class RunNotCurrentError(ValueError):
    """Error raised when a requested run is not the current run."""


class MaintenanceRunDataManager:
    """Collaborator to manage current and historical run data.

    Provides a facade to both an EngineStore (current run) and a RunStore
    (historical runs). Returns `Run` response models to the router.

    Args:
        engine_store: In-memory store of the current run's ProtocolEngine.
        run_store: Persistent database of current and historical run data.
    """

    def __init__(self, engine_store: EngineStore) -> None:
        self._engine_store = engine_store

    @property
    def current_run_id(self) -> Optional[str]:
        """The identifier of the current run, if any."""
        return self._engine_store.current_run_id

    async def create(
        self,
        run_id: str,
        created_at: datetime,
        labware_offsets: List[LabwareOffsetCreate],
    ) -> MaintenanceRun:
        """Create a new, current maintenance run.

        Args:
            run_id: Identifier to assign the new run.
            created_at: Creation datetime.
            labware_offsets: Labware offsets to initialize the engine with.

        Returns:
            The run resource.

        Raise:
            EngineConflictError: There is a currently active run that cannot
                be superceded by this new run.
        """
        prev_run_id = self._engine_store.current_run_id
        if prev_run_id is not None:
            await self._engine_store.clear()

        state_summary = await self._engine_store.create(
            run_id=run_id, labware_offsets=labware_offsets
        )

        return _build_run(
            run_id=run_id,
            created_at=created_at,
            state_summary=state_summary,
            current=True,
        )

    def get(self, run_id: str) -> MaintenanceRun:
        """Get a run resource.

        This method will pull from the current run or the historical runs,
        depending on if `run_id` refers to the current run.

        Args:
            run_id: The identifier of the run to return.

        Returns:
            The run resource.

        Raises:
            RunNotFoundError: The given run identifier does not exist.
        """
        current = run_id == self._engine_store.current_run_id
        if not current:
            raise RunNotCurrentError(
                "Cannot get the run summery of a none current run."
            )
        state_summary = self._get_state_summary(run_id=run_id)

        # store created_at at engine level
        return _build_run(
            run_id=run_id,
            created_at=datetime(2023, 1, 1),
            state_summary=state_summary,
            current=current,
        )

    async def delete(self, run_id: str) -> None:
        """Delete a current or historical run.

        Args:
            run_id: The identifier of the run to remove.

        Raises:
            EngineConflictError: If deleting the current run, the current run
                is not idle and cannot be deleted.
            RunNotFoundError: The given run identifier was not found in the database.
        """
        if run_id == self._engine_store.current_run_id:
            await self._engine_store.clear()

    def get_commands_slice(
        self,
        run_id: str,
        cursor: Optional[int],
        length: int,
    ) -> CommandSlice:
        """Get a slice of run commands.

        Args:
            run_id: ID of the run.
            cursor: Requested index of first command in the returned slice.
            length: Length of slice to return.

        Raises:
            RunNotFoundError: The given run identifier was not found in the database.
        """
        if run_id != self._engine_store.current_run_id:
            raise RunNotCurrentError(f"{run_id} is not the current maintenance run")
        the_slice = self._engine_store.engine.state_view.commands.get_slice(
            cursor=cursor, length=length
        )
        return the_slice

    def get_current_command(self, run_id: str) -> Optional[CurrentCommand]:
        """Get the currently executing command, if any.

        Args:
            run_id: ID of the run.
        """
        if self._engine_store.current_run_id == run_id:
            return self._engine_store.engine.state_view.commands.get_current()
        return None

    def get_command(self, run_id: str, command_id: str) -> Command:
        """Get a run's command by ID.

        Args:
            run_id: ID of the run.
            command_id: ID of the command.

        Raises:
            RunNotFoundError: The given run identifier was not found.
            CommandNotFoundError: The given command identifier was not found.
        """
        if run_id != self._engine_store.current_run_id:
            raise RunNotCurrentError(f"{run_id} is not the current maintenance run")
        return self._engine_store.engine.state_view.commands.get(command_id=command_id)

    def _get_state_summary(self, run_id: str) -> Optional[StateSummary]:

        return self._engine_store.engine.state_view.get_summary()
