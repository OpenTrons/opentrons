from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Union, Tuple, List

from opentrons import types
from opentrons.commands import CommandPublisher
from opentrons.protocols.types import APIVersion
from opentrons.protocols.implementations.paired_instrument import\
    PairedInstrument

from opentrons.protocols.api_support.util import (
    requires_version, labware_column_shift)
from .labware import (
    Labware, Well, OutOfTipsError, select_tiprack_from_list_paired_pipettes,
    filter_tipracks_to_start, quirks_from_any_parent)

if TYPE_CHECKING:
    from .protocol_context import ProtocolContext
    from .instrument_context import InstrumentContext
    from opentrons.hardware_control import types as hc_types
    from opentrons.protocols.api_support.util import HardwareManager


SECONDARY_WELL_SPACING = 4


SECONDARY_WELL_SPACING = 4


class UnsupportedInstrumentPairingError(Exception):
    pass


class PipettePairPickUpTipError(Exception):
    pass


class PairedInstrumentContext(CommandPublisher):

    def __init__(self,
                 primary_instrument: InstrumentContext,
                 secondary_instrument: InstrumentContext,
                 ctx: ProtocolContext,
                 pair_policy: hc_types.PipettePair,
                 api_version: APIVersion,
                 hardware_manager: HardwareManager,
                 trash: Labware,
                 log_parent: logging.Logger) -> None:
        self._instruments = {
            pair_policy.primary: primary_instrument,
            pair_policy.secondary: secondary_instrument}
        self._api_version = api_version
        self._log = log_parent.getChild(repr(self))
        self._tip_racks = list(
            set(primary_instrument.tip_racks) &
            set(secondary_instrument.tip_racks))
        self._pair_policy = pair_policy

        self._starting_tip: Union[Well, None] = None
        self._last_tip_picked_up_from: Union[Well, None] = None

        self.trash_container = trash
        self.paired_instrument_obj = PairedInstrument(
            primary_instrument, secondary_instrument, pair_policy,
            ctx, hardware_manager, self._log)

    @property  # type: ignore
    @requires_version(2, 7)
    def api_version(self) -> APIVersion:
        pass

    @property  # type: ignore
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
        a paired pipette object.

        If no location is passed, the Pipette will pick up the next available
        tip in its :py:attr:`PairedInstrumentContext.tip_racks` list. Pick up
        tip will determine the next available tip based on both the primary
        and secondary target.

        If you choose to pass in a tip location, you must pass in the
        tiprack location that you wish to move based on the primary pipette.

        The tip to pick up can be manually specified with the ``location``
        argument. The ``location`` argument can be specified in several ways:

        * If the only thing to specify is which well from which to pick
          up a tip, `location` can be a :py:class:`.Well`. For instance,
          if you have a tip rack in a variable called `tiprack`, you can
          pick up a specific tip from it with
          ``instr.pick_up_tip(tiprack.wells()[0])``. This style of call can
          be used to make the robot pick up a tip from a tip rack that
          was not specified when creating the
          :py:class:`.PairedInstrumentContext`.

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
        :raises OutOfTipsError: if there are no more tips to pick up from a
        tiprack
        :raises PipettePairPickUpTipError: If you specify a location that both
        pipettes cannot pick up a tip from, for example, the last column
        of the tiprack

        .. note::

            The current spacing of the two pipettes is approximately 34
            millimeters, or 5 columns in a 96 well SBS footprint.
            In practice, this means that you can only pick up from 10
            columns of the tiprack rather than the full 12 columns of a 96
            SBS footprint when utilizing the
            :py:attr:`PairedInstrumentContext.pick_up_tip` command.
            You can, however, use the regular
            :py:attr:`InstrumentContext.pick_up_tip` to pick up the
            remaining tips from the tiprack. See the code snippet below.

        .. code-block:: python

            >>> tiprack = ctx.load_labware('opentrons_96_tiprack_300ul', 1)
            >>> left = ctx.load_instrument('p300_multi', 'left', tip_racks=[tiprack])  # noqa(E501)
            >>> right = ctx.load_instrument('p300_multi', 'right', tip_racks=[tiprack])  # noqa(E501)
            >>> paired = right.pair_with(left)
            >>> paired.pick_up_tip() # Pick up tips from the first and fifth column  # noqa(E501)
            >>> paired.drop_tip()
            >>> left.pick_up_tip() # Pick up tips from the second column
            >>> left.drop_tip()
            >>> right.pick_up_tip() # Pick up tips from third column
            >>> right.drop_tip()
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

        # We must check that you can also pick up from
        # that tiprack with the second pipette attached.
        secondary_target = self._get_secondary_target(tiprack, target)
        primary_pipette = self._instruments[self._pair_policy.primary]
        tip_length = primary_pipette._tip_length_for(tiprack)
        self.paired_instrument_obj.pick_up_tip(
            target, secondary_target, tiprack, presses, increment, tip_length)
        self._last_tip_picked_up_from = target
        return self

    @requires_version(2, 7)
    def drop_tip(
            self,
            location: Union[types.Location, Well] = None,
            home_after: bool = True)\
            -> PairedInstrumentContext:
        """
        Drop the current tip.

        If no location is passed, both pipettes will drop their
        tips into :py:attr:`trash_container`, which if not specified defaults
        to the fixed trash in slot 12.

        If you pass in a location, you must pass in the tiprack location that
        you wish to move based on the primary pipette.

        The location in which to drop the tip can be manually specified with
        the ``location`` argument. The ``location`` argument can be specified
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

        :raises TyepError: If a location is not relative to a well.
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
                primary_pipette = self._instruments[self._pair_policy.primary]
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
        self._last_tip_picked_up_from = None
        return self

    @requires_version(2, 7)
    def aspirate(self,
                 volume: float = None,
                 location: Union[types.Location, Well] = None,
                 rate: float = 1.0) -> PairedInstrumentContext:
        """
        Aspirate a volume of liquid (in microliters/uL) using this pipette
        from the specified location

        If only a volume is passed, the pipette will aspirate
        from its current position. If only a location is passed (as in
        ``instr.aspirate(location=wellplate['A1'])``,
        :py:meth:`aspirate` will default to the amount of volume available.

        :param volume: The volume to aspirate, in microliters. If not
                       specified, :py:attr:`max_volume`.
        :type volume: int or float
        :param location: Where to aspirate from. If `location` is a
                         :py:class:`.Well`, the robot will aspirate from
                         :py:obj:`well_bottom_clearance.aspirate` mm
                         above the bottom of the well. If `location` is a
                         :py:class:`.Location` (i.e. the result of
                         :py:meth:`.Well.top` or :py:meth:`.Well.bottom`), the
                         robot will aspirate from the exact specified location.
                         If unspecified, the robot will aspirate from the
                         current position.
        :param rate: The relative plunger speed for this aspirate. During
                     this aspirate, the speed of the plunger will be
                     `rate` * :py:attr:`aspirate_speed`. If not specified,
                     defaults to 1.0 (speed will not be modified).
        :type rate: float
        :returns: This instance.

        .. note::

            If ``aspirate`` is called with a single argument, it will not try
            to guess whether the argument is a volume or location - it is
            required to be a volume. If you want to call ``aspirate`` with only
            a location, specify it as a keyword argument:
            ``instr.aspirate(location=wellplate['A1'])``

        """
        self._log.debug("aspirate {} from {} at {}"
                        .format(volume,
                                location if location else 'current position',
                                rate))

        if isinstance(location, Well):
            point, well = location.bottom()
            dest = types.Location(
                point + types.Point(0, 0,
                                    self.well_bottom_clearance.aspirate),
                well)
        elif isinstance(location, types.Location):
            dest = location
        elif location is not None:
            raise TypeError(
                'location should be a Well or Location, but it is {}'
                .format(location))

        if self.current_volume == 0:
            # Make sure we're at the top of the labware and clear of any
            # liquid to prepare the pipette for aspiration

            if not self.hw_pipette['ready_to_aspirate']:
                if isinstance(dest.labware, Well):
                    self.move_to(dest.labware.top())
                else:
                    # TODO(seth,2019/7/29): This should be a warning exposed
                    #  via rpc to the runapp
                    self._log.warning(
                        "When aspirate is called on something other than a "
                        "well relative position, we can't move to the top of"
                        " the well to prepare for aspiration. This might "
                        "cause over aspiration if the previous command is a "
                        "blow_out.")
                self._hw_manager.hardware.prepare_for_aspirate(self._mount)
            self.move_to(dest)
        elif dest != self._ctx.location_cache:
            self.move_to(dest)

        self._hw_manager.hardware.aspirate(self._mount, volume, rate)

        return self

    @requires_version(2, 7)
    def dispense(self,
                 volume: float = None,
                 location: Union[types.Location, Well] = None,
                 rate: float = 1.0) -> PairedInstrumentContext:
        """
        Dispense a volume of liquid (in microliters/uL) using this pipette
        into the specified location.

        If only a volume is passed, the pipette will dispense from its current
        position. If only a location is passed (as in
        ``instr.dispense(location=wellplate['A1'])``), all of the liquid
        aspirated into the pipette will be dispensed (this volume is accessible
        through :py:attr:`current_volume`).

        :param volume: The volume of liquid to dispense, in microliters. If not
                       specified, defaults to :py:attr:`current_volume`.
        :type volume: int or float

        :param location: Where to dispense into. If `location` is a
                         :py:class:`.Well`, the robot will dispense into
                         :py:obj:`well_bottom_clearance.dispense` mm
                         above the bottom of the well. If `location` is a
                         :py:class:`.Location` (i.e. the result of
                         :py:meth:`.Well.top` or :py:meth:`.Well.bottom`), the
                         robot will dispense into the exact specified location.
                         If unspecified, the robot will dispense into the
                         current position.
        :param rate: The relative plunger speed for this dispense. During
                     this dispense, the speed of the plunger will be
                     `rate` * :py:attr:`dispense_speed`. If not specified,
                     defaults to 1.0 (speed will not be modified).
        :type rate: float

        :returns: This instance.

        .. note::

            If ``dispense`` is called with a single argument, it will not try
            to guess whether the argument is a volume or location - it is
            required to be a volume. If you want to call ``dispense`` with only
            a location, specify it as a keyword argument:
            ``instr.dispense(location=wellplate['A1'])``

        """
        self._log.debug("dispense {} from {} at {}"
                        .format(volume,
                                location if location else 'current position',
                                rate))
        if isinstance(location, Well):
            if 'fixedTrash' in quirks_from_any_parent(location):
                loc = location.top()
            else:
                point, well = location.bottom()
                loc = types.Location(
                    point + types.Point(0, 0,
                                        self.well_bottom_clearance.dispense),
                    well)
        elif isinstance(location, types.Location):
            loc = location
        elif location is not None:
            raise TypeError(
                'location should be a Well or Location, but it is {}'
                .format(location))

        self.paired_instrument_obj.dispense(volume, loc, rate)
        return self


    @requires_version(2, 7)
    def air_gap(self,
                volume: float = None,
                height: float = None) -> PairedInstrumentContext:
        """
        Pull air into the pipette current tip at the current location

        :param volume: The amount in uL to aspirate air into the tube.
                       (Default will use all remaining volume in tip)
        :type volume: float

        :param height: The number of millimiters to move above the current Well
                       to air-gap aspirate. (Default: 5mm above current Well)
        :type height: float

        :raises NoTipAttachedError: If no tip is attached to the pipette

        :raises RuntimeError: If location cache is None.
                              This should happen if `touch_tip` is called
                              without first calling a method that takes a
                              location (eg, :py:meth:`.aspirate`,
                              :py:meth:`dispense`)

        :returns: This instance

        .. note::

            Both ``volume`` and height are optional, but unlike previous API
            versions, if you want to specify only ``height`` you must do it
            as a keyword argument: ``pipette.air_gap(height=2)``. If you
            call ``air_gap`` with only one unnamed argument, it will always
            be interpreted as a volume.


        """
        for instr in self._instruments.values():
            if not instr.hw_pipette['has_tip']:
                raise hc.NoTipAttachedError('Pipette has no tip. Aborting air_gap')

        if height is None:
            height = 5

        self.paired_instrument_obj.air_gap(volume, height)
        return self

    @requires_version(2, 7)
    def blow_out(self,
                 location: Union[types.Location, Well] = None
                 ) -> PairedInstrumentContext:
        """
        Blow liquid out of the tip.

        If :py:attr:`dispense` is used to completely empty a pipette,
        usually a small amount of liquid will remain in the tip. This
        method moves the plunger past its usual stops to fully remove
        any remaining liquid from the tip. Regardless of how much liquid
        was in the tip when this function is called, after it is done
        the tip will be empty.

        :param location: The location to blow out into. If not specified,
                         defaults to the current location of the pipette
        :type location: :py:class:`.Well` or :py:class:`.Location` or None

        :raises RuntimeError: If no location is specified and location cache is
                              None. This should happen if `blow_out` is called
                              without first calling a method that takes a
                              location (eg, :py:meth:`.aspirate`,
                              :py:meth:`dispense`)
        :returns: This instance
        """
        if isinstance(location, Well):
            if location.parent.is_tiprack:
                self._log.warning('Blow_out being performed on a tiprack. '
                                  'Please re-check your code')
            loc = location.top()
            
        elif isinstance(location, types.Location):
            loc = location
            self.move_to(loc)
        elif location is not None:
            raise TypeError(
                'location should be a Well or Location, but it is {}'
                .format(location))
        self.paired_instrument_obj.blow_out(loc)
        return self

    @requires_version(2, 7)
    def mix(self,
            repetitions: int = 1,
            volume: float = None,
            location: Union[types.Location, Well] = None,
            rate: float = 1.0) -> PairedInstrumentContext:
        """
        Mix a volume of liquid (uL) using this pipette.
        If no location is specified, the pipette will mix from its current
        position. If no volume is passed, ``mix`` will default to the
        pipette's :py:attr:`max_volume`.

        :param repetitions: how many times the pipette should mix (default: 1)
        :param volume: number of microliters to mix (default:
                       :py:attr:`max_volume`)
        :param location: a Well or a position relative to well.
                         e.g, `plate.rows()[0][0].bottom()`
        :type location: types.Location
        :param rate: Set plunger speed for this mix, where,
                     ``speed = rate * (aspirate_speed or dispense_speed)``
        :raises NoTipAttachedError: If no tip is attached to the pipette.
        :returns: This instance

        .. note::

            All the arguments to ``mix`` are optional; however, if you do
            not want to specify one of them, all arguments after that one
            should be keyword arguments. For instance, if you do not want
            to specify volume, you would call
            ``pipette.mix(1, location=wellplate['A1'])``. If you do not
            want to specify repetitions, you would call
            ``pipette.mix(volume=10, location=wellplate['A1'])``. Unlike
            previous API versions, ``mix`` will not attempt to guess your
            inputs; the first argument will always be interpreted as
            ``repetitions``, the second as ``volume``, and the third as
            ``location`` unless you use keywords.

        """
        self._log.debug(
            'mixing {}uL with {} repetitions in {} at rate={}'.format(
                volume, repetitions,
                location if location else 'current position', rate))
        for instr in self._instruments.values():
            if not instr.hw_pipette['has_tip']:
                raise hc.NoTipAttachedError('Pipette has no tip. Aborting mix()')

        self.aspirate(volume, location, rate)
        while repetitions - 1 > 0:
            self.dispense(volume, rate=rate)
            self.aspirate(volume, rate=rate)
            repetitions -= 1
        self.dispense(volume, rate=rate)
        return self

    @requires_version(2, 7)
    def touch_tip(self,
                  location: Well = None,
                  radius: float = 1.0,
                  v_offset: float = -1.0,
                  speed: float = 60.0) -> PairedInstrumentContext:
        pass

    @requires_version(2, 7)
    def air_gap(self,
                volume: float = None,
                height: float = None) -> PairedInstrumentContext:
        """
        Pull air into the pipette current tip at the current location

        :param volume: The amount in uL to aspirate air into the tube.
                       (Default will use all remaining volume in tip)
        :type volume: float

        :param height: The number of millimiters to move above the current Well
                       to air-gap aspirate. (Default: 5mm above current Well)
        :type height: float

        :raises NoTipAttachedError: If no tip is attached to the pipette

        :raises RuntimeError: If location cache is None.
                              This should happen if `touch_tip` is called
                              without first calling a method that takes a
                              location (eg, :py:meth:`.aspirate`,
                              :py:meth:`dispense`)

        :returns: This instance

        .. note::

            Both ``volume`` and height are optional, but unlike previous API
            versions, if you want to specify only ``height`` you must do it
            as a keyword argument: ``pipette.air_gap(height=2)``. If you
            call ``air_gap`` with only one unnamed argument, it will always
            be interpreted as a volume.


        """
        if not self.hw_pipette['has_tip']:
            raise hc.NoTipAttachedError('Pipette has no tip. Aborting air_gap')

        if height is None:
            height = 5
        loc = self._ctx.location_cache
        if not loc or not isinstance(loc.labware, Well):
            raise RuntimeError('No previous Well cached to perform air gap')
        target = loc.labware.top(height)
        self.move_to(target)
        self.aspirate(volume)
        return self

    @requires_version(2, 7)
    def return_tip(self,
                   home_after: bool = True) -> PairedInstrumentContext:
        """
        If a tip is currently attached to both of the pipettes, then it will
        return the tip to it's location in the tiprack.

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
        primary_pipette = self._instruments[self._pair_policy.primary]
        drop_loc = self._drop_tip_target(loc, primary_pipette)
        self.drop_tip(drop_loc, home_after=home_after)
        return self

    @requires_version(2, 7)
    def move_to(self, location: types.Location, force_direct: bool = False,
                minimum_z_height: float = None,
                speed: float = None
                ) -> PairedInstrumentContext:
        """ Move the full gantry with the primary pipette used as the basis
        for the XY position within a given labware.

        :param location: The location to move to.
        :type location: :py:class:`.types.Location`
        :param force_direct: If set to true, move directly to destination
                        without arc motion.
        :param minimum_z_height: When specified, this Z margin is able to raise
                                 (but never lower) the mid-arc height.
        :param speed: The speed at which to move. If no speed is specified,
                      this function will utilize the primary pipette's speed.
                      This controls the straight linear speed of the motion;
                      to limit individual axis speeds, you can use
                      :py:attr:`.ProtocolContext.max_speeds`.
        """
        if not speed:
            primary = self._instruments[self._pair_policy.primary]
            speed = primary.default_speed

        self.paired_instrument_obj.move_to(
            location, force_direct, minimum_z_height, speed)
        return self

    def _next_available_tip(self) -> Tuple[Labware, Well]:
        # Here we will find the next available tip for
        # both the primary and secondary tip with a spacing
        # of approximately 34 mm.
        start = self.starting_tip
        primary_channels =\
            self._instruments[self._pair_policy.primary].channels
        secondary_channels =\
            self._instruments[self._pair_policy.secondary].channels
        if start is None:
            return select_tiprack_from_list_paired_pipettes(
                self.tip_racks, primary_channels, secondary_channels)
        else:
            return select_tiprack_from_list_paired_pipettes(
                filter_tipracks_to_start(start, self.tip_racks),
                primary_channels, secondary_channels, starting_point=start)

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
        try:
            return labware_column_shift(
                primary_loc, tiprack, SECONDARY_WELL_SPACING)
        except IndexError:
            raise PipettePairPickUpTipError(
                f'The location you specified ({primary_loc}) is'
                'incompatible with a PipettePair pickup.')
