from __future__ import annotations

from typing import TYPE_CHECKING, Union

from opentrons import types
from opentrons.commands import CommandPublisher
from opentrons.protocols.types import APIVersion

from opentrons.protocols.api_support.util import requires_version
from .labware import Labware, Well
from .paired_instrument import PairedInstrument

if TYPE_CHECKING:
    from .protocol_context import ProtocolContext
    from .instrument_context import InstrumentContext
    from opentrons.hardware_control import types as hc_types


class UnsupportedInstrumentPairingError(Exception):
    pass


class PairedInstrumentContext(CommandPublisher):

    def __init__(self,
                 primary_instrument: InstrumentContext,
                 secondary_instrument: InstrumentContext,
                 ctx: ProtocolContext,
                 mount: hc_types.PipettePair,
                 api_version: APIVersion,
                 trash: Labware = None) -> None:
        self._instruments = {
            mount.primary: primary_instrument,
            mount.secondary: secondary_instrument}
        self._api_version = api_version

        self.trash_container = trash
        self._tip_racks = list(set(primary_instrument.tip_racks) & set(secondary_instrument.tip_racks))
        self._starting_tip: Union[Well, None] = None
        self._mount = mount
        self.paired_instrument_obj = PairedInstrument(
            primary_instrument, secondary_instrument, mount, ctx)

    @property  # type: ignore
    @requires_version(2, 7)
    def api_version(self) -> APIVersion:
        pass

    @property
    @requires_version(2, 7)
    def tip_racks(self) -> List[Labware]:
        return self._tip_racks

    @property  # type: ignore
    @requires_version(2, 7)
    def starting_tip(self) -> Union[Well, None]:
        """ The starting tip from which the pipette pick up
        """
        return self._starting_tip

    @starting_tip.setter
    def starting_tip(self, location: Union[Well, None]):
        self._starting_tip = location

    @requires_version(2, 7)
    def reset_tipracks(self):
        """ Reload all tips in each tip rack and reset starting tip
        """
        for tiprack in self.tip_racks:
            tiprack.reset()
        self.starting_tip = None

    @requires_version(2, 7)
    def pick_up_tip(
            self, location: Union[types.Location, Well] = None,
            presses: int = None,
            increment: float = None) -> PairedInstrumentContext:
        """
        Pick up a tip for the pipette to run liquid-handling commands with

        If no location is passed, the Pipette will pick up the next available
        tip in its :py:attr:`InstrumentContext.tip_racks` list.

        The tip to pick up can be manually specified with the `location`
        argument. The `location` argument can be specified in several ways:

        * If the only thing to specify is which well from which to pick
          up a tip, `location` can be a :py:class:`.Well`. For instance,
          if you have a tip rack in a variable called `tiprack`, you can
          pick up a specific tip from it with
          ``instr.pick_up_tip(tiprack.wells()[0])``. This style of call can
          be used to make the robot pick up a tip from a tip rack that
          was not specified when creating the :py:class:`.InstrumentContext`.

        * If the position to move to in the well needs to be specified,
          for instance to tell the robot to run its pick up tip routine
          starting closer to or farther from the top of the tip,
          `location` can be a :py:class:`.types.Location`; for instance,
          you can call ``instr.pick_up_tip(tiprack.wells()[0].top())``.

        :param location: The location from which to pick up a tip.
        :type location: :py:class:`.types.Location` or :py:class:`.Well` to
                        pick up a tip from.
        :param presses: The number of times to lower and then raise the pipette
                        when picking up a tip, to ensure a good seal (0 [zero]
                        will result in the pipette hovering over the tip but
                        not picking it up--generally not desireable, but could
                        be used for dry-run).
        :type presses: int
        :param increment: The additional distance to travel on each successive
                          press (e.g.: if `presses=3` and `increment=1.0`, then
                          the first press will travel down into the tip by
                          3.5mm, the second by 4.5mm, and the third by 5.5mm).
        :type increment: float

        :returns: This instance
        """
        if location and isinstance(location, types.Location):
            if isinstance(location.labware, Labware):
                tiprack = location.labware
                target: Well = tiprack.next_tip(self.channels)  # type: ignore
                if not target:
                    raise OutOfTipsError
            elif isinstance(location.labware, Well):
                tiprack = location.labware.parent
                target = location.labware
        elif location and isinstance(location, Well):
            tiprack = location.parent
            target = location
        elif not location:
            tiprack, target = self._next_available_tip()
        else:
            raise TypeError(
                "If specified, location should be an instance of "
                "types.Location (e.g. the return value from "
                "tiprack.wells()[0].top()) or a Well (e.g. tiprack.wells()[0]."
                " However, it is a {}".format(location))
        assert tiprack.is_tiprack, "{} is not a tiprack".format(str(tiprack))
        self._get_secondary_target(tiprack, target)
        self.paired_instrument_obj.pick_up_tip(
            target, tiprack, presses, increment, secondary_target)
        return self

    @requires_version(2, 7)
    def drop_tip(
            self,
            location: Union[types.Location, Well] = None,
            home_after: bool = True)\
            -> PairedInstrumentContext:
        """
        Drop the current tip.

        If no location is passed, the Pipette will drop the tip into its
        :py:attr:`trash_container`, which if not specified defaults to
        the fixed trash in slot 12.

        The location in which to drop the tip can be manually specified with
        the `location` argument. The `location` argument can be specified in
        several ways:

            - If the only thing to specify is which well into which to drop
              a tip, `location` can be a :py:class:`.Well`. For instance,
              if you have a tip rack in a variable called `tiprack`, you can
              drop a tip into a specific well on that tiprack with the call
              `instr.drop_tip(tiprack.wells()[0])`. This style of call can
              be used to make the robot drop a tip into arbitrary labware.
            - If the position to drop the tip from as well as the
              :py:class:`.Well` to drop the tip into needs to be specified,
              for instance to tell the robot to drop a tip from an unusually
              large height above the tiprack, `location`
              can be a :py:class:`.types.Location`; for instance, you can call
              `instr.drop_tip(tiprack.wells()[0].top())`.

        :param location: The location to drop the tip
        :type location: :py:class:`.types.Location` or :py:class:`.Well` or
                        None
        :param home_after: Whether to home the plunger after dropping the tip
                           (defaults to ``True``). The plungeer must home after
                           dropping tips because the ejector shroud that pops
                           the tip off the end of the pipette is driven by the
                           plunger motor, and may skip steps when dropping the
                           tip.

        :returns: This instance
        """
        if location and isinstance(location, types.Location):
            if isinstance(location.labware, Well):
                target = location
            else:
                raise TypeError(
                    "If a location is specified as a types.Location (for "
                    "instance, as the result of a call to "
                    "tiprack.wells()[0].top()) it must be a location "
                    "relative to a well, since that is where a tip is "
                    "dropped. The passed location, however, is in "
                    "reference to {}".format(location.labware))
        elif location and isinstance(location, Well):
            if 'fixedTrash' in quirks_from_any_parent(location):
                target = location.top()
            else:
                primary_pipette = self._instruments[self._mount]
                target = self._drop_tip_target(location, primary_pipette)
        elif not location:
            target = self.trash_container.wells()[0].top()
        else:
            raise TypeError(
                "If specified, location should be an instance of "
                "types.Location (e.g. the return value from "
                "tiprack.wells()[0].top()) or a Well (e.g. tiprack.wells()[0]."
                " However, it is a {}".format(location))
        self.paired_instrument_obj.drop_tip(target, home_after)
        return self

    @requires_version(2, 7)
    def aspirate(self,
                 volume: float = None,
                 location: Union[types.Location, Well] = None,
                 rate: float = 1.0) -> PairedInstrumentContext:
        pass

    @requires_version(2, 7)
    def dispense(self,
                 volume: float = None,
                 location: Union[types.Location, Well] = None,
                 rate: float = 1.0) -> PairedInstrumentContext:
        pass

    @requires_version(2, 7)
    def air_gap(self,
                volume: float = None,
                height: float = None) -> PairedInstrumentContext:
        pass

    @requires_version(2, 7)
    def blow_out(self,
                 location: Union[types.Location, Well] = None
                 ) -> PairedInstrumentContext:
        pass

    @requires_version(2, 7)
    def mix(self,
            repetitions: int = 1,
            volume: float = None,
            location: Union[types.Location, Well] = None,
            rate: float = 1.0) -> PairedInstrumentContext:
        pass

    @requires_version(2, 7)
    def touch_tip(self,
                  location: Well = None,
                  radius: float = 1.0,
                  v_offset: float = -1.0,
                  speed: float = 60.0) -> PairedInstrumentContext:
        pass

    @requires_version(2, 7)
    def return_tip(self,
                   home_after: bool = True) -> PairedInstrumentContext:
        """
        If a tip is currently attached to the pipette, then it will return the
        tip to it's location in the tiprack.

        It will not reset tip tracking so the well flag will remain False.

        :returns: This instance
        """
        for mount, instr in self._instruments.items():
            if not instr.hw_pipette['has_tip']:
                self._log.warning('Pipette has no tip to return')
        loc = self._last_tip_picked_up_from
        if not isinstance(loc, Well):
            raise TypeError('Last tip location should be a Well but it is: '
                            f'{loc}')
        drop_loc = _drop_tip_target(loc, pipette)
        self.drop_tip(drop_loc, home_after=home_after)

        return self

    @requires_version(2, 7)
    def move_to(self, location: types.Location, force_direct: bool = False,
                minimum_z_height: float = None,
                speed: float = None
                ) -> PairedInstrumentContext:
        """ Move the instrument.

        :param location: The location to move to.
        :type location: :py:class:`.types.Location`
        :param force_direct: If set to true, move directly to destination
                        without arc motion.
        :param minimum_z_height: When specified, this Z margin is able to raise
                                 (but never lower) the mid-arc height.
        :param speed: The speed at which to move. By default,
                      :py:attr:`InstrumentContext.default_speed`. This controls
                      the straight linear speed of the motion; to limit
                      individual axis speeds, you can use
                      :py:attr:`.ProtocolContext.max_speeds`.
        """
        if self._ctx.location_cache:
            from_lw = self._ctx.location_cache.labware
        else:
            from_lw = None

        if not speed:
            primary = self._instruments[self._mount.primary]
            speed = primary.default_speed

        from_center = 'centerMultichannelOnWells'\
            in quirks_from_any_parent(from_lw)
        cp_override = CriticalPoint.XY_CENTER if from_center else None
        from_loc = types.Location(
            self._hw_manager.hardware.gantry_position(
                self._mount, critical_point=cp_override),
            from_lw)
        self.paired_instrument_obj.move_to(
            from_loc, to_loc, force_direct, minimum_z_height, speed)
        return self

    def _next_available_tip(self, channels: int) -> Tuple[Labware, Well]:
        start = self.starting_tip
        if start is None:
            return select_tiprack_from_list(
                self.tip_racks, channels)
        else:
            return select_tiprack_from_list(
                filter_tipracks_to_start(start, self.tip_racks),
                channels, start)

    @staticmethod
    def _drop_tip_target(
            location: Well,
            pipette: InstrumentContext) -> types.Location:
        tr = location.parent
        assert tr.is_tiprack
        z_height = pipette.return_height * tr.tip_length
        return location.top(-z_height)

    @staticmethod
    def _get_secondary_target(tiprack: Labware, primary_loc: Well) -> Well:
        secondary_well
        return secondary_well


