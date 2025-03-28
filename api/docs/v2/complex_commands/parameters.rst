:og:description: Parameters for fine-tuning complex liquid handling behavior in the Python API.

.. _complex_params:

**********************************
Complex Liquid Handling Parameters
**********************************

Complex commands accept a number of optional parameters that give you greater control over the exact steps they perform.  

This page describes the accepted values and behavior of each parameter. The parameters are organized in the order that they first add a step. Some parameters, such as ``touch_tip``, add multiple steps. See :ref:`complex-command-order` for more details on the sequence of steps performed by complex commands.

The API reference entry for :py:meth:`.InstrumentContext.transfer` also lists the parameters and has more information on their implementation as keyword arguments.

.. _param-tip-handling:

Tip Handling
============

The ``new_tip`` parameter controls if and when complex commands pick up new tips from the pipette's tip racks. It has three possible values:

.. list-table::
   :header-rows: 1

   * - Value
     - Behavior
   * - ``"once"``
     - 
        - Pick up a tip at the start of the command.
        - Use the tip for all liquid handling.
        - Drop the tip at the end of the command.
   * - ``"always"``
     - Pick up and drop a tip for each set of aspirate and dispense steps.
   * - ``"never"``
     - Do not pick up or drop tips at all.
     
``"once"`` is the default behavior for all complex commands.

.. versionadded:: 2.0
     
Tip Handling Requirements
-------------------------
     
