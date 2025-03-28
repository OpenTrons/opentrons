.. _pipettes:

The ``instruments`` module gives your protocol access to the pipette constructors, which is what you will be primarily using to create protocol commands.

************************

******************
Creating a Pipette
******************

.. code-block:: python

    '''
    Examples in this section require the following:
    '''
    from opentrons import instruments, robot


Pipette Model(s)
===================
Currently in our API there are 10 pipette models to correspond with the offered pipette models on our website.

They are as follows:

- ``P10_Single`` (1 - 10 ul)
- ``P10_Multi`` (1 - 10ul)
- ``P50_Single`` (5 - 50ul)
- ``P50_Multi`` (5 - 50ul)
- ``P300_Single`` (30 - 300ul)
- ``P300_Multi`` (30 - 300ul)
- ``P1000_Single`` (100 - 1000ul)
- ``P20_Single_GEN2`` (1 - 20ul)
- ``P300_Single_GEN2`` (20 - 300ul)
- ``P1000_Single_GEN2`` (100 - 1000ul)


For every pipette type you are using in a protocol, you must use one of the
model names specified above and call it out as ``instruments.(Model Name)``.
You must also specify a mount. The mount can be either ``"left"`` or ``"right"``.
In this example, we are using a Single-Channel 300uL pipette.

.. code-block:: python

    pipette = instruments.P300_Single(mount="left")

Pipette GEN2 Backwards Compatibility
====================================

Because the Gen 2 pipettes behave similarly to the Gen 1 pipettes, if you specify a Gen 1 pipette
in your protocol (for instance, ``instruments.P300_Single``) but have a Gen 2 pipette attached (for instance,
``instruments.P300_Single_GEN2``), you can still run your protocol. The robot will consider the Gen 2
pipette to have the same minimum volume as the Gen 1 pipette, so any advanced commands have the
same behavior as before.

The P20 Single GEN2 is back-compatible with the P10 Single in this regard. If your protocol
specifies an ``instruments.P10_Single`` and your robot has an ``instruments.P20_Single_GEN2``
attached, you can run your protocol, and the robot will act as if the maximum volume of the P20
Single GEN2 is 10 µl.

If you have a P50 Single specified in your protocol, there is no automatic backwards compatibility.
If you want to use a Gen2 Pipette, you must change your protocol to load either a P300 Single GEN2
(if you are using volumes between 20 and 50 µl) or a P20 Single GEN2 (if you are using volumes
below 20 µl).


Plunger Flow Rates
==================

The speeds at which the pipette will aspirate and dispense can be set through ``aspirate_speed``, ``dispense_speed``, and ``blow_out_speed`` in units of millimeters of plunger travel per second, or through ``aspirate_flow_rate``, ``dispense_flow_rate``, and ``blow_out_flow_rate`` in units of microliters/second. These have varying defaults depending on the model.


.. code-block:: python

    pipette = instruments.P300_Single(
        mount="right",
        aspirate_flow_rate=200,
        dispense_flow_rate=600,
        blow_out_flow_rate=600)


Minimum and Maximum Volume
==========================

The minimum and maximum volume of the pipette may be set using
``min_volume`` and ``max_volume``. The values are in microliters and have
varying defaults depending on the model.


.. code-block:: python

    pipette = instruments.P10_Single(
        mount="right",
        min_volume=2,
        max_volume=8)


The given defaults for every pipette model is the following:

P10_Single
----------

- Aspirate Default: 5 µl/s
- Dispense Default: 10 µl/s
- Blow Out Default: 1000 µl/s
- Minimum Volume: 1 µl
- Maximum Volume: 10 µl

P10_Multi
---------

- Aspirate Default: 5 µl/s
- Dispense Default: 10 µl/s
- Blow Out Default: 1000 µl/s
- Minimum Volume: 1 µl
- Maximum Volume: 10 µl

P50_Single
----------

- Aspirate Default: 25 µl/s
- Dispense Default: 50 µl/s
- Blow Out Default: 1000 µl/s
- Minimum Volume: 5 µl
- Maximum Volume: 50 µl

P50_Multi
---------

- Aspirate Default: 25 µl/s
- Dispense Default: 50 µl/s
- Blow Out Default: 1000 µl/s
- Minimum Volume: 5 µl
- Maximum Volume: 50 µl

P300_Single
-----------

- Aspirate Default: 150 µl/s
- Dispense Default: 300 µl/s
- Blow Out Default: 1000 µl/s
- Minimum Volume: 30 µl
- Maximum Volume: 300 µl

P300_Multi
----------

- Aspirate Default: 150 µl/s
- Dispense Default: 300 µl/s
- Blow Out Default: 1000 µl/s
- Minimum Volume: 30 µl
- Maximum Volume: 300 µl

P1000_Single
------------

- Aspirate Default: 500 µl/s
- Dispense Default: 1000 µl/s
- Blow Out Default: 1000 µl/s
- Minimum Volume: 100 µl
- Maximum Volume: 1000 µl

P20_Single_GEN2
---------------

- Aspirate Default: 3.78 µl/s
- Dispense Default: 3.78 µl/s
- Blow Out Default: 3.78 µl/s
- Minimum Volume: 1 µl
- Maximum Volume: 20 µl

P300_Single_GEN2
----------------

- Aspirate Default: 46.43 µl/s
- Dispense Default: 46.43 µl/s
- Blow Out Default: 46.43 µl/s
- Minimum Volume: 20 µl
- Maximum Volume: 300 µl

P1000_Single_GEN2
-----------------

- Aspirate Default: 137.35 µl/s
- Dispense Default: 137.35 µl/s
- Blow Out Default: 137.35 µl/s
- Minimum Volume: 100 µl
- Maximum Volume: 1000 µl

Old Pipette Constructor
=======================

The ``Pipette`` constructor that was used directly in OT-One protocols is now
an internal-only class. Its behavior is difficult to predict when not used
through the public constructors mentioned above. ``Pipette`` constructor
arguments are subject to change of their default values, behaviors, and
parameters may be added or removed without warning or a major version
increment.
