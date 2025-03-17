:og:description: How to work with very small volumes of liquid on Opentrons Flex.

.. _pipette-volume-modes:

Volume Modes
============

The Flex 1-Channel 50 µL and Flex 8-Channel 50 µL pipettes must operate in a low-volume mode to accurately dispense very small volumes of liquid. Set the volume mode by calling :py:meth:`.InstrumentContext.configure_for_volume` with the amount of liquid you plan to aspirate, in µL::

    pipette50.configure_for_volume(1)
    pipette50.pick_up_tip()
    pipette50.aspirate(1, plate["A1"])
    
.. versionadded:: 2.15

Passing different values to ``configure_for_volume()`` changes the minimum and maximum volume of Flex 50 µL pipettes as follows:

.. list-table::
    :header-rows: 1
    :widths: 2 3 3
    
    * - Value
      - Minimum Volume (µL)
      - Maximum Volume (µL)
    * - 1–4.9
      - 1
      - 30
    * - 5–50
      - 5
      - 50

When you use ``configure_for_volume()`` for a Flex 50 µL pipette, you also define the default push out volume:
* For **low volume mode** (1-4.9 µL): 7 µL
* For 5-50 µL: 2 µL

For more, see :ref:`_push-out-dispense`.

.. note::
    The pipette must not contain liquid when you call ``configure_for_volume()``, or the API will raise an error.
    
    Also, if the pipette is in a well location that may contain liquid, it will move upward to ensure it is not immersed in liquid before changing its mode. Calling ``configure_for_volume()`` *before* ``pick_up_tip()`` helps to avoid this situation.

In a protocol that handles many different volumes, it's a good practice to call ``configure_for_volume()`` once for each :py:meth:`.transfer` or :py:meth:`.aspirate`, specifying the volume that you are about to handle. When operating with a list of volumes, nest ``configure_for_volume()`` inside a ``for`` loop to ensure that the pipette is properly configured for each volume:

.. code-block:: python
    
    volumes = [1, 2, 3, 4, 1, 5, 2, 8]
    sources = plate.columns()[0]
    destinations = plate.columns()[1]
    for i in range(8):
        pipette50.configure_for_volume(volumes[i])
        pipette50.pick_up_tip()
        pipette50.aspirate(volume=volumes[i], location=sources[i])
        pipette50.dispense(location=destinations[i])
        pipette50.drop_tip()

If you know that all your liquid handling will take place in a specific mode, then you can call ``configure_for_volume()`` just once with a representative volume. Or if all the volumes correspond to the pipette's default mode, you don't have to call ``configure_for_volume()`` at all.