``"once"`` and ``"always"`` require that the pipette has an :ref:`associated tip rack <pipette-tip-racks>`, or the API will raise an error (because it doesn't know where to pick up a tip from). If the pipette already has a tip attached, the API will also raise an error when it tries to pick up a tip. 

.. code-block:: python

    pipette.pick_up_tip()
    pipette.transfer(
        volume=100,
        source=plate["A1"],
        dest=[plate["B1"], plate["B2"], plate["B3"]],
        new_tip="never",  # "once", "always", or None will error
    )

Conversely, ``"never"`` requires that the pipette has picked up a tip, or the API will raise an error (because it will attempt to aspirate without a tip attached).

Avoiding Cross-Contamination
----------------------------

One reason to set ``new_tip="always"`` is to avoid cross-contamination between wells. However, you should always do a dry run of your protocol to test that the pipette is picking up and dropping tips in the way that your application requires.

:py:meth:`~.InstrumentContext.transfer` will pick up a new tip before *every* aspirate when ``new_tip="always"``. This includes when :ref:`tip refilling <complex-tip-refilling>` requires multiple aspirations from a single source well.

:py:meth:`~.InstrumentContext.distribute` and :py:meth:`~.InstrumentContext.consolidate` only pick up one tip, even when ``new_tip="always"``. For example, this distribute command returns to the source well a second time, because the amount to be distributed (400 µL total plus disposal volume) exceeds the pipette capacity (300 µL)::

    pipette.distribute(
        volume=200,
        source=plate["A1"],
        dest=[plate["B1"], plate["B2"]],
        new_tip="always",
    )
    
But it *does not* pick up a new tip after dispensing into B1:

.. code-block:: text

    Picking up tip from A1 of tip rack on 3
    Aspirating 220.0 uL from A1 of well plate on 2 at 92.86 uL/sec
    Dispensing 200.0 uL into B1 of well plate on 2 at 92.86 uL/sec
    Blowing out at A1 of Opentrons Fixed Trash on 12
    Aspirating 220.0 uL from A1 of well plate on 2 at 92.86 uL/sec
    Dispensing 200.0 uL into B2 of well plate on 2 at 92.86 uL/sec
    Blowing out at A1 of Opentrons Fixed Trash on 12
    Dropping tip into A1 of Opentrons Fixed Trash on 12

If this poses a contamination risk, you can work around it in a few ways:

    * Use ``transfer()`` with ``new_tip="always"`` instead.
    * Set :py:obj:`.well_bottom_clearance` high enough that the tip doesn't contact liquid in the destination well.
    * Use :ref:`building block commands <v2-atomic-commands>` instead of complex commands.


.. _param-mix-before:

Mix Before
==========

The ``mix_before`` parameter controls mixing in source wells before each aspiration. Its value must be a :py:class:`tuple` with two numeric values. The first value is the number of repetitions, and the second value is the amount of liquid to mix in µL.

For example, this transfer command will mix 50 µL of liquid 3 times before each of its aspirations::

    pipette.transfer(
        volume=100,
        source=plate["A1"],
        dest=[plate["B1"], plate["B2"]],
        mix_before=(3, 50),
    )
    
.. versionadded:: 2.0

Mixing occurs before every aspiration, including when :ref:`tip refilling <complex-tip-refilling>` is required.

.. note::
    :py:meth:`~.InstrumentContext.consolidate` ignores any value of ``mix_before``. Mixing on the second and subsequent aspirations of a consolidate command would defeat its purpose: to aspirate multiple times in a row, from different wells, *before* dispensing.
    
.. _param-disposal-volume:

Disposal Volume
===============

The ``disposal_volume`` parameter controls how much extra liquid is aspirated as part of a :py:meth:`~.InstrumentContext.distribute` command. Including a disposal volume can improve the accuracy of each dispense. The pipette blows out the disposal volume of liquid after dispensing. To skip aspirating and blowing out extra liquid, set ``disposal_volume=0``.

By default, ``disposal_volume`` is the :ref:`minimum volume <new-pipette-models>` of the pipette, but you can set it to any amount::

    pipette.distribute(
        volume=100,
        source=plate["A1"],
        dest=[plate["B1"], plate["B2"]],
        disposal_volume=10,  # reduce from default 20 µL to 10 µL
    )
    
.. versionadded:: 2.0
    
If the amount to aspirate plus the disposal volume exceeds the tip's capacity, ``distribute()`` will use a :ref:`tip refilling strategy <complex-tip-refilling>`. In such cases, the pipette will aspirate and blow out the disposal volume *for each aspiration*. For example, this command will require tip refilling with a 1000 µL pipette::
    
    pipette.distribute(
        volume=120,
        source=reservoir["A1"],
        dest=[plate.columns()[0]],
        disposal_volume=50,
    )
    
The amount to dispense in the destination is 960 µL (120 µL for each of 8 wells in the column). Adding the 50 µL disposal volume exceeds the 1000 µL capacity of the tip. The command will be split across two aspirations, each with the full disposal volume of 50 µL. The pipette will dispose *a total of 100 µL* during the command.

.. note::
    :py:meth:`~.InstrumentContext.transfer` will not aspirate additional liquid if you set ``disposal_volume``. However, it will perform a very small blow out after each dispense.
    
    :py:meth:`~.InstrumentContext.consolidate` ignores ``disposal_volume`` completely.

.. _param-touch-tip:

Touch Tip
=========

The ``touch_tip`` parameter accepts a Boolean value. When ``True``, a touch tip step occurs after every aspirate and dispense.

For example, this transfer command aspirates, touches the tip at the source, dispenses, and touches the tip at the destination::

    pipette.transfer(
        volume=100,
        dest=plate["A1"],
        source=plate["B1"],
        touch_tip=True,
    )

.. versionadded:: 2.0

Touch tip occurs after every aspiration, including when :ref:`tip refilling <complex-tip-refilling>` is required.

This parameter always uses default motion behavior for touch tip. Use the :ref:`touch tip building block command <touch-tip>` if you need to:

    * Only touch the tip after aspirating or dispensing, but not both.
    * Control the speed, radius, or height of the touch tip motion.

.. _param-air-gap:

Air Gap
=======

The ``air_gap`` parameter controls how much air to aspirate and hold in the bottom of the tip when it contains liquid. The parameter's value is the amount of air to aspirate in µL.

Air-gapping behavior is different for each complex command. The different behaviors all serve the same purpose, which is to never leave the pipette holding liquid at the very bottom of the tip. This helps keep liquids from seeping out of the pipette.

.. list-table::
   :header-rows: 1

   * - Method
     - Air-gapping behavior
   * - ``transfer()``
     - 
       - Air gap after each aspiration.
       - Pipette is empty after dispensing.
   * - ``distribute()``
     - 
       - Air gap after each aspiration.
       - Air gap after dispensing if the pipette isn't empty.
   * - ``consolidate()``
     - 
       - Air gap after each aspiration. This may create multiple air gaps within the tip.
       - Pipette is empty after dispensing.

For example, this transfer command will create a 20 µL air gap after each of its aspirations. When dispensing, it will clear the air gap and dispense the full 100 µL of liquid::

    pipette.transfer(
        volume=100,
        source=plate["A1"],
        dest=plate["B1"],
        air_gap=20,
    )
    
.. versionadded:: 2.0

When consolidating, air gaps still occur after every aspiration. In this example, the tip will use 210 µL of its capacity (50 µL of liquid followed by 20 µL of air, repeated three times)::

    pipette.consolidate(
        volume=50,
        source=[plate["A1"], plate["A2"], plate["A3"]],
        dest=plate["B1"],
        air_gap=20,
    )

.. code-block:: text

    Picking up tip from A1 of tip rack on 3
    Aspirating 50.0 uL from A1 of well plate on 2 at 92.86 uL/sec
    Air gap
        Aspirating 20.0 uL from A1 of well plate on 2 at 92.86 uL/sec
    Aspirating 50.0 uL from A2 of well plate on 2 at 92.86 uL/sec
    Air gap
        Aspirating 20.0 uL from A2 of well plate on 2 at 92.86 uL/sec
    Aspirating 50.0 uL from A3 of well plate on 2 at 92.86 uL/sec
    Air gap
        Aspirating 20.0 uL from A3 of well plate on 2 at 92.86 uL/sec
    Dispensing 210.0 uL into B1 of well plate on 2 at 92.86 uL/sec
    Dropping tip into A1 of Opentrons Fixed Trash on 12
    
If adding an air gap would exceed the pipette's maximum volume, the complex command will use a :ref:`tip refilling strategy <complex-tip-refilling>`. For example, this command uses a 300 µL pipette to transfer 300 µL of liquid plus an air gap::

    pipette.transfer(
        volume=300,
        source=plate["A1"],
        dest=plate["B1"],
        air_gap=20,
    )

As a result, the transfer is split into two aspirates of 150 µL, each with their own 20 µL air gap:

.. code-block:: text

	Picking up tip from A1 of tip rack on 3
	Aspirating 150.0 uL from A1 of well plate on 2 at 92.86 uL/sec
	Air gap
		Aspirating 20.0 uL from A1 of well plate on 2 at 92.86 uL/sec
	Dispensing 170.0 uL into B1 of well plate on 2 at 92.86 uL/sec
	Aspirating 150.0 uL from A1 of well plate on 2 at 92.86 uL/sec
	Air gap
		Aspirating 20.0 uL from A1 of well plate on 2 at 92.86 uL/sec
	Dispensing 170.0 uL into B1 of well plate on 2 at 92.86 uL/sec
	Dropping tip into A1 of Opentrons Fixed Trash on 12

.. _param-mix-after:

Mix After
=========

The ``mix_after`` parameter controls mixing in source wells after each dispense. Its value must be a :py:class:`tuple` with two numeric values. The first value is the number of repetitions, and the second value is the amount of liquid to mix in µL.

For example, this transfer command will mix 50 µL of liquid 3 times after each of its dispenses::

    pipette.transfer(
        volume=100,
        source=plate["A1"],
        dest=[plate["B1"], plate["B2"]],
        mix_after=(3, 50),
    )
    
.. versionadded:: 2.0

.. note::
    :py:meth:`~.InstrumentContext.distribute` ignores any value of ``mix_after``. Mixing after dispensing would combine (and potentially contaminate) the remaining source liquid with liquid present at the destination.

.. _param-blow-out:

Blow Out
========

There are two parameters that control whether and where the pipette blows out liquid. The ``blow_out`` parameter accepts a Boolean value. When ``True``, the pipette blows out remaining liquid when the tip is empty or only contains the disposal volume. The ``blowout_location`` parameter controls in which of three locations these blowout actions occur. The default blowout location is the trash. Blowout behavior is different for each complex command. 

.. list-table::
   :header-rows: 1

   * - Method
     - Blowout behavior and location
   * - ``transfer()``
     -
       - Blow out after each dispense.
       - Valid locations: ``"trash"``, ``"source well"``, ``"destination well"``
   * - ``distribute()``
     - 
       - Blow out after the final dispense.
       - Valid locations: ``"trash"``, ``"source well"``
   * - ``consolidate()``
     - 
       - Blow out after the only dispense.
       - Valid locations: ``"trash"``, ``"destination well"``

For example, this transfer command will blow out liquid in the trash twice, once after each dispense into a destination well::

    pipette.transfer(
        volume=100,
        source=[plate["A1"], plate["A2"]],
        dest=[plate["B1"], plate["B2"]],
        blow_out=True,
    )

.. versionadded:: 2.0

Set ``blowout_location`` when you don't want to waste any liquid by blowing it out into the trash. For example, you may want to make sure that every last bit of a sample is moved into a destination well. Or you may want to return every last bit of an expensive reagent to the source for use in later pipetting. 

If you need to blow out in a different well, or at a specific location within a well, use the :ref:`blow out building block command <blow-out>` instead.

When setting a blowout location, you *must* also set ``blow_out=True``, or the location will be ignored::

    pipette.transfer(
        volume=100,
        source=plate["A1"],
        dest=plate["B1"],
        blow_out=True,  # required to set location
        blowout_location="destination well",
    )

.. versionadded:: 2.8

With ``transfer()``, the pipette will not blow out at all if you only set ``blowout_location``.

``blow_out=True`` is also required for distribute commands that blow out by virtue of having a disposal volume::

    pipette.distribute(
        volume=100,
        source=plate["A1"],
        dest=[plate["B1"], plate["B2"]],
        disposal_volume=50,  # causes blow out
        blow_out=True,       # still required to set location!
        blowout_location="source well",
    )

With ``distribute()``, the pipette will still blow out if you only set ``blowout_location``, but in the default location of the trash.

.. note::
    If the tip already contains liquid before the complex command, the default blowout location will shift away from the trash. ``transfer()`` and ``distribute()`` shift to the source well, and ``consolidate()`` shifts to the destination well. For example, this transfer command will blow out in well B1 because it's the source::
    
        pipette.pick_up_tip()
        pipette.aspirate(100, plate["A1"])    
        pipette.transfer(
            volume=100,
            source=plate["B1"],
            dest=plate["C1"],
            new_tip="never",
            blow_out=True,
            # no blowout_location
        )
        pipette.drop_tip()

    This only occurs when you aspirate and then perform a complex command with ``new_tip="never"`` and ``blow_out=True``.

.. _param-trash:

Trash Tips
==========

The ``trash`` parameter controls what the pipette does with tips at the end of complex commands. When ``True``, the pipette drops tips into the trash. When ``False``, the pipette returns tips to their original locations in their tip rack. 

The default is ``True``, so you only have to set ``trash`` when you want the tip-returning behavior::

    pipette.transfer(
        volume=100,
        source=plate["A1"],
        dest=plate["B1"],
        trash=False,
    )

.. versionadded:: 2.0