:og:description: How to heat and cool with the Temperature Module in a Python protocol.

.. _temperature-module:

******************
Temperature Module
******************

The Temperature Module acts as both a cooling and heating device. It can control the temperature of its deck between 4 °C and 95 °C with a resolution of 1 °C.

The Temperature Module is represented in code by a :py:class:`.TemperatureModuleContext` object, which has methods for setting target temperatures and reading the module's status. This example demonstrates loading a Temperature Module GEN2 and loading a well plate on top of it.

.. code-block:: python

    temp_mod = protocol.load_module(
        module_name="temperature module gen2", location="D3"
    )

.. versionadded:: 2.3

Loading Labware
===============

Use the Temperature Module’s :py:meth:`~.TemperatureModuleContext.load_adapter` and :py:meth:`~.TemperatureModuleContext.load_labware` methods to specify what you will place on the module. You may use one or both of the methods, depending on the labware you're using. See :ref:`labware-on-adapters` for examples of loading labware on modules.

The `Opentrons Labware Library <https://labware.opentrons.com/>`_ includes definitions for both standalone adapters and adapter–labware combinations. These labware definitions help make the Temperature Module ready to use right out of the box.

Standalone Adapters
-------------------

You can use these standalone adapter definitions to load Opentrons verified or custom labware on top of the Temperature Module. 

.. list-table::
   :header-rows: 1

   * - Adapter Type
     - API Load Name
   * - Opentrons Aluminum Flat Bottom Plate
     - ``opentrons_aluminum_flat_bottom_plate``
   * - Opentrons 96 Well Aluminum Block
     - ``opentrons_96_well_aluminum_block``
   * - Opentrons 96 Deep Well Temperature Module Adapter
     - ``opentrons_96_deep_well_temp_mod_adapter``
     
For example, these commands load a PCR plate on top of the 96-well block::

    temp_adapter = temp_mod.load_adapter(
        "opentrons_96_well_aluminum_block"
    )
    temp_plate = temp_adapter.load_labware(
        "nest_96_wellplate_100ul_pcr_full_skirt"
    )

.. versionadded:: 2.15
    The ``load_adapter()`` method.

.. note::
    You can also load labware directly onto the Temperature Module. In API version 2.14 and earlier, this was the correct way to load labware on top of the flat bottom plate. In API version 2.15 and later, you should load both the adapter and the labware with separate commands.

Block-and-tube combinations
---------------------------

You can use these combination labware definitions to load various types of tubes into the 24-well thermal block on top of the Temperature Module. There is no standalone definition for the 24-well block.

.. list-table::
   :header-rows: 1

   * - Tube Type
     - API Load Name
   * - Generic 2 mL screw cap
     - ``opentrons_24_aluminumblock_generic_2ml_screwcap``
   * - NEST 0.5 mL screw cap
     - ``opentrons_24_aluminumblock_nest_0.5ml_screwcap``
   * - NEST 1.5 mL screw cap
     - ``opentrons_24_aluminumblock_nest_1.5ml_screwcap``
   * - NEST 1.5 mL snap cap
     - ``opentrons_24_aluminumblock_nest_1.5ml_snapcap``
   * - NEST 2 mL screw cap
     - ``opentrons_24_aluminumblock_nest_2ml_screwcap``
   * - NEST 2 mL snap cap
     - ``opentrons_24_aluminumblock_nest_2ml_snapcap``
     
For example, this command loads the 24-well block with generic 2 mL tubes::

    temp_tubes = temp_mod.load_labware(
        "opentrons_24_aluminumblock_generic_2ml_screwcap"
    )

.. versionadded:: 2.0

Block-and-plate combinations
----------------------------

The Temperature Module supports these 96-well block and labware combinations for backwards compatibility. If your protocol specifies an ``apiLevel`` of 2.15 or higher, you should use the standalone 96-well block definition instead.

.. list-table::
   :header-rows: 1

   * - 96-well block contents
     - API Load Name
   * - Bio-Rad well plate 200 µL
     - ``opentrons_96_aluminumblock_biorad_wellplate_200uL``
   * - Generic PCR strip 200 µL
     - ``opentrons_96_aluminumblock_generic_pcr_strip_200uL``
   * - NEST well plate 100 µL
     - ``opentrons_96_aluminumblock_nest_wellplate_100uL``

This command loads the same physical adapter and labware as the example in the Standalone Adapters section above, but it is also compatible with earlier API versions::

    temp_combo = temp_mod.load_labware(
        "opentrons_96_aluminumblock_nest_wellplate_100uL"
    )

.. versionadded:: 2.0


Temperature Control
===================

The primary function of the module is to control the temperature of its deck, using :py:meth:`~.TemperatureModuleContext.set_temperature`, which takes one parameter: ``celsius``. For example, to set the Temperature Module to 4 °C:

.. code-block:: python

    temp_mod.set_temperature(celsius=4)

When using ``set_temperature()``, your protocol will wait until the target temperature is reached before proceeding to further commands. In other words, you can pipette to or from the Temperature Module when it is holding at a temperature or idle, but not while it is actively changing temperature. Whenever the module reaches its target temperature, it will hold the temperature until you set a different target or call :py:meth:`~.TemperatureModuleContext.deactivate`, which will stop heating or cooling and will turn off the fan.

.. note::

    Your robot will not automatically deactivate the Temperature Module at the end of a protocol. If you need to deactivate the module after a protocol is completed or canceled, use the Temperature Module controls on the device detail page in the Opentrons App or run ``deactivate()`` in Jupyter notebook.

.. versionadded:: 2.0

Temperature Status
==================

If you need to confirm in software whether the Temperature Module is holding at a temperature or is idle, use the :py:obj:`~.TemperatureModuleContext.status` property:

.. code-block:: python

    temp_mod.set_temperature(celsius=90)
    temp_mod.status  # "holding at target"
    temp_mod.deactivate()
    temp_mod.status  # "idle"
    
If you don't need to use the status value in your code, and you have physical access to the module, you can read its status and temperature from the LED and display on the module.
    
.. versionadded:: 2.0

Changes with the GEN2 Temperature Module
========================================

All methods of :py:class:`.TemperatureModuleContext` work with both the GEN1 and GEN2 Temperature Module. Physically, the GEN2 module has a plastic insulating rim around the plate, and plastic insulating shrouds designed to fit over Opentrons aluminum blocks. This mitigates an issue where the GEN1 module would have trouble cooling to very low temperatures, especially if it shared the deck with a running Thermocycler.
