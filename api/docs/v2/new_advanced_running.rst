:og:description: How to control a robot outside of the Opentrons App, using Jupyter Notebook or the command line.

.. _advanced-control:

Advanced Control
================

As its name implies, the Python Protocol API is primarily designed for creating protocols that you upload via the Opentrons App and execute on the robot as a unit. But sometimes it's more convenient to control the robot outside of the app. For example, you might want to have variables in your code that change based on user input or the contents of a CSV file. Or you might want to only execute part of your protocol at a time, especially when developing or debugging a new protocol.

The Python API offers two ways of issuing commands to the robot outside of the app: through Jupyter Notebook or on the command line with ``opentrons_execute``.

Jupyter Notebook
----------------

The Flex and OT-2 run `Jupyter Notebook <https://jupyter.org>`_ servers on port 48888, which you can connect to with your web browser. This is a convenient environment for writing and debugging protocols, since you can define different parts of your protocol in different notebook cells and run a single cell at a time.

Access your robot’s Jupyter Notebook by either:

- Going to the **Advanced** tab of Robot Settings and clicking **Launch Jupyter Notebook**.
- Going directly to ``http://<robot-ip>:48888`` in your web browser (if you know your robot's IP address).
- On **Flex** robot, running Jupyter Notebook requires stopping the Opentrons Robot Server. In the first cell of your Jupyter Notebook, enter and run ``!systemctl stop opentrons-robot-server``. This will cause the Opentrons App to display the message: "This robot's API server is not responding correctly to requests at IP address xxx.xxx.xxx.xxx."

Once you've launched Jupyter Notebook, you can create a notebook file or edit an existing one. These notebook files are stored on the the robot. If you want to save code from a notebook to your computer, go to **File > Download As** in the notebook interface.

Protocol Structure
^^^^^^^^^^^^^^^^^^

Jupyter Notebook is structured around `cells`: discrete chunks of code that can be run individually. This is nearly the opposite of Opentrons protocols, which bundle all commands into a single ``run`` function. Therefore, to take full advantage of Jupyter Notebook, you have to restructure your protocol. 

Rather than writing a  ``run`` function and embedding commands within it, start your notebook by importing ``opentrons.execute`` and calling :py:meth:`opentrons.execute.get_protocol_api`. This function also replaces the ``metadata`` block of a standalone protocol by taking the minimum :ref:`API version <v2-versioning>` as its argument. Then you can call :py:class:`~opentrons.protocol_api.ProtocolContext` methods in subsequent lines or cells:

.. code-block:: python
    :substitutions:

    import opentrons.execute
    protocol = opentrons.execute.get_protocol_api("|apiLevel|")
    protocol.home()

The first command you execute should always be :py:meth:`~opentrons.protocol_api.ProtocolContext.home`. If you try to execute other commands first, you will get a ``MustHomeError``. (When running protocols through the Opentrons App, the robot homes automatically.)

You should use the same :py:class:`.ProtocolContext` throughout your notebook, unless you need to start over from the beginning of your protocol logic. In that case, call :py:meth:`~opentrons.execute.get_protocol_api` again to get a new :py:class:`.ProtocolContext`.

Running a Previously Written Protocol
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

You can also use Jupyter to run a protocol that you have already written. To do so, first copy the entire text of the protocol into a cell and run that cell:

.. code-block:: python

    import opentrons.execute
    from opentrons import protocol_api
    def run(protocol: protocol_api.ProtocolContext):
        # the contents of your previously written protocol go here


Since a typical protocol only `defines` the ``run`` function but doesn't `call` it, this won't immediately cause the robot to move. To begin the run, instantiate a :py:class:`.ProtocolContext` and pass it to the ``run`` function you just defined:

.. code-block:: python
    :substitutions:

    protocol = opentrons.execute.get_protocol_api("|apiLevel|")
    run(protocol)  # your protocol will now run

.. _using_lpc:

Setting Labware Offsets
-----------------------

All positions relative to labware are adjusted automatically based on labware offset data. When you're running your code in Jupyter Notebook or with ``opentrons_execute``, you need to set your own offsets because you can't perform run setup and Labware Position Check in the Opentrons App or on the Flex touchscreen. 

Creating a Dummy Protocol
^^^^^^^^^^^^^^^^^^^^^^^^^

For advanced control applications, do the following to calculate and apply labware offsets:
	
	1. Create a "dummy" protocol that loads your labware and has each used pipette pick up a tip from a tip rack.
	2. Import the dummy protocol to the Opentrons App.
	3. Run Labware Position Check from the app or touchscreen.
	4. Add the offsets to your code with :py:meth:`.set_offset`.
	
Creating the dummy protocol requires you to:

    1. Use the ``metadata`` or ``requirements`` dictionary to specify the API version. (See :ref:`v2-versioning` for details.) Use the same API version as you did in :py:meth:`opentrons.execute.get_protocol_api`.
    2. Define a ``run()`` function.
    3. Load all of your labware in their initial locations.
    4. Load your smallest capacity pipette and specify its ``tip_racks``.
    5. Call ``pick_up_tip()``. Labware Position Check can't run if you don't pick up a tip.
    
For example, the following dummy protocol will use a P300 Single-Channel GEN2 pipette to enable Labware Position Check for an OT-2 tip rack, NEST reservoir, and NEST flat well plate.

