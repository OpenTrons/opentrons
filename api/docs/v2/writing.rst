.. _writing:

##########################
Using Python For Protocols
##########################

Writing protocols in Python requires some up-front design before seeing your liquid handling automation in action. At a high-level, writing protocols with the Opentrons API looks like:

1) Write a Python protocol
2) Test the code for errors
3) Repeat steps 1 & 2
4) Calibrate labware on robot
5) Run your protocol

These sets of documents aim to help you get the most out of steps 1 & 2, the "design" stage.

*******************************

********************
Python for Beginners
********************

If Python is new to you, we suggest going through a few simple tutorials to acquire a base understanding to build upon. The following tutorials are a great starting point for working with the Opentrons API (from `learnpython.org <http://www.learnpython.org/>`_):

1) `Hello World <http://www.learnpython.org/en/Hello%2C_World%21>`_
2) `Variables and Types <http://www.learnpython.org/en/Variables_and_Types>`_
3) `Lists <http://www.learnpython.org/en/Lists>`_
4) `Basic Operators <http://www.learnpython.org/en/Basic_Operators>`_
5) `Conditions <http://www.learnpython.org/en/Conditions>`_
6) `Loops <http://www.learnpython.org/en/Loops>`_
7) `Functions <http://www.learnpython.org/en/Functions>`_
8) `Dictionaries <http://www.learnpython.org/en/Dictionaries>`_

After going through the above tutorials, you should have enough of an understanding of Python to work with the Opentrons API and start designing your experiments!
More detailed information on python can always be found at `the python docs <https://docs.python.org/3/index.html>`_

*******************************

*******************
Working with Python
*******************


Using a popular and free code editor, like `Sublime Text 3`__, is a common method for writing Python protocols. Download onto your computer, and you can now write and save Python scripts.

__ https://www.sublimetext.com/3

.. note::

    Make sure that when saving a protocol file, it ends with the ``.py`` file extension. This will ensure the App and other programs are able to properly read it.

    For example, ``my_protocol.py``

   
***************************
Simulating Python Protocols
***************************

In general, the best way to simulate a protocol is to simply upload it to an OT 2 through the Opentrons app. When you upload a protocol via the Opentrons app, the robot simulates the protocol and the app displays any errors. However, if you want to simulate protocols without being connected to a robot, you can download the Opentrons python package.

Installing
==========

To install the Opentrons package, you must install it from Python’s package manager, `pip`. The exact method of installation is slightly different depending on whether you use Jupyter on your computer (note: you do not need to do this if you want to use the :ref:`writing-robot-jupyter`, ONLY for your locally-installed notebook) or not.

Non-Jupyter Installation
^^^^^^^^^^^^^^^^^^^^^^^^

First, install Python 3.6 (`Windows x64 <https://www.python.org/ftp/python/3.6.4/python-3.6.4-amd64.exe>`_, `Windows x86 <https://www.python.org/ftp/python/3.6.4/python-3.6.4.exe>`_, `OS X <https://www.python.org/ftp/python/3.6.4/python-3.6.4-macosx10.6.pkg>`_) on your local computer.

Once the installer is done, make sure that Python is properly installed by opening a terminal and doing ``python --version``. If this is not 3.6.4, you have another version of Python installed; this happens frequently on OS X and sometimes on windows. We recommend using a tool like `pyenv <https://github.com/pyenv/pyenv>`_ to manage multiple Python versions. This is particularly useful on OS X, whch has a built in install of Python 2.7 that should not be removed.

Once python is installed, install the `opentrons package <https://pypi.org/project/opentrons/>`_ using ``pip``:

.. code-block:: shell

   pip install opentrons

You should see some output that ends with ``Successfully installed opentrons-3.13.1`` (the version number may be different).

Jupyter Installation
^^^^^^^^^^^^^^^^^^^^

You must make sure that you install the `opentrons` package for whichever kernel and virtual environment the notebook is using. A generally good way to do this is

.. code-block:: shell

   import sys
   !{sys.executable} -m pip install opentrons

.. _simulate-block:

Simulating Your Scripts
=======================

From the Command Line
+++++++++++++++++++++

Once the Opentrons Python package is installed, you can simulate protocols in your terminal using the ``opentrons_simulate`` command:

.. code-block:: shell

   opentrons_simulate.exe my_protocol.py

or, on OS X or linux,

.. code-block:: shell

   opentrons_simulate my_protocol.py

The simulator will print out a log of the actions the protocol will cause, similar to the Opentrons app; it will also print out any log messages caused by a given command next to that list of actions. If there is a problem with the protocol, the simulation will stop and the error will be printed.

The simulation script can also be invoked through python with ``python -m opentrons.simulate /path/to/protocol``.

In Python
+++++++++

This also provides an entrypoint to use the Opentrons simulation package from other Python contexts such as an interactive prompt or Jupyter. To simulate a protocol in python, open a file containing a protocol and pass it to ``opentrons.simulate.simulate``:

.. code-block:: python

   import opentrons.simulate
   protocol_file = open('/path/to/protocol.py')
   runlog = opentrons.simulate.simulate(protocol_file)
   print(format_runlog(runlog))

The :py:meth:`opentrons.simulate.simulate` method does the work of simulating the protocol and returns the run log, which is a list of structured dictionaries. :py:meth:`opentrons.simulate.format_runlog` turns that list of dictionaries into a human readable string, which is then printed out. For more information on the protocol simulator, see :ref:`simulate-block`.

Using Jupyter
+++++++++++++

In your Jupyter notebook, you can use the Opentrons Protocol API simulator by doing

.. code-block:: python

    from opentrons import simulate
    protocol = simulate.get_protocol_api()
    p300 = protocol.load_instrument('p300_single', 'right')
    ...

The ``protocol`` object, which is an instance of :py:class:`.ProtocolContext`, is the same thing that gets passed to your protocol's ``run`` function, but set to simulate rather than control a robot. You can call all your protocol's functions on that object.

If you have a full protocol, wrapped inside a ``run`` function, defined in a Jupyter cell you can also use :py:meth:`opentrons.simulate.simulate` as described above to simulate the protocol.

These instructions also work on the robot's Jupyter notebook.


Configuration and Local Storage
===============================

The module uses a folder in your user directory as a place to store and read configuration and changes to its internal data. For instance, if your protocol creates a custom labware, the custom labware will live in the local storage location. This location is ``~/.opentrons`` on Linux or OSX and ``C:\Users\%USERNAME%\.opentrons`` on Windows.


.. _writing-robot-jupyter:

************************
Robot’s Jupyter Notebook
************************

Your OT-2 also has a Jupyter notebook, which you can use to develop and execute protocols. For more information on how to execute protocols using the robot's Jupyter notebook, please see :ref:`advanced-control`. To simulate protocols on the robot's jupyter notebook, use the instructions above.