.. code-block:: python

    metadata = {"apiLevel": "2.13"} 
  
     def run(protocol): 
         tiprack = protocol.load_labware("opentrons_96_tiprack_300ul", 1) 
         reservoir = protocol.load_labware("nest_12_reservoir_15ml", 2) 
         plate = protocol.load_labware("nest_96_wellplate_200ul_flat", 3) 
         p300 = protocol.load_instrument("p300_single_gen2", "left", tip_racks=[tiprack]) 
         p300.pick_up_tip() 
         p300.return_tip()

After importing this protocol to the Opentrons App, run Labware Position Check to get the x, y, and z offsets for the tip rack and labware. When complete, you can click **Get Labware Offset Data** to view automatically generated code that uses :py:meth:`.set_offset` to apply the offsets to each piece of labware.

.. code-block:: python
	
    labware_1 = protocol.load_labware("opentrons_96_tiprack_300ul", location="1")
    labware_1.set_offset(x=0.00, y=0.00, z=0.00)

    labware_2 = protocol.load_labware("nest_12_reservoir_15ml", location="2")
    labware_2.set_offset(x=0.10, y=0.20, z=0.30)

    labware_3 = protocol.load_labware("nest_96_wellplate_200ul_flat", location="3")
    labware_3.set_offset(x=0.10, y=0.20, z=0.30)
    
This automatically generated code uses generic names for the loaded labware. If you want to match the labware names already in your protocol, change the labware names to match your original code:

.. code-block:: python

    reservoir = protocol.load_labware("nest_12_reservoir_15ml", "2")
    reservoir.set_offset(x=0.10, y=0.20, z=0.30)
    
.. versionadded:: 2.12

Once you've executed this code in Jupyter Notebook, all subsequent positional calculations for this reservoir in slot 2 will be adjusted 0.1 mm to the right, 0.2 mm to the back, and 0.3 mm up.

Keep in mind that ``set_offset()`` commands will override any labware offsets set by running Labware Position Check in the Opentrons App. And you should follow the behavior of Labware Position Check, i.e., *do not* reuse offset measurements unless they apply to the *same labware type* in the *same deck slot* on the *same robot*.

.. warning::

	Improperly reusing offset data may cause your robot to move to an unexpected position or crash against labware, which can lead to incorrect protocol execution or damage your equipment. When in doubt: run Labware Position Check again and update your code!

.. _labware-offset-behavior:

Labware Offset Behavior
^^^^^^^^^^^^^^^^^^^^^^^

How the API applies labware offsets varies depending on the API level of your protocol. This section describes the latest behavior. For details on how offsets work in earlier API versions, see the API reference entry for :py:meth:`.set_offset`.

In the latest API version, offsets apply to labware type–location combinations. For example,  if you use ``set_offset()`` on a tip rack, use all the tips, and replace the rack with a fresh one of the same type in the same location, the offsets will apply to the fresh tip rack::

    tiprack = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_1000ul", location="D3"
    )
    tiprack2 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_1000ul",
        location=protocol_api.OFF_DECK,
    )
    tiprack.set_offset(x=0.1, y=0.1, z=0.1)
    protocol.move_labware(
        labware=tiprack, new_location=protocol_api.OFF_DECK
    )  # tiprack has no offset while off-deck
    protocol.move_labware(
        labware=tiprack2, new_location="D3"
    )  # tiprack2 now has offset 0.1, 0.1, 0.1
    
Because offsets apply to combinations of labware type and location, if you want an offset to apply to a piece of labware as it moves around the deck, call ``set_offset()`` again after each movement::

    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat", location="D2"
    )
    plate.set_offset(
        x=-0.1, y=-0.2, z=-0.3
    )  # plate now has offset -0.1, -0.2, -0.3
    protocol.move_labware(
        labware=plate, new_location="D3"
    )  # plate now has offset 0, 0, 0
    plate.set_offset(
        x=-0.1, y=-0.2, z=-0.3
    )  # plate again has offset -0.1, -0.2, -0.3

Using Custom Labware
--------------------

If you have custom labware definitions you want to use with Jupyter, make a new directory called ``labware`` in Jupyter and put the definitions there. These definitions will be available when you call :py:meth:`~opentrons.protocol_api.ProtocolContext.load_labware`.

Using Modules
-------------

If your protocol uses :ref:`modules <new_modules>`, you need to take additional steps to make sure that Jupyter Notebook doesn't send commands that conflict with the robot server. Sending commands to modules while the robot server is running will likely cause errors, and the module commands may not execute as expected.

To disable the robot server, open a Jupyter terminal session by going to **New > Terminal** and run ``systemctl stop opentrons-robot-server``. Then you can run code from cells in your notebook as usual. When you are done using Jupyter Notebook, you should restart the robot server with ``systemctl start opentrons-robot-server``.

.. note::

    While the robot server is stopped, the robot will display as unavailable in the Opentrons App. If you need to control the robot or its attached modules through the app, you need to restart the robot server and wait for the robot to appear as available in the app.


Command Line
------------

.. TODO update with separate links to OT-2 and Flex setup, when new Flex process is in manual or on help site

The robot's command line is accessible either by going to **New > Terminal** in Jupyter or `via SSH <https://support.opentrons.com/s/article/Connecting-to-your-OT-2-with-SSH>`_.

To execute a protocol from the robot's command line, copy the protocol file to the robot with ``scp`` and then run the protocol with ``opentrons_execute``:

.. prompt:: bash

   opentrons_execute /data/my_protocol.py


By default, ``opentrons_execute`` will print out the same run log shown in the Opentrons App, as the protocol executes. It also prints out internal logs at the level ``warning`` or above. Both of these behaviors can be changed. Run ``opentrons_execute --help`` for more information. 
